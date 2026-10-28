import React, { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { formatDateKolkata } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileBox,
  Send,
  CalendarDays,
} from 'lucide-react'

export function ClientProjectDetail() {
  const { projectId } = useParams()
  const { organizationId } = useAuth()

  const [project, setProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch project doc
    const unsubProject = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setProject({ id: snap.id, ...data })
      }
      setLoading(false)
    })

    // 2. Fetch milestones
    const qMilestones = query(collection(db, 'milestones'), where('projectId', '==', projectId))
    const unsubMilestones = onSnapshot(qMilestones, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || ''))
      setMilestones(list)
    })

    // 3. Fetch client visible deliverables
    const qDeliverables = query(
      collection(db, 'deliverables'),
      where('projectId', '==', projectId),
      where('visibility', '==', 'client_visible')
    )
    const unsubDeliverables = onSnapshot(qDeliverables, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setDeliverables(list)
    })

    return () => {
      unsubProject()
      unsubMilestones()
      unsubDeliverables()
    }
  }, [projectId])

  if (loading) {
    return <div className="p-8 text-center text-xs text-wwi-muted">Loading project details...</div>
  }

  // Strict organization isolation check
  if (project && organizationId && project.organizationId !== organizationId) {
    return <Navigate to="/access-denied" replace />
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-xs text-wwi-muted">
        Project not found. <Link to="/portal/projects" className="underline">Back to projects</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.code || 'PRJ'} • Target Date: ${project.targetCompletionDate || 'TBD'}`}
        breadcrumbs={[
          { label: 'My Projects', to: '/portal/projects' },
          { label: project.name },
        ]}
        badge={
          <Badge variant={project.status === 'completed' ? 'success' : 'dark'}>
            {project.status?.toUpperCase()}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/portal/messages">
              <Button variant="secondary" size="sm" icon={MessageSquare}>
                Chat with Team
              </Button>
            </Link>
            <Link to="/portal/submissions">
              <Button variant="primary" size="sm" icon={Send}>
                Submit Feedback / Request
              </Button>
            </Link>
          </div>
        }
      />

      {/* Main Roadmap & Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Milestone Delivery Timeline */}
          <Card
            title="Project Milestones & Deliverables Roadmap"
            subtitle="Delivery checkpoints and acceptance status"
            noPadding
          >
            <div className="px-5 py-3 bg-wwi-surface border-b border-wwi-border flex items-center justify-between">
              <span className="text-xs font-semibold text-wwi-text">Overall Milestone Completion:</span>
              <div className="flex items-center gap-3">
                <div className="w-36 bg-neutral-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-wwi-dark h-full rounded-full transition-all duration-300"
                    style={{ width: `${project.completionPercentage || 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold font-mono">{project.completionPercentage || 0}%</span>
              </div>
            </div>

            <div className="divide-y divide-wwi-border">
              {milestones.map((m, idx) => {
                const isCompleted = m.status === 'completed'
                return (
                  <div key={m.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-wwi-dark border-wwi-dark text-white'
                            : 'bg-white border-wwi-border text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${isCompleted ? 'text-wwi-text' : 'text-wwi-text'}`}>
                          {idx + 1}. {m.title}
                        </div>
                        {m.description && (
                          <p className="text-[11px] text-wwi-muted mt-0.5">{m.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                          <span>Target: {m.plannedDate || 'TBD'}</span>
                          {m.actualDate && (
                            <span className="text-green-600 font-medium">• Delivered: {m.actualDate}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge variant={isCompleted ? 'success' : 'neutral'} size="xs">
                      {isCompleted ? 'Delivered' : 'In Development'}
                    </Badge>
                  </div>
                )
              })}
              {milestones.length === 0 && (
                <div className="p-8 text-center text-xs text-wwi-muted">
                  Milestones are being finalized by the engineering team.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Scope, Updates & Deliverables */}
        <div className="space-y-6">
          {/* Latest WWI Updates (Client visible notes) */}
          <Card title="WWI Engineering Updates">
            <div className="text-xs text-wwi-text leading-relaxed">
              {project.clientNotes ? (
                <p className="whitespace-pre-wrap">{project.clientNotes}</p>
              ) : (
                <p className="text-wwi-muted">No special notes published for this sprint.</p>
              )}
            </div>
          </Card>

          {/* Project Deliverables */}
          <Card
            title="Project Documents & Releases"
            subtitle={`${deliverables.length} files available for download`}
            action={
              <Link to="/portal/deliverables" className="text-xs text-wwi-muted hover:text-wwi-text">
                All Files →
              </Link>
            }
            noPadding
          >
            <div className="divide-y divide-wwi-border">
              {deliverables.map((d) => (
                <div key={d.id} className="p-3 text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-semibold text-wwi-text truncate">{d.title}</div>
                    <div className="text-[10px] text-neutral-400">{d.fileName}</div>
                  </div>
                  <Link to="/portal/deliverables">
                    <Button variant="outline" size="sm">
                      Get
                    </Button>
                  </Link>
                </div>
              ))}
              {deliverables.length === 0 && (
                <div className="p-4 text-center text-xs text-wwi-muted">
                  No deliverables attached to this project yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
