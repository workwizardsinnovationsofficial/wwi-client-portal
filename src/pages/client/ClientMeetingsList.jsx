import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore'
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
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  CalendarDays,
  Plus,
  Video,
  ExternalLink,
  Clock,
  CheckCircle2,
} from 'lucide-react'

export function ClientMeetingsList() {
  const { organization, organizationId, user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()

  const [meetings, setMeetings] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Request Meeting Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    agenda: '',
    projectId: '',
    requestedDate: '',
    durationMinutes: 30,
    mode: 'google_meet',
  })

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    // 1. Fetch meetings for this client org
    const qMeetings = query(
      collection(db, 'meetings'),
      where('organizationId', '==', organizationId)
    )
    const unsubMeetings = onSnapshot(qMeetings, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.requestedDate || '').localeCompare(a.requestedDate || ''))
      setMeetings(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    // 2. Fetch projects for dropdown
    const qProjects = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId)
    )
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    return () => {
      unsubMeetings()
      unsubProjects()
    }
  }, [organizationId])

  const handleRequestMeeting = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const selectedPrj = projects.find((p) => p.id === formData.projectId)

      await addDoc(collection(db, 'meetings'), {
        title: formData.title || formData.purpose,
        purpose: formData.purpose,
        agenda: formData.agenda,
        projectId: formData.projectId || null,
        projectName: selectedPrj?.name || null,
        organizationId,
        organizationName: organization?.name || 'Client Org',
        requestedBy: user.uid,
        requestedByEmail: user.email,
        requestedByName: userProfile?.name || user.email.split('@')[0],
        requestedDate: formData.requestedDate,
        durationMinutes: Number(formData.durationMinutes) || 30,
        mode: formData.mode,
        status: 'requested',
        meetingUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess('Consultation request submitted. WWI team will confirm the slot and provide call link.')
      setRequestModalOpen(false)
      setFormData({
        title: '',
        purpose: '',
        agenda: '',
        projectId: '',
        requestedDate: '',
        durationMinutes: 30,
        mode: 'google_meet',
      })
    } catch (err) {
      showError(err.message || 'Failed to submit meeting request')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      header: 'Meeting Purpose & Agenda',
      render: (m) => (
        <div>
          <div className="font-semibold text-wwi-text">{m.title || m.purpose}</div>
          {m.agenda && (
            <p className="text-[11px] text-wwi-muted mt-0.5 line-clamp-1">{m.agenda}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Associated Project',
      render: (m) => <span className="text-wwi-text">{m.projectName || 'General Review'}</span>,
    },
    {
      header: 'Requested Date & Time',
      render: (m) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-medium text-wwi-text">
            <Clock className="w-3 h-3 text-neutral-400" />
            <span>{formatDateKolkata(m.requestedDate)}</span>
          </div>
          <div className="text-[11px] text-wwi-muted mt-0.5">
            Duration: {m.durationMinutes || 30} mins
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (m) => {
        let variant = 'neutral'
        if (m.status === 'confirmed') variant = 'success'
        if (m.status === 'requested') variant = 'warning'
        return <Badge variant={variant} size="xs">{m.status}</Badge>
      },
    },
    {
      header: 'Conference Link',
      cellClassName: 'text-right',
      render: (m) => (
        <div>
          {m.status === 'confirmed' && m.meetingUrl ? (
            <a href={m.meetingUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm" icon={ExternalLink}>
                Join Call
              </Button>
            </a>
          ) : (
            <span className="text-xs text-wwi-muted italic">Awaiting confirmation</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation & Meeting Requests"
        description="Schedule architecture review sessions, sprint checkpoints, and technical discussions with WWI specialists."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setRequestModalOpen(true)}
          >
            Request Meeting
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
            data={meetings}
            emptyMessage="No consultation meetings scheduled."
          />
        )}
      </Card>

      {/* Request Meeting Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request Consultation Meeting"
        description="Pick a preferred date and time in Asia/Kolkata timezone. WWI staff will confirm and provide meeting room link."
      >
        <form onSubmit={handleRequestMeeting} className="space-y-4">
          <Input
            label="Meeting Purpose / Topic"
            required
            placeholder="e.g. Sprint 3 Demo & Microservices Review"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          />

          <Select
            label="Related Project"
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            options={[
              { value: '', label: 'General / Non-Project Specific' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Requested Date & Time (Asia/Kolkata)"
              type="datetime-local"
              required
              value={formData.requestedDate}
              onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
            />

            <Select
              label="Preferred Duration"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
              options={[
                { value: 30, label: '30 Minutes' },
                { value: 45, label: '45 Minutes' },
                { value: 60, label: '60 Minutes (Full Architecture Sync)' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-wwi-text block mb-1">Agenda & Discussion Topics</label>
            <textarea
              rows={3}
              placeholder="Outline specific technical questions or items you wish to discuss..."
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
