import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { Drawer } from '../../components/common/Drawer'
import { Modal } from '../../components/common/Modal'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatDateKolkata } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { LifeBuoy, Plus, Send, Clock, CheckCircle2 } from 'lucide-react'

export function ClientSupportList() {
  const { user, userProfile, organization, organizationId } = useAuth()
  const { showSuccess, showError } = useToast()

  const [tickets, setTickets] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Drawer & Modals state
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    projectId: '',
    category: 'Technical Inquiry',
    priority: 'medium',
  })

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    // 1. Fetch tickets for this organization
    const qTickets = query(
      collection(db, 'supportTickets'),
      where('organizationId', '==', organizationId)
    )
    const unsubTickets = onSnapshot(qTickets, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setTickets(list)
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
      unsubTickets()
      unsubProjects()
    }
  }, [organizationId])

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const selectedPrj = projects.find((p) => p.id === newTicket.projectId)
      const ticketNum = `TCK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      await addDoc(collection(db, 'supportTickets'), {
        ticketNumber: ticketNum,
        subject: newTicket.subject,
        description: newTicket.description,
        projectId: newTicket.projectId || null,
        projectName: selectedPrj?.name || null,
        organizationId,
        organizationName: organization?.name || 'Client Org',
        category: newTicket.category,
        priority: newTicket.priority,
        status: 'open',
        createdBy: user.uid,
        createdByName: userProfile?.name || user.email.split('@')[0],
        createdByEmail: user.email,
        responses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Support ticket ${ticketNum} created.`)
      setNewModalOpen(false)
      setNewTicket({
        subject: '',
        description: '',
        projectId: '',
        category: 'Technical Inquiry',
        priority: 'medium',
      })
    } catch (err) {
      showError(err.message || 'Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket) return
    setReplying(true)

    try {
      const replies = selectedTicket.responses || []
      const newReply = {
        id: `RPLY-${Date.now()}`,
        senderId: user.uid,
        senderName: userProfile?.name || user.email.split('@')[0],
        senderEmail: user.email,
        text: replyText.trim(),
        isInternal: false, // Client replies are always visible
        createdAt: new Date().toISOString(),
      }
      replies.push(newReply)

      await updateDoc(doc(db, 'supportTickets', selectedTicket.id), {
        responses: replies,
        lastClientReplyAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess('Reply sent.')
      setReplyText('')
      setSelectedTicket({ ...selectedTicket, responses: replies })
    } catch (err) {
      showError(err.message || 'Failed to send reply')
    } finally {
      setReplying(false)
    }
  }

  const getStatusBadge = (s) => {
    switch (s) {
      case 'resolved':
      case 'closed':
        return <Badge variant="success" size="xs">{s}</Badge>
      case 'open':
        return <Badge variant="warning" size="xs">Open</Badge>
      case 'in_progress':
        return <Badge variant="dark" size="xs">In Progress</Badge>
      default:
        return <Badge variant="neutral" size="xs">{s}</Badge>
    }
  }

  const columns = [
    {
      header: 'Ticket # & Subject',
      render: (t) => (
        <div>
          <button
            type="button"
            onClick={() => setSelectedTicket(t)}
            className="font-semibold text-wwi-text hover:underline text-left block"
          >
            {t.subject}
          </button>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{t.ticketNumber}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (t) => <span className="text-wwi-muted">{t.category || 'General'}</span>,
    },
    {
      header: 'Priority',
      render: (t) => (
        <Badge variant={t.priority === 'urgent' ? 'danger' : 'neutral'} size="xs">
          {t.priority?.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Status',
      render: (t) => getStatusBadge(t.status),
    },
    {
      header: 'Created Date',
      render: (t) => (
        <span className="text-wwi-muted text-xs">{formatDateKolkata(t.createdAt, 'dd MMM yyyy')}</span>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (t) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedTicket(t)}
        >
          View Thread
        </Button>
      ),
    },
  ]

  // Filter out any internal notes from WWI staff before presenting to client!
  const clientVisibleResponses = (selectedTicket?.responses || []).filter((r) => !r.isInternal)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technical Support & Incident Desk"
        description="Submit tickets, report integration bugs, and communicate directly with WWI support engineers."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setNewModalOpen(true)}
          >
            New Support Ticket
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
            data={tickets}
            emptyMessage="No support tickets recorded for your organization."
          />
        )}
      </Card>

      {/* New Ticket Modal */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Open Support Ticket"
        description="Provide comprehensive details of your inquiry or technical blocker."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Input
            label="Subject"
            required
            placeholder="e.g. Staging Environment SSO Redirect Configuration"
            value={newTicket.subject}
            onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Related Project"
              value={newTicket.projectId}
              onChange={(e) => setNewTicket({ ...newTicket, projectId: e.target.value })}
              options={[
                { value: '', label: 'General / Platform Level' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Select
              label="Category"
              value={newTicket.category}
              onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
              options={[
                { value: 'Technical Inquiry', label: 'Technical Inquiry' },
                { value: 'Bug / Incident', label: 'Bug / Incident' },
                { value: 'API & Integration', label: 'API & Integration' },
                { value: 'Billing & Invoicing', label: 'Billing & Invoicing' },
              ]}
            />
          </div>

          <Select
            label="Priority"
            value={newTicket.priority}
            onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent (Production Blocker)' },
            ]}
          />

          <div>
            <label className="text-xs font-medium text-wwi-text block mb-1">Detailed Description</label>
            <textarea
              rows={4}
              required
              placeholder="Describe symptoms, expected behavior, steps to reproduce, or required access..."
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Drawer */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject}
        subtitle={`${selectedTicket?.ticketNumber} • Status: ${selectedTicket?.status}`}
        width="max-w-2xl"
      >
        {selectedTicket && (
          <div className="space-y-5 text-xs">
            <div className="p-3 bg-wwi-surface rounded-lg border border-wwi-border grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedTicket.status)}</div>
              </div>
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Priority</span>
                <div className="mt-0.5 font-medium text-wwi-text capitalize">{selectedTicket.priority}</div>
              </div>
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Created</span>
                <div className="mt-0.5 text-wwi-text">{formatDateKolkata(selectedTicket.createdAt, 'dd MMM, hh:mm')}</div>
              </div>
            </div>

            <div className="border border-wwi-border rounded-lg p-3.5 bg-white">
              <span className="font-semibold text-wwi-text block mb-1">Initial Description</span>
              <p className="text-wwi-muted leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            <div className="space-y-3">
              <span className="font-semibold text-wwi-text block">Conversation Thread</span>
              {clientVisibleResponses.map((r) => (
                <div key={r.id} className="p-3 rounded-lg border border-wwi-border bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-wwi-text">{r.senderName}</span>
                    <span className="text-[10px] text-neutral-400">
                      {formatDateKolkata(r.createdAt, 'dd MMM, hh:mm a')}
                    </span>
                  </div>
                  <p className="text-wwi-text whitespace-pre-wrap">{r.text}</p>
                </div>
              ))}
              {clientVisibleResponses.length === 0 && (
                <div className="text-center p-4 text-wwi-muted border border-dashed border-wwi-border rounded">
                  Awaiting response from WWI engineering team.
                </div>
              )}
            </div>

            <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-wwi-border">
              <textarea
                rows={3}
                required
                placeholder="Reply to support engineer..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
              />

              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm" icon={Send} loading={replying}>
                  Send Reply
                </Button>
              </div>
            </form>
          </div>
        )}
      </Drawer>
    </div>
  )
}
