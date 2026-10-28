import React, { useState, useEffect, useRef } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { formatDateKolkata, getInitials } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { MessageSquare, Send, Bell, BellRing, CheckCircle2 } from 'lucide-react'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendWebNotification,
} from '../../lib/webNotifications'

export function ClientMessagesView() {
  const { user, userProfile, organization, organizationId } = useAuth()
  const { showSuccess, showError } = useToast()

  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission())
  const [promptDismissed, setPromptDismissed] = useState(false)

  const messagesEndRef = useRef(null)
  const isFirstSnapshot = useRef(true)
  const prevCount = useRef(0)

  // 1. Fetch Projects belonging to this client org
  useEffect(() => {
    if (!organizationId) return
    const q = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId)
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id)
      }
    })
    return () => unsub()
  }, [organizationId])

  // 2. Fetch realtime messages for the selected project
  useEffect(() => {
    if (!selectedProjectId) {
      setMessages([])
      return
    }

    isFirstSnapshot.current = true
    prevCount.current = 0

    const q = query(
      collection(db, 'messages'),
      where('projectId', '==', selectedProjectId),
      limit(50)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))

        // Trigger web desktop notification if a new message arrives from the team
        if (!isFirstSnapshot.current && list.length > prevCount.current) {
          const incoming = list.slice(prevCount.current)
          incoming.forEach((m) => {
            if (m.senderId !== user?.uid) {
              sendWebNotification(`WWI Team: ${m.senderName || 'New Message'}`, {
                body: m.text,
                tag: `msg-${m.id}`,
              })
            }
          })
        }

        isFirstSnapshot.current = false
        prevCount.current = list.length
        setMessages(list)

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      },
      (err) => {
        console.warn('Messages listener error:', err.message)
      }
    )

    return () => unsub()
  }, [selectedProjectId, user?.uid])

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission()
    setNotificationPermission(perm)
    if (perm === 'granted') {
      showSuccess('Web notifications enabled! You will be alerted when new messages arrive.')
      sendWebNotification('Notifications Enabled', {
        body: 'Work Wizards Innovations project chat alerts are active on this device.',
      })
    } else if (perm === 'denied') {
      showError('Notification permission was blocked in browser settings.')
    }
  }


  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedProjectId) return

    const selectedPrj = projects.find((p) => p.id === selectedProjectId)
    setSending(true)

    try {
      await addDoc(collection(db, 'messages'), {
        projectId: selectedProjectId,
        projectName: selectedPrj?.name || 'Project',
        organizationId,
        senderId: user.uid,
        senderName: userProfile?.name || userProfile?.displayName || user.email.split('@')[0],
        senderEmail: user.email,
        senderRole: 'client',
        isStaff: false,
        text: newMessage.trim(),
        createdAt: new Date().toISOString(),
      })

      setNewMessage('')
    } catch (err) {
      showError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const activeProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Conversations"
        description="Direct communication with your assigned Work Wizards Innovations technical team."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[640px] bg-white border border-wwi-border rounded-lg overflow-hidden shadow-sm">
        {/* Left Col: Projects List */}
        <div className="lg:col-span-1 border-r border-wwi-border flex flex-col h-full bg-wwi-surface/30">
          <div className="p-3.5 border-b border-wwi-border bg-white">
            <span className="text-xs font-semibold text-wwi-text uppercase tracking-wider">
              Project Channels
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-wwi-border">
            {projects.map((p) => {
              const isSelected = p.id === selectedProjectId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`w-full text-left p-3.5 transition-colors ${
                    isSelected ? 'bg-wwi-selected text-wwi-text font-medium' : 'hover:bg-neutral-50 text-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-neutral-400">{p.code || 'PRJ'}</span>
                    <Badge variant="neutral" size="xs">
                      {p.status}
                    </Badge>
                  </div>
                  <div className="text-xs font-semibold text-wwi-text truncate">{p.name}</div>
                </button>
              )
            })}
            {projects.length === 0 && (
              <div className="p-6 text-center text-xs text-wwi-muted">No projects found.</div>
            )}
          </div>
        </div>

        {/* Right 3 Cols: Realtime Message Thread */}
        <div className="lg:col-span-3 flex flex-col h-full bg-white">
          {/* Permission Prompt Banner */}
          {notificationPermission === 'default' && !promptDismissed && isNotificationSupported() && (
            <div className="px-4 py-2.5 bg-neutral-900 text-white flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                <span>
                  <strong>Enable Web Push Notifications:</strong> Get notified instantly when the WWI technical team replies.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-2.5 py-1 rounded bg-white text-black text-xs font-semibold hover:bg-neutral-100 transition"
                >
                  Allow Notifications
                </button>
                <button
                  type="button"
                  onClick={() => setPromptDismissed(true)}
                  className="text-neutral-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="p-3.5 border-b border-wwi-border flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-wwi-text">
                {activeProject ? activeProject.name : 'Select a project'}
              </div>
              <div className="text-[11px] text-wwi-muted">
                {activeProject ? `Project Code: ${activeProject.code}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {notificationPermission === 'granted' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Live Alerts Active
                </span>
              ) : notificationPermission === 'denied' ? (
                <span className="text-[11px] text-neutral-400" title="Notifications blocked in browser permissions">
                  Alerts Muted
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  icon={Bell}
                  onClick={handleRequestPermission}
                >
                  Enable Alerts
                </Button>
              )}
            </div>
          </div>


          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isMe = m.senderId === user?.uid
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      m.isStaff ? 'bg-wwi-dark text-white' : 'bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    {getInitials(m.senderName)}
                  </div>
                  <div
                    className={`max-w-md rounded-lg p-3 text-xs ${
                      isMe
                        ? 'bg-wwi-dark text-white'
                        : 'bg-wwi-surface text-wwi-text border border-wwi-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                      <span className="font-semibold">
                        {m.senderName} {m.isStaff ? '(WWI Team)' : ''}
                      </span>
                      <span>{formatDateKolkata(m.createdAt, 'hh:mm a')}</span>
                    </div>
                    <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              )
            })}
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-wwi-muted text-xs">
                <MessageSquare className="w-8 h-8 text-neutral-300 mb-2" />
                <p>No messages yet in this project channel.</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Send a message to reach your WWI technical lead.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-wwi-border bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Type your message to the WWI team..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!selectedProjectId || sending}
              className="flex-1 bg-wwi-surface border border-wwi-border rounded px-3 py-2 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark focus:bg-white"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Send}
              loading={sending}
              disabled={!selectedProjectId || !newMessage.trim()}
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
