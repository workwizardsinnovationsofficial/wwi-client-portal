import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
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
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { seedClientDataDirectly } from '../../lib/seedDatabase'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

export function AdminDashboard() {
  const { user } = useAuth()
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
            {clients.length === 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={Database}
                loading={seeding}
                onClick={handleSeedDatabase}
              >
                Seed Sample Data
              </Button>
            )}
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
        <Link to="/admin/support" className="block group">
          <Card className="transition-all hover:border-wwi-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Pending Attention</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-wwi-text">{openTickets.length + pendingApprovals.length}</span>
              <span className="text-[11px] text-wwi-muted">items</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>{openTickets.length} tickets • {pendingApprovals.length} submissions</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>
      </div>

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
                        className="bg-wwi-dark h-full rounded-full"
                        style={{ width: `${p.completionPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-wwi-text w-8 text-right">
                      {p.completionPercentage || 0}%
                    </span>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="p-6 text-center text-xs text-wwi-muted">
                  No active projects recorded. Create a new project to start tracking milestones.
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
    </div>
  )
}
