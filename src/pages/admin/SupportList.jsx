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
  PhoneCall,
  Phone,
  Video,
  Calendar,
  ExternalLink,
} from 'lucide-react'

export function SupportList() {
  const { user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'tickets' | 'calls'

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
        senderName: userProfile?.displayName || userProfile?.name || user.email.split('@')[0],
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
      showSuccess(`Status updated to ${newStatus}`)
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
      }
    } catch (err) {
      showError(err.message)
    }
  }

  const handleUpdateCallStatus = async (ticketId, newCallStatus, newTicketStatus) => {
    try {
      const updateData = {
        callStatus: newCallStatus,
        updatedAt: new Date().toISOString(),
      }
      if (newTicketStatus) {
        updateData.status = newTicketStatus
      }
      await updateDoc(doc(db, 'supportTickets', ticketId), updateData)
      showSuccess(`Call status updated to ${newCallStatus}`)
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ...updateData })
      }
    } catch (err) {
      showError(err.message)
    }
  }

  const filteredTickets = tickets.filter((t) => {
    const isCall = t.isCallRequest || t.type === 'call_request'
    const matchesSearch =
      t.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.createdByName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'calls' && isCall) ||
      (typeFilter === 'tickets' && !isCall)

    return matchesSearch && matchesStatus && matchesType
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

  const getStatusBadge = (s, isCall) => {
    if (isCall) {
      switch (s) {
        case 'resolved':
        case 'closed':
          return <Badge variant="success" size="xs">Call Completed</Badge>
        case 'in_progress':
          return <Badge variant="primary" size="xs">Call Scheduled</Badge>
        default:
          return <Badge variant="warning" size="xs">Call Pending</Badge>
      }
    }

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
      render: (t) => {
        const isCall = t.isCallRequest || t.type === 'call_request'
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTicket(t)}
                className="font-semibold text-wwi-text hover:underline text-left block"
              >
                {t.subject}
              </button>
              {isCall && (
                <Badge variant="primary" size="xs">📞 Call Request</Badge>
              )}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5 flex items-center gap-2">
              <span>{t.ticketNumber}</span>
              {isCall && t.phoneNumber && (
                <>
                  <span>•</span>
                  <a
                    href={`tel:${t.phoneNumber}`}
                    className="font-semibold text-blue-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📞 {t.phoneNumber}
                  </a>
                  <span>•</span>
                  <span className="text-neutral-600">{t.preferredTimeSlot}</span>
                </>
              )}
            </div>
          </div>
        )
      },
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
      header: 'Type / Category',
      render: (t) => {
        const isCall = t.isCallRequest || t.type === 'call_request'
        return (
          <span className="text-wwi-muted text-xs">
            {isCall ? 'Phone Consultation' : (t.category || 'General')}
          </span>
        )
      },
    },
    {
      header: 'Status',
      render: (t) => getStatusBadge(t.status, t.isCallRequest || t.type === 'call_request'),
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
          {t.isCallRequest || t.type === 'call_request' ? 'Manage Call' : 'View Thread'}
        </Button>
      ),
    },
  ]

  const callCount = tickets.filter((t) => t.isCallRequest || t.type === 'call_request').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets & Call Requests"
        description="Address technical inquiries, integration debugging requests, and client call consultation requests."
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket #, subject, client, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded pl-8 pr-3 py-1.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-wwi-muted">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-wwi-border rounded px-2.5 py-1 text-xs text-wwi-text focus:outline-none"
              >
                <option value="all">All Requests</option>
                <option value="calls">📞 Call Requests ({callCount})</option>
                <option value="tickets">Support Tickets</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-wwi-muted">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-wwi-border rounded px-2.5 py-1 text-xs text-wwi-text focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open / Pending</option>
                <option value="in_progress">In Progress / Scheduled</option>
                <option value="resolved">Resolved / Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
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
            emptyMessage="No support tickets or call requests found matching filters."
          />
        )}
      </Card>

      {/* Ticket Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject}
        subtitle={`${selectedTicket?.ticketNumber} • ${selectedTicket?.organizationName}`}
        width="max-w-2xl"
      >
        {selectedTicket && (
          <div className="space-y-5 text-xs">
            {/* Call Request Actions & Details Card */}
            {(selectedTicket.isCallRequest || selectedTicket.type === 'call_request') && (
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-blue-700" />
                    <span className="font-semibold text-blue-900">Client Call Consultation Request</span>
                  </div>
                  <Badge variant="primary" size="xs">
                    {selectedTicket.callStatus === 'scheduled' ? 'Scheduled' : (selectedTicket.callStatus === 'completed' ? 'Completed' : 'Pending Callback')}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-blue-200/60">
                  <div>
                    <span className="text-blue-800 font-medium block">Client Phone Number:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={`tel:${selectedTicket.phoneNumber}`}
                        className="font-mono text-sm font-bold text-blue-900 hover:underline"
                      >
                        {selectedTicket.phoneNumber}
                      </a>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTicket.phoneNumber)
                          showSuccess('Phone number copied to clipboard.')
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div>
                    <span className="text-blue-800 font-medium block">Preferred Time Window:</span>
                    <span className="text-blue-950 font-medium">
                      {selectedTicket.preferredDate ? `${selectedTicket.preferredDate} • ` : ''}
                      {selectedTicket.preferredTimeSlot}
                    </span>
                  </div>

                  <div>
                    <span className="text-blue-800 font-medium block">Channel:</span>
                    <span className="text-blue-950">{selectedTicket.callChannel || 'Direct Cellular Phone Call'}</span>
                  </div>

                  <div>
                    <span className="text-blue-800 font-medium block">Contact Person:</span>
                    <span className="text-blue-950">{selectedTicket.createdByName} ({selectedTicket.createdByEmail})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                  <span className="text-blue-800 font-medium">Update Call Status:</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={selectedTicket.callStatus === 'scheduled' ? 'primary' : 'outline'}
                      size="xs"
                      onClick={() => handleUpdateCallStatus(selectedTicket.id, 'scheduled', 'in_progress')}
                    >
                      Mark Scheduled
                    </Button>
                    <Button
                      variant={selectedTicket.callStatus === 'completed' ? 'primary' : 'outline'}
                      size="xs"
                      onClick={() => handleUpdateCallStatus(selectedTicket.id, 'completed', 'resolved')}
                    >
                      Mark Completed
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Bar */}
            <div className="p-3 bg-wwi-surface rounded-lg border border-wwi-border grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedTicket.status, selectedTicket.isCallRequest || selectedTicket.type === 'call_request')}</div>
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
              <span className="font-semibold text-wwi-text block mb-1">
                {selectedTicket.isCallRequest || selectedTicket.type === 'call_request' ? 'Call Agenda & Background' : 'Issue Description'}
              </span>
              <p className="text-wwi-muted leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            {/* Response Thread */}
            <div className="space-y-3">
              <span className="font-semibold text-wwi-text block">Conversation Thread & Meeting Notes</span>
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
                          Internal Staff Note
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
                <span className="font-semibold text-wwi-text">Add Response or Call Meet Link</span>
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
                placeholder={isInternalNote ? "Record private investigation notes or call outcome for WWI team..." : "Write message or share video call link (Google Meet / Teams) with client..."}
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
