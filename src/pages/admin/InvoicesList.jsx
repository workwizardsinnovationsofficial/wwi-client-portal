import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore'
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
import { getDownloadPresignedUrl } from '../../lib/r2Client'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  CreditCard,
  Plus,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Trash2,
  FileCheck,
  Eye,
  BellRing,
  ExternalLink,
  XCircle,
  Image as ImageIcon,
  Clock,
} from 'lucide-react'

export function InvoicesList() {
  const { user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()

  const [invoices, setInvoices] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [selectedInvoiceForVerify, setSelectedInvoiceForVerify] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingMode, setRejectingMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)


  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'NEFT_RTGS',
    paymentReference: '',
    notes: '',
  })

  // New Invoice form state
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: `WWI-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    organizationId: '',
    projectId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: '',
    lineItems: [
      {
        description: 'Software Engineering & Cloud Architecture Services',
        quantity: 1,
        unitPrice: 150000,
        taxRate: 18,
      },
    ],
  })

  useEffect(() => {
    // 1. Fetch Invoices
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''))
      setInvoices(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    // 2. Fetch Organizations
    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setOrganizations(list)
    })

    // 3. Fetch Projects
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    return () => {
      unsubInvoices()
      unsubOrgs()
      unsubProjects()
    }
  }, [])

  // Line item helpers
  const handleAddLineItem = () => {
    setNewInvoice({
      ...newInvoice,
      lineItems: [
        ...newInvoice.lineItems,
        { description: '', quantity: 1, unitPrice: 0, taxRate: 18 },
      ],
    })
  }

  const handleUpdateLineItem = (index, field, value) => {
    const updated = [...newInvoice.lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setNewInvoice({ ...newInvoice, lineItems: updated })
  }

  const handleRemoveLineItem = (index) => {
    if (newInvoice.lineItems.length <= 1) return
    const updated = newInvoice.lineItems.filter((_, i) => i !== index)
    setNewInvoice({ ...newInvoice, lineItems: updated })
  }

  // Calculate totals
  const subtotal = newInvoice.lineItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 1
    const price = Number(item.unitPrice) || 0
    return acc + qty * price
  }, 0)
  const taxAmount = subtotal * 0.18
  const totalAmount = subtotal + taxAmount

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const org = organizations.find((o) => o.id === newInvoice.organizationId)
      const prj = projects.find((p) => p.id === newInvoice.projectId)

      await addDoc(collection(db, 'invoices'), {
        invoiceNumber: newInvoice.invoiceNumber,
        organizationId: newInvoice.organizationId,
        organizationName: org?.name || 'Client Org',
        clientContactName: org?.primaryContact || '',
        clientEmail: org?.officialEmail || '',
        projectId: newInvoice.projectId || null,
        projectName: prj?.name || null,
        issueDate: newInvoice.issueDate,
        dueDate: newInvoice.dueDate,
        description: newInvoice.description || 'Milestone Delivery Invoice',
        currency: 'INR',
        lineItems: newInvoice.lineItems,
        subtotal,
        taxRate: 18,
        taxAmount,
        totalAmount,
        amountPaid: 0,
        balanceDue: totalAmount,
        status: 'issued',
        payments: [],
        auditHistory: [
          {
            action: 'INVOICE_ISSUED',
            actor: user?.email,
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email,
      })

      showSuccess(`Invoice ${newInvoice.invoiceNumber} created and issued.`)
      setCreateModalOpen(false)
    } catch (err) {
      showError(err.message || 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!selectedInvoiceForPayment) return
    setSubmitting(true)

    try {
      const token = typeof user?.getIdToken === 'function' ? await user.getIdToken() : 'master_admin_session_token'
      const res = await fetch('/api/invoices/record-payment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: selectedInvoiceForPayment.id,
          amountPaid: Number(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMode: paymentForm.paymentMode,
          paymentReference: paymentForm.paymentReference,
          notes: paymentForm.notes,
        }),
      })

      if (res.ok) {
        showSuccess(`Payment of ${formatCurrencyINR(paymentForm.amount)} recorded.`)
        setPaymentModalOpen(false)
        setPaymentForm({
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMode: 'NEFT_RTGS',
          paymentReference: '',
          notes: '',
        })
        return
      }
    } catch (apiErr) {
      console.warn('API payment recording notice, applying Firestore update:', apiErr)
    }

    // Direct Firestore update fallback
    try {
      const paidAmt = Number(paymentForm.amount)
      const currentPaid = Number(selectedInvoiceForPayment.amountPaid || 0)
      const newPaid = currentPaid + paidAmt
      const total = Number(selectedInvoiceForPayment.totalAmount || selectedInvoiceForPayment.total || 0)
      const newBalance = Math.max(0, total - newPaid)
      const newStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : selectedInvoiceForPayment.status

      await updateDoc(doc(db, 'invoices', selectedInvoiceForPayment.id), {
        amountPaid: newPaid,
        balanceDue: newBalance,
        status: newStatus,
        paymentReference: paymentForm.paymentReference,
        paymentMethod: paymentForm.paymentMode,
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Payment of ${formatCurrencyINR(paymentForm.amount)} recorded directly.`)
      setPaymentModalOpen(false)
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: 'NEFT_RTGS',
        paymentReference: '',
        notes: '',
      })
    } catch (err) {
      showError(err.message || 'Payment recording error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadPDF = (inv) => {
    const org = organizations.find((o) => o.id === inv.organizationId) || { name: inv.organizationName }
    const prj = projects.find((p) => p.id === inv.projectId) || { name: inv.projectName }
    downloadInvoicePDF(inv, org, prj)
    showSuccess(`Generated official PDF for ${inv.invoiceNumber}`)
  }

  const handleVerifyAndMarkPaid = async (inv) => {
    setSubmitting(true)
    try {
      const total = Number(inv.totalAmount || inv.total || 0)
      await updateDoc(doc(db, 'invoices', inv.id), {
        status: 'paid',
        amountPaid: total,
        balanceDue: 0,
        paidAt: new Date().toISOString(),
        verifiedBy: user?.email || 'admin@wwi.org.in',
        verifiedByName: userProfile?.displayName || userProfile?.name || 'WWI Admin',
        paymentVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Payment verified! Invoice ${inv.invoiceNumber} recorded as PAID.`)
      setVerifyModalOpen(false)
      setSelectedInvoiceForVerify(null)
    } catch (err) {
      showError(err.message || 'Failed to verify payment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectProof = async (inv) => {
    if (!rejectionReason.trim()) {
      showError('Please enter a reason for rejecting the payment proof.')
      return
    }
    setSubmitting(true)
    try {
      await updateDoc(doc(db, 'invoices', inv.id), {
        status: 'payment_rejected',
        paymentRejectionReason: rejectionReason.trim(),
        paymentRejectedAt: new Date().toISOString(),
        paymentRejectedBy: user?.email,
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Payment proof for ${inv.invoiceNumber} marked as rejected.`)
      setVerifyModalOpen(false)
      setSelectedInvoiceForVerify(null)
      setRejectionReason('')
      setRejectingMode(false)
    } catch (err) {
      showError(err.message || 'Failed to reject payment proof')
    } finally {
      setSubmitting(false)
    }
  }

  // Status badge styling
  const getInvoiceStatusBadge = (status, inv) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'payment_submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Proof Uploaded (Pending)
          </span>
        )
      case 'payment_rejected':
        return <Badge variant="danger">Proof Rejected</Badge>
      case 'overdue':
        return <Badge variant="danger">Overdue</Badge>
      case 'partially_paid':
        return <Badge variant="warning">Partially Paid</Badge>
      case 'draft':
        return <Badge variant="neutral">Draft</Badge>
      default:
        return <Badge variant="neutral">{status?.toUpperCase() || 'ISSUED'}</Badge>
    }
  }

  const pendingVerificationInvoices = invoices.filter(
    (i) => i.status === 'payment_submitted' || (i.paymentProofUploadedAt && i.status !== 'paid')
  )

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.paymentProofReference?.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesStatus = true
    if (statusFilter === 'all') matchesStatus = true
    else if (statusFilter === 'pending_verification') {
      matchesStatus = i.status === 'payment_submitted' || (i.paymentProofUploadedAt && i.status !== 'paid')
    } else {
      matchesStatus = i.status === statusFilter
    }

    return matchesSearch && matchesStatus
  })

  // Summary Metrics
  const totalBilled = invoices.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0)
  const totalCollected = invoices.reduce((acc, i) => acc + (Number(i.amountPaid) || 0), 0)
  const totalOutstanding = invoices.reduce((acc, i) => acc + (Number(i.balanceDue !== undefined ? i.balanceDue : (Number(i.totalAmount) - Number(i.amountPaid || 0))) || 0), 0)
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((acc, i) => acc + (Number(i.balanceDue || i.totalAmount) || 0), 0)

  const columns = [
    {
      header: 'Invoice #',
      render: (inv) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-wwi-text">{inv.invoiceNumber}</span>
            {(inv.status === 'payment_submitted' || (inv.paymentProofUploadedAt && inv.status !== 'paid')) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="Payment proof uploaded awaiting verification" />
            )}
          </div>
          {inv.paymentProofReference && (
            <div className="text-[10px] text-wwi-muted font-mono">UTR: {inv.paymentProofReference}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Client & Project',
      render: (inv) => (
        <div>
          <div className="font-semibold text-wwi-text">{inv.organizationName}</div>
          <div className="text-[11px] text-wwi-muted truncate">{inv.projectName || 'General Services'}</div>
        </div>
      ),
    },
    {
      header: 'Issue / Due Date',
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
        <span className="font-mono font-medium text-wwi-text">
          {formatCurrencyINR(inv.totalAmount)}
        </span>
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
      render: (inv) => getInvoiceStatusBadge(inv.status, inv),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (inv) => {
        const isPendingVerification = inv.status === 'payment_submitted' || (inv.paymentProofUploadedAt && inv.status !== 'paid')

        return (
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

            {isPendingVerification ? (
              <Button
                variant="primary"
                size="sm"
                icon={FileCheck}
                onClick={() => {
                  setSelectedInvoiceForVerify(inv)
                  setRejectingMode(false)
                  setRejectionReason('')
                  setVerifyModalOpen(true)
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                Verify Proof
              </Button>
            ) : inv.status !== 'paid' ? (
              <Button
                variant="secondary"
                size="sm"
                icon={CheckCircle2}
                onClick={() => {
                  setSelectedInvoiceForPayment(inv)
                  setPaymentForm({
                    ...paymentForm,
                    amount: inv.balanceDue || inv.totalAmount,
                  })
                  setPaymentModalOpen(true)
                }}
              >
                Record Payment
              </Button>
            ) : (
              <Badge variant="success" size="xs">
                Settled
              </Badge>
            )}
          </div>
        )
      },
    },
  ]


  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Billing"
        description="Issue professional tax invoices, monitor outstanding balances in INR, and record verified bank payments."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Invoice
          </Button>
        }
      />

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs font-medium text-wwi-muted">Total Billed</span>
          <div className="mt-2 text-xl font-bold font-mono text-wwi-text">
            {formatCurrencyINR(totalBilled, false)}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">{invoices.length} total invoices</span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-wwi-muted">Total Collected</span>
          <div className="mt-2 text-xl font-bold font-mono text-green-700">
            {formatCurrencyINR(totalCollected, false)}
          </div>
          <span className="text-[11px] text-green-600 mt-1 block">Verified bank credits</span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-wwi-muted">Outstanding Receivables</span>
          <div className="mt-2 text-xl font-bold font-mono text-wwi-text">
            {formatCurrencyINR(totalOutstanding, false)}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Pending client transfers</span>
        </Card>

        <Card>
          <span className="text-xs font-medium text-wwi-muted">Overdue Balance</span>
          <div className="mt-2 text-xl font-bold font-mono text-red-600">
            {formatCurrencyINR(totalOverdue, false)}
          </div>
          <span className="text-[11px] text-red-500 mt-1 block">Exceeded payment due date</span>
        </Card>
      </div>

      {/* Pending Payment Verification Alert Banner */}
      {pendingVerificationInvoices.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-950">
                  {pendingVerificationInvoices.length} Payment Verification(s) Pending Action
                </h4>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Client organizations have uploaded bank transfer screenshots. Review screenshot & verify to record payment done.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setStatusFilter('pending_verification')}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-semibold"
          >
            Review Pending Proofs ({pendingVerificationInvoices.length})
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            statusFilter === 'all'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          All Invoices ({invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('pending_verification')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
            statusFilter === 'pending_verification'
              ? 'bg-amber-600 text-white font-semibold'
              : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
          }`}
        >
          {pendingVerificationInvoices.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          )}
          Proof Uploaded ({pendingVerificationInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('paid')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            statusFilter === 'paid'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          Paid ({invoices.filter((i) => i.status === 'paid').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('overdue')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            statusFilter === 'overdue'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          Overdue ({invoices.filter((i) => i.status === 'overdue').length})
        </button>
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number, client, project, or UTR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded pl-8 pr-3 py-1.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-wwi-muted">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-wwi-border rounded px-2.5 py-1 text-xs text-wwi-text focus:outline-none"
            >
              <option value="all">All Invoices</option>
              <option value="pending_verification">Proof Uploaded (Pending)</option>
              <option value="issued">Issued</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>


        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredInvoices}
            emptyMessage="No invoices found matching criteria."
          />
        )}
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Tax Invoice"
        description="Generates a formal invoice with GST line items and bank transfer instructions."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Invoice Number"
              required
              value={newInvoice.invoiceNumber}
              onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
            />

            <Select
              label="Client Organization"
              required
              value={newInvoice.organizationId}
              onChange={(e) => setNewInvoice({ ...newInvoice, organizationId: e.target.value })}
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Associated Project"
              value={newInvoice.projectId}
              onChange={(e) => setNewInvoice({ ...newInvoice, projectId: e.target.value })}
              options={[
                { value: '', label: 'None (Standalone / Consultation)' },
                ...projects
                  .filter((p) => !newInvoice.organizationId || p.organizationId === newInvoice.organizationId)
                  .map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Input
              label="Brief Scope / Description"
              placeholder="e.g. Milestone 1 Software Delivery"
              value={newInvoice.description}
              onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Issue Date"
              type="date"
              required
              value={newInvoice.issueDate}
              onChange={(e) => setNewInvoice({ ...newInvoice, issueDate: e.target.value })}
            />
            <Input
              label="Due Date"
              type="date"
              required
              value={newInvoice.dueDate}
              onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
            />
          </div>

          {/* Line items table editor */}
          <div className="border border-wwi-border rounded-lg p-3 bg-neutral-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-wwi-text">Invoice Line Items</span>
              <Button variant="outline" size="sm" icon={Plus} onClick={handleAddLineItem}>
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {newInvoice.lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-wwi-border rounded">
                  <input
                    type="text"
                    required
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                    className="flex-1 text-xs border border-wwi-border rounded px-2 py-1 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                    className="w-14 text-xs border border-wwi-border rounded px-2 py-1 text-center focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Rate (₹)"
                    value={item.unitPrice}
                    onChange={(e) => handleUpdateLineItem(idx, 'unitPrice', e.target.value)}
                    className="w-24 text-xs border border-wwi-border rounded px-2 py-1 text-right focus:outline-none"
                  />
                  <span className="text-[11px] text-wwi-muted w-12 text-center">18% GST</span>
                  {newInvoice.lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="text-neutral-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Calculations Summary */}
            <div className="pt-2 border-t border-wwi-border text-right space-y-1 text-xs">
              <div className="text-wwi-muted">Subtotal: <span className="font-mono text-wwi-text">{formatCurrencyINR(subtotal)}</span></div>
              <div className="text-wwi-muted">GST (18%): <span className="font-mono text-wwi-text">{formatCurrencyINR(taxAmount)}</span></div>
              <div className="font-bold text-sm text-wwi-text">Total Amount: <span className="font-mono">{formatCurrencyINR(totalAmount)}</span></div>
            </div>
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Issue Official Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment for ${selectedInvoiceForPayment?.invoiceNumber}`}
        description="Authorized staff verification of received wire, NEFT, or RTGS transfer."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Amount Paid (INR)"
            type="number"
            required
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              required
              value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
            />

            <Select
              label="Payment Mode"
              value={paymentForm.paymentMode}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
              options={[
                { value: 'NEFT_RTGS', label: 'NEFT / RTGS Wire' },
                { value: 'IMPS', label: 'IMPS Direct Transfer' },
                { value: 'UPI', label: 'UPI Business' },
                { value: 'CHEQUE', label: 'Cheque Clearance' },
              ]}
            />
          </div>

          <Input
            label="Transaction Reference / UTR Number"
            required
            placeholder="e.g. HDFCR20260228009841"
            value={paymentForm.paymentReference}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
          />

          <Input
            label="Internal Notes"
            placeholder="Bank branch or settlement remarks"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
          />

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Confirm & Update Balance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Payment Proof & Verify Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => {
          setVerifyModalOpen(false)
          setRejectingMode(false)
        }}
        title={`Audit & Verify Payment Proof: ${selectedInvoiceForVerify?.invoiceNumber || ''}`}
        description="Verify the client-submitted bank transfer screenshot, UTR number, and mark invoice as settled."
        maxWidth="max-w-2xl"
      >
        {selectedInvoiceForVerify && (
          <div className="space-y-4">
            {/* Invoice Summary Card */}
            <div className="p-3.5 bg-wwi-surface rounded-lg border border-wwi-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-wwi-muted block">Client:</span>
                <span className="font-semibold text-wwi-text">{selectedInvoiceForVerify.organizationName}</span>
              </div>
              <div>
                <span className="text-wwi-muted block">Invoice Balance:</span>
                <span className="font-mono font-bold text-amber-700">
                  {formatCurrencyINR(selectedInvoiceForVerify.balanceDue !== undefined ? selectedInvoiceForVerify.balanceDue : selectedInvoiceForVerify.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-wwi-muted block">Total Billed:</span>
                <span className="font-mono font-semibold text-wwi-text">
                  {formatCurrencyINR(selectedInvoiceForVerify.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-wwi-muted block">Due Date:</span>
                <span className="text-wwi-text">{formatDateKolkata(selectedInvoiceForVerify.dueDate, 'dd MMM yyyy')}</span>
              </div>
            </div>

            {/* Client Payment Claim Details */}
            <div className="p-3.5 bg-white rounded-lg border border-neutral-200 space-y-2 text-xs">
              <div className="font-semibold text-wwi-text flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                <FileCheck className="w-4 h-4 text-green-600" />
                <span>Client Submission Details</span>
                {selectedInvoiceForVerify.paymentProofUploadedAt && (
                  <span className="text-[11px] text-wwi-muted font-normal ml-auto">
                    Uploaded: {formatDateKolkata(selectedInvoiceForVerify.paymentProofUploadedAt, 'dd MMM yyyy, hh:mm a')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-wwi-muted block text-[11px]">UTR / Bank Reference:</span>
                  <span className="font-mono font-bold text-wwi-text text-sm">
                    {selectedInvoiceForVerify.paymentProofReference || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-wwi-muted block text-[11px]">Amount Claimed Paid:</span>
                  <span className="font-mono font-bold text-green-700 text-sm">
                    {formatCurrencyINR(selectedInvoiceForVerify.paymentProofAmount || selectedInvoiceForVerify.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-wwi-muted block text-[11px]">Payment Mode & Date:</span>
                  <span className="text-wwi-text font-medium">
                    {selectedInvoiceForVerify.paymentProofMode || 'Bank Wire'} • {formatDateKolkata(selectedInvoiceForVerify.paymentProofDate, 'dd MMM yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-wwi-muted block text-[11px]">Submitted By:</span>
                  <span className="text-wwi-text truncate block">
                    {selectedInvoiceForVerify.paymentProofUploadedByName || selectedInvoiceForVerify.paymentProofUploadedByEmail || 'Client Lead'}
                  </span>
                </div>
              </div>

              {selectedInvoiceForVerify.paymentProofNotes && (
                <div className="pt-2 border-t border-neutral-100 text-[11px] text-wwi-muted">
                  <span className="font-semibold text-neutral-700">Client Remarks: </span>
                  {selectedInvoiceForVerify.paymentProofNotes}
                </div>
              )}
            </div>

            {/* Screenshot Preview Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-wwi-text flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-neutral-500" />
                  Uploaded Payment Screenshot / Receipt:
                </span>
                {(selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl) && (
                  <a
                    href={selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Full Image
                  </a>
                )}
              </div>

              {selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl ? (
                <div className="p-3 border border-neutral-200 rounded-lg bg-neutral-900/5 flex items-center justify-center max-h-72 overflow-hidden">
                  <img
                    src={selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl}
                    alt="Payment Screenshot"
                    className="max-h-72 object-contain rounded shadow-sm cursor-pointer"
                    onClick={() => {
                      const url = selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl
                      if (url) window.open(url, '_blank')
                    }}
                  />
                </div>
              ) : selectedInvoiceForVerify.paymentProofKey ? (
                <div className="p-4 bg-wwi-surface rounded-lg border border-wwi-border text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neutral-500" />
                    <div>
                      <div className="font-semibold text-wwi-text">
                        {selectedInvoiceForVerify.paymentProofFileName || 'Payment Proof in Cloudflare R2'}
                      </div>
                      <div className="text-[11px] text-wwi-muted">Storage Key: {selectedInvoiceForVerify.paymentProofKey}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const url = await getDownloadPresignedUrl(selectedInvoiceForVerify.paymentProofKey)
                        if (url) window.open(url, '_blank')
                        else showError('Proof object not found in storage.')
                      } catch (err) {
                        showError(err.message)
                      }
                    }}
                  >
                    Download Object
                  </Button>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-wwi-muted border border-dashed rounded-lg">
                  No visual screenshot attached with this submission. Verify transaction via bank statement.
                </div>
              )}
            </div>

            {/* Rejection Form Mode */}
            {rejectingMode ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-red-900 block">
                  Specify Rejection Reason (visible to client):
                </span>
                <input
                  type="text"
                  placeholder="e.g. UTR reference not reflected in HDFC bank statement. Please check."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-white border border-red-300 rounded px-3 py-1.5 text-xs text-wwi-text focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setRejectingMode(false)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    onClick={() => handleRejectProof(selectedInvoiceForVerify)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            ) : (
              /* Modal Footer Action Buttons */
              <div className="pt-3 border-t border-wwi-border flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingMode(true)}
                  className="text-red-600 hover:bg-red-50 border-red-200"
                >
                  Reject Proof
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setVerifyModalOpen(false)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    loading={submitting}
                    onClick={() => handleVerifyAndMarkPaid(selectedInvoiceForVerify)}
                    className="bg-green-700 hover:bg-green-800 text-white font-semibold"
                  >
                    Verify & Record as Paid
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

