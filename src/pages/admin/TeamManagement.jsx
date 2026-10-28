import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc } from 'firebase/firestore'
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
import { Users, Plus, Shield, ShieldCheck, UserX, UserCheck } from 'lucide-react'

export function TeamManagement() {
  const { user, isSuperAdmin } = useAuth()
  const { showSuccess, showError } = useToast()

  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Add Member Modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'team_member',
    title: 'Software Engineer',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Query users that have staff roles
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['super_admin', 'admin', 'team_member'])
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setTeamMembers(list)
      setLoading(false)
    }, (err) => {
      console.warn('Team query notice:', err.message)
      // Fallback: load users collection and filter client-side
      const unsubFallback = onSnapshot(collection(db, 'users'), (snap2) => {
        const list2 = []
        snap2.forEach((d) => {
          const u = d.data()
          if (['super_admin', 'admin', 'team_member'].includes(u.role)) {
            list2.push({ id: d.id, ...u })
          }
        })
        setTeamMembers(list2)
        setLoading(false)
      })
      return () => unsubFallback()
    })

    return () => unsub()
  }, [])

  const handleAddTeamMember = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Add or invite staff user document
      await addDoc(collection(db, 'users'), {
        name: newMember.name,
        displayName: newMember.name,
        email: newMember.email,
        role: newMember.role,
        title: newMember.title,
        isStaff: true,
        organizationId: null,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Staff profile created for ${newMember.email}`)
      setAddModalOpen(false)
      setNewMember({ name: '', email: '', role: 'team_member', title: 'Software Engineer' })
    } catch (err) {
      showError(err.message || 'Failed to add team member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleSuspend = async (member) => {
    const newSuspended = !member.isSuspended
    try {
      await updateDoc(doc(db, 'users', member.id), {
        isSuspended: newSuspended,
        updatedAt: new Date().toISOString(),
      })
      showSuccess(`User access ${newSuspended ? 'suspended' : 'restored'}.`)
    } catch (err) {
      showError(err.message)
    }
  }

  const columns = [
    {
      header: 'Staff Member',
      render: (m) => (
        <div>
          <div className="font-semibold text-wwi-text">{m.displayName || m.name || m.email}</div>
          <div className="text-[11px] text-wwi-muted">{m.email}</div>
        </div>
      ),
    },
    {
      header: 'Title / Specialization',
      render: (m) => <span className="text-wwi-text">{m.title || 'Technical Specialist'}</span>,
    },
    {
      header: 'Role',
      render: (m) => {
        let variant = 'neutral'
        if (m.role === 'super_admin') variant = 'dark'
        if (m.role === 'admin') variant = 'info'
        return <Badge variant={variant} size="xs">{m.role?.replace('_', ' ').toUpperCase()}</Badge>
      },
    },
    {
      header: 'Status',
      render: (m) => (
        <Badge variant={m.isSuspended ? 'danger' : 'success'} size="xs">
          {m.isSuspended ? 'Suspended' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5">
          {isSuperAdmin && m.id !== user.uid && (
            <Button
              variant={m.isSuspended ? 'outline' : 'ghost'}
              size="sm"
              icon={m.isSuspended ? UserCheck : UserX}
              onClick={() => handleToggleSuspend(m)}
            >
              {m.isSuspended ? 'Reactivate' : 'Suspend'}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Team Management"
        description="Configure Work Wizards Innovations engineering leads, architects, and administrators."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setAddModalOpen(true)}
          >
            Add Team Member
          </Button>
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={teamMembers}
            emptyMessage="No internal staff members configured."
          />
        )}
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register Internal Staff Member"
        description="Grants internal access to WWI operations, project pipelines, and deliverables."
      >
        <form onSubmit={handleAddTeamMember} className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Priya Nair"
            value={newMember.name}
            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
          />

          <Input
            label="WWI Official Email"
            type="email"
            required
            placeholder="priya@workwizards.in"
            value={newMember.email}
            onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="System Role"
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              options={[
                { value: 'team_member', label: 'Team Member (Assigned Projects)' },
                { value: 'admin', label: 'Administrator (Operations)' },
                ...(isSuperAdmin ? [{ value: 'super_admin', label: 'Super Admin (Full Access)' }] : []),
              ]}
            />

            <Input
              label="Job Title"
              placeholder="e.g. Solutions Architect"
              value={newMember.title}
              onChange={(e) => setNewMember({ ...newMember, title: e.target.value })}
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Register Staff Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
