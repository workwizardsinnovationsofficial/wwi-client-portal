import { authenticateRequest } from '../_lib/authMiddleware.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await authenticateRequest(req, res)
  if (!user) return

  let organization = null
  if (user.organizationId) {
    try {
      const fbAdmin = getFirebaseAdmin()
      const orgDoc = await fbAdmin.firestore().collection('organizations').doc(user.organizationId).get()
      if (orgDoc.exists) {
        organization = { id: orgDoc.id, ...orgDoc.data() }
      }
    } catch (err) {
      console.warn('Could not fetch organization:', err.message)
    }
  }

  return res.status(200).json({
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.name || user.email.split('@')[0],
      role: user.role || 'client',
      organizationId: user.organizationId || null,
      organization,
    },
  })
}
