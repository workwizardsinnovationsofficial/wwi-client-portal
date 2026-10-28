import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatDateKolkata } from '../../lib/utils'
import { Activity, Search, ShieldCheck } from 'lucide-react'

export function ActivityAuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100))
    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setLogs(list)
      setLoading(false)
    }, (err) => {
      console.warn('Audit logs notice:', err.message)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filteredLogs = logs.filter((l) => {
    return (
      l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityType?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const columns = [
    {
      header: 'Timestamp (Asia/Kolkata)',
      render: (l) => (
        <span className="font-mono text-xs text-neutral-600">
          {formatDateKolkata(l.timestamp)}
        </span>
      ),
    },
    {
      header: 'Actor',
      render: (l) => (
        <div>
          <div className="font-semibold text-wwi-text">{l.actorEmail || 'System'}</div>
          <div className="text-[10px] text-neutral-400 capitalize">{l.actorRole}</div>
        </div>
      ),
    },
    {
      header: 'Action',
      render: (l) => (
        <span className="font-mono font-medium text-xs px-2 py-0.5 rounded bg-neutral-100 text-wwi-text border border-neutral-200">
          {l.action}
        </span>
      ),
    },
    {
      header: 'Target Entity',
      render: (l) => (
        <span className="text-xs text-wwi-muted">
          {l.entityType} {l.entityId ? `(${l.entityId})` : ''}
        </span>
      ),
    },
    {
      header: 'Context Metadata',
      render: (l) => (
        <span className="font-mono text-[11px] text-neutral-500 truncate max-w-xs block">
          {l.metadata ? JSON.stringify(l.metadata) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail & Security Log"
        description="Append-only immutable record of administrative operations, file transfers, invitations, and status changes."
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex items-center justify-between">
          <div className="relative w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit actions, actors, entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded pl-8 pr-3 py-1.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Tamper-evident system log</span>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredLogs}
            emptyMessage="No audit logs recorded yet."
          />
        )}
      </Card>
    </div>
  )
}
