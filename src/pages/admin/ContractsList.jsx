import React, { useState, useEffect } from 'react'
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
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { FileText, Plus, Search, ExternalLink } from 'lucide-react'

export function ContractsList() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [contracts, setContracts] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    contractNumber: `WWI-CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    title: '',
    organizationId: '',
    contractValue: '',
    startDate: '',
    endDate: '',
    status: 'active',
    scopeDescription: '',
  })

  useEffect(() => {
    // 1. Fetch contracts
    const unsubContracts = onSnapshot(collection(db, 'contracts'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      setContracts(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    // 2. Fetch orgs
    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setOrganizations(list)
    })

    return () => {
      unsubContracts()
      unsubOrgs()
    }
  }, [])

  const handleCreateContract = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const org = organizations.find((o) => o.id === formData.organizationId)

      await addDoc(collection(db, 'contracts'), {
        contractNumber: formData.contractNumber,
        title: formData.title,
        organizationId: formData.organizationId,
        organizationName: org?.name || 'Client Org',
        contractValue: Number(formData.contractValue) || 0,
        currency: 'INR',
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        scopeDescription: formData.scopeDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Contract ${formData.contractNumber} recorded.`)
      setModalOpen(false)
      setFormData({
        contractNumber: `WWI-CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        title: '',
        organizationId: '',
        contractValue: '',
        startDate: '',
        endDate: '',
        status: 'active',
        scopeDescription: '',
      })
    } catch (err) {
      showError(err.message || 'Failed to record contract')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      header: 'Contract Reference & Title',
      render: (c) => (
        <div>
          <div className="font-semibold text-wwi-text">{c.title}</div>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{c.contractNumber}</div>
        </div>
      ),
    },
    {
      header: 'Client Organization',
      render: (c) => <span className="font-medium text-wwi-text">{c.organizationName}</span>,
    },
    {
      header: 'Contract Value (INR)',
      render: (c) => (
        <span className="font-mono font-medium text-wwi-text">
          {formatCurrencyINR(c.contractValue)}
        </span>
      ),
    },
    {
      header: 'Term Duration',
      render: (c) => (
        <div className="text-xs text-wwi-muted">
          <span>{formatDateKolkata(c.startDate, 'dd MMM yyyy')}</span>
          <span className="mx-1.5">to</span>
          <span>{formatDateKolkata(c.endDate, 'dd MMM yyyy')}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (c) => (
        <Badge variant={c.status === 'active' ? 'success' : 'neutral'} size="xs">
          {c.status?.toUpperCase() || 'ACTIVE'}
        </Badge>
      ),
    },
  ]

  const filteredContracts = contracts.filter((c) => {
    return (
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts & Master Agreements"
        description="Master Service Agreements (MSA), Statements of Work (SOW), and contractual schedules."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setModalOpen(true)}
          >
            New Contract
          </Button>
        }
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border">
          <div className="relative w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, number, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded pl-8 pr-3 py-1.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredContracts}
            emptyMessage="No contracts recorded."
          />
        )}
      </Card>

      {/* Contract Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record New Contract / SOW"
        description="Registers an official legal engagement between WWI and client entity."
      >
        <form onSubmit={handleCreateContract} className="space-y-4">
          <Input
            label="Contract Title"
            required
            placeholder="e.g. Master Services Agreement — Cloud ERP Modernization"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contract Reference #"
              required
              value={formData.contractNumber}
              onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
            />

            <Select
              label="Client Organization"
              required
              value={formData.organizationId}
              onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contract Value (INR)"
              type="number"
              required
              placeholder="e.g. 1500000"
              value={formData.contractValue}
              onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
            />

            <Select
              label="Contract Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft / Under Negotiation' },
                { value: 'completed', label: 'Completed' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Effective Start Date"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="Target End Date"
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-wwi-text block mb-1">Contract Scope & Terms Summary</label>
            <textarea
              rows={3}
              placeholder="Outline deliverables, SLAs, payment schedule..."
              value={formData.scopeDescription}
              onChange={(e) => setFormData({ ...formData, scopeDescription: e.target.value })}
              className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save Contract
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
