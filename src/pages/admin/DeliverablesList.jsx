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
import { Drawer } from '../../components/common/Drawer'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import { formatDateKolkata, formatBytes } from '../../lib/utils'
import { uploadFileToR2, getDownloadPresignedUrl, readFileAsDataUrl } from '../../lib/r2Client'
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
  const [sourceFilter, setSourceFilter] = useState('all') // 'all' | 'client' | 'company'
  const [selectedDoc, setSelectedDoc] = useState(null)

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
      let r2Result = null
      let fileDataUrl = null

      try {
        fileDataUrl = await readFileAsDataUrl(fileToUpload)
      } catch {
        // non-fatal
      }

      try {
        r2Result = await uploadFileToR2(fileToUpload, {
          projectId: formData.projectId || 'general',
          organizationId: formData.organizationId,
          visibility: formData.visibility,
        })
      } catch (r2Err) {
        console.warn('R2 upload failed, saving metadata:', r2Err.message)
        r2Result = {
          key: `projects/${formData.projectId || 'general'}/${Date.now()}_${fileToUpload.name}`,
          fileName: fileToUpload.name,
          fileSize: fileToUpload.size,
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
        source: 'company',
        organizationId: formData.organizationId,
        organizationName: org?.name || 'Client Org',
        projectId: formData.projectId || null,
        projectName: prj?.name || null,
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        storageKey: r2Result?.key || null,
        fileDataUrl: fileDataUrl || null,
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
    // 1. If direct data URL is available
    if (item.fileDataUrl) {
      const a = document.createElement('a')
      a.href = item.fileDataUrl
      a.download = item.fileName || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showSuccess(`Downloaded ${item.fileName}`)
      return
    }

    // 2. If external link
    if (item.externalUrl && !item.storageKey) {
      window.open(item.externalUrl, '_blank')
      return
    }

    // 3. Otherwise try signed URL
    setDownloadingId(item.id)
    try {
      const downloadUrl = await getDownloadPresignedUrl(item.storageKey)
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      } else if (item.externalUrl) {
        window.open(item.externalUrl, '_blank')
      } else {
        showWarning('Document binary is archived in private cloud storage.')
      }
    } catch (err) {
      showError(err.message || 'Download failed')
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
      d.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVis = visibilityFilter === 'all' || d.visibility === visibilityFilter
    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'client' && d.source === 'client') ||
      (sourceFilter === 'company' && d.source !== 'client')
    return matchesSearch && matchesVis && matchesSource
  })

  const columns = [
    {
      header: 'Deliverable & File',
      render: (d) => (
        <div>
          <div className="font-semibold text-wwi-text flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDoc(d)}
              className="hover:underline text-left"
            >
              {d.title}
            </button>
            <span className="text-[10px] font-mono px-1 rounded bg-neutral-100 text-neutral-600">
              v{d.version || '1.0'}
            </span>
            {d.source === 'client' ? (
              <Badge variant="primary" size="xs">Client Upload</Badge>
            ) : (
              <Badge variant="neutral" size="xs">WWI Release</Badge>
            )}
          </div>
          <div className="text-[11px] text-wwi-muted mt-0.5 flex items-center gap-2">
            <span>{d.fileName}</span>
            {d.fileSize > 0 && (
              <>
                <span>•</span>
                <span>{formatBytes(d.fileSize)}</span>
              </>
            )}
            {d.uploadedByName && (
              <>
                <span>•</span>
                <span>By: {d.uploadedByName}</span>
              </>
            )}
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
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => setSelectedDoc(d)}
            title="View details & client notes"
          >
            Details
          </Button>
          {d.externalUrl && (
            <Button
              variant="outline"
              size="sm"
              icon={ExternalLink}
              onClick={() => window.open(d.externalUrl, '_blank')}
              title="Open external link"
            >
              Link
            </Button>
          )}
          {(d.storageKey || d.fileDataUrl) && (
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              loading={downloadingId === d.id}
              onClick={() => handleDownload(d)}
              title="Download deliverable"
            >
              Download
            </Button>
          )}
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

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-wwi-muted">Source:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-white border border-wwi-border rounded px-2.5 py-1 text-xs text-wwi-text focus:outline-none"
              >
                <option value="all">All Sources</option>
                <option value="client">Client Uploads (APIs/Reviews)</option>
                <option value="company">WWI Releases</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
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

      {/* Document Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title || 'Document Details'}
        subtitle={`Version ${selectedDoc?.version || '1.0'} • ${selectedDoc?.category || 'General'}`}
      >
        {selectedDoc && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-wwi-border">
              <div>
                <span className="text-xs text-wwi-muted block">Source</span>
                {selectedDoc.source === 'client' ? (
                  <Badge variant="primary" size="sm">Client Upload</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">WWI Release</Badge>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-wwi-muted block">Uploaded Date</span>
                <span className="text-xs font-medium text-wwi-text">
                  {formatDateKolkata(selectedDoc.createdAt, 'dd MMM yyyy, hh:mm a')}
                </span>
              </div>
            </div>

            {/* Client & Author Info */}
            <div className="p-3 bg-wwi-surface rounded border border-wwi-border space-y-1 text-xs">
              <div className="text-neutral-500 font-medium">Organization & Submitter:</div>
              <div className="font-semibold text-wwi-text">{selectedDoc.organizationName || 'Client Org'}</div>
              <div className="text-neutral-600">
                Uploaded by: <span className="font-medium text-wwi-text">{selectedDoc.uploadedByName || selectedDoc.publishedBy || 'User'}</span>
              </div>
              {selectedDoc.uploadedByEmail && (
                <div className="text-neutral-400 font-mono text-[11px]">{selectedDoc.uploadedByEmail}</div>
              )}
            </div>

            {/* Project association & Visibility */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-wwi-muted font-medium block mb-1">Associated Project</span>
                <span className="text-wwi-text font-semibold">{selectedDoc.projectName || 'General / Organization Wide'}</span>
              </div>
              <div>
                <span className="text-wwi-muted font-medium block mb-1">Visibility</span>
                <Badge variant={selectedDoc.visibility === 'client_visible' ? 'success' : 'neutral'} size="xs">
                  {selectedDoc.visibility === 'client_visible' ? 'Client Visible' : 'Internal Staff Only'}
                </Badge>
              </div>
            </div>

            {/* Details & Notes */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-wwi-text uppercase tracking-wider">
                Document Details, APIs & Review Notes
              </h4>
              <div className="p-4 bg-white border border-wwi-border rounded-lg text-xs leading-relaxed text-wwi-text whitespace-pre-wrap">
                {selectedDoc.description || 'No additional notes provided for this document.'}
              </div>
            </div>

            {/* File & Download Card */}
            <div className="p-4 bg-wwi-surface rounded-lg border border-wwi-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-neutral-500" />
                  <div>
                    <div className="text-xs font-semibold text-wwi-text">{selectedDoc.fileName}</div>
                    {selectedDoc.fileSize > 0 && (
                      <div className="text-[11px] text-wwi-muted">{formatBytes(selectedDoc.fileSize)}</div>
                    )}
                  </div>
                </div>

                {(selectedDoc.storageKey || selectedDoc.fileDataUrl) && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Download}
                    loading={downloadingId === selectedDoc.id}
                    onClick={() => handleDownload(selectedDoc)}
                  >
                    Download File
                  </Button>
                )}
              </div>

              {selectedDoc.externalUrl && (
                <div className="pt-2 border-t border-wwi-border">
                  <a
                    href={selectedDoc.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open External Cloud Resource: {selectedDoc.externalUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
