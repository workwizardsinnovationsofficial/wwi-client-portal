import React, { useState, useEffect, useRef } from 'react'
import {
  collection,
  query,
  where,
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
import {
  MessageSquare,
  Send,
  Bell,
  BellRing,
  CheckCircle2,
  CornerUpLeft,
  X,
  ArrowDown,
} from 'lucide-react'
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
  const [replyingTo, setReplyingTo] = useState(null)
  const [sending, setSending] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission())
  const [promptDismissed, setPromptDismissed] = useState(false)

  const chatContainerRef = useRef(null)
  const inputRef = useRef(null)
  const isFirstSnapshot = useRef(true)
  const prevCount = useRef(0)
  const userScrolledUpRef = useRef(false)

  // Robust helper to check if a message was sent by the currently logged-in user
  const checkIsMe = (m) => {
    if (!m) return false
    const myUid = user?.uid
    const myProfileId = userProfile?.id
    const myEmail = (user?.email || userProfile?.email || '').toLowerCase().trim()
    const msgSenderEmail = (m.senderEmail || '').toLowerCase().trim()
    const msgSenderId = String(m.senderId || '').trim()

    return Boolean(
      (myUid && msgSenderId === String(myUid).trim()) ||
      (myProfileId && msgSenderId === String(myProfileId).trim()) ||
      (myEmail && msgSenderEmail && myEmail === msgSenderEmail)
    )
  }

  // Robust helper to determine if a message is from WWI staff vs Client
  const checkIsStaff = (m) => {
    if (!m) return false
    const email = (m.senderEmail || '').toLowerCase().trim()
    const role = (m.senderRole || '').toLowerCase().trim()
    const name = (m.senderName || '').toLowerCase().trim()

    return Boolean(
      m.isStaff === true ||
      role === 'super_admin' ||
      role === 'admin' ||
      role === 'team_member' ||
      email.includes('@wwi.org.in') ||
      email.includes('wwi-admin') ||
      name.includes('wwi') ||
      name.includes('admin')
    )
  }

  // Scroll listener to detect when user has scrolled up to view previous messages
  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // If user is more than 100px from the bottom, they are viewing older messages
    const isUp = distanceFromBottom > 100
    setShowScrollBottom(isUp)
    userScrolledUpRef.current = isUp
  }

  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
      userScrolledUpRef.current = false
      setShowScrollBottom(false)
    }
  }

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

  // 2. Fetch realtime messages for the selected project (up to 300 messages)
  useEffect(() => {
    if (!selectedProjectId) {
      setMessages([])
      return
    }

    isFirstSnapshot.current = true
    prevCount.current = 0
    userScrolledUpRef.current = false
    setShowScrollBottom(false)

    const q = query(
      collection(db, 'messages'),
      where('projectId', '==', selectedProjectId),
      limit(300)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())

        // Trigger web desktop notification if a new message arrives from the team
        if (!isFirstSnapshot.current && list.length > prevCount.current) {
          const incoming = list.slice(prevCount.current)
          incoming.forEach((m) => {
            if (!checkIsMe(m)) {
              const senderLabel = checkIsStaff(m) ? 'WWI Technical Team' : (m.senderName || 'Project Message')
              sendWebNotification(`${senderLabel}`, {
                body: m.text,
                tag: `msg-${m.id}`,
              })
            }
          })
        }

        const isInitial = isFirstSnapshot.current
        isFirstSnapshot.current = false
        prevCount.current = list.length
        setMessages(list)

        // Only auto-scroll to bottom on first load, or if user was already at the bottom
        if (isInitial) {
          setTimeout(() => scrollToBottom(false), 50)
        } else if (!userScrolledUpRef.current) {
          setTimeout(() => scrollToBottom(true), 50)
        }
      },
      (err) => {
        console.warn('Messages listener error:', err.message)
      }
    )

    return () => unsub()
  }, [selectedProjectId, user?.uid, user?.email])

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
      const myName =
        userProfile?.name ||
        userProfile?.displayName ||
        organization?.name ||
        user?.email?.split('@')[0] ||
        'Client'
      const myEmail = userProfile?.email || user?.email || ''
      const myId = userProfile?.id || user?.uid || 'client-user'

      await addDoc(collection(db, 'messages'), {
        projectId: selectedProjectId,
        projectName: selectedPrj?.name || 'Project',
        organizationId: organizationId || selectedPrj?.organizationId || null,
        senderId: myId,
        senderName: myName,
        senderEmail: myEmail,
        senderRole: 'client',
        isStaff: false,
        text: newMessage.trim(),
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName || (checkIsStaff(replyingTo) ? 'WWI Team' : 'Client'),
              text: replyingTo.text || '',
              isStaff: checkIsStaff(replyingTo),
            }
          : null,
        createdAt: new Date().toISOString(),
      })

      setNewMessage('')
      setReplyingTo(null)
      userScrolledUpRef.current = false
      setTimeout(() => scrollToBottom(true), 50)
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[640px] max-h-[640px] bg-white border border-wwi-border rounded-lg overflow-hidden shadow-sm">
        {/* Left Col: Projects List */}
        <div className="lg:col-span-1 border-r border-wwi-border flex flex-col h-full min-h-0 overflow-hidden bg-wwi-surface/30">
          <div className="p-3.5 border-b border-wwi-border bg-white shrink-0">
            <span className="text-xs font-semibold text-wwi-text uppercase tracking-wider">
              Project Channels
            </span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-wwi-border">
            {projects.map((p) => {
              const isSelected = p.id === selectedProjectId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(p.id)
                    setReplyingTo(null)
                  }}
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
        <div className="lg:col-span-3 flex flex-col h-full min-h-0 overflow-hidden bg-white relative">
          {/* Permission Prompt Banner */}
          {notificationPermission === 'default' && !promptDismissed && isNotificationSupported() && (
            <div className="px-4 py-2.5 bg-neutral-900 text-white flex items-center justify-between text-xs shrink-0 animate-in fade-in">
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

          {/* Chat Header */}
          <div className="p-3.5 border-b border-wwi-border flex items-center justify-between shrink-0 bg-white">
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

          {/* Messages list - Fully scrollable container with min-h-0 */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 overscroll-contain"
          >
            {messages.map((m) => {
              const isMe = checkIsMe(m)
              const isStaffMsg = checkIsStaff(m)

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 group ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ${
                      isStaffMsg
                        ? 'bg-neutral-900 text-white border border-neutral-700'
                        : 'bg-blue-600 text-white'
                    }`}
                    title={isStaffMsg ? 'Work Wizards Innovations Team' : 'Client Organization'}
                  >
                    {isStaffMsg ? 'WWI' : getInitials(m.senderName || 'C')}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-xl p-3 text-xs shadow-sm relative ${
                        isMe
                          ? 'bg-neutral-900 text-white rounded-tr-none'
                          : 'bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-tl-none'
                      }`}
                    >
                      {/* Sender Header */}
                      <div className="flex items-center justify-between gap-3 mb-1.5 text-[10px] pb-1 border-b border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">
                            {m.senderName || (isStaffMsg ? 'WWI Team' : 'Client')}
                          </span>
                          {isStaffMsg ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-800 text-amber-300 border border-neutral-700">
                              WWI Admin
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-100 text-blue-800">
                              Client
                            </span>
                          )}
                        </div>
                        <span className="opacity-70 font-mono text-[9px]">
                          {formatDateKolkata(m.createdAt, 'hh:mm a')}
                        </span>
                      </div>

                      {/* Quoted Reply Block */}
                      {m.replyTo && (
                        <div
                          className={`mb-2 p-2 rounded text-[11px] border-l-2 ${
                            isMe
                              ? 'bg-white/10 border-amber-400 text-neutral-200'
                              : 'bg-neutral-200/70 border-neutral-800 text-neutral-800'
                          }`}
                        >
                          <div className="font-semibold flex items-center gap-1 text-[10px] opacity-90">
                            <CornerUpLeft className="w-2.5 h-2.5" />
                            <span>Replying to {m.replyTo.senderName}:</span>
                          </div>
                          <p className="line-clamp-2 italic text-[10px] opacity-80 mt-0.5">
                            "{m.replyTo.text}"
                          </p>
                        </div>
                      )}

                      {/* Main Message Text */}
                      <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                    </div>

                    {/* Quick Action: Reply Button */}
                    <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(m)
                          inputRef.current?.focus()
                        }}
                        className="text-[10px] text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-100 transition"
                      >
                        <CornerUpLeft className="w-3 h-3" />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-wwi-muted text-xs">
                <MessageSquare className="w-8 h-8 text-neutral-300 mb-2" />
                <p>No messages yet in this project channel.</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Send a message to reach your WWI technical lead.
                </p>
              </div>
            )}
          </div>

          {/* Floating "Scroll to latest" button when user scrolled up */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-16 right-6 px-3 py-1.5 rounded-full bg-neutral-900 text-white text-[11px] font-semibold shadow-xl border border-neutral-700 hover:bg-black transition-all flex items-center gap-1.5 z-20 animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              Scroll to latest
            </button>
          )}

          {/* Active Reply Banner */}
          {replyingTo && (
            <div className="px-4 py-2 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs shrink-0 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 truncate">
                <CornerUpLeft className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="text-neutral-500">
                  Replying to <strong className="text-neutral-900">{replyingTo.senderName}</strong>:
                </span>
                <span className="text-neutral-600 italic truncate max-w-sm sm:max-w-md">
                  "{replyingTo.text}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-neutral-400 hover:text-neutral-800 p-1 text-xs"
                title="Cancel reply"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Message Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-wwi-border bg-white flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : "Type your message to the WWI team..."}
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
