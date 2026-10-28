import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Table } from '../../components/common/Table'
import { formatDateKolkata, formatCurrencyINR } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
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
} from 'lucide-react'

export function ClientDetail() {
  const { clientId } = useParams()
  const { showSuccess, showError } = useToast()

  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [users, setUsers] = useState([])
  const [internalNotes, setInternalNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [loading, setLoading] = useState(true)

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
        subtitle="Users belonging to this organization who can access portal records"
        noPadding
      >
        <Table
          columns={[
            {
              header: 'Name',
              render: (u) => (
                <div className="font-medium text-wwi-text">
                  {u.displayName || u.name || 'User'}
                </div>
              ),
            },
            { header: 'Email', accessor: 'email' },
            {
              header: 'Role',
              render: (u) => <Badge variant="neutral" size="xs">{u.role}</Badge>,
            },
            {
              header: 'Invited Date',
              render: (u) => formatDateKolkata(u.invitedAt || u.createdAt, 'dd MMM yyyy'),
            },
          ]}
          data={users}
          emptyMessage="No client accounts provisioned yet for this organization."
        />
      </Card>

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
