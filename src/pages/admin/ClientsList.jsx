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
import { formatDateKolkata } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  Building2,
  Plus,
  UserPlus,
  Search,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react'

export function ClientsList() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedOrgForInvite, setSelectedOrgForInvite] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Create Org Form State
  const [newOrg, setNewOrg] = useState({
    name: '',
    identifier: '',
    primaryContact: '',
    officialEmail: '',
    phone: '',
    address: '',
    gstin: '',
  })

  // Invite User Form State
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    role: 'client',
    temporaryPassword: '',
  })
  const [generatedInviteLink, setGeneratedInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'organizations'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setClients(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.officialEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.primaryContact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.identifier?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreateOrganization = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const code = newOrg.identifier || `WWI-ORG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      await addDoc(collection(db, 'organizations'), {
        ...newOrg,
        identifier: code,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email,
      })
      showSuccess(`Client organization "${newOrg.name}" created successfully.`)
      setCreateModalOpen(false)
      setNewOrg({
        name: '',
        identifier: '',
        primaryContact: '',
        officialEmail: '',
        phone: '',
        address: '',
        gstin: '',
      })
    } catch (err) {
      showError(err.message || 'Failed to create organization')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    if (!selectedOrgForInvite) return
    setSubmitting(true)
    setGeneratedInviteLink('')

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/clients/invite', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: selectedOrgForInvite.id,
          email: inviteData.email,
          name: inviteData.name,
          role: inviteData.role,
          temporaryPassword: inviteData.temporaryPassword || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite client user')

      showSuccess(`Invitation generated for ${inviteData.email}`)
      if (data.inviteLink) {
        setGeneratedInviteLink(data.inviteLink)
      } else {
        setInviteModalOpen(false)
      }
    } catch (err) {
      showError(err.message || 'Invitation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = () => {
    if (generatedInviteLink) {
      navigator.clipboard.writeText(generatedInviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const columns = [
    {
      header: 'Organization',
      render: (row) => (
        <div>
          <Link
            to={`/admin/clients/${row.id}`}
            className="font-semibold text-wwi-text hover:underline flex items-center gap-1.5"
          >
            {row.name}
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{row.identifier}</div>
        </div>
      ),
    },
    {
      header: 'Primary Contact',
      render: (row) => (
        <div>
          <div className="font-medium text-wwi-text">{row.primaryContact || '—'}</div>
          <div className="text-[11px] text-wwi-muted">{row.officialEmail}</div>
        </div>
      ),
    },
    {
      header: 'Phone',
      accessor: 'phone',
      render: (row) => <span className="text-wwi-muted">{row.phone || '—'}</span>,
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'} size="xs">
          {row.status || 'active'}
        </Badge>
      ),
    },
    {
      header: 'Created Date',
      render: (row) => (
        <span className="text-wwi-muted">{formatDateKolkata(row.createdAt, 'dd MMM yyyy')}</span>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            icon={UserPlus}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedOrgForInvite(row)
              setInviteModalOpen(true)
              setGeneratedInviteLink('')
            }}
          >
            Invite User
          </Button>
          <Link to={`/admin/clients/${row.id}`}>
            <Button variant="secondary" size="sm">
              Details
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Organizations"
        description="Directory of enterprise clients, assigned projects, authorized contacts, and access permissions."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            New Organization
          </Button>
        }
      />

      {/* Filters and Search Bar */}
      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded pl-8 pr-3 py-1.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-wwi-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-wwi-border rounded px-2.5 py-1 text-xs text-wwi-text focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredClients}
            emptyMessage="No matching client organizations found."
          />
        )}
      </Card>

      {/* Create Organization Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Client Organization"
        description="Register a new enterprise client entity. You can assign projects and invite users after creation."
      >
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <Input
            label="Organization Legal Name"
            required
            placeholder="e.g. Apex Enterprise Solutions Pvt Ltd"
            value={newOrg.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Organization Identifier"
              placeholder="e.g. WWI-ORG-APEX"
              helperText="Leave empty to auto-generate"
              value={newOrg.identifier}
              onChange={(e) => setNewOrg({ ...newOrg, identifier: e.target.value })}
            />
            <Input
              label="GSTIN / Tax ID"
              placeholder="e.g. 29AABCW9876Q1Z5"
              value={newOrg.gstin}
              onChange={(e) => setNewOrg({ ...newOrg, gstin: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Primary Contact Person"
              required
              placeholder="e.g. Rajesh Sharma"
              value={newOrg.primaryContact}
              onChange={(e) => setNewOrg({ ...newOrg, primaryContact: e.target.value })}
            />
            <Input
              label="Official Contact Email"
              type="email"
              required
              placeholder="contact@company.com"
              value={newOrg.officialEmail}
              onChange={(e) => setNewOrg({ ...newOrg, officialEmail: e.target.value })}
            />
          </div>

          <Input
            label="Contact Number"
            placeholder="+91 98450 12345"
            value={newOrg.phone}
            onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
          />

          <Input
            label="Registered Business Address"
            placeholder="Floor, Building, City, State, PIN"
            value={newOrg.address}
            onChange={(e) => setNewOrg({ ...newOrg, address: e.target.value })}
          />

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Organization
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Client User Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={`Invite User to ${selectedOrgForInvite?.name || 'Organization'}`}
        description="Creates an authorized account bound strictly to this organization's projects and records."
      >
        {generatedInviteLink ? (
          <div className="space-y-4">
            <div className="p-3 bg-neutral-50 border border-wwi-border rounded text-xs space-y-2">
              <div className="font-semibold text-wwi-text">Temporary Account Setup Link</div>
              <p className="text-wwi-muted">
                Since live email dispatch (RESEND_API_KEY) is optional, copy this password setup link directly to send to the client:
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedInviteLink}
                  className="w-full bg-white border border-wwi-border rounded px-2.5 py-1.5 text-[11px] font-mono text-neutral-600 select-all"
                />
                <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={handleCopyLink}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setInviteModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInviteUser} className="space-y-4">
            <Input
              label="User Full Name"
              required
              placeholder="e.g. Ananya Sen"
              value={inviteData.name}
              onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
            />

            <Input
              label="Official Email Address"
              type="email"
              required
              placeholder="ananya@company.com"
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            />

            <Select
              label="Platform Role"
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
              options={[
                { value: 'client', label: 'Client (Restricted to this organization)' },
              ]}
            />

            <Input
              label="Temporary Password (Optional)"
              type="password"
              placeholder="Leave empty for auto-generated password reset link"
              value={inviteData.temporaryPassword}
              onChange={(e) => setInviteData({ ...inviteData, temporaryPassword: e.target.value })}
            />

            <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Generate Invitation
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
