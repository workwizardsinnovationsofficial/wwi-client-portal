import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Input } from '../../components/common/Input'
import { Modal } from '../../components/common/Modal'
import { formatDateKolkata } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Plus,
  Save,
  MessageSquare,
  FileBox,
  Trash2,
  AlertCircle,
  Eye,
  Lock,
} from 'lucide-react'

export function ProjectDetail() {
  const { projectId } = useParams()
  const { showSuccess, showError } = useToast()

  const [project, setProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)

  // Status & notes states
  const [clientNotes, setClientNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [blockers, setBlockers] = useState('')
  const [nextActions, setNextActions] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Milestone modal state
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false)
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    plannedDate: '',
  })

  useEffect(() => {
    // 1. Fetch project document
    const unsubProject = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setProject({ id: snap.id, ...data })
        setClientNotes(data.clientNotes || '')
        setInternalNotes(data.internalNotes || '')
        setBlockers(data.blockers || '')
        setNextActions(data.nextActions || '')
      }
      setLoading(false)
    })

    // 2. Fetch milestones for this project
    const qMilestones = query(collection(db, 'milestones'), where('projectId', '==', projectId))
    const unsubMilestones = onSnapshot(qMilestones, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || ''))
      setMilestones(list)
    })

    // 3. Fetch deliverables for this project
    const qDeliverables = query(collection(db, 'deliverables'), where('projectId', '==', projectId))
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

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        clientNotes,
        internalNotes,
        blockers,
        nextActions,
        updatedAt: new Date().toISOString(),
      })
      showSuccess('Project updates and notes synchronized.')
    } catch (err) {
      showError(err.message || 'Failed to update notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleAddMilestone = async (e) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'milestones'), {
        projectId,
        organizationId: project.organizationId,
        title: newMilestone.title,
        description: newMilestone.description,
        plannedDate: newMilestone.plannedDate,
        status: 'pending',
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
      })
      showSuccess('Milestone added.')
      setMilestoneModalOpen(false)
      setNewMilestone({ title: '', description: '', plannedDate: '' })
    } catch (err) {
      showError(err.message || 'Failed to add milestone')
    }
  }

  const handleToggleMilestone = async (m) => {
    const isCompleted = m.status === 'completed'
    const newStatus = isCompleted ? 'in_progress' : 'completed'
    const actualDate = isCompleted ? null : new Date().toISOString().split('T')[0]

    try {
      await updateDoc(doc(db, 'milestones', m.id), {
        status: newStatus,
        actualDate,
        completionPercentage: isCompleted ? 50 : 100,
        updatedAt: new Date().toISOString(),
      })

      // Recalculate project overall percentage
      const otherCompleted = milestones.filter((item) => item.id !== m.id && item.status === 'completed').length
      const totalMilestones = milestones.length
      const newTotalCompleted = otherCompleted + (isCompleted ? 0 : 1)
      const overallPercent = totalMilestones > 0 ? Math.round((newTotalCompleted / totalMilestones) * 100) : 0

      await updateDoc(doc(db, 'projects', projectId), {
        completionPercentage: overallPercent,
        status: overallPercent === 100 ? 'completed' : 'in_progress',
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      showError(err.message)
    }
  }

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      await deleteDoc(doc(db, 'milestones', milestoneId))
      showSuccess('Milestone deleted.')
    } catch (err) {
      showError(err.message)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-wwi-muted">Loading project...</div>
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-xs text-wwi-muted">
        Project not found. <Link to="/admin/projects" className="underline">Back to projects</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.code || 'PRJ'} • Client: ${project.organizationName} • Target: ${project.targetCompletionDate || 'TBD'}`}
        breadcrumbs={[
          { label: 'Projects', to: '/admin/projects' },
          { label: project.name },
        ]}
        badge={
          <Badge variant={project.status === 'completed' ? 'success' : 'neutral'}>
            {project.status?.toUpperCase()}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/admin/messages">
              <Button variant="secondary" size="sm" icon={MessageSquare}>
                Open Project Chat
              </Button>
            </Link>
            <Link to="/admin/deliverables">
              <Button variant="primary" size="sm" icon={FileBox}>
                Manage Files
              </Button>
            </Link>
          </div>
        }
      />

      {/* Progress & Milestone Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Milestones Roadmap */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title={`Project Milestones (${milestones.filter((m) => m.status === 'completed').length}/${milestones.length})`}
            subtitle="Completion dictates overall project progress"
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setMilestoneModalOpen(true)}
              >
                Add Milestone
              </Button>
            }
            noPadding
          >
            {/* Progress bar */}
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
                  <div
                    key={m.id}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-neutral-50 transition"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleMilestone(m)}
                        className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-wwi-dark border-wwi-dark text-white'
                            : 'bg-white border-wwi-border hover:border-wwi-dark text-transparent'
                        }`}
                        title={isCompleted ? 'Mark in progress' : 'Mark completed'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <div className={`text-xs font-semibold ${isCompleted ? 'line-through text-wwi-muted' : 'text-wwi-text'}`}>
                          {idx + 1}. {m.title}
                        </div>
                        {m.description && (
                          <p className="text-[11px] text-wwi-muted mt-0.5">{m.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                          <span>Planned: {m.plannedDate || 'TBD'}</span>
                          {m.actualDate && (
                            <span className="text-green-600 font-medium">• Delivered: {m.actualDate}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="text-neutral-400 hover:text-red-600 p-1 rounded transition"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
              {milestones.length === 0 && (
                <div className="p-8 text-center text-xs text-wwi-muted">
                  No milestones added yet. Add milestones to track deliverables and calculate progress.
                </div>
              )}
            </div>
          </Card>

          {/* Blockers & Next Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card title="Current Blockers">
              <textarea
                rows={3}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="List technical or client approval impediments..."
                className="w-full bg-neutral-50 border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
              />
            </Card>

            <Card title="Next Actions">
              <textarea
                rows={3}
                value={nextActions}
                onChange={(e) => setNextActions(e.target.value)}
                placeholder="Upcoming sprint goals or deployment targets..."
                className="w-full bg-neutral-50 border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
              />
            </Card>
          </div>
        </div>

        {/* Right Col: Client-Visible Notes vs Internal Notes */}
        <div className="space-y-6">
          <Card
            title="Client-Visible Updates"
            subtitle="Displayed directly on the client's portal dashboard"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-green-700 font-medium">
                <Eye className="w-3.5 h-3.5" /> Client Portal Visible
              </div>
              <textarea
                rows={4}
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Updates visible to client authorized personnel..."
                className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
              />
            </div>
          </Card>

          <Card
            title="Private Internal Notes"
            subtitle="Internal WWI staff only • Never exposed to clients"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                <Lock className="w-3.5 h-3.5" /> WWI Staff Confidential
              </div>
              <textarea
                rows={4}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal engineering discussions, margin estimates, or team notes..."
                className="w-full bg-neutral-50 border border-wwi-border rounded p-2.5 text-xs text-wwi-text focus:outline-none focus:border-wwi-dark resize-none"
              />
            </div>
          </Card>

          <Button
            variant="primary"
            size="md"
            icon={Save}
            loading={savingNotes}
            onClick={handleSaveNotes}
            className="w-full"
          >
            Save All Updates
          </Button>
        </div>
      </div>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={milestoneModalOpen}
        onClose={() => setMilestoneModalOpen(false)}
        title="Add Project Milestone"
        description="Define a delivery checkpoint. Milestones calculate progress automatically."
      >
        <form onSubmit={handleAddMilestone} className="space-y-4">
          <Input
            label="Milestone Title"
            required
            placeholder="e.g. Phase 2: Database Schema & Migration Scripts"
            value={newMilestone.title}
            onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
          />

          <Input
            label="Scope Description"
            placeholder="Key deliverables included in this milestone"
            value={newMilestone.description}
            onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
          />

          <Input
            label="Planned Delivery Date"
            type="date"
            required
            value={newMilestone.plannedDate}
            onChange={(e) => setNewMilestone({ ...newMilestone, plannedDate: e.target.value })}
          />

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setMilestoneModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Milestone
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
