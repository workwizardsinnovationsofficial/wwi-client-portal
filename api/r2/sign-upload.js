import { authenticateRequest } from '../_lib/authMiddleware.js'
import { createPresignedUploadUrl } from '../_lib/r2Server.js'
import { logActivity } from '../_lib/audit.js'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'application/json',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const caller = await authenticateRequest(req, res)
  if (!caller) return

  const { fileName, fileType, fileSize, projectId, organizationId, visibility = 'client_visible' } = req.body || {}

  if (!fileName || !projectId) {
    return res.status(400).json({ error: 'fileName and projectId are required' })
  }

  // Check organization authorization
  if (caller.role === 'client') {
    if (caller.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied: Cannot upload to another organization' })
    }
  }

  // Validate size
  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({ error: 'File size exceeds maximum allowed limit of 50MB' })
  }

  // Sanitize filename and extract extension
  const cleanExt = (fileName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 10)
  const timestamp = Date.now()
  const key = `projects/${projectId}/${timestamp}_${randomSuffix}.${cleanExt}`

  try {
    const { uploadUrl, expiresIn } = await createPresignedUploadUrl({
      key,
      contentType: fileType || 'application/octet-stream',
      expiresIn: 900,
    })

    await logActivity({
      actorUid: caller.uid,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: 'R2_SIGN_UPLOAD',
      entityType: 'file',
      entityId: key,
      metadata: {
        fileName,
        fileSize,
        projectId,
        organizationId,
        visibility,
      },
    })

    return res.status(200).json({
      uploadUrl,
      key,
      expiresIn,
    })
  } catch (err) {
    console.error('R2 upload signing error:', err.message)
    return res.status(503).json({
      error: err.message.includes('credentials')
        ? 'Cloudflare R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are pending configuration on the server.'
        : `Upload service error: ${err.message}`,
    })
  }
}
