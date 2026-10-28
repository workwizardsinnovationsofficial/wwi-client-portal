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
import { Send, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export function ClientSubmissionsList() {
  const { user, userProfile, organization, organizationId } = useAuth()
  const { showSuccess, showError } = useToast()

  const [submissions, setSubmissions] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    submissionType: 'requirements',
    description: '',
    projectId: '',
  })

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    const qSub = query(
      collection(db, 'submissions'),
      where('organizationId', '==', organizationId)
    )
    const unsubSub = onSnapshot(qSub, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setSubmissions(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    const qPrj = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId)
    )
    const unsubPrj = onSnapshot(qPrj, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    return () => {
      unsubSub()
      unsubPrj()
    }
  }, [organizationId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const selectedPrj = projects.find((p) => p.id === formData.projectId)
      const subNum = `SUB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      await addDoc(collection(db, 'submissions'), {
        submissionNumber: subNum,
        title: formData.title,
        submissionType: formData.submissionType,
        description: formData.description,
        projectId: formData.projectId || null,
        projectName: selectedPrj?.name || null,
        organizationId,
        organizationName: organization?.name || 'Client Org',
        status: 'submitted',
        submittedBy: user.uid,
        submitterName: userProfile?.name || user.email.split('@')[0],
        submitterEmail: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Submission ${subNum} recorded and queued for WWI review.`)
      setModalOpen(false)
      setFormData({
        title: '',
        submissionType: 'requirements',
        description: '',
        projectId: '',
      })
    } catch (err) {
      showError(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>
      case 'changes_requested':
        return <Badge variant="warning">Changes Requested</Badge>
      case 'under_review':
        return <Badge variant="info">Under Review</Badge>
      default:
        return <Badge variant="neutral">Submitted</Badge>
    }
  }

  const columns = [
    {
      header: 'Submission # & Title',
      render: (s) => (
        <div>
          <div className="font-semibold text-wwi-text">{s.title}</div>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{s.submissionNumber || 'SUB'}</div>
        </div>
      ),
    },
    {
      header: 'Category / Type',
      render: (s) => (
        <Badge variant="neutral" size="xs">
          {s.submissionType?.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Associated Project',
      render: (s) => <span className="text-wwi-text">{s.projectName || 'General / Non-Project'}</span>,
    },
    {
      header: 'Status',
      render: (s) => getStatusBadge(s.status),
    },
    {
      header: 'Reviewer Feedback',
      render: (s) => (
        <span className="text-xs text-wwi-muted max-w-xs truncate block">
          {s.reviewerNotes || 'Awaiting review by WWI staff'}
        </span>
      ),
    },
    {
      header: 'Date Submitted',
      render: (s) => (
        <span className="text-wwi-muted text-xs">{formatDateKolkata(s.createdAt, 'dd MMM yyyy')}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions & Milestone Sign-Offs"
        description="Formal pipeline for submitting new technical requirements, change requests, feedback, and UAT sign-offs."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setModalOpen(true)}
          >
            New Submission
          </Button>
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={submissions}
            emptyMessage="No formal submissions recorded yet."
          />
        )}
      </Card>

      {/* Submission Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Requirements or Acceptance"
        description="Recorded formally and assigned to the project lead for review and sign-off."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Submission Title"
            required
            placeholder="e.g. UAT Sign-Off for Milestone 2 Procurement Module"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Submission Type"
              value={formData.submissionType}
              onChange={(e) => setFormData({ ...formData, submissionType: e.target.value })}
              options={[
                { value: 'requirements', label: 'Technical Requirements Document' },
                { value: 'change_request', label: 'Scope Change Request' },
                { value: 'uat_results', label: 'User Acceptance Testing (UAT) Sign-Off' },
                { value: 'milestone_acceptance', label: 'Milestone Acceptance Sign-Off' },
                { value: 'feedback', label: 'General Project Feedback' },
              ]}
            />

            <Select
              label="Related Project"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              options={[
                { value: '', label: 'General / Platform Wide' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-wwi-text block mb-1">Details & Rationale</label>
            <textarea
              rows={4}
              required
              placeholder="State acceptance decision, specifications, or requested modifications in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit for Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
