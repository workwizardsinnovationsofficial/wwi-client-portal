import { authenticateRequest } from '../_lib/authMiddleware.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'
import { logActivity } from '../_lib/audit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const caller = await authenticateRequest(req, res, ['super_admin', 'admin'])
  if (!caller) return

  const { organizationId, email, name, role = 'client', temporaryPassword } = req.body || {}

  if (!organizationId || !email || !name) {
    return res.status(400).json({ error: 'organizationId, email, and name are required' })
  }

  const fbAdmin = getFirebaseAdmin()
  const auth = fbAdmin.auth()
  const db = fbAdmin.firestore()

  try {
    // Verify organization exists
    const orgDoc = await db.collection('organizations').doc(organizationId).get()
    if (!orgDoc.exists) {
      return res.status(404).json({ error: 'Organization not found' })
    }
    const orgData = orgDoc.data()

    // 1. Create or retrieve Firebase Auth user
    let userRecord
    let isNewUser = false
    try {
      userRecord = await auth.getUserByEmail(email)
    } catch (e) {
      isNewUser = true
      userRecord = await auth.createUser({
        email,
        displayName: name,
        password: temporaryPassword || Math.random().toString(36).slice(-10) + 'A1!',
        emailVerified: true,
      })
    }

    // 2. Set Custom User Claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      organizationId,
    })

    // 3. Upsert Firestore user document
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      displayName: name,
      role,
      organizationId,
      organizationName: orgData.name,
      isStaff: false,
      invitedBy: caller.uid,
      invitedByEmail: caller.email,
      invitedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSuspended: false,
    }, { merge: true })

    // 4. Generate Password Reset / Invitation Setup Link
    let setupLink = null
    try {
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
      const actionCodeSettings = {
        url: `${appBaseUrl}/login`,
        handleCodeInApp: false,
      }
      setupLink = await auth.generatePasswordResetLink(email, actionCodeSettings)
    } catch (linkErr) {
      console.warn('Could not generate Firebase action link:', linkErr.message)
    }

    // 5. Audit Log
    await logActivity({
      actorUid: caller.uid,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: 'INVITE_CLIENT_USER',
      entityType: 'user',
      entityId: userRecord.uid,
      metadata: {
        organizationId,
        organizationName: orgData.name,
        clientEmail: email,
        clientName: name,
        role,
      },
    })

    return res.status(200).json({
      success: true,
      message: `Client invitation generated for ${email}`,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name,
        role,
        organizationId,
      },
      inviteLink: setupLink,
      emailDelivered: false, // Email provider can be configured via RESEND_API_KEY
    })
  } catch (err) {
    console.error('Invite error:', err)
    return res.status(500).json({ error: err.message || 'Invitation failed' })
  }
}
