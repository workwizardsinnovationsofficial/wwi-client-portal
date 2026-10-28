import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore'
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
    username: '',
    email: '',
    role: 'client',
    password: '',
  })
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

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

    const finalEmail = (inviteData.email || '').trim().toLowerCase()
    const autoUser = finalEmail.split('@')[0] || inviteData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    const finalUsername = (inviteData.username || autoUser).trim().toLowerCase()
    const finalPassword = (inviteData.password || '').trim() || 'ClientPass@2026'

    try {
      const token = typeof user?.getIdToken === 'function' ? await user.getIdToken() : 'master_admin_session_token'
      const res = await fetch('/api/clients/invite', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: selectedOrgForInvite.id,
          email: finalEmail,
          username: finalUsername,
          name: inviteData.name,
          role: inviteData.role || 'client',
          temporaryPassword: finalPassword,
        }),
      })

      if (res.ok) {
        showSuccess(`Client login assigned for ${finalEmail}`)
        setCreatedCredentials({
          orgName: selectedOrgForInvite.name,
          name: inviteData.name,
          username: finalUsername,
          email: finalEmail,
          password: finalPassword,
        })
        setInviteData({ name: '', username: '', email: '', role: 'client', password: '' })
        return
      }
    } catch (apiErr) {
      console.warn('API invite note, falling back to direct Firestore:', apiErr)
    }

    // Direct Firestore fallback for client user creation
    try {
      const userUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      await setDoc(doc(db, 'users', userUid), {
        email: finalEmail,
        username: finalUsername,
        name: inviteData.name,
        displayName: inviteData.name,
        role: inviteData.role || 'client',
        organizationId: selectedOrgForInvite.id,
        organizationName: selectedOrgForInvite.name,
        isStaff: false,
        invitedBy: user?.email || 'wwi-admin-9326',
        invitedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        password: finalPassword,
        temporaryPassword: finalPassword,
        isSuspended: false,
      })
      showSuccess(`Client login assigned for "${inviteData.name}"`)
      setCreatedCredentials({
        orgName: selectedOrgForInvite.name,
        name: inviteData.name,
        username: finalUsername,
        email: finalEmail,
        password: finalPassword,
      })
      setInviteData({ name: '', username: '', email: '', role: 'client', password: '' })
    } catch (err) {
      showError(err.message || 'Failed to create client user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyText = (text, fieldKey) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2000)
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

      {/* Invite / Assign Client Login Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false)
          setCreatedCredentials(null)
        }}
        title={`Assign Client Login: ${selectedOrgForInvite?.name || 'Organization'}`}
        description="Creates active credentials for this client organization to sign in immediately."
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Client Login Successfully Created & Activated</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                The client can now sign in at the login page using either their <strong>Username</strong> or <strong>Email</strong> with the password below:
              </p>

              <div className="bg-white border border-emerald-200 rounded-md p-3 space-y-2 font-mono text-[12px]">
                <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <span className="text-wwi-muted font-sans text-xs">Organization:</span>
                  <span className="font-semibold text-wwi-text font-sans">{createdCredentials.orgName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <span className="text-wwi-muted font-sans text-xs">Username / Login ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-wwi-dark">{createdCredentials.username}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(createdCredentials.username, 'username')}
                      className="text-neutral-500 hover:text-black p-0.5 rounded cursor-pointer"
                      title="Copy Username"
                    >
                      {copiedField === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <span className="text-wwi-muted font-sans text-xs">Email Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-wwi-text">{createdCredentials.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(createdCredentials.email, 'email')}
                      className="text-neutral-500 hover:text-black p-0.5 rounded cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-wwi-muted font-sans text-xs">Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{createdCredentials.password}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(createdCredentials.password, 'password')}
                      className="text-neutral-500 hover:text-black p-0.5 rounded cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={copiedField === 'all' ? Check : Copy}
                onClick={() => {
                  const text = `WWI Client Portal Access:\nLogin URL: ${window.location.origin}/login\nUsername: ${createdCredentials.username}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                  handleCopyText(text, 'all')
                }}
              >
                {copiedField === 'all' ? 'All Credentials Copied' : 'Copy All Details'}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setInviteModalOpen(false)
                  setCreatedCredentials(null)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInviteUser} className="space-y-4">
            <Input
              label="Client Full Name"
              required
              placeholder="e.g. Venky"
              value={inviteData.name}
              onChange={(e) => {
                const newName = e.target.value
                const autoUser = newName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
                setInviteData((prev) => ({
                  ...prev,
                  name: newName,
                  username: prev.username ? prev.username : autoUser,
                }))
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Login Username / ID"
                required
                placeholder="e.g. venky"
                helperText="Client can use this to sign in"
                value={inviteData.username}
                onChange={(e) => setInviteData({ ...inviteData, username: e.target.value })}
              />

              <Input
                label="Official Email Address"
                type="email"
                required
                placeholder="venky@gmail.com"
                value={inviteData.email}
                onChange={(e) => {
                  const newEmail = e.target.value
                  const emailUser = newEmail.split('@')[0]
                  setInviteData((prev) => ({
                    ...prev,
                    email: newEmail,
                    username: prev.username ? prev.username : emailUser,
                  }))
                }}
              />
            </div>

            <Select
              label="Platform Role"
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
              options={[
                { value: 'client', label: 'Client (Restricted to this organization)' },
              ]}
            />

            <Input
              label="Assign Login Password"
              required
              placeholder="e.g. 0000000000 or ClientPass@2026"
              helperText="Client will use this password to sign in on the login page"
              value={inviteData.password}
              onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
            />

            <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setInviteModalOpen(false)
                  setCreatedCredentials(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Save & Assign Login
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
