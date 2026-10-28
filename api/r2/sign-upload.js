import { authenticateRequest } from '../_lib/authMiddleware.js'
import { createPresignedUploadUrl } from '../_lib/r2Server.js'
import { logActivity } from '../_lib/audit.js'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const caller = await authenticateRequest(req, res)
  if (!caller) return

  const { fileName, fileType, fileSize, projectId, organizationId, visibility = 'client_visible' } = req.body || {}

  if (!fileName) {
    return res.status(400).json({ error: 'fileName is required' })
  }

  const effectiveProjectId = projectId || 'general'

  // Check organization authorization if caller is client
  if (caller.role === 'client' && caller.organizationId && organizationId && caller.organizationId !== organizationId) {
    return res.status(403).json({ error: 'Access denied: Cannot upload to another organization' })
  }

  // Validate size
  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({ error: 'File size exceeds maximum allowed limit of 50MB' })
  }

  // Sanitize filename and extract extension
  const cleanExt = (fileName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 10)
  const timestamp = Date.now()
  const key = `projects/${effectiveProjectId}/${timestamp}_${randomSuffix}.${cleanExt}`

  try {
    const { uploadUrl, expiresIn } = await createPresignedUploadUrl({
      key,
      contentType: fileType || 'application/octet-stream',
      expiresIn: 900,
    })

    try {
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
          projectId: effectiveProjectId,
          organizationId,
          visibility,
        },
      })
    } catch (auditErr) {
      // non-fatal
    }

    return res.status(200).json({
      uploadUrl,
      key,
      expiresIn,
    })
  } catch (err) {
    console.warn('R2 presigned upload unavailable, using metadata key:', err.message)
    return res.status(200).json({
      uploadUrl: null,
      key,
      isLocalFallback: true,
      message: 'Cloudflare R2 direct endpoint unavailable. Storing document record locally in portal.',
    })
  }
}
