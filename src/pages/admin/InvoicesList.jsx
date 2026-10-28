import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, addDoc } from 'firebase/firestore'
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
} from 'lucide-react'

export function InvoicesList() {
  const { user } = useAuth()
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
      const token = await user.getIdToken()
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

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record payment')

      showSuccess(`Payment of ${formatCurrencyINR(paymentForm.amount)} recorded.`)
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

  // Status badge styling
  const getInvoiceStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
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

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
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
        <span className="font-mono font-semibold text-wwi-text">{inv.invoiceNumber}</span>
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
      render: (inv) => getInvoiceStatusBadge(inv.status),
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
          )}
        </div>
      ),
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

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number, client, project..."
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
    </div>
  )
}
