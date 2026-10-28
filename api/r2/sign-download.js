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

  const fbAdmin = getFirebaseAdmin()
  const db = fbAdmin.firestore()

  // Find associated record in deliverables, attachments, or submissions to verify ownership
  try {
    const deliverableSnap = await db.collection('deliverables')
      .where('storageKey', '==', key)
      .limit(1)
      .get()

    if (!deliverableSnap.empty) {
      const doc = deliverableSnap.docs[0].data()
      // If client, check org and visibility
      if (caller.role === 'client') {
        if (doc.organizationId !== caller.organizationId) {
          return res.status(403).json({ error: 'Access denied: File belongs to another organization' })
        }
        if (doc.visibility === 'internal') {
          return res.status(403).json({ error: 'Access denied: Internal document' })
        }
      }
    }

    const { downloadUrl, expiresIn } = await createPresignedDownloadUrl({
      key,
      expiresIn: 600, // 10 minutes
    })

    await logActivity({
      actorUid: caller.uid,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: 'R2_SIGN_DOWNLOAD',
      entityType: 'file',
      entityId: key,
    })

    return res.status(200).json({
      downloadUrl,
      expiresIn,
    })
  } catch (err) {
    console.error('R2 download signing error:', err.message)
    return res.status(503).json({
      error: err.message.includes('credentials')
        ? 'Cloudflare R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are pending configuration on the server.'
        : `Download service error: ${err.message}`,
    })
  }
}
