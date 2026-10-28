import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, addDoc, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Select } from '../../components/common/Select'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { FolderKanban, Plus, Search, ExternalLink, Calendar, Users, Sliders } from 'lucide-react'

export function ProjectsList() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  const [projects, setProjects] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Progress modal state
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

  const [newProject, setNewProject] = useState({
    code: '',
    name: '',
    description: '',
    organizationId: '',
    category: 'Enterprise Software',
    startDate: '',
    targetCompletionDate: '',
    projectOwner: '',
    status: 'planning',
  })

  useEffect(() => {
    // 1. Fetch projects
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setProjects(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    // 2. Fetch organizations for dropdown
    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setOrganizations(list)
    })

    return () => {
      unsubProjects()
      unsubOrgs()
    }
  }, [])

  const handleCreateProject = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const selectedOrg = organizations.find((o) => o.id === newProject.organizationId)
      const projectCode = newProject.code || `PRJ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      await addDoc(collection(db, 'projects'), {
        ...newProject,
        code: projectCode,
        organizationName: selectedOrg?.name || 'Client Org',
        completionPercentage: 0,
        authorizedTeam: newProject.projectOwner ? [newProject.projectOwner] : [],
        clientNotes: 'Project scope established. Initial discovery in progress.',
        internalNotes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email,
      })

      showSuccess(`Project "${newProject.name}" created successfully.`)
      setCreateModalOpen(false)
      setNewProject({
        code: '',
        name: '',
        description: '',
        organizationId: '',
        category: 'Enterprise Software',
        startDate: '',
        targetCompletionDate: '',
        projectOwner: '',
        status: 'planning',
      })
    } catch (err) {
      showError(err.message || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'in_progress':
        return <Badge variant="dark">In Progress</Badge>
      case 'in_review':
        return <Badge variant="info">In Review</Badge>
      case 'on_hold':
        return <Badge variant="warning">On Hold</Badge>
      default:
        return <Badge variant="neutral">{status || 'Planning'}</Badge>
    }
  }

  const columns = [
    {
      header: 'Project Code & Name',
      render: (p) => (
        <div>
          <Link
            to={`/admin/projects/${p.id}`}
            className="font-semibold text-wwi-text hover:underline flex items-center gap-1.5"
          >
            {p.name}
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{p.code}</div>
        </div>
      ),
    },
    {
      header: 'Client Organization',
      render: (p) => (
        <span className="font-medium text-wwi-text">{p.organizationName || '—'}</span>
      ),
    },
    {
      header: 'Status',
      render: (p) => getStatusBadge(p.status),
    },
    {
      header: 'Progress',
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-wwi-surface rounded-full h-1.5 overflow-hidden border border-wwi-border">
            <div
              className="bg-wwi-dark h-full rounded-full"
              style={{ width: `${p.completionPercentage || 0}%` }}
            />
          </div>
          <span className="text-xs font-mono font-medium">{p.completionPercentage || 0}%</span>
        </div>
      ),
    },
    {
      header: 'Target Date',
      render: (p) => (
        <span className="text-wwi-muted text-xs">{p.targetCompletionDate || 'TBD'}</span>
      ),
    },
    {
      header: 'Lead',
      accessor: 'projectOwner',
      render: (p) => <span className="text-wwi-muted">{p.projectOwner || 'Unassigned'}</span>,
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            icon={Sliders}
            onClick={(e) => {
              e.stopPropagation()
              handleOpenProgressModal(p)
            }}
          >
            Progress
          </Button>
          <Link to={`/admin/projects/${p.id}`}>
            <Button variant="secondary" size="xs">
              Details
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects & Deliverables"
        description="Monitor software engineering milestones, target dates, team assignment, and progress."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            New Project
          </Button>
        }
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects by title, code, or client..."
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
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredProjects}
            emptyMessage="No matching projects found."
          />
        )}
      </Card>

      {/* New Project Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
        description="Provision an active client project with milestones and tracking."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name"
            required
            placeholder="e.g. Cloud ERP & Workflow Modernization"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Project Code"
              placeholder="e.g. PRJ-ERP-2026"
              helperText="Auto-generated if left blank"
              value={newProject.code}
              onChange={(e) => setNewProject({ ...newProject, code: e.target.value })}
            />

            <Select
              label="Client Organization"
              required
              value={newProject.organizationId}
              onChange={(e) => setNewProject({ ...newProject, organizationId: e.target.value })}
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
            />
          </div>

          <Input
            label="Detailed Scope / Description"
            placeholder="Key objectives, architectural scope, and deliverables"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={newProject.startDate}
              onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
            />
            <Input
              label="Target Completion Date"
              type="date"
              value={newProject.targetCompletionDate}
              onChange={(e) => setNewProject({ ...newProject, targetCompletionDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Project Lead / Owner"
              placeholder="e.g. Nikhil Verma (Lead)"
              value={newProject.projectOwner}
              onChange={(e) => setNewProject({ ...newProject, projectOwner: e.target.value })}
            />

            <Select
              label="Initial Status"
              value={newProject.status}
              onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'in_review', label: 'In Review' },
                { value: 'on_hold', label: 'On Hold' },
              ]}
            />
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

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
    </div>
  )
}
