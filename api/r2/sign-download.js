import { authenticateRequest } from '../_lib/authMiddleware.js'
import { createPresignedDownloadUrl } from '../_lib/r2Server.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'
import { logActivity } from '../_lib/audit.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const caller = await authenticateRequest(req, res)
  if (!caller) return

  const { key } = req.query || {}

  if (!key) {
    return res.status(400).json({ error: 'Object key is required' })
  }

  // If local fallback key or documents key, return null so frontend serves dataUrl
  if (key.startsWith('local/') || key.startsWith('documents/')) {
    return res.status(200).json({
      downloadUrl: null,
      isLocal: true,
    })
  }

  try {
    const { downloadUrl, expiresIn } = await createPresignedDownloadUrl({
      key,
      expiresIn: 600, // 10 minutes
    })

    try {
      await logActivity({
        actorUid: caller.uid,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: 'R2_SIGN_DOWNLOAD',
        entityType: 'file',
        entityId: key,
      })
    } catch {
      // non-fatal
    }

    return res.status(200).json({
      downloadUrl,
      expiresIn,
    })
  } catch (err) {
    console.warn('R2 download presign error:', err.message)
    return res.status(200).json({
      downloadUrl: null,
      isLocal: true,
      message: 'Direct Cloudflare storage not configured for this object.',
    })
  }
}
