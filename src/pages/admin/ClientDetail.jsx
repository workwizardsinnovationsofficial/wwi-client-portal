import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { Modal } from '../../components/common/Modal'
import { Badge } from '../../components/common/Badge'
import { Table } from '../../components/common/Table'
import { formatDateKolkata, formatCurrencyINR } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  Building2,
  FolderKanban,
  CreditCard,
  Users,
  Lock,
  Save,
  AlertTriangle,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  UserPlus,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  UserX,
  UserCheck,
} from 'lucide-react'

export function ClientDetail() {
  const { clientId } = useParams()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [users, setUsers] = useState([])
  const [internalNotes, setInternalNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [loading, setLoading] = useState(true)

  // Assign Login Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteData, setInviteData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'client',
    password: '',
  })
  const [submittingUser, setSubmittingUser] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  // Reset Password Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState(null)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Visible passwords toggles
  const [visiblePasswords, setVisiblePasswords] = useState({})

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  const handleCopyText = (text, fieldKey) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2000)
  }

  useEffect(() => {
    // 1. Fetch organization
    const fetchOrg = async () => {
      try {
        const orgRef = doc(db, 'organizations', clientId)
        const orgSnap = await getDoc(orgRef)
        if (orgSnap.exists()) {
          const data = orgSnap.data()
          setClient({ id: orgSnap.id, ...data })
          setInternalNotes(data.internalNotes || '')
        }
      } catch (err) {
        showError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()

    // 2. Fetch projects for this organization
    const qProjects = query(collection(db, 'projects'), where('organizationId', '==', clientId))
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    // 3. Fetch invoices for this organization
    const qInvoices = query(collection(db, 'invoices'), where('organizationId', '==', clientId))
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setInvoices(list)
    })

    // 4. Fetch users belonging to this organization
    const qUsers = query(collection(db, 'users'), where('organizationId', '==', clientId))
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setUsers(list)
    })

    return () => {
      unsubProjects()
      unsubInvoices()
      unsubUsers()
    }
  }, [clientId])

  const handleSaveInternalNotes = async () => {
    setSavingNotes(true)
    try {
      await updateDoc(doc(db, 'organizations', clientId), {
        internalNotes,
        updatedAt: new Date().toISOString(),
      })
      showSuccess('Private internal notes saved.')
    } catch (err) {
      showError(err.message || 'Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!client) return
    const newStatus = client.status === 'active' ? 'suspended' : 'active'
    try {
      await updateDoc(doc(db, 'organizations', clientId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      setClient({ ...client, status: newStatus })
      showSuccess(`Organization status updated to ${newStatus}`)
    } catch (err) {
      showError(err.message || 'Failed to update organization status')
    }
  }

  const handleInviteClientUser = async (e) => {
    e.preventDefault()
    setSubmittingUser(true)

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
          organizationId: clientId,
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
          orgName: client.name,
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

    try {
      const userUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      await setDoc(doc(db, 'users', userUid), {
        email: finalEmail,
        username: finalUsername,
        name: inviteData.name,
        displayName: inviteData.name,
        role: inviteData.role || 'client',
        organizationId: clientId,
        organizationName: client.name,
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
        orgName: client.name,
        name: inviteData.name,
        username: finalUsername,
        email: finalEmail,
        password: finalPassword,
      })
      setInviteData({ name: '', username: '', email: '', role: 'client', password: '' })
    } catch (err) {
      showError(err.message || 'Failed to create client user')
    } finally {
      setSubmittingUser(false)
    }
  }

  const handleSaveResetPassword = async (e) => {
    e.preventDefault()
    if (!userToReset || !newPasswordValue.trim()) return
    setSavingPassword(true)

    try {
      const pass = newPasswordValue.trim()
      await updateDoc(doc(db, 'users', userToReset.id), {
        password: pass,
        temporaryPassword: pass,
        updatedAt: new Date().toISOString(),
      })
      showSuccess(`Password updated for ${userToReset.displayName || userToReset.email}`)
      setResetModalOpen(false)
      setUserToReset(null)
      setNewPasswordValue('')
    } catch (err) {
      showError(err.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleToggleUserSuspended = async (targetUser) => {
    const newSuspended = !targetUser.isSuspended
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        isSuspended: newSuspended,
        updatedAt: new Date().toISOString(),
      })
      showSuccess(`User account ${newSuspended ? 'suspended' : 'reactivated'}.`)
    } catch (err) {
      showError(err.message)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-wwi-muted">Loading organization details...</div>
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-xs text-wwi-muted">
        Organization not found. <Link to="/admin/clients" className="underline">Back to list</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={`Identifier: ${client.identifier || 'N/A'} • Registered: ${formatDateKolkata(client.createdAt, 'dd MMM yyyy')}`}
        breadcrumbs={[
          { label: 'Organizations', to: '/admin/clients' },
          { label: client.name },
        ]}
        badge={
          <Badge variant={client.status === 'active' ? 'success' : 'danger'}>
            {client.status?.toUpperCase() || 'ACTIVE'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={UserPlus}
              onClick={() => {
                setInviteModalOpen(true)
                setCreatedCredentials(null)
              }}
            >
              Assign Client Login
            </Button>
            <Button
              variant={client.status === 'active' ? 'dangerOutline' : 'primary'}
              size="sm"
              icon={AlertTriangle}
              onClick={handleToggleStatus}
            >
              {client.status === 'active' ? 'Suspend Organization' : 'Reactivate Organization'}
            </Button>
          </div>
        }
      />

      {/* Org Profile Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Organization Overview" className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-wwi-muted block mb-0.5">Primary Contact:</span>
              <span className="font-semibold text-wwi-text">{client.primaryContact || '—'}</span>
            </div>
            <div>
              <span className="text-wwi-muted block mb-0.5">Official Email:</span>
              <span className="font-medium text-wwi-text">{client.officialEmail || '—'}</span>
            </div>
            <div>
              <span className="text-wwi-muted block mb-0.5">Contact Number:</span>
              <span className="text-wwi-text">{client.phone || '—'}</span>
            </div>
            <div>
              <span className="text-wwi-muted block mb-0.5">GSTIN / Tax ID:</span>
              <span className="font-mono text-wwi-text">{client.gstin || '—'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-wwi-muted block mb-0.5">Billing Address:</span>
              <span className="text-wwi-text">{client.address || '—'}</span>
            </div>
          </div>
        </Card>

        {/* Private Internal Notes (Hidden from clients) */}
        <Card
          title="Private WWI Staff Notes"
          subtitle="Strictly confidential • Not visible to client users"
        >
          <div className="space-y-3">
            <textarea
              rows={4}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Record internal negotiation notes, client preferences, or operational risks..."
              className="w-full bg-neutral-50 border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark focus:bg-white resize-none"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Save}
              loading={savingNotes}
              onClick={handleSaveInternalNotes}
              className="w-full"
            >
              Save Internal Notes
            </Button>
          </div>
        </Card>
      </div>

      {/* Client Users */}
      <Card
        title={`Authorized Client Accounts (${users.length})`}
        subtitle="Credentials assigned to this organization for client portal access"
        action={
          <Button
            variant="outline"
            size="sm"
            icon={UserPlus}
            onClick={() => {
              setInviteModalOpen(true)
              setCreatedCredentials(null)
            }}
          >
            Assign New Login
          </Button>
        }
        noPadding
      >
        <Table
          columns={[
            {
              header: 'Name',
              render: (u) => (
                <div>
                  <div className="font-semibold text-wwi-text">
                    {u.displayName || u.name || 'User'}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400">
                    ID: {u.id?.substring(0, 14)}...
                  </div>
                </div>
              ),
            },
            {
              header: 'Login Username',
              render: (u) => (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-wwi-dark">
                    {u.username || u.email?.split('@')[0] || '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(u.username || u.email?.split('@')[0], `user_${u.id}`)}
                    className="text-neutral-400 hover:text-black p-0.5 rounded cursor-pointer"
                    title="Copy Username"
                  >
                    {copiedField === `user_${u.id}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ),
            },
            {
              header: 'Email Address',
              render: (u) => (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-wwi-text">{u.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(u.email, `email_${u.id}`)}
                    className="text-neutral-400 hover:text-black p-0.5 rounded cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedField === `email_${u.id}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ),
            },
            {
              header: 'Assigned Password',
              render: (u) => {
                const pass = u.password || u.temporaryPassword || '—'
                const isVisible = visiblePasswords[u.id]
                return (
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200 font-semibold text-wwi-text">
                      {isVisible ? pass : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(u.id)}
                      className="text-neutral-500 hover:text-black cursor-pointer p-0.5"
                      title={isVisible ? 'Hide password' : 'Show password'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {pass !== '—' && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(pass, `pass_${u.id}`)}
                        className="text-neutral-500 hover:text-black cursor-pointer p-0.5"
                        title="Copy password"
                      >
                        {copiedField === `pass_${u.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                )
              },
            },
            {
              header: 'Status',
              render: (u) => (
                <Badge variant={u.isSuspended ? 'danger' : 'success'} size="xs">
                  {u.isSuspended ? 'Suspended' : 'Active'}
                </Badge>
              ),
            },
            {
              header: 'Actions',
              cellClassName: 'text-right',
              render: (u) => (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Key}
                    onClick={() => {
                      setUserToReset(u)
                      setNewPasswordValue(u.password || u.temporaryPassword || '')
                      setResetModalOpen(true)
                    }}
                  >
                    Change Pass
                  </Button>
                  <Button
                    variant={u.isSuspended ? 'outline' : 'ghost'}
                    size="sm"
                    icon={u.isSuspended ? UserCheck : UserX}
                    onClick={() => handleToggleUserSuspended(u)}
                  >
                    {u.isSuspended ? 'Activate' : 'Suspend'}
                  </Button>
                </div>
              ),
            },
          ]}
          data={users}
          emptyMessage="No client accounts provisioned yet for this organization."
        />
      </Card>

      {/* Assign Client Login Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false)
          setCreatedCredentials(null)
        }}
        title={`Assign Client Login: ${client?.name}`}
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
                      onClick={() => handleCopyText(createdCredentials.username, 'modal_user')}
                      className="text-neutral-500 hover:text-black p-0.5 rounded cursor-pointer"
                      title="Copy Username"
                    >
                      {copiedField === 'modal_user' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                  <span className="text-wwi-muted font-sans text-xs">Email Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-wwi-text">{createdCredentials.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(createdCredentials.email, 'modal_email')}
                      className="text-neutral-500 hover:text-black p-0.5 rounded cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedField === 'modal_email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-wwi-muted font-sans text-xs">Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{createdCredentials.password}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(createdCredentials.password, 'modal_pass')}
                      className="text-neutral-500 hover:text-black p-0.5 rounded cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedField === 'modal_pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={copiedField === 'all_detail' ? Check : Copy}
                onClick={() => {
                  const text = `WWI Client Portal Access:\nLogin URL: ${window.location.origin}/login\nUsername: ${createdCredentials.username}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                  handleCopyText(text, 'all_detail')
                }}
              >
                {copiedField === 'all_detail' ? 'All Credentials Copied' : 'Copy All Details'}
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
          <form onSubmit={handleInviteClientUser} className="space-y-4">
            <Input
              label="Client Full Name"
              required
              placeholder="e.g. Rajesh Kumar"
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
                placeholder="e.g. rajesh"
                helperText="Client can use this to sign in"
                value={inviteData.username}
                onChange={(e) => setInviteData({ ...inviteData, username: e.target.value })}
              />

              <Input
                label="Official Email Address"
                type="email"
                required
                placeholder="rajesh@company.com"
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
              <Button type="submit" variant="primary" loading={submittingUser}>
                Save & Assign Login
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Change / Reset Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => {
          setResetModalOpen(false)
          setUserToReset(null)
          setNewPasswordValue('')
        }}
        title={`Change Password for ${userToReset?.displayName || userToReset?.email}`}
        description="Set a new password for this client account. They can use it immediately."
      >
        <form onSubmit={handleSaveResetPassword} className="space-y-4">
          <Input
            label="User Email"
            disabled
            value={userToReset?.email || ''}
          />

          <Input
            label="New Password"
            required
            placeholder="Enter new password"
            value={newPasswordValue}
            onChange={(e) => setNewPasswordValue(e.target.value)}
          />

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setResetModalOpen(false)
                setUserToReset(null)
                setNewPasswordValue('')
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assigned Projects */}
      <Card
        title={`Assigned Projects (${projects.length})`}
        subtitle="Active, planning, and completed engagements for this client"
        noPadding
      >
        <Table
          columns={[
            {
              header: 'Project Code',
              render: (p) => (
                <Link to={`/admin/projects/${p.id}`} className="font-mono text-wwi-dark font-medium hover:underline">
                  {p.code || 'PRJ'}
                </Link>
              ),
            },
            {
              header: 'Project Name',
              render: (p) => (
                <Link to={`/admin/projects/${p.id}`} className="font-medium text-wwi-text hover:underline">
                  {p.name}
                </Link>
              ),
            },
            {
              header: 'Status',
              render: (p) => (
                <Badge variant={p.status === 'completed' ? 'success' : 'neutral'} size="xs">
                  {p.status}
                </Badge>
              ),
            },
            {
              header: 'Progress',
              render: (p) => `${p.completionPercentage || 0}%`,
            },
            {
              header: 'Target Date',
              render: (p) => p.targetCompletionDate || '—',
            },
          ]}
          data={projects}
          emptyMessage="No projects currently assigned to this organization."
        />
      </Card>
    </div>
  )
}
