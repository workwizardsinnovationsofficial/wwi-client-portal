import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { useAuth } from '../../context/AuthContext'
import { FolderKanban, ExternalLink, Calendar, MessageSquare } from 'lucide-react'

export function ClientProjectsList() {
  const { organizationId } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    const q = query(collection(db, 'projects'), where('organizationId', '==', organizationId))
    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
      setLoading(false)
    }, () => setLoading(false))

    return () => unsub()
  }, [organizationId])

  const columns = [
    {
      header: 'Project Code & Title',
      render: (p) => (
        <div>
          <Link
            to={`/portal/projects/${p.id}`}
            className="font-semibold text-wwi-text hover:underline flex items-center gap-1.5"
          >
            {p.name}
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{p.code || 'PRJ'}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (p) => <span className="text-wwi-muted">{p.category || 'Software'}</span>,
    },
    {
      header: 'Status',
      render: (p) => (
        <Badge variant={p.status === 'completed' ? 'success' : 'dark'} size="xs">
          {p.status}
        </Badge>
      ),
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
      header: 'Actions',
      cellClassName: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/portal/projects/${p.id}`}>
            <Button variant="secondary" size="sm">
              View Details
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned Projects"
        description="Track current roadmap, milestone delivery progress, and engineering updates."
      />

      <Card noPadding>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={projects}
            emptyMessage="No active projects assigned to your organization."
          />
        )}
      </Card>
    </div>
  )
}
