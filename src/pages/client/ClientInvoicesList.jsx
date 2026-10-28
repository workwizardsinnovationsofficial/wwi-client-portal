import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatCurrencyINR, formatDateKolkata } from '../../lib/utils'
import { downloadInvoicePDF } from '../../lib/pdfGenerator'
import { uploadFileToR2, readFileAsDataUrl } from '../../lib/r2Client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileCheck,
  Upload,
  Image as ImageIcon,
  Clock,
  Eye,
  FileText,
  ExternalLink,
} from 'lucide-react'

export function ClientInvoicesList() {
  const { organization, organizationId, user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  // Payment proof submission modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [amountTransferred, setAmountTransferred] = useState('')
  const [paymentMode, setPaymentMode] = useState('UPI')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewingProofOnly, setViewingProofOnly] = useState(false)

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

  const handleOpenUploadModal = (inv, viewOnly = false) => {
    setSelectedInvoice(inv)
    setAmountTransferred(inv.balanceDue || inv.totalAmount || '')
    setPaymentReference(inv.paymentProofReference || '')
    setPaymentDate(inv.paymentProofDate || new Date().toISOString().split('T')[0])
    setPaymentMode(inv.paymentProofMode || 'UPI')
    setPaymentNotes(inv.paymentProofNotes || '')
    setScreenshotFile(null)
    setScreenshotPreview(inv.paymentProofDataUrl || inv.paymentProofUrl || null)
    setViewingProofOnly(viewOnly)
    setPaymentModalOpen(true)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScreenshotFile(file)
    try {
      const preview = await readFileAsDataUrl(file)
      setScreenshotPreview(preview)
    } catch {
      // non-fatal
    }
  }

  const handleSubmitPaymentProof = async (e) => {
    e.preventDefault()
    if (!selectedInvoice) return
    if (!paymentReference.trim()) {
      showError('Please enter transaction reference / UTR number.')
      return
    }
    if (!screenshotFile && !selectedInvoice.paymentProofDataUrl && !selectedInvoice.paymentProofKey) {
      showError('Please attach payment screenshot or transfer receipt.')
      return
    }

    setSubmitting(true)
    try {
      let r2Result = null
      let fileDataUrl = null

      if (screenshotFile) {
        try {
          fileDataUrl = await readFileAsDataUrl(screenshotFile)
        } catch {
          // non-fatal
        }

        try {
          r2Result = await uploadFileToR2(screenshotFile, {
            organizationId,
            projectId: selectedInvoice.projectId || 'invoices',
            visibility: 'client_visible',
          })
        } catch (r2Err) {
          console.warn('R2 upload notice:', r2Err.message)
          r2Result = {
            key: `payments/${organizationId}/${Date.now()}_${screenshotFile.name}`,
            fileName: screenshotFile.name,
            fileSize: screenshotFile.size,
          }
        }
      }

      // 1. Update invoice document in Firestore directly
      const invoiceUpdate = {
        status: 'payment_submitted',
        paymentProofReference: paymentReference.trim(),
        paymentProofAmount: Number(amountTransferred) || selectedInvoice.totalAmount,
        paymentProofDate: paymentDate,
        paymentProofMode: paymentMode,
        paymentProofNotes: paymentNotes.trim() || null,
        paymentProofUploadedAt: new Date().toISOString(),
        paymentProofUploadedBy: user.uid,
        paymentProofUploadedByName: userProfile?.displayName || userProfile?.name || user.email.split('@')[0],
        paymentProofUploadedByEmail: user.email,
        updatedAt: new Date().toISOString(),
      }

      if (screenshotFile) {
        invoiceUpdate.paymentProofFileName = screenshotFile.name
        invoiceUpdate.paymentProofFileSize = screenshotFile.size
        invoiceUpdate.paymentProofFileType = screenshotFile.type
      }
      if (r2Result?.key) {
        invoiceUpdate.paymentProofKey = r2Result.key
      }
      if (fileDataUrl) {
        invoiceUpdate.paymentProofDataUrl = fileDataUrl
      }

      await updateDoc(doc(db, 'invoices', selectedInvoice.id), invoiceUpdate)

      // 2. Also register in submissions for audit & accounts pipeline
      await addDoc(collection(db, 'submissions'), {
        submissionNumber: `SUB-PAY-${Date.now().toString().slice(-6)}`,
        title: `Payment Screenshot Submission for ${selectedInvoice.invoiceNumber}`,
        submissionType: 'payment_reference',
        description: `Client submitted payment proof screenshot. UTR / Ref: ${paymentReference}. Amount: ${formatCurrencyINR(amountTransferred)}. Mode: ${paymentMode}. Date: ${paymentDate}`,
        organizationId,
        organizationName: organization?.name || selectedInvoice.organizationName,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        status: 'under_review',
        paymentProofKey: r2Result?.key || selectedInvoice.paymentProofKey || null,
        paymentProofDataUrl: fileDataUrl || selectedInvoice.paymentProofDataUrl || null,
        submittedBy: user.uid,
        submitterEmail: user.email,
        createdAt: new Date().toISOString(),
      })

      showSuccess(`Payment proof submitted for ${selectedInvoice.invoiceNumber}. WWI accounts team will verify and record payment.`)
      setPaymentModalOpen(false)
      setScreenshotFile(null)
      setScreenshotPreview(null)
      setPaymentReference('')
      setAmountTransferred('')
    } catch (err) {
      showError(err.message || 'Failed to submit payment proof')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status, inv) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'payment_submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Verification Pending
          </span>
        )
      case 'payment_rejected':
        return <Badge variant="danger">Proof Rejected - Reupload</Badge>
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
      render: (inv) => getStatusBadge(inv.status, inv),
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

          {inv.status === 'paid' ? (
            <Badge variant="success" size="xs">
              Settled
            </Badge>
          ) : inv.status === 'payment_submitted' || inv.paymentProofUploadedAt ? (
            <Button
              variant="secondary"
              size="sm"
              icon={FileCheck}
              onClick={() => handleOpenUploadModal(inv, false)}
              className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
            >
              Proof Submitted
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => handleOpenUploadModal(inv, false)}
            >
              Upload Proof
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
        description="Official GST tax invoices in INR. Download PDF receipts, pay via bank transfer or UPI, and upload payment screenshots for immediate verification."
      />

      {/* Payment Instructions Card */}
      <Card title="Official Settlement & Bank Transfer Details">
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

      {/* Upload Payment Screenshot & Reference Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={
          selectedInvoice?.status === 'payment_submitted'
            ? `Payment Proof for ${selectedInvoice?.invoiceNumber}`
            : `Upload Payment Screenshot & Details (${selectedInvoice?.invoiceNumber})`
        }
        description="Submit your bank transfer, NEFT, IMPS, or UPI payment screenshot. Our accounts team verifies and marks the invoice as Paid."
      >
        <form onSubmit={handleSubmitPaymentProof} className="space-y-4">
          {/* Invoice Summary Box */}
          <div className="p-3 bg-wwi-surface rounded-lg border border-wwi-border flex items-center justify-between text-xs">
            <div>
              <span className="text-wwi-muted block">Invoice Balance Due:</span>
              <span className="text-base font-bold font-mono text-wwi-text">
                {formatCurrencyINR(selectedInvoice?.balanceDue || selectedInvoice?.totalAmount || 0)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-wwi-muted block">Invoice Number:</span>
              <span className="font-mono font-semibold text-wwi-text">{selectedInvoice?.invoiceNumber}</span>
            </div>
          </div>

          {/* Screenshot / File Upload Dropzone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-wwi-text">
              Payment Screenshot / Receipt <span className="text-red-500">*</span>
            </label>

            {screenshotPreview ? (
              <div className="p-3 border border-wwi-border rounded-lg bg-neutral-50 space-y-2">
                <div className="flex items-center justify-between text-xs text-wwi-muted">
                  <span className="font-medium text-wwi-text flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-neutral-600" />
                    {screenshotFile?.name || selectedInvoice?.paymentProofFileName || 'Payment Screenshot Attached'}
                  </span>
                  <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                    Change Screenshot
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {screenshotPreview.startsWith('data:image') || screenshotPreview.startsWith('http') ? (
                  <div className="relative max-h-48 overflow-hidden rounded border border-neutral-200 bg-white flex items-center justify-center">
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot preview"
                      className="max-h-48 object-contain w-full"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded border border-neutral-200 text-xs flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neutral-500" />
                    <span>PDF Document Attached ({screenshotFile?.name || selectedInvoice?.paymentProofFileName})</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="border-2 border-dashed border-wwi-border hover:border-wwi-dark rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition bg-white hover:bg-neutral-50">
                <Upload className="w-7 h-7 text-neutral-400 mb-2" />
                <span className="text-xs font-semibold text-wwi-text">Click to upload payment screenshot</span>
                <span className="text-[11px] text-wwi-muted mt-0.5">PNG, JPG, WEBP, or PDF receipt (up to 15MB)</span>
                <input
                  type="file"
                  required={!selectedInvoice?.paymentProofDataUrl && !selectedInvoice?.paymentProofKey}
                  accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Amount Paid (INR)"
              type="number"
              required
              value={amountTransferred}
              onChange={(e) => setAmountTransferred(e.target.value)}
            />

            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={[
                { value: 'UPI', label: 'UPI (GPay, PhonePe, Paytm)' },
                { value: 'NEFT_RTGS', label: 'Bank Transfer (NEFT / RTGS)' },
                { value: 'IMPS', label: 'IMPS Instant Transfer' },
                { value: 'NET_BANKING', label: 'Corporate Net Banking' },
                { value: 'CARD', label: 'Credit / Debit Card' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Transaction Date"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />

            <Input
              label="UTR / Transaction Reference Number"
              required
              placeholder="e.g. 439281902849 or UPI/932..."
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-wwi-text">
              Remarks / Transaction Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid via ICICI Corporate Banking for Milestone 2"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded px-3 py-2 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {selectedInvoice?.status === 'payment_submitted' ? 'Update & Resubmit Proof' : 'Upload Proof & Submit'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
