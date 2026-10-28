import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore'
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
  CalendarDays,
  CheckCircle2,
  Clock,
  Video,
  Plus,
  Search,
  ExternalLink,
  XCircle,
} from 'lucide-react'

export function MeetingsList() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [meetings, setMeetings] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Confirm Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [meetingUrl, setMeetingUrl] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    // 1. Fetch meetings
    const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.requestedDate || '').localeCompare(a.requestedDate || ''))
      setMeetings(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    // 2. Fetch Organizations & Projects
    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setOrganizations(list)
    })

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    return () => {
      unsubMeetings()
      unsubOrgs()
      unsubProjects()
    }
  }, [])

  const handleConfirmMeeting = async (e) => {
    e.preventDefault()
    if (!selectedMeeting) return
    setConfirming(true)

    try {
      await updateDoc(doc(db, 'meetings', selectedMeeting.id), {
        status: 'confirmed',
        meetingUrl,
        confirmedBy: user?.email,
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      showSuccess(`Meeting confirmed. Link delivered to client portal.`)
      setConfirmModalOpen(false)
      setSelectedMeeting(null)
      setMeetingUrl('')
    } catch (err) {
      showError(err.message || 'Failed to confirm meeting')
    } finally {
      setConfirming(false)
    }
  }

  const handleUpdateStatus = async (meetingId, newStatus) => {
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      showSuccess(`Meeting marked as ${newStatus}`)
    } catch (err) {
      showError(err.message)
    }
  }

  const columns = [
    {
      header: 'Purpose & Agenda',
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
      header: 'Client & Project',
      render: (m) => (
        <div>
          <div className="font-medium text-wwi-text">{m.organizationName || 'Client Org'}</div>
          <div className="text-[11px] text-wwi-muted">{m.projectName || 'General Review'}</div>
        </div>
      ),
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
            Duration: {m.durationMinutes || 30} mins • Mode: {m.mode || 'Google Meet'}
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
        if (m.status === 'cancelled') variant = 'danger'
        return <Badge variant={variant} size="xs">{m.status}</Badge>
      },
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5">
          {m.status === 'requested' && (
            <Button
              variant="primary"
              size="sm"
              icon={Video}
              onClick={() => {
                setSelectedMeeting(m)
                setMeetingUrl(m.meetingUrl || 'https://meet.google.com/wwi-')
                setConfirmModalOpen(true)
              }}
            >
              Confirm Call
            </Button>
          )}

          {m.status === 'confirmed' && (
            <>
              {m.meetingUrl && (
                <a href={m.meetingUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" icon={ExternalLink}>
                    Join
                  </Button>
                </a>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUpdateStatus(m.id, 'completed')}
              >
                Complete
              </Button>
            </>
          )}

          {m.status !== 'cancelled' && m.status !== 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateStatus(m.id, 'cancelled')}
              title="Cancel Meeting"
            >
              <XCircle className="w-3.5 h-3.5 text-neutral-400 hover:text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings & Consultation Calls"
        description="Schedule and confirm client architecture syncs, sprint reviews, and technical checkpoints in Asia/Kolkata timezone."
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

      {/* Confirm Meeting Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Client Consultation Slot"
        description="Assign a Google Meet, Zoom, or conference URL for this session."
      >
        <form onSubmit={handleConfirmMeeting} className="space-y-4">
          <div className="p-3 bg-wwi-surface rounded border border-wwi-border text-xs space-y-1">
            <div className="font-semibold text-wwi-text">{selectedMeeting?.title || selectedMeeting?.purpose}</div>
            <div className="text-wwi-muted">Client: {selectedMeeting?.organizationName}</div>
            <div className="text-wwi-muted">
              Requested Time: <span className="font-medium text-wwi-text">{formatDateKolkata(selectedMeeting?.requestedDate)}</span>
            </div>
          </div>

          <Input
            label="Video Conference URL (Google Meet / Zoom)"
            required
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
          />

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={confirming}>
              Confirm & Issue Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
