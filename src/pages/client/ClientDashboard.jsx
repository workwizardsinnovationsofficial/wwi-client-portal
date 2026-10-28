import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { formatCurrencyINR, formatDateKolkata } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import {
  FolderKanban,
  CreditCard,
  FileBox,
  CalendarDays,
  LifeBuoy,
  Send,
  ArrowUpRight,
  Download,
  Clock,
  CheckCircle2,
} from 'lucide-react'

export function ClientDashboard() {
  const { organization, organizationId, userProfile } = useAuth()

  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    // 1. Projects belonging to this client org
    const qProjects = query(collection(db, 'projects'), where('organizationId', '==', organizationId))
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    // 2. Invoices belonging to this client org
    const qInvoices = query(collection(db, 'invoices'), where('organizationId', '==', organizationId))
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setInvoices(list)
    })

    // 3. Client visible deliverables
    const qDeliv = query(
      collection(db, 'deliverables'),
      where('organizationId', '==', organizationId),
      where('visibility', '==', 'client_visible')
    )
    const unsubDeliv = onSnapshot(qDeliv, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setDeliverables(list)
    })

    // 4. Meetings
    const qMeetings = query(collection(db, 'meetings'), where('organizationId', '==', organizationId))
    const unsubMeetings = onSnapshot(qMeetings, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setMeetings(list)
      setLoading(false)
    }, () => setLoading(false))

    return () => {
      unsubProjects()
      unsubInvoices()
      unsubDeliv()
      unsubMeetings()
    }
  }, [organizationId])

  // Computed metrics
  const activeProjects = projects.filter((p) => p.status === 'in_progress' || p.status === 'planning')
  const unpaidInvoices = invoices.filter((i) => ['issued', 'overdue', 'partially_paid'].includes(i.status))
  const totalBalanceDue = unpaidInvoices.reduce((sum, i) => sum + (Number(i.balanceDue !== undefined ? i.balanceDue : (Number(i.totalAmount) - Number(i.amountPaid || 0))) || 0), 0)
  const upcomingMeetings = meetings.filter((m) => m.status === 'confirmed' || m.status === 'requested')

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${userProfile?.displayName || userProfile?.name || 'Client'}`}
        description={`${organization?.name || 'Client Workspace'} • Dedicated project delivery portal`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/portal/meetings">
              <Button variant="secondary" size="sm" icon={CalendarDays}>
                Request Meeting
              </Button>
            </Link>
            <Link to="/portal/deliverables">
              <Button variant="primary" size="sm" icon={FileBox}>
                Post Document
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/portal/projects" className="block group">
          <Card className="hover:border-wwi-dark transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Active Engagements</span>
              <FolderKanban className="w-4 h-4 text-wwi-muted group-hover:text-wwi-text transition" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-wwi-text">{activeProjects.length}</span>
              <span className="text-[11px] text-wwi-muted">projects</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>View milestones & scope</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>

        <Link to="/portal/invoices" className="block group">
          <Card className="hover:border-wwi-dark transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Outstanding Invoices</span>
              <CreditCard className="w-4 h-4 text-wwi-muted group-hover:text-wwi-text transition" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-wwi-text">
                {formatCurrencyINR(totalBalanceDue, false)}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>{unpaidInvoices.length} unpaid milestone bills</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>

        <Link to="/portal/deliverables" className="block group">
          <Card className="hover:border-wwi-dark transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Approved Deliverables</span>
              <FileBox className="w-4 h-4 text-wwi-muted group-hover:text-wwi-text transition" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-wwi-text">{deliverables.length}</span>
              <span className="text-[11px] text-wwi-muted">published files</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>Specifications & reports</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>

        <Link to="/portal/meetings" className="block group">
          <Card className="hover:border-wwi-dark transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-wwi-muted">Scheduled Syncs</span>
              <CalendarDays className="w-4 h-4 text-wwi-muted group-hover:text-wwi-text transition" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-wwi-text">{upcomingMeetings.length}</span>
              <span className="text-[11px] text-wwi-muted">consultations</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>Upcoming Google Meet calls</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-wwi-text" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Main Grid: Active Projects & Recent Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Projects Progress Overview */}
          <Card
            title="My Active Projects"
            subtitle="Milestone delivery progress and current sprint notes"
            action={
              <Link to="/portal/projects" className="text-xs text-wwi-muted hover:text-wwi-text font-medium">
                View all ({projects.length}) →
              </Link>
            }
            noPadding
          >
            <div className="divide-y divide-wwi-border">
              {projects.map((p) => (
                <div key={p.id} className="p-5 hover:bg-neutral-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/portal/projects/${p.id}`} className="text-sm font-semibold text-wwi-text hover:underline">
                          {p.name}
                        </Link>
                        <Badge variant="neutral" size="xs">
                          {p.code || 'PRJ'}
                        </Badge>
                      </div>
                      <p className="text-xs text-wwi-muted mt-1 leading-relaxed">
                        {p.description || 'Enterprise software modernization engagement.'}
                      </p>
                      {p.clientNotes && (
                        <div className="mt-2 p-2.5 rounded bg-wwi-surface border border-wwi-border text-[11px] text-wwi-text">
                          <span className="font-semibold text-neutral-700">WWI Team Update: </span>
                          {p.clientNotes}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={p.status === 'completed' ? 'success' : 'dark'} size="xs">
                        {p.status}
                      </Badge>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="w-24 bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-wwi-dark h-full rounded-full"
                            style={{ width: `${p.completionPercentage || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-wwi-text">
                          {p.completionPercentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="p-8 text-center text-xs text-wwi-muted">
                  No active projects currently provisioned for your organization.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Recent Deliverables & Meeting */}
        <div className="space-y-6">
          {/* Latest Deliverables */}
          <Card
            title="Available Deliverables"
            subtitle="Secure document releases"
            action={
              <Link to="/portal/deliverables" className="text-xs text-wwi-muted hover:text-wwi-text font-medium">
                All Files →
              </Link>
            }
            noPadding
          >
            <div className="divide-y divide-wwi-border">
              {deliverables.slice(0, 4).map((d) => (
                <div key={d.id} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-wwi-text truncate">{d.title}</span>
                    <span className="text-[10px] font-mono text-neutral-400">v{d.version || '1.0'}</span>
                  </div>
                  <div className="text-[11px] text-wwi-muted flex items-center justify-between">
                    <span>{d.category}</span>
                    <span>{formatDateKolkata(d.createdAt, 'dd MMM')}</span>
                  </div>
                </div>
              ))}
              {deliverables.length === 0 && (
                <div className="p-6 text-center text-xs text-wwi-muted">
                  No deliverables published yet.
                </div>
              )}
            </div>
          </Card>

          {/* Quick Support / Chat Action */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-wwi-surface rounded border border-wwi-border text-wwi-text shrink-0">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-wwi-text">Need Technical Assistance?</h4>
                <p className="text-[11px] text-wwi-muted mt-0.5">
                  Our engineering team is available for scheduled architectural consultations and support requests.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link to="/portal/support">
                    <Button variant="secondary" size="sm">
                      Open Ticket
                    </Button>
                  </Link>
                  <Link to="/portal/messages">
                    <Button variant="primary" size="sm">
                      Project Chat
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
