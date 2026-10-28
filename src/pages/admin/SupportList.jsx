import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { Drawer } from '../../components/common/Drawer'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatDateKolkata } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  LifeBuoy,
  Search,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Lock,
} from 'lucide-react'

export function SupportList() {
  const { user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Selected Ticket Drawer
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'supportTickets'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setTickets(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })
    return () => unsub()
  }, [])

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
        isInternal: isInternalNote,
        createdAt: new Date().toISOString(),
      }
      replies.push(newReply)

      await updateDoc(doc(db, 'supportTickets', selectedTicket.id), {
        responses: replies,
        status: isInternalNote ? selectedTicket.status : 'in_progress',
        updatedAt: new Date().toISOString(),
      })

      showSuccess(isInternalNote ? 'Internal note added.' : 'Reply sent to client.')
      setReplyText('')
      setSelectedTicket({ ...selectedTicket, responses: replies })
    } catch (err) {
      showError(err.message || 'Failed to send reply')
    } finally {
      setReplying(false)
    }
  }

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      showSuccess(`Ticket status updated to ${newStatus}`)
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
      }
    } catch (err) {
      showError(err.message)
    }
  }

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'urgent':
        return <Badge variant="danger" size="xs">Urgent</Badge>
      case 'high':
        return <Badge variant="warning" size="xs">High</Badge>
      case 'medium':
        return <Badge variant="neutral" size="xs">Medium</Badge>
      default:
        return <Badge variant="neutral" size="xs">Low</Badge>
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
      header: 'Client',
      render: (t) => (
        <div>
          <div className="font-medium text-wwi-text">{t.organizationName || 'Client Org'}</div>
          <div className="text-[11px] text-wwi-muted">{t.createdByName || t.createdByEmail}</div>
        </div>
      ),
    },
    {
      header: 'Priority',
      render: (t) => getPriorityBadge(t.priority),
    },
    {
      header: 'Category',
      render: (t) => <span className="text-wwi-muted">{t.category || 'General'}</span>,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets & Client Requests"
        description="Address technical inquiries, integration debugging requests, and incident notifications."
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket #, subject, client..."
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
              <option value="all">All Tickets</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredTickets}
            emptyMessage="No support tickets found."
          />
        )}
      </Card>

      {/* Ticket Detail Drawer */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject}
        subtitle={`${selectedTicket?.ticketNumber} • ${selectedTicket?.organizationName}`}
        width="max-w-2xl"
      >
        {selectedTicket && (
          <div className="space-y-5 text-xs">
            {/* Metadata Bar */}
            <div className="p-3 bg-wwi-surface rounded-lg border border-wwi-border grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedTicket.status)}</div>
              </div>
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Priority</span>
                <div className="mt-0.5">{getPriorityBadge(selectedTicket.priority)}</div>
              </div>
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Category</span>
                <div className="mt-0.5 font-medium text-wwi-text">{selectedTicket.category || 'General'}</div>
              </div>
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Submitted</span>
                <div className="mt-0.5 text-wwi-text">{formatDateKolkata(selectedTicket.createdAt, 'dd MMM, hh:mm')}</div>
              </div>
            </div>

            {/* Description */}
            <div className="border border-wwi-border rounded-lg p-3.5 bg-white">
              <span className="font-semibold text-wwi-text block mb-1">Issue Description</span>
              <p className="text-wwi-muted leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            {/* Response Thread */}
            <div className="space-y-3">
              <span className="font-semibold text-wwi-text block">Conversation Thread</span>
              {(selectedTicket.responses || []).map((r) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-lg border ${
                    r.isInternal
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-wwi-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-wwi-text">
                      <span>{r.senderName}</span>
                      {r.isInternal && (
                        <Badge variant="warning" size="xs">
                          Internal Note
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {formatDateKolkata(r.createdAt, 'dd MMM, hh:mm a')}
                    </span>
                  </div>
                  <p className="text-wwi-text whitespace-pre-wrap">{r.text}</p>
                </div>
              ))}
              {(!selectedTicket.responses || selectedTicket.responses.length === 0) && (
                <div className="text-center p-4 text-wwi-muted border border-dashed border-wwi-border rounded">
                  No responses recorded yet.
                </div>
              )}
            </div>

            {/* Reply Editor */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-wwi-border">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-wwi-text">Add Reply</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-wwi-muted hover:text-wwi-text">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-wwi-border"
                  />
                  <span>Internal note (Hidden from client)</span>
                </label>
              </div>

              <textarea
                rows={3}
                required
                placeholder={isInternalNote ? "Record private investigation notes for WWI team..." : "Write message to client contact..."}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                  >
                    Close
                  </Button>
                </div>

                <Button type="submit" variant="primary" size="sm" icon={Send} loading={replying}>
                  {isInternalNote ? 'Save Internal Note' : 'Send to Client'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Drawer>
    </div>
  )
}
