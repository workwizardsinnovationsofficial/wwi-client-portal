import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatCurrencyINR, formatDateKolkata } from '../../lib/utils'
import { downloadInvoicePDF } from '../../lib/pdfGenerator'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileCheck,
} from 'lucide-react'

export function ClientInvoicesList() {
  const { organization, organizationId, user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  // Payment reference submission modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [amountTransferred, setAmountTransferred] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'invoices'),
      where('organizationId', '==', organizationId)
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''))
      setInvoices(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    return () => unsub()
  }, [organizationId])

  const handleDownloadPDF = (inv) => {
    downloadInvoicePDF(inv, organization || { name: inv.organizationName }, { name: inv.projectName })
    showSuccess(`Generated official Tax Invoice PDF for ${inv.invoiceNumber}`)
  }

  const handleSubmitPaymentRef = async (e) => {
    e.preventDefault()
    if (!selectedInvoice || !paymentReference.trim()) return
    setSubmitting(true)

    try {
      // 1. Create a submission record for staff review
      await addDoc(collection(db, 'submissions'), {
        submissionNumber: `SUB-PAY-${Date.now().toString().slice(-6)}`,
        title: `Payment Reference Submission for ${selectedInvoice.invoiceNumber}`,
        submissionType: 'payment_reference',
        description: `Client submitted payment reference / UTR: ${paymentReference}. Amount: ${formatCurrencyINR(amountTransferred)}. Transfer Date: ${paymentDate}`,
        organizationId,
        organizationName: organization?.name || selectedInvoice.organizationName,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        status: 'under_review',
        submittedBy: user.uid,
        submitterEmail: user.email,
        createdAt: new Date().toISOString(),
      })

      showSuccess(`Payment reference submitted. WWI finance team will verify and update invoice balance.`)
      setPaymentModalOpen(false)
      setPaymentReference('')
      setAmountTransferred('')
    } catch (err) {
      showError(err.message || 'Failed to submit payment reference')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'overdue':
        return <Badge variant="danger">Overdue</Badge>
      case 'partially_paid':
        return <Badge variant="warning">Partially Paid</Badge>
      default:
        return <Badge variant="neutral">{status?.toUpperCase() || 'ISSUED'}</Badge>
    }
  }

  const columns = [
    {
      header: 'Invoice #',
      render: (inv) => (
        <span className="font-mono font-semibold text-wwi-text">{inv.invoiceNumber}</span>
      ),
    },
    {
      header: 'Scope / Project',
      render: (inv) => (
        <div>
          <div className="font-medium text-wwi-text">{inv.description || inv.projectName || 'Milestone Delivery'}</div>
          <div className="text-[11px] text-wwi-muted">{inv.projectName}</div>
        </div>
      ),
    },
    {
      header: 'Dates',
      render: (inv) => (
        <div className="text-xs">
          <div>Issued: {formatDateKolkata(inv.issueDate, 'dd MMM yyyy')}</div>
          <div className="text-[11px] text-wwi-muted">Due: {formatDateKolkata(inv.dueDate, 'dd MMM yyyy')}</div>
        </div>
      ),
    },
    {
      header: 'Total Amount',
      render: (inv) => (
        <span className="font-mono font-medium text-wwi-text">{formatCurrencyINR(inv.totalAmount)}</span>
      ),
    },
    {
      header: 'Balance Due',
      render: (inv) => {
        const bal = inv.balanceDue !== undefined ? inv.balanceDue : (Number(inv.totalAmount) - Number(inv.amountPaid || 0))
        return (
          <span className={`font-mono font-medium ${bal > 0 ? (inv.status === 'overdue' ? 'text-red-600' : 'text-amber-600') : 'text-green-600'}`}>
            {formatCurrencyINR(bal)}
          </span>
        )
      },
    },
    {
      header: 'Status',
      render: (inv) => getStatusBadge(inv.status),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => handleDownloadPDF(inv)}
            title="Download Tax Invoice PDF"
          >
            PDF
          </Button>

          {inv.status !== 'paid' && (
            <Button
              variant="secondary"
              size="sm"
              icon={FileCheck}
              onClick={() => {
                setSelectedInvoice(inv)
                setAmountTransferred(inv.balanceDue || inv.totalAmount)
                setPaymentModalOpen(true)
              }}
            >
              Submit UTR
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Billing"
        description="Official GST tax invoices in INR for milestones and deliverables. Download PDF copies and submit wire transfer references."
      />

      {/* Payment Instructions Card */}
      <Card title="Official Bank Wire & Settlement Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-wwi-muted block mb-0.5">Beneficiary:</span>
            <span className="font-semibold text-wwi-text">Work Wizards Innovations Pvt Ltd</span>
          </div>
          <div>
            <span className="text-wwi-muted block mb-0.5">Bank Name:</span>
            <span className="text-wwi-text">HDFC Bank Ltd</span>
          </div>
          <div>
            <span className="text-wwi-muted block mb-0.5">Account Number:</span>
            <span className="font-mono text-wwi-text">50200084729103</span>
          </div>
          <div>
            <span className="text-wwi-muted block mb-0.5">IFSC / UPI:</span>
            <span className="font-mono text-wwi-text">HDFC0000053 • workwizards@hdfcbank</span>
          </div>
        </div>
      </Card>

      <Card noPadding>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={7} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={invoices}
            emptyMessage="No invoices issued for your organization."
          />
        )}
      </Card>

      {/* Submit Payment Reference Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Submit Payment Reference for ${selectedInvoice?.invoiceNumber}`}
        description="Enter the NEFT, RTGS, or IMPS reference / UTR number for verification by our accounts team."
      >
        <form onSubmit={handleSubmitPaymentRef} className="space-y-4">
          <Input
            label="Amount Transferred (INR)"
            type="number"
            required
            value={amountTransferred}
            onChange={(e) => setAmountTransferred(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Transaction Date"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />

            <Input
              label="Bank Reference / UTR Number"
              required
              placeholder="e.g. HDFCR2026..."
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit for Verification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
