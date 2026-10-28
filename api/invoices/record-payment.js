import { authenticateRequest } from '../_lib/authMiddleware.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'
import { logActivity } from '../_lib/audit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const caller = await authenticateRequest(req, res, ['super_admin', 'admin'])
  if (!caller) return

  const { invoiceId, amountPaid, paymentDate, paymentMode, paymentReference, notes } = req.body || {}

  if (!invoiceId || !amountPaid || Number(amountPaid) <= 0) {
    return res.status(400).json({ error: 'Valid invoiceId and amountPaid are required' })
  }

  const fbAdmin = getFirebaseAdmin()
  const db = fbAdmin.firestore()

  try {
    const invoiceRef = db.collection('invoices').doc(invoiceId)
    const invoiceDoc = await invoiceRef.get()

    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const currentInvoice = invoiceDoc.data()
    const numericAmount = Number(amountPaid)
    const previousPaid = Number(currentInvoice.amountPaid) || 0
    const newTotalPaid = previousPaid + numericAmount
    const totalAmount = Number(currentInvoice.totalAmount) || 0
    const newBalanceDue = Math.max(0, totalAmount - newTotalPaid)

    const newStatus = newBalanceDue === 0 ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : currentInvoice.status)

    const paymentRecord = {
      paymentId: `PAY-${Date.now()}`,
      amount: numericAmount,
      date: paymentDate || new Date().toISOString(),
      mode: paymentMode || 'NEFT_RTGS',
      reference: paymentReference || '',
      notes: notes || '',
      recordedBy: caller.uid,
      recordedByEmail: caller.email,
      recordedAt: new Date().toISOString(),
    }

    const paymentsList = currentInvoice.payments || []
    paymentsList.push(paymentRecord)

    const auditTrail = currentInvoice.auditHistory || []
    auditTrail.push({
      action: 'PAYMENT_RECORDED',
      actor: caller.email,
      amount: numericAmount,
      timestamp: new Date().toISOString(),
      notes,
    })

    await invoiceRef.update({
      amountPaid: newTotalPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
      payments: paymentsList,
      auditHistory: auditTrail,
      updatedAt: new Date().toISOString(),
    })

    await logActivity({
      actorUid: caller.uid,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: 'RECORD_INVOICE_PAYMENT',
      entityType: 'invoice',
      entityId: invoiceId,
      metadata: {
        invoiceNumber: currentInvoice.invoiceNumber,
        amount: numericAmount,
        newStatus,
        newBalanceDue,
        reference: paymentReference,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      invoice: {
        id: invoiceId,
        invoiceNumber: currentInvoice.invoiceNumber,
        amountPaid: newTotalPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    })
  } catch (err) {
    console.error('Record payment error:', err)
    return res.status(500).json({ error: err.message || 'Failed to record payment' })
  }
}
