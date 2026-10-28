import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore'
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
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  FileBox,
  UploadCloud,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  Plus,
  FileText,
  Info,
  Calendar,
  Layers,
  CheckCircle2,
  Eye,
} from 'lucide-react'

export function ClientDeliverablesList() {
  const { user, userProfile, organization, organizationId } = useAuth()
  const { showSuccess, showError, showWarning } = useToast()

  const [deliverables, setDeliverables] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSource, setFilterSource] = useState('all') // 'all' | 'client' | 'company'
  const [downloadingId, setDownloadingId] = useState(null)

  // Post Document Modal & Drawer State
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [posting, setPosting] = useState(false)
  const [fileToUpload, setFileToUpload] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    category: 'API Documentation (PDF / Specs)',
    projectId: '',
    version: '1.0',
    description: '',
    externalUrl: '',
  })

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    // 1. Fetch Deliverables
    const qDeliv = query(
      collection(db, 'deliverables'),
      where('organizationId', '==', organizationId),
      where('visibility', '==', 'client_visible')
    )

    const unsubDeliv = onSnapshot(qDeliv, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setDeliverables(list)
      setLoading(false)
    }, (err) => {
      showError(err.message)
      setLoading(false)
    })

    // 2. Fetch Projects for dropdown selection
    const qProj = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId)
    )
    const unsubProj = onSnapshot(qProj, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setProjects(list)
    })

    return () => {
      unsubDeliv()
      unsubProj()
    }
  }, [organizationId])

  const handlePostDocument = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      showError('Please provide a document title.')
      return
    }

    if (!fileToUpload && !formData.externalUrl.trim()) {
      showError('Please attach a file (PDF, DOCX, ZIP, etc.) or provide an external document URL.')
      return
    }

    setPosting(true)
    try {
      let r2Result = null
      let fileDataUrl = null

      if (fileToUpload) {
        // Read file as base64 data url for instant downloadability (if <= 2MB)
        try {
          fileDataUrl = await readFileAsDataUrl(fileToUpload)
        } catch {
          // non-fatal
        }

        try {
          r2Result = await uploadFileToR2(fileToUpload, {
            projectId: formData.projectId || 'general',
            organizationId,
            visibility: 'client_visible',
          })
        } catch (r2Err) {
          console.warn('R2 upload failed, saving metadata:', r2Err.message)
          r2Result = {
            key: `documents/${organizationId}/${Date.now()}_${fileToUpload.name}`,
            fileName: fileToUpload.name,
            fileSize: fileToUpload.size,
          }
        }
      }

      const selectedPrj = projects.find((p) => p.id === formData.projectId)

      // Store in deliverables with source: 'client'
      await addDoc(collection(db, 'deliverables'), {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        version: formData.version.trim() || '1.0',
        source: 'client',
        visibility: 'client_visible',
        organizationId,
        organizationName: organization?.name || 'Client Org',
        projectId: formData.projectId || null,
        projectName: selectedPrj?.name || 'Organization Wide',
        fileName: fileToUpload ? fileToUpload.name : (formData.externalUrl ? 'External Cloud Document' : 'Document'),
        fileSize: fileToUpload ? fileToUpload.size : 0,
        fileType: fileToUpload ? fileToUpload.type : 'link',
        storageKey: r2Result ? r2Result.key : null,
        fileDataUrl: fileDataUrl || null,
        externalUrl: formData.externalUrl.trim() || null,
        uploadedBy: user.uid,
        uploadedByName: userProfile?.displayName || userProfile?.name || user.email.split('@')[0],
        uploadedByEmail: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess(`Document "${formData.title}" posted to company successfully.`)
      setPostModalOpen(false)
      setFileToUpload(null)
      setFormData({
        title: '',
        category: 'API Documentation (PDF / Specs)',
        projectId: '',
        version: '1.0',
        description: '',
        externalUrl: '',
      })
    } catch (err) {
      showError(err.message || 'Failed to post document')
    } finally {
      setPosting(false)
    }
  }

  const handleDownload = async (item) => {
    // 1. If direct data URL is available (e.g. PDF uploaded by client or admin)
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

    // 2. If external cloud URL
    if (item.externalUrl && !item.storageKey) {
      window.open(item.externalUrl, '_blank')
      return
    }

    // 3. Otherwise try signed URL from R2
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

  const filtered = deliverables.filter((d) => {
    const matchesSearch =
      d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const isClientPost = d.source === 'client'
    const matchesSource =
      filterSource === 'all' ||
      (filterSource === 'client' && isClientPost) ||
      (filterSource === 'company' && !isClientPost)

    return matchesSearch && matchesSource
  })

  const clientPostCount = deliverables.filter((d) => d.source === 'client').length
  const companyReleaseCount = deliverables.filter((d) => d.source !== 'client').length

  const getCategoryBadge = (category) => {
    if (category?.toLowerCase().includes('api')) {
      return <Badge variant="dark" size="xs">API Specs (PDF)</Badge>
    }
    if (category?.toLowerCase().includes('review')) {
      return <Badge variant="success" size="xs">Review & Feedback</Badge>
    }
    if (category?.toLowerCase().includes('architecture') || category?.toLowerCase().includes('scope')) {
      return <Badge variant="warning" size="xs">Architecture</Badge>
    }
    return <Badge variant="neutral" size="xs">{category || 'General'}</Badge>
  }

  const columns = [
    {
      header: 'Document & Version',
      render: (d) => (
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDoc(d)}
              className="font-semibold text-wwi-text hover:underline text-left block"
            >
              {d.title}
            </button>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
              v{d.version || '1.0'}
            </span>
            {d.source === 'client' ? (
              <Badge variant="primary" size="xs">From Client (Us)</Badge>
            ) : (
              <Badge variant="neutral" size="xs">From WWI Company</Badge>
            )}
          </div>
          <div className="text-[11px] text-wwi-muted mt-1 flex items-center gap-2">
            <span>{d.fileName}</span>
            {d.fileSize > 0 && (
              <>
                <span>•</span>
                <span>{formatBytes(d.fileSize)}</span>
              </>
            )}
            {d.description && (
              <>
                <span>•</span>
                <span className="truncate max-w-xs italic text-neutral-500">"{d.description}"</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (d) => getCategoryBadge(d.category),
    },
    {
      header: 'Project Association',
      render: (d) => <span className="text-wwi-text text-xs">{d.projectName || 'Organization Wide'}</span>,
    },
    {
      header: 'Date',
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
            title="View Details"
          >
            Details
          </Button>

          {d.externalUrl && (
            <Button
              variant="outline"
              size="sm"
              icon={ExternalLink}
              onClick={() => window.open(d.externalUrl, '_blank')}
            >
              Link
            </Button>
          )}

          {(d.storageKey || d.fileDataUrl) && (
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              loading={downloadingId === d.id}
              onClick={() => handleDownload(d)}
            >
              Download
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliverables & Document Exchange"
        description="Share API specifications, updated review documents, and access technical packages released by WWI."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setPostModalOpen(true)}
          >
            Post Document to Company
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-wwi-border pb-3">
        <button
          type="button"
          onClick={() => setFilterSource('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            filterSource === 'all'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          All Documents ({deliverables.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSource('client')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            filterSource === 'client'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          Submitted by Us ({clientPostCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterSource('company')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            filterSource === 'company'
              ? 'bg-wwi-dark text-white'
              : 'bg-white text-wwi-muted hover:text-wwi-text border border-wwi-border'
          }`}
        >
          Company Releases ({companyReleaseCount})
        </button>
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-wwi-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents by title, API, category..."
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
            emptyMessage="No documents found. Use 'Post Document to Company' to share API specs, review documents, or blueprints."
          />
        )}
      </Card>

      {/* Post Document to Company Modal */}
      <Modal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        title="Post Document to Company (WWI)"
        description="Submit your API specifications (PDF), updated review docs, requirements, or architecture blueprints."
      >
        <form onSubmit={handlePostDocument} className="space-y-4">
          <Input
            label="Document Title"
            required
            placeholder="e.g. Payment Gateway APIs v2.4 (PDF) or Sprint 3 Review & Feedback"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Document Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'API Documentation (PDF / Specs)', label: 'API Documentation (PDF / Specs)' },
                { value: 'Updated Review & Feedback Doc', label: 'Updated Review & Feedback Doc' },
                { value: 'Technical Architecture & Scope', label: 'Technical Architecture & Scope' },
                { value: 'Requirements & Wireframes', label: 'Requirements & Wireframes' },
                { value: 'Database & Schema Definition', label: 'Database & Schema Definition' },
                { value: 'Other Documentation', label: 'Other Documentation' },
              ]}
            />

            <Select
              label="Associated Project"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              options={[
                { value: '', label: 'General / Organization Wide' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          <Input
            label="Version Tag"
            placeholder="e.g. 1.0, 2.1, or draft"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
          />

          {/* Details / Notes */}
          <div>
            <label className="block text-xs font-semibold text-wwi-text mb-1">
              Document Details & Notes
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add key details: e.g., list of API endpoints updated, review changes requested, security notes, or instructions for the WWI engineers..."
              className="w-full bg-white border border-wwi-border rounded p-2.5 text-xs text-wwi-text placeholder:text-neutral-400 focus:outline-none focus:border-wwi-dark"
            />
          </div>

          {/* Optional External URL */}
          <Input
            label="External Document / Postman / Cloud Link (Optional)"
            placeholder="https://drive.google.com/... or https://postman.com/..."
            value={formData.externalUrl}
            onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
          />

          {/* File input */}
          <div className="border border-dashed border-wwi-border rounded-lg p-4 text-center bg-wwi-surface/50">
            <input
              type="file"
              id="client-file-input"
              className="hidden"
              onChange={(e) => setFileToUpload(e.target.files[0] || null)}
            />
            <label htmlFor="client-file-input" className="cursor-pointer block">
              <UploadCloud className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              {fileToUpload ? (
                <div>
                  <div className="text-xs font-semibold text-wwi-text">{fileToUpload.name}</div>
                  <div className="text-[11px] text-wwi-muted">{formatBytes(fileToUpload.size)}</div>
                  <span className="inline-block mt-2 text-[10px] text-blue-600 font-medium">Click to choose another file</span>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-wwi-text">Click to attach file</div>
                  <div className="text-[11px] text-wwi-muted mt-0.5">PDF, DOCX, XLSX, ZIP, JSON, PNG (Max 50MB)</div>
                </div>
              )}
            </label>
          </div>

          <div className="pt-3 border-t border-wwi-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setPostModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={posting}>
              Post Document to Company
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Document Details Drawer */}
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
                  <Badge variant="primary" size="sm">Submitted by Client</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Company Release (WWI)</Badge>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-wwi-muted block">Posted Date</span>
                <span className="text-xs font-medium text-wwi-text">
                  {formatDateKolkata(selectedDoc.createdAt, 'dd MMM yyyy, hh:mm a')}
                </span>
              </div>
            </div>

            {/* Author Info */}
            <div className="p-3 bg-wwi-surface rounded border border-wwi-border space-y-1 text-xs">
              <div className="text-neutral-500">Uploaded by:</div>
              <div className="font-semibold text-wwi-text">{selectedDoc.uploadedByName || selectedDoc.publishedBy || 'User'}</div>
              <div className="text-neutral-400">{selectedDoc.uploadedByEmail}</div>
            </div>

            {/* Project association */}
            <div className="text-xs">
              <span className="text-wwi-muted font-medium block mb-1">Associated Project</span>
              <span className="text-wwi-text font-semibold">{selectedDoc.projectName || 'Organization Wide'}</span>
            </div>

            {/* Details & Notes */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-wwi-text uppercase tracking-wider">
                Document Details & Notes
              </h4>
              <div className="p-4 bg-white border border-wwi-border rounded-lg text-xs leading-relaxed text-wwi-text whitespace-pre-wrap">
                {selectedDoc.description || 'No additional details provided for this document.'}
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
                    Download
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
