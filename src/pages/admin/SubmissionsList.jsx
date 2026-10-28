import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatDateKolkata } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  Send,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileCheck,
} from 'lucide-react'

export function SubmissionsList() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('approved')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'submissions'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setSubmissions(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleReviewSubmission = async (e) => {
    e.preventDefault()
    if (!selectedSub) return
    setSubmitting(true)

    try {
      await updateDoc(doc(db, 'submissions', selectedSub.id), {
        status: reviewStatus,
        reviewerNotes,
        reviewedBy: user?.email,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Submission marked as ${reviewStatus}.`)
      setReviewModalOpen(false)
      setSelectedSub(null)
      setReviewerNotes('')
    } catch (err) {
      showError(err.message || 'Failed to review submission')
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

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.submissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const columns = [
    {
      header: 'Submission # & Title',
      render: (s) => (
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedSub(s)
              setReviewStatus(s.status === 'submitted' ? 'approved' : s.status)
              setReviewerNotes(s.reviewerNotes || '')
              setReviewModalOpen(true)
            }}
            className="font-semibold text-wwi-text hover:underline text-left block"
          >
            {s.title}
          </button>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{s.submissionNumber || 'SUB'}</div>
        </div>
      ),
    },
    {
      header: 'Type',
      render: (s) => (
        <Badge variant="neutral" size="xs">
          {s.submissionType?.replace('_', ' ').toUpperCase() || 'GENERAL'}
        </Badge>
      ),
    },
    {
      header: 'Client & Project',
      render: (s) => (
        <div>
          <div className="font-medium text-wwi-text">{s.organizationName || 'Client Org'}</div>
          <div className="text-[11px] text-wwi-muted">{s.projectName || '—'}</div>
        </div>
      ),
    },
    {
      header: 'Submitted By',
      render: (s) => (
        <div className="text-xs">
          <div className="font-medium text-wwi-text">{s.submitterName || 'Client User'}</div>
          <div className="text-[11px] text-wwi-muted">{formatDateKolkata(s.createdAt, 'dd MMM yyyy')}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (s) => getStatusBadge(s.status),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (s) => (
        <Button
          variant="secondary"
          size="sm"
          icon={FileCheck}
          onClick={() => {
            setSelectedSub(s)
            setReviewStatus(s.status === 'submitted' ? 'approved' : s.status)
            setReviewerNotes(s.reviewerNotes || '')
            setReviewModalOpen(true)
          }}
        >
          Review
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Submissions & Approvals"
        description="Review formal client requirement submissions, UAT acceptance results, and milestone sign-offs."
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, number, or client..."
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
              <option value="all">All Submissions</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="changes_requested">Changes Requested</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredSubmissions}
            emptyMessage="No client submissions awaiting review."
          />
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review Client Submission"
        description={`Record formal decision on ${selectedSub?.submissionNumber || 'submission'}`}
      >
        <form onSubmit={handleReviewSubmission} className="space-y-4">
          <div className="p-3 bg-wwi-surface rounded border border-wwi-border space-y-1 text-xs">
            <div className="font-semibold text-wwi-text">{selectedSub?.title}</div>
            <div className="text-wwi-muted">Submitted by: {selectedSub?.submitterName} ({selectedSub?.organizationName})</div>
            <p className="mt-2 text-wwi-text whitespace-pre-wrap">{selectedSub?.description}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-wwi-text block mb-1.5">Decision Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['approved', 'changes_requested', 'under_review', 'rejected'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setReviewStatus(st)}
                  className={`px-3 py-2 text-xs rounded border text-center transition font-medium capitalize ${
                    reviewStatus === st
                      ? 'bg-wwi-dark text-white border-wwi-dark'
                      : 'bg-white text-wwi-text border-wwi-border hover:bg-neutral-50'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-wwi-text block mb-1">Reviewer Feedback & Remarks</label>
            <textarea
              rows={3}
              placeholder="Provide constructive feedback or sign-off rationale visible to the client..."
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Record Decision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
