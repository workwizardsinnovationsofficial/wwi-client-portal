import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Table } from '../../components/common/Table'
import { Badge } from '../../components/common/Badge'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatDateKolkata, formatBytes } from '../../lib/utils'
import { getDownloadPresignedUrl } from '../../lib/r2Client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  FileBox,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'

export function ClientDeliverablesList() {
  const { organizationId } = useAuth()
  const { showSuccess, showError, showWarning } = useToast()

  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    // Explicitly query ONLY client_visible deliverables for this organization
    const q = query(
      collection(db, 'deliverables'),
      where('organizationId', '==', organizationId),
      where('visibility', '==', 'client_visible')
    )

    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setDeliverables(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    return () => unsub()
  }, [organizationId])

  const handleDownload = async (item) => {
    setDownloadingId(item.id)
    try {
      const downloadUrl = await getDownloadPresignedUrl(item.storageKey)
      window.open(downloadUrl, '_blank')
    } catch (err) {
      if (err.message.includes('credentials') || err.message.includes('503')) {
        showWarning('Cloudflare R2 private storage credentials are being configured by your system administrator.')
      } else {
        showError(err.message || 'Download failed')
      }
    } finally {
      setDownloadingId(null)
    }
  }

  const filtered = deliverables.filter((d) => {
    return (
      d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const columns = [
    {
      header: 'Deliverable Title & File',
      render: (d) => (
        <div>
          <div className="font-semibold text-wwi-text flex items-center gap-1.5">
            {d.title}
            <span className="text-[10px] font-mono px-1 rounded bg-neutral-100 text-neutral-600">
              v{d.version || '1.0'}
            </span>
          </div>
          <div className="text-[11px] text-wwi-muted mt-0.5 flex items-center gap-2">
            <span>{d.fileName}</span>
            <span>•</span>
            <span>{formatBytes(d.fileSize)}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (d) => <Badge variant="neutral" size="xs">{d.category || 'General'}</Badge>,
    },
    {
      header: 'Project Association',
      render: (d) => <span className="text-wwi-text">{d.projectName || 'Organization Wide'}</span>,
    },
    {
      header: 'Published Date',
      render: (d) => (
        <span className="text-wwi-muted text-xs">{formatDateKolkata(d.createdAt, 'dd MMM yyyy')}</span>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (d) => (
        <Button
          variant="primary"
          size="sm"
          icon={Download}
          loading={downloadingId === d.id}
          onClick={() => handleDownload(d)}
        >
          Download
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliverables & Technical Documentation"
        description="Access and download approved architecture blueprints, integration guides, and software release packages."
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex items-center justify-between">
          <div className="relative w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deliverables by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded pl-8 pr-3 py-1.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Secure Cloudflare R2 transfer</span>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filtered}
            emptyMessage="No deliverables published for your organization yet."
          />
        )}
      </Card>
    </div>
  )
}
