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
import {
  LifeBuoy,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  PhoneCall,
  Phone,
  Video,
  Calendar,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'

export function ClientSupportList() {
  const { user, userProfile, organization, organizationId } = useAuth()
  const { showSuccess, showError } = useToast()

  const [tickets, setTickets] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all') // 'all' | 'tickets' | 'calls'

  // Drawer & Modals state
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [submittingCall, setSubmittingCall] = useState(false)

  // New Support Ticket State
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    projectId: '',
    category: 'Technical Inquiry',
    priority: 'medium',
  })

  // New Request a Call State
  const [callData, setCallData] = useState({
    subject: '',
    phoneNumber: userProfile?.phone || '',
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    timeSlot: 'Morning (10:00 AM - 1:00 PM IST)',
    callChannel: 'Direct Cellular Phone Call',
    projectId: '',
    agenda: '',
    urgency: 'medium',
  })

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    // 1. Fetch tickets & call requests for this organization
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

  // Sync phone number from profile if available
  useEffect(() => {
    if (userProfile?.phone && !callData.phoneNumber) {
      setCallData((prev) => ({ ...prev, phoneNumber: userProfile.phone }))
    }
  }, [userProfile?.phone])

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    setSubmittingTicket(true)

    try {
      const selectedPrj = projects.find((p) => p.id === newTicket.projectId)
      const ticketNum = `TCK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      await addDoc(collection(db, 'supportTickets'), {
        ticketNumber: ticketNum,
        subject: newTicket.subject,
        description: newTicket.description,
        type: 'support_ticket',
        isCallRequest: false,
        projectId: newTicket.projectId || null,
        projectName: selectedPrj?.name || null,
        organizationId,
        organizationName: organization?.name || 'Client Org',
        category: newTicket.category,
        priority: newTicket.priority,
        status: 'open',
        createdBy: user.uid,
        createdByName: userProfile?.displayName || userProfile?.name || user.email.split('@')[0],
        createdByEmail: user.email,
        responses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Support ticket ${ticketNum} created.`)
      setTicketModalOpen(false)
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
      setSubmittingTicket(false)
    }
  }

  const handleRequestCall = async (e) => {
    e.preventDefault()
    if (!callData.phoneNumber.trim()) {
      showError('Please provide a contact phone number.')
      return
    }

    setSubmittingCall(true)
    try {
      const selectedPrj = projects.find((p) => p.id === callData.projectId)
      const callTicketNum = `CALL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      await addDoc(collection(db, 'supportTickets'), {
        ticketNumber: callTicketNum,
        subject: `📞 Call Request: ${callData.subject}`,
        type: 'call_request',
        isCallRequest: true,
        phoneNumber: callData.phoneNumber.trim(),
        preferredDate: callData.preferredDate,
        preferredTimeSlot: callData.timeSlot,
        callChannel: callData.callChannel,
        callStatus: 'pending', // 'pending' | 'scheduled' | 'completed' | 'cancelled'
        description: callData.agenda.trim() || 'Client requested voice / consultation call regarding project progress.',
        projectId: callData.projectId || null,
        projectName: selectedPrj?.name || 'General Project Consultation',
        organizationId,
        organizationName: organization?.name || 'Client Org',
        category: 'Call Consultation',
        priority: callData.urgency,
        status: 'open',
        createdBy: user.uid,
        createdByName: userProfile?.displayName || userProfile?.name || user.email.split('@')[0],
        createdByEmail: user.email,
        responses: [
          {
            id: `INIT-${Date.now()}`,
            senderId: user.uid,
            senderName: userProfile?.displayName || userProfile?.name || user.email.split('@')[0],
            senderEmail: user.email,
            text: `Call Request Details:\n• Phone: ${callData.phoneNumber}\n• Preferred Date: ${callData.preferredDate}\n• Time Window: ${callData.timeSlot}\n• Channel: ${callData.callChannel}\n\nAgenda:\n${callData.agenda || 'General consultation.'}`,
            isInternal: false,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Call request ${callTicketNum} submitted. Our engineering leads will reach out to you.`)
      setCallModalOpen(false)
      setCallData({
        subject: '',
        phoneNumber: userProfile?.phone || '',
        preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        timeSlot: 'Morning (10:00 AM - 1:00 PM IST)',
        callChannel: 'Direct Cellular Phone Call',
        projectId: '',
        agenda: '',
        urgency: 'medium',
      })
    } catch (err) {
      showError(err.message || 'Failed to request call')
    } finally {
      setSubmittingCall(false)
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
        senderName: userProfile?.displayName || userProfile?.name || user.email.split('@')[0],
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

  const filteredTickets = tickets.filter((t) => {
    const isCall = t.isCallRequest || t.type === 'call_request'
    if (filterType === 'tickets' && isCall) return false
    if (filterType === 'calls' && !isCall) return false
    return true
  })

  const callCount = tickets.filter((t) => t.isCallRequest || t.type === 'call_request').length
  const ticketCount = tickets.filter((t) => !(t.isCallRequest || t.type === 'call_request')).length

  const columns = [
    {
      header: 'Request # & Topic',
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
            <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
              <span className="font-mono">{t.ticketNumber}</span>
              {isCall && t.phoneNumber && (
                <>
                  <span>•</span>
                  <span className="text-wwi-text font-medium">{t.phoneNumber}</span>
                  <span>•</span>
                  <span>{t.preferredTimeSlot}</span>
                </>
              )}
            </div>
          </div>
        )
      },
    },
    {
      header: 'Type / Category',
      render: (t) => {
        const isCall = t.isCallRequest || t.type === 'call_request'
        return (
          <span className="text-wwi-muted text-xs">
            {isCall ? 'Phone Consultation' : (t.category || 'Technical Inquiry')}
          </span>
        )
      },
    },
    {
      header: 'Priority',
      render: (t) => (
        <Badge variant={t.priority === 'urgent' ? 'danger' : (t.priority === 'high' ? 'warning' : 'neutral')} size="xs">
          {t.priority?.toUpperCase()}
        </Badge>
      ),
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
          {t.isCallRequest || t.type === 'call_request' ? 'Call Details' : 'View Thread'}
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
        description="Submit tickets, request direct phone consultations, and communicate with WWI engineers."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={PhoneCall}
              onClick={() => setCallModalOpen(true)}
            >
              Request a Call
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setTicketModalOpen(true)}
            >
              New Support Ticket
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-wwi-border pb-3">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            filterType === 'all'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          All Requests ({tickets.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('calls')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            filterType === 'calls'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          📞 Call Requests ({callCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('tickets')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            filterType === 'tickets'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          Support Tickets ({ticketCount})
        </button>
      </div>

      <Card noPadding>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredTickets}
            emptyMessage="No requests recorded. Use 'Request a Call' or 'New Support Ticket' to get assistance."
          />
        )}
      </Card>

      {/* Request a Call Modal */}
      <Modal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        title="Request a Phone Consultation / Call"
        description="Schedule a direct voice or video call with a dedicated WWI technical lead or project manager."
      >
        <form onSubmit={handleRequestCall} className="space-y-4">
          <Input
            label="Call Reason / Topic"
            required
            placeholder="e.g. Discuss API integration architecture, review feedback, or sprint blockers"
            value={callData.subject}
            onChange={(e) => setCallData({ ...callData, subject: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Phone Number"
              required
              placeholder="+91 98450 12345"
              value={callData.phoneNumber}
              onChange={(e) => setCallData({ ...callData, phoneNumber: e.target.value })}
              helperText="Number our engineer should dial"
            />

            <Input
              label="Preferred Date"
              type="date"
              required
              value={callData.preferredDate}
              onChange={(e) => setCallData({ ...callData, preferredDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Preferred Time Window"
              value={callData.timeSlot}
              onChange={(e) => setCallData({ ...callData, timeSlot: e.target.value })}
              options={[
                { value: 'Morning (10:00 AM - 1:00 PM IST)', label: 'Morning (10:00 AM - 1:00 PM IST)' },
                { value: 'Afternoon (2:00 PM - 5:00 PM IST)', label: 'Afternoon (2:00 PM - 5:00 PM IST)' },
                { value: 'Evening (5:00 PM - 7:30 PM IST)', label: 'Evening (5:00 PM - 7:30 PM IST)' },
                { value: 'Urgent / ASAP (Blocker)', label: 'Urgent / ASAP (Critical)' },
              ]}
            />

            <Select
              label="Preferred Channel"
              value={callData.callChannel}
              onChange={(e) => setCallData({ ...callData, callChannel: e.target.value })}
              options={[
                { value: 'Direct Cellular Phone Call', label: 'Direct Cellular Phone Call' },
                { value: 'Google Meet Video Call', label: 'Google Meet (Video Link)' },
                { value: 'Zoom / Teams Meeting', label: 'Zoom / Teams Meeting' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Associated Project"
              value={callData.projectId}
              onChange={(e) => setCallData({ ...callData, projectId: e.target.value })}
              options={[
                { value: '', label: 'General / Platform Level' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Select
              label="Urgency"
              value={callData.urgency}
              onChange={(e) => setCallData({ ...callData, urgency: e.target.value })}
              options={[
                { value: 'medium', label: 'Medium (Standard)' },
                { value: 'high', label: 'High (Important topic)' },
                { value: 'urgent', label: 'Urgent (Production/Release Blocker)' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-wwi-text block mb-1">
              Call Agenda & Topics to Cover
            </label>
            <textarea
              rows={3}
              placeholder="List specific questions, modules, API endpoints, or review documents to be discussed..."
              value={callData.agenda}
              onChange={(e) => setCallData({ ...callData, agenda: e.target.value })}
              className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCallModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingCall} icon={PhoneCall}>
              Submit Call Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Support Ticket Modal */}
      <Modal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
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
            <Button variant="secondary" onClick={() => setTicketModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingTicket}>
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket / Call Drawer */}
      <Drawer
        isOpen={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject}
        subtitle={`${selectedTicket?.ticketNumber} • Status: ${selectedTicket?.status}`}
        width="max-w-2xl"
      >
        {selectedTicket && (
          <div className="space-y-5 text-xs">
            {/* Call Request Banner */}
            {(selectedTicket.isCallRequest || selectedTicket.type === 'call_request') && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-blue-700" />
                    <span className="font-semibold text-blue-900">Phone Consultation Requested</span>
                  </div>
                  <Badge variant="primary" size="xs">
                    {selectedTicket.callStatus === 'scheduled' ? 'Scheduled' : 'Pending Callback'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-blue-200/60">
                  <div>
                    <span className="text-blue-800 font-medium block">Callback Number:</span>
                    <a
                      href={`tel:${selectedTicket.phoneNumber}`}
                      className="font-mono font-semibold text-blue-900 hover:underline"
                    >
                      {selectedTicket.phoneNumber}
                    </a>
                  </div>
                  <div>
                    <span className="text-blue-800 font-medium block">Preferred Time Window:</span>
                    <span className="text-blue-950 font-medium">
                      {selectedTicket.preferredDate ? `${selectedTicket.preferredDate} • ` : ''}
                      {selectedTicket.preferredTimeSlot}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-blue-800 font-medium block">Channel:</span>
                    <span className="text-blue-950">{selectedTicket.callChannel || 'Direct Cellular Phone Call'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-wwi-surface rounded-lg border border-wwi-border grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-wwi-muted uppercase block">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedTicket.status, selectedTicket.isCallRequest || selectedTicket.type === 'call_request')}</div>
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
              <span className="font-semibold text-wwi-text block mb-1">
                {selectedTicket.isCallRequest || selectedTicket.type === 'call_request' ? 'Call Agenda & Details' : 'Initial Description'}
              </span>
              <p className="text-wwi-muted leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            <div className="space-y-3">
              <span className="font-semibold text-wwi-text block">Conversation & Updates</span>
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
                placeholder="Reply to support engineer or add notes..."
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
