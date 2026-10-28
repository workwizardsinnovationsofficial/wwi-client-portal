import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatCurrencyINR, formatDateKolkata } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { FileText, ShieldCheck } from 'lucide-react'

export function ClientContractsList() {
  const { organizationId } = useAuth()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'contracts'),
      where('organizationId', '==', organizationId)
    )

    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setContracts(list)
      setLoading(false)
    }, () => setLoading(false))

    return () => unsub()
  }, [organizationId])

  const columns = [
    {
      header: 'Contract Reference & Title',
      render: (c) => (
        <div>
          <div className="font-semibold text-wwi-text">{c.title}</div>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{c.contractNumber}</div>
        </div>
      ),
    },
    {
      header: 'Term Duration',
      render: (c) => (
        <div className="text-xs text-wwi-muted">
          <span>{formatDateKolkata(c.startDate, 'dd MMM yyyy')}</span>
          <span className="mx-1.5">to</span>
          <span>{formatDateKolkata(c.endDate, 'dd MMM yyyy')}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (c) => (
        <Badge variant={c.status === 'active' ? 'success' : 'neutral'} size="xs">
          {c.status?.toUpperCase() || 'ACTIVE'}
        </Badge>
      ),
    },
    {
      header: 'Scope Summary',
      render: (c) => (
        <p className="text-xs text-wwi-muted line-clamp-2 max-w-md">
          {c.scopeDescription || 'Enterprise service delivery terms & SLA schedule.'}
        </p>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts & Master Agreements"
        description="Review active Master Service Agreements (MSA) and Statements of Work (SOW) executed with Work Wizards Innovations."
      />

      <Card noPadding>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={3} cols={4} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={contracts}
            emptyMessage="No contracts found for your organization."
          />
        )}
      </Card>
    </div>
  )
}
