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

    // 1. Create or retrieve Firebase Auth user (with graceful fallback)
    let userUid = null
    let userRecord = null
    const tempPass = temporaryPassword || Math.random().toString(36).slice(-8) + 'A1!'

    try {
      userRecord = await auth.getUserByEmail(email)
      userUid = userRecord.uid
    } catch (e) {
      try {
        userRecord = await auth.createUser({
          email,
          displayName: name,
          password: tempPass,
          emailVerified: true,
        })
        userUid = userRecord.uid
      } catch (authCreateErr) {
        console.warn('Firebase Auth user creation note (using Firestore profile):', authCreateErr.message)
        userUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      }
    }

    // 2. Set Custom User Claims if Firebase Auth user exists
    if (userRecord?.uid) {
      try {
        await auth.setCustomUserClaims(userRecord.uid, {
          role,
          organizationId,
        })
      } catch (claimErr) {
        console.warn('Custom claims note:', claimErr.message)
      }
    }

    // 3. Upsert Firestore user document
    const finalUsername = (req.body.username || email.split('@')[0] || 'client').trim().toLowerCase()
    const cleanEmail = email.trim().toLowerCase()

    await db.collection('users').doc(userUid).set({
      email: cleanEmail,
      username: finalUsername,
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
      temporaryPassword: tempPass,
      password: tempPass,
    }, { merge: true })

    // 4. Generate Password Reset / Invitation Setup Link
    let setupLink = null
    try {
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
      const actionCodeSettings = {
        url: `${appBaseUrl}/login`,
        handleCodeInApp: false,
      }
      setupLink = await auth.generatePasswordResetLink(cleanEmail, actionCodeSettings)
    } catch (linkErr) {
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
      setupLink = `${appBaseUrl}/login?email=${encodeURIComponent(cleanEmail)}`
    }

    // 5. Audit Log
    await logActivity({
      actorUid: caller.uid,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: 'INVITE_CLIENT_USER',
      entityType: 'user',
      entityId: userUid,
      metadata: {
        organizationId,
        organizationName: orgData.name,
        clientEmail: cleanEmail,
        clientUsername: finalUsername,
        clientName: name,
        role,
      },
    })

    return res.status(200).json({
      success: true,
      message: `Client credentials created for ${cleanEmail}`,
      user: {
        uid: userUid,
        email: cleanEmail,
        username: finalUsername,
        name,
        role,
        organizationId,
        password: tempPass,
      },
      temporaryPassword: tempPass,
      inviteLink: setupLink,
      emailDelivered: false,
    })
  } catch (err) {
    console.error('Invite error:', err)
    return res.status(500).json({ error: err.message || 'Invitation failed' })
  }
}
