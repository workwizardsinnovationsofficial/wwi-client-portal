import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { formatCurrencyINR, formatDateKolkata, formatRelativeTime } from '../../lib/utils'
import {
  Building2,
  FolderKanban,
  CreditCard,
  CalendarDays,
  LifeBuoy,
  Send,
  Activity,
  ArrowUpRight,
  Database,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sliders,
  Plus,
  FileCheck,
  Eye,
  BellRing,
  ExternalLink,
  Image as ImageIcon,
  FileText,
} from 'lucide-react'
import { getDownloadPresignedUrl } from '../../lib/r2Client'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { seedClientDataDirectly } from '../../lib/seedDatabase'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

export function AdminDashboard() {
  const { user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()
  const [seeding, setSeeding] = useState(false)

  // Real data states from Firestore
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [meetings, setMeetings] = useState([])
  const [tickets, setTickets] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  // Verify payment proof modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [selectedInvoiceForVerify, setSelectedInvoiceForVerify] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingMode, setRejectingMode] = useState(false)
  const [submittingPaymentVerify, setSubmittingPaymentVerify] = useState(false)


  // Update project progress modal state
  const [progressModalOpen, setProgressModalOpen] = useState(false)
  const [selectedProjectForProgress, setSelectedProjectForProgress] = useState(null)
  const [progressForm, setProgressForm] = useState({
    completionPercentage: 0,
    status: 'in_progress',
    nextActions: '',
    blockers: '',
  })
  const [updatingProgress, setUpdatingProgress] = useState(false)

  const handleOpenProgressModal = (p) => {
    setSelectedProjectForProgress(p)
    setProgressForm({
      completionPercentage: p.completionPercentage || 0,
      status: p.status || 'in_progress',
      nextActions: p.nextActions || '',
      blockers: p.blockers || '',
    })
    setProgressModalOpen(true)
  }

  const handleSaveProgress = async (e) => {
    e.preventDefault()
    if (!selectedProjectForProgress) return
    setUpdatingProgress(true)

    try {
      const percentage = Math.min(100, Math.max(0, Number(progressForm.completionPercentage) || 0))
      const newStatus = percentage === 100 ? 'completed' : progressForm.status

      await updateDoc(doc(db, 'projects', selectedProjectForProgress.id), {
        completionPercentage: percentage,
        status: newStatus,
        nextActions: progressForm.nextActions || '',
        blockers: progressForm.blockers || '',
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Progress for "${selectedProjectForProgress.name}" updated to ${percentage}%`)
      setProgressModalOpen(false)
    } catch (err) {
      console.error('Progress update error:', err)
      showError(err.message || 'Failed to update progress')
    } finally {
      setUpdatingProgress(false)
    }
  }

  const handleVerifyAndMarkPaid = async (inv) => {
    if (!inv) return
    setSubmittingPaymentVerify(true)
    try {
      const total = Number(inv.totalAmount || inv.total || 0)
      await updateDoc(doc(db, 'invoices', inv.id), {
        status: 'paid',
        amountPaid: total,
        balanceDue: 0,
        paidAt: new Date().toISOString(),
        verifiedBy: user?.email || 'admin@wwi.org.in',
        verifiedByName: userProfile?.displayName || userProfile?.name || 'WWI Admin',
        paymentVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Payment verified! Invoice ${inv.invoiceNumber} recorded as PAID.`)
      setVerifyModalOpen(false)
      setSelectedInvoiceForVerify(null)
    } catch (err) {
      showError(err.message || 'Failed to verify payment proof')
    } finally {
      setSubmittingPaymentVerify(false)
    }
  }

  const handleRejectProof = async (inv) => {
    if (!inv) return
    if (!rejectionReason.trim()) {
      showError('Please specify a rejection reason for the client.')
      return
    }
    setSubmittingPaymentVerify(true)
    try {
      await updateDoc(doc(db, 'invoices', inv.id), {
        status: 'payment_rejected',
        paymentRejectionReason: rejectionReason.trim(),
        paymentRejectedAt: new Date().toISOString(),
        paymentRejectedBy: user?.email,
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Payment proof for ${inv.invoiceNumber} rejected.`)
      setVerifyModalOpen(false)
      setSelectedInvoiceForVerify(null)
      setRejectionReason('')
      setRejectingMode(false)
    } catch (err) {
      showError(err.message || 'Failed to reject payment proof')
    } finally {
      setSubmittingPaymentVerify(false)
    }
  }

  useEffect(() => {
    // 1. Clients
    const unsubClients = onSnapshot(collection(db, 'organizations'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setClients(list)
    })

    // 2. Projects
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    // 3. Invoices
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setInvoices(list)
    })

    // 4. Meetings
    const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setMeetings(list)
    })

    // 5. Support Tickets
    const unsubTickets = onSnapshot(collection(db, 'supportTickets'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setTickets(list)
    })

    // 6. Submissions
    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setSubmissions(list)
    })

    // 7. Recent Activity
    const actQuery = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(10))
    const unsubActivity = onSnapshot(actQuery, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setActivity(list)
      setLoading(false)
    }, () => {
      setLoading(false)
    })

    return () => {
      unsubClients()
      unsubProjects()
      unsubInvoices()
      unsubMeetings()
      unsubTickets()
      unsubSubmissions()
      unsubActivity()
    }
  }, [])

  // Calculated business metrics
  const activeClientsCount = clients.filter((c) => c.status !== 'suspended').length
  const activeProjectsCount = projects.filter((p) => p.status === 'in_progress' || p.status === 'planning').length
  
  // Outstanding invoices and overdue amounts
  const unpaidInvoices = invoices.filter((i) => ['issued', 'overdue', 'partially_paid'].includes(i.status))
  const totalOutstandingINR = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue !== undefined ? inv.balanceDue : (Number(inv.totalAmount) - Number(inv.amountPaid || 0))) || 0), 0)
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue')
  const overdueTotalINR = overdueInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue || inv.totalAmount) || 0), 0)

  // Upcoming meetings
  const upcomingMeetings = meetings.filter((m) => m.status === 'confirmed' || m.status === 'requested')
  const openTickets = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed')
  const pendingApprovals = submissions.filter((s) => s.status === 'submitted' || s.status === 'under_review')

  // Invoices with pending payment proof awaiting verification
  const pendingPaymentInvoices = invoices.filter(
    (i) => i.status === 'payment_submitted' || (i.paymentProofUploadedAt && i.status !== 'paid' && i.status !== 'payment_rejected')
  )

  // Chart data
  const invoiceChartData = [
    { name: 'Paid', amount: invoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0) },
    { name: 'Outstanding', amount: totalOutstandingINR },
    { name: 'Overdue', amount: overdueTotalINR },
  ]

  const handleSeedDatabase = async () => {
    if (!user) return
    setSeeding(true)
    try {
      await seedClientDataDirectly(user)
      showSuccess('Live database seeded with enterprise test records!')
    } catch (err) {
      console.error('Seed error:', err)
      showError(err.message || 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        description="Real-time operational metrics across client accounts, contracts, deliverables, and invoices."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/admin/clients">
              <Button variant="outline" size="sm" icon={Building2}>
                New Client
              </Button>
            </Link>
            <Link to="/admin/projects">
              <Button variant="outline" size="sm" icon={FolderKanban}>
                New Project
              </Button>
            </Link>
            <Link to="/admin/invoices">
              <Button variant="primary" size="sm" icon={CreditCard}>
                Issue Invoice
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Clients */}
        <Link to="/admin/clients" className="block group">
          <Card className="transition-all hover:border-wwi-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Active Clients</span>
              <Building2 className="w-4 h-4 text-wwi-muted group-hover:text-wwi-text transition" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-wwi-text">{activeClientsCount}</span>
              <span className="text-[11px] text-wwi-muted">organizations</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>Total accounts: {clients.length}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>

        {/* Active Projects */}
        <Link to="/admin/projects" className="block group">
          <Card className="transition-all hover:border-wwi-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Active Projects</span>
              <FolderKanban className="w-4 h-4 text-wwi-muted group-hover:text-wwi-text transition" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-wwi-text">{activeProjectsCount}</span>
              <span className="text-[11px] text-wwi-muted">in development</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>All projects: {projects.length}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>

        {/* Outstanding Receivables */}
        <Link to="/admin/invoices" className="block group">
          <Card className="transition-all hover:border-wwi-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Outstanding Balance</span>
              <CreditCard className="w-4 h-4 text-wwi-muted group-hover:text-wwi-text transition" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-wwi-text">
                {formatCurrencyINR(totalOutstandingINR, false)}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-red-600 flex items-center justify-between font-medium">
              <span>Overdue: {formatCurrencyINR(overdueTotalINR, false)}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>

        {/* Action Items */}
        <div className="block group">
          <Card className="transition-all hover:border-wwi-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Pending Attention</span>
              <div className="flex items-center gap-1.5">
                {pendingPaymentInvoices.length > 0 && (
                  <span className="relative flex h-2.5 w-2.5" title="Payment proofs awaiting verification">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-wwi-text">
                {openTickets.length + pendingPaymentInvoices.length}
              </span>
              <span className="text-[11px] text-wwi-muted">action items</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span className={pendingPaymentInvoices.length > 0 ? 'text-amber-700 font-semibold' : ''}>
                {pendingPaymentInvoices.length > 0
                  ? `${pendingPaymentInvoices.length} payment proof(s) to verify`
                  : `${openTickets.length} open tickets & call requests`}
              </span>
              <Link to="/admin/invoices?filter=proof_uploaded" className="text-neutral-400 hover:text-wwi-text">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Payment Proofs Awaiting Verification - Action Section */}
      {pendingPaymentInvoices.length > 0 && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <BellRing className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Action Required: {pendingPaymentInvoices.length} Client Payment Proof(s) Awaiting Verification
              </h3>
            </div>
            <Link
              to="/admin/invoices?filter=proof_uploaded"
              className="text-xs font-semibold text-amber-900 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              All Invoices →
            </Link>
          </div>

          <p className="text-xs text-amber-800 dark:text-amber-300">
            Clients have submitted settlement screenshots & bank reference numbers. Review the uploaded proof objects and record them as paid.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingPaymentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800/40 rounded-lg shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-wwi-text">
                      {inv.invoiceNumber}
                    </span>
                    <Badge variant="warning" size="xs">
                      Proof Uploaded
                    </Badge>
                  </div>
                  <div className="text-xs font-medium text-wwi-text mt-1 truncate">
                    {inv.organizationName || 'Client Org'}
                  </div>
                  <div className="text-[11px] text-wwi-muted truncate">
                    UTR / Ref: <span className="font-mono font-semibold text-wwi-text">{inv.paymentProofReference || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-wwi-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-wwi-muted block">Amount Claimed:</span>
                    <span className="font-mono font-bold text-green-700 dark:text-green-400 text-xs">
                      {formatCurrencyINR(inv.paymentProofAmount || inv.totalAmount)}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="xs"
                    icon={Eye}
                    onClick={() => {
                      setSelectedInvoiceForVerify(inv)
                      setRejectingMode(false)
                      setRejectionReason('')
                      setVerifyModalOpen(true)
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    Review & Verify
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Revenue & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Analytics & Active Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoicing Breakdown */}
          <Card
            title="Invoicing & Receivables (INR)"
            subtitle="Realtime distribution of billed, collected, and outstanding milestone payments"
          >
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoiceChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#666666" fontSize={11} tickLine={false} />
                  <YAxis stroke="#666666" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    formatter={(val) => [formatCurrencyINR(val), 'Amount']}
                    contentStyle={{ backgroundColor: '#111111', color: '#ffffff', borderRadius: 4, fontSize: 12, border: 'none' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {invoiceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#171717' : index === 1 ? '#737373' : '#DC2626'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Active Projects Quick Table */}
          <Card
            title="Active Client Projects"
            subtitle="Delivery status and milestone progress"
            action={
              <Link to="/admin/projects" className="text-xs text-wwi-muted hover:text-wwi-text font-medium">
                View all ({projects.length}) →
              </Link>
            }
            noPadding
          >
            <div className="divide-y divide-wwi-border">
              {projects.slice(0, 4).map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/projects/${p.id}`} className="text-xs font-semibold text-wwi-text hover:underline truncate">
                        {p.name}
                      </Link>
                      <Badge variant="neutral" size="xs">
                        {p.code || 'PRJ'}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-wwi-muted mt-0.5 truncate">
                      {p.organizationName} • Due: {p.targetCompletionDate || 'TBD'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 bg-wwi-surface rounded-full h-2 overflow-hidden border border-wwi-border">
                      <div
                        className="bg-wwi-dark h-full rounded-full transition-all duration-300"
                        style={{ width: `${p.completionPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-wwi-text w-8 text-right">
                      {p.completionPercentage || 0}%
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      icon={Sliders}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenProgressModal(p)
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="p-8 text-center space-y-3">
                  <div className="text-xs text-wwi-muted">
                    No active projects recorded. Start by registering an enterprise organization and creating a project.
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Link to="/admin/projects">
                      <Button variant="primary" size="sm" icon={Plus}>
                        Create Project
                      </Button>
                    </Link>
                    <Link to="/admin/clients">
                      <Button variant="secondary" size="sm" icon={Building2}>
                        Add Client Org
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Upcoming Meetings & Append-only Audit Activity */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <Card
            title="Scheduled Meetings"
            subtitle="Confirmed client consultation calls"
            action={
              <Link to="/admin/meetings" className="text-xs text-wwi-muted hover:text-wwi-text">
                Manage →
              </Link>
            }
            noPadding
          >
            <div className="divide-y divide-wwi-border">
              {upcomingMeetings.slice(0, 3).map((m) => (
                <div key={m.id} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-wwi-text truncate">{m.title || m.purpose}</span>
                    <Badge variant={m.status === 'confirmed' ? 'success' : 'warning'} size="xs">
                      {m.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-wwi-muted flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{formatDateKolkata(m.requestedDate, 'dd MMM, hh:mm a')}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate">
                    {m.organizationName || 'Client Org'}
                  </div>
                </div>
              ))}
              {upcomingMeetings.length === 0 && (
                <div className="p-6 text-center text-xs text-wwi-muted">
                  No upcoming meetings scheduled.
                </div>
              )}
            </div>
          </Card>

          {/* Real-time Audit Activity */}
          <Card
            title="System Activity & Audit"
            subtitle="Append-only log of privileged actions"
            action={
              <Link to="/admin/activity" className="text-xs text-wwi-muted hover:text-wwi-text">
                Full Log →
              </Link>
            }
            noPadding
          >
            <div className="divide-y divide-wwi-border max-h-96 overflow-y-auto">
              {activity.map((act) => (
                <div key={act.id} className="p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-wwi-text truncate">{act.action}</span>
                    <span className="text-neutral-400 shrink-0">{formatRelativeTime(act.timestamp)}</span>
                  </div>
                  <div className="text-[11px] text-wwi-muted truncate">
                    Actor: {act.actorEmail || 'System'}
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="p-6 text-center text-xs text-wwi-muted">
                  No audit logs recorded yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Update Project Progress Modal */}
      <Modal
        isOpen={progressModalOpen}
        onClose={() => setProgressModalOpen(false)}
        title={`Update Project Progress: ${selectedProjectForProgress?.name || ''}`}
        description="Modify the delivery completion percentage, current phase status, next actions, and blockers."
      >
        <form onSubmit={handleSaveProgress} className="space-y-4">
          <div className="p-3.5 bg-neutral-50 border border-wwi-border rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-wwi-text">Completion Percentage:</span>
              <span className="font-mono font-bold text-base text-wwi-text">
                {progressForm.completionPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressForm.completionPercentage}
              onChange={(e) => setProgressForm({ ...progressForm, completionPercentage: Number(e.target.value) })}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
              <span>0% (Not Started)</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% (Completed)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Exact Percentage (0-100)"
              type="number"
              min="0"
              max="100"
              required
              value={progressForm.completionPercentage}
              onChange={(e) => setProgressForm({ ...progressForm, completionPercentage: Number(e.target.value) })}
            />
            <Select
              label="Project Status"
              value={progressForm.status}
              onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
              options={[
                { value: 'planning', label: 'Planning & Discovery' },
                { value: 'in_progress', label: 'In Progress (Active)' },
                { value: 'in_review', label: 'In Client Review / UAT' },
                { value: 'completed', label: 'Completed & Delivered' },
                { value: 'on_hold', label: 'On Hold' },
              ]}
            />
          </div>

          <Input
            label="Next Immediate Actions"
            placeholder="e.g. Completing sprint 2 milestone and staging deployment"
            value={progressForm.nextActions}
            onChange={(e) => setProgressForm({ ...progressForm, nextActions: e.target.value })}
          />

          <Input
            label="Blockers / Attention Required (Optional)"
            placeholder="e.g. Awaiting client API keys or sign-off"
            value={progressForm.blockers}
            onChange={(e) => setProgressForm({ ...progressForm, blockers: e.target.value })}
          />

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setProgressModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={updatingProgress}>
              Save Progress Updates
            </Button>
          </div>
        </form>
      </Modal>

      {/* Audit & Verify Payment Proof Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => {
          setVerifyModalOpen(false)
          setSelectedInvoiceForVerify(null)
          setRejectingMode(false)
          setRejectionReason('')
        }}
        title={`Audit & Verify Payment Proof: ${selectedInvoiceForVerify?.invoiceNumber || ''}`}
        size="lg"
      >
        {selectedInvoiceForVerify && (
          <div className="space-y-4">
            {/* Invoice summary cards */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-wwi-border rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-wwi-muted block">Client Organization:</span>
                <span className="font-semibold text-wwi-text truncate block">
                  {selectedInvoiceForVerify.organizationName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-wwi-muted block">Total Billed:</span>
                <span className="font-mono font-semibold text-wwi-text">
                  {formatCurrencyINR(selectedInvoiceForVerify.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-wwi-muted block">Due Date:</span>
                <span className="text-wwi-text">{formatDateKolkata(selectedInvoiceForVerify.dueDate, 'dd MMM yyyy')}</span>
              </div>
            </div>

            {/* Client Payment Claim Details */}
            <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <div className="font-semibold text-wwi-text flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <FileCheck className="w-4 h-4 text-green-600" />
                <span>Client Submission Details</span>
                {selectedInvoiceForVerify.paymentProofUploadedAt && (
                  <span className="text-[11px] text-wwi-muted font-normal ml-auto">
                    Uploaded: {formatDateKolkata(selectedInvoiceForVerify.paymentProofUploadedAt, 'dd MMM yyyy, hh:mm a')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-wwi-muted block text-[11px]">UTR / Bank Reference:</span>
                  <span className="font-mono font-bold text-wwi-text text-sm">
                    {selectedInvoiceForVerify.paymentProofReference || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-wwi-muted block text-[11px]">Amount Claimed Paid:</span>
                  <span className="font-mono font-bold text-green-700 dark:text-green-400 text-sm">
                    {formatCurrencyINR(selectedInvoiceForVerify.paymentProofAmount || selectedInvoiceForVerify.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-wwi-muted block text-[11px]">Payment Mode & Date:</span>
                  <span className="text-wwi-text font-medium">
                    {selectedInvoiceForVerify.paymentProofMode || 'Bank Wire'} • {formatDateKolkata(selectedInvoiceForVerify.paymentProofDate, 'dd MMM yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-wwi-muted block text-[11px]">Submitted By:</span>
                  <span className="text-wwi-text truncate block">
                    {selectedInvoiceForVerify.paymentProofUploadedByName || selectedInvoiceForVerify.paymentProofUploadedByEmail || 'Client Lead'}
                  </span>
                </div>
              </div>

              {selectedInvoiceForVerify.paymentProofNotes && (
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-wwi-muted">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Client Remarks: </span>
                  {selectedInvoiceForVerify.paymentProofNotes}
                </div>
              )}
            </div>

            {/* Screenshot Preview Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-wwi-text flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-neutral-500" />
                  Uploaded Payment Screenshot / Receipt:
                </span>
                {(selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl) && (
                  <a
                    href={selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Full Image
                  </a>
                )}
              </div>

              {selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl ? (
                <div className="p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-900/5 dark:bg-neutral-950 flex items-center justify-center max-h-72 overflow-hidden">
                  <img
                    src={selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl}
                    alt="Payment Screenshot"
                    className="max-h-72 object-contain rounded shadow-sm cursor-pointer"
                    onClick={() => {
                      const url = selectedInvoiceForVerify.paymentProofDataUrl || selectedInvoiceForVerify.paymentProofUrl
                      if (url) window.open(url, '_blank')
                    }}
                  />
                </div>
              ) : selectedInvoiceForVerify.paymentProofKey ? (
                <div className="p-4 bg-wwi-surface rounded-lg border border-wwi-border text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neutral-500" />
                    <div>
                      <div className="font-semibold text-wwi-text">
                        {selectedInvoiceForVerify.paymentProofFileName || 'Payment Proof in Cloudflare R2'}
                      </div>
                      <div className="text-[11px] text-wwi-muted">Storage Key: {selectedInvoiceForVerify.paymentProofKey}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const url = await getDownloadPresignedUrl(selectedInvoiceForVerify.paymentProofKey)
                        if (url) window.open(url, '_blank')
                        else showError('Proof object not found in storage.')
                      } catch (err) {
                        showError(err.message)
                      }
                    }}
                  >
                    Download Object
                  </Button>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-wwi-muted border border-dashed rounded-lg">
                  No visual screenshot attached with this submission. Verify transaction via bank statement.
                </div>
              )}
            </div>

            {/* Rejection Form Mode */}
            {rejectingMode ? (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-red-900 dark:text-red-300 block">
                  Specify Rejection Reason (visible to client):
                </span>
                <input
                  type="text"
                  placeholder="e.g. UTR reference not reflected in HDFC bank statement. Please verify and re-upload."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-red-300 dark:border-red-800 rounded px-3 py-1.5 text-xs text-wwi-text focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setRejectingMode(false)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={submittingPaymentVerify}
                    onClick={() => handleRejectProof(selectedInvoiceForVerify)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            ) : (
              /* Modal Footer Action Buttons */
              <div className="pt-3 border-t border-wwi-border flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingMode(true)}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
                >
                  Reject Proof
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setVerifyModalOpen(false)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    loading={submittingPaymentVerify}
                    onClick={() => handleVerifyAndMarkPaid(selectedInvoiceForVerify)}
                    className="bg-green-700 hover:bg-green-800 text-white font-semibold"
                  >
                    Verify & Record as Paid
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
