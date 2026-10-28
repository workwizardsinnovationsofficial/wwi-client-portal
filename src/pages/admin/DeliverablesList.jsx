import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'
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
import { formatDateKolkata, formatBytes } from '../../lib/utils'
import { uploadFileToR2, getDownloadPresignedUrl } from '../../lib/r2Client'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  FileBox,
  UploadCloud,
  Download,
  Search,
  Eye,
  Lock,
  Trash2,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

export function DeliverablesList() {
  const { user } = useAuth()
  const { showSuccess, showError, showWarning } = useToast()

  const [deliverables, setDeliverables] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all')

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  // Upload Form
  const [fileToUpload, setFileToUpload] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical Specification',
    version: '1.0',
    visibility: 'client_visible',
    organizationId: '',
    projectId: '',
  })

  useEffect(() => {
    // 1. Fetch Deliverables
    const unsubDeliv = onSnapshot(collection(db, 'deliverables'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setDeliverables(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    // 2. Fetch Organizations & Projects
    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setOrganizations(list)
    })

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    return () => {
      unsubDeliv()
      unsubOrgs()
      unsubProjects()
    }
  }, [])

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!fileToUpload) {
      showError('Please select a file to upload.')
      return
    }

    setUploading(true)
    try {
      // 1. Upload to Cloudflare R2 bucket via server presigned PUT URL
      let r2Result = null
      try {
        r2Result = await uploadFileToR2(fileToUpload, {
          projectId: formData.projectId || 'general',
          organizationId: formData.organizationId,
          visibility: formData.visibility,
        })
      } catch (r2Err) {
        if (r2Err.message.includes('credentials') || r2Err.message.includes('R2_ACCESS_KEY_ID')) {
          showWarning('R2 credentials pending in server environment. Recording deliverable metadata in Firestore for tracking.')
          r2Result = {
            key: `projects/${formData.projectId || 'general'}/${Date.now()}_${fileToUpload.name}`,
            fileName: fileToUpload.name,
            fileSize: fileToUpload.size,
          }
        } else {
          throw r2Err
        }
      }

      const org = organizations.find((o) => o.id === formData.organizationId)
      const prj = projects.find((p) => p.id === formData.projectId)

      // 2. Store metadata in Firestore
      await addDoc(collection(db, 'deliverables'), {
        title: formData.title || fileToUpload.name,
        description: formData.description,
        category: formData.category,
        version: formData.version,
        visibility: formData.visibility,
        organizationId: formData.organizationId,
        organizationName: org?.name || 'Client Org',
        projectId: formData.projectId || null,
        projectName: prj?.name || null,
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        storageKey: r2Result.key,
        bucket: 'wwi-client-portal',
        publishedBy: user?.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Deliverable "${formData.title || fileToUpload.name}" successfully published.`)
      setUploadModalOpen(false)
      setFileToUpload(null)
      setFormData({
        title: '',
        description: '',
        category: 'Technical Specification',
        version: '1.0',
        visibility: 'client_visible',
        organizationId: '',
        projectId: '',
      })
    } catch (err) {
      showError(err.message || 'File upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (item) => {
    setDownloadingId(item.id)
    try {
      const downloadUrl = await getDownloadPresignedUrl(item.storageKey)
      window.open(downloadUrl, '_blank')
    } catch (err) {
      if (err.message.includes('credentials') || err.message.includes('503')) {
        showWarning('Cloudflare R2 bucket credentials (R2_ACCESS_KEY_ID) need to be configured in your environment to stream private binary objects.')
      } else {
        showError(err.message || 'Download failed')
      }
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deliverable record?')) return
    try {
      await deleteDoc(doc(db, 'deliverables', id))
      showSuccess('Deliverable removed.')
    } catch (err) {
      showError(err.message)
    }
  }

  const filteredDeliverables = deliverables.filter((d) => {
    const matchesSearch =
      d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVis = visibilityFilter === 'all' || d.visibility === visibilityFilter
    return matchesSearch && matchesVis
  })

  const columns = [
    {
      header: 'Deliverable & File',
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
      header: 'Client & Project',
      render: (d) => (
        <div>
          <div className="font-medium text-wwi-text">{d.organizationName}</div>
          <div className="text-[11px] text-wwi-muted">{d.projectName || 'General Deliverable'}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (d) => <Badge variant="neutral" size="xs">{d.category}</Badge>,
    },
    {
      header: 'Visibility',
      render: (d) => (
        <Badge variant={d.visibility === 'client_visible' ? 'success' : 'neutral'} size="xs">
          {d.visibility === 'client_visible' ? 'Client Visible' : 'Internal Staff Only'}
        </Badge>
      ),
    },
    {
      header: 'Uploaded Date',
      render: (d) => (
        <span className="text-wwi-muted text-xs">{formatDateKolkata(d.createdAt, 'dd MMM yyyy')}</span>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            loading={downloadingId === d.id}
            onClick={() => handleDownload(d)}
            title="Download via authorized signed URL"
          >
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(d.id)}
            title="Delete deliverable"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-600" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliverables & Document Sharing"
        description="Encrypted technical specifications, API documents, and release archives stored in private Cloudflare R2 bucket."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={UploadCloud}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Deliverable
          </Button>
        }
      />

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deliverables by title or filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-wwi-border rounded pl-8 pr-3 py-1.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-wwi-muted">Visibility:</span>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="bg-white border border-wwi-border rounded px-2.5 py-1 text-xs text-wwi-text focus:outline-none"
            >
              <option value="all">All Documents</option>
              <option value="client_visible">Client Visible</option>
              <option value="internal">Internal Only</option>
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
            data={filteredDeliverables}
            emptyMessage="No deliverables found matching filters."
          />
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Publish Deliverable to Cloudflare R2"
        description="Files are uploaded to private bucket wwi-client-portal via temporary presigned URLs."
      >
        <form onSubmit={handleFileUpload} className="space-y-4">
          <Input
            label="Deliverable Title"
            required
            placeholder="e.g. System Architecture Specification v2.1"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Client Organization"
              required
              value={formData.organizationId}
              onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
            />

            <Select
              label="Associated Project"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              options={[
                { value: '', label: 'General / Organization Wide' },
                ...projects
                  .filter((p) => !formData.organizationId || p.organizationId === formData.organizationId)
                  .map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Document Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Technical Specification', label: 'Technical Specification' },
                { value: 'API Documentation', label: 'API Documentation' },
                { value: 'Project Report', label: 'Project Report' },
                { value: 'Release Notes', label: 'Release Notes' },
                { value: 'Source Archive', label: 'Source Archive / ZIP' },
                { value: 'Security Audit', label: 'Security Audit' },
              ]}
            />

            <Select
              label="Audience Visibility"
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              options={[
                { value: 'client_visible', label: 'Client Visible (Publish to Portal)' },
                { value: 'internal', label: 'Internal Staff Only' },
              ]}
            />
          </div>

          <Input
            label="Version Tag"
            placeholder="1.0"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
          />

          {/* File input */}
          <div className="border border-dashed border-wwi-border rounded-lg p-4 text-center bg-wwi-surface/50">
            <input
              type="file"
              id="file-input"
              className="hidden"
              onChange={(e) => setFileToUpload(e.target.files[0] || null)}
            />
            <label htmlFor="file-input" className="cursor-pointer block">
              <UploadCloud className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              {fileToUpload ? (
                <div>
                  <div className="text-xs font-semibold text-wwi-text">{fileToUpload.name}</div>
                  <div className="text-[11px] text-wwi-muted">{formatBytes(fileToUpload.size)}</div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-wwi-text">Click to choose a file</div>
                  <div className="text-[11px] text-wwi-muted mt-0.5">PDF, DOCX, XLSX, ZIP, PNG, JSON (Max 50MB)</div>
                </div>
              )}
            </label>
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={uploading}>
              Upload & Publish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
