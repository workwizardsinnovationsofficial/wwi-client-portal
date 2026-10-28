import { verifyAuthToken, getFirebaseAdmin } from './firebaseAdmin.js'

export async function authenticateRequest(req, res, allowedRoles = []) {
  try {
    const decodedToken = await verifyAuthToken(req)
    const uid = decodedToken.uid

    const fbAdmin = getFirebaseAdmin()
    const db = fbAdmin.firestore()
    const userDoc = await db.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      // User might be newly registered or token valid without firestore doc yet
      const role = decodedToken.role || 'client'
      const orgId = decodedToken.organizationId || null
      const user = {
        uid,
        email: decodedToken.email,
        role,
        organizationId: orgId,
      }
      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        res.status(403).json({ error: 'Access denied: Insufficient privileges' })
        return null
      }
      return user
    }

    const userData = userDoc.data()

    if (userData.isSuspended) {
      res.status(403).json({ error: 'Account suspended. Please contact WWI administration.' })
      return null
    }

    const effectiveRole = userData.role || decodedToken.role || 'client'
    const organizationId = userData.organizationId || decodedToken.organizationId || null

    if (allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
      res.status(403).json({ error: 'Access denied: Insufficient privileges' })
      return null
    }

    return {
      uid,
      email: decodedToken.email,
      ...userData,
      role: effectiveRole,
      organizationId,
    }
  } catch (err) {
    res.status(401).json({ error: err.message || 'Authentication failed' })
    return null
  }
}
