import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'
import { logActivity } from '../_lib/audit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, name = 'Super Admin', secretKey } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const expectedSecret = process.env.BOOTSTRAP_SECRET_KEY || 'wwi_super_secret_bootstrap_token_2026'
  const fbAdmin = getFirebaseAdmin()
  const auth = fbAdmin.auth()
  const db = fbAdmin.firestore()

  try {
    // Check if any super_admin already exists
    const existingAdmins = await db.collection('users')
      .where('role', '==', 'super_admin')
      .limit(1)
      .get()

    if (!existingAdmins.empty && secretKey !== expectedSecret) {
      return res.status(403).json({
        error: 'A Super Admin already exists. A valid secretKey is required to provision additional administrators.',
      })
    }

    // Check if user already exists in Firebase Auth
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(email)
      // Update password
      await auth.updateUser(userRecord.uid, {
        password,
        displayName: name,
      })
    } catch (e) {
      // User doesn't exist yet, create
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
      })
    }

    // Set custom claims for role-based authorization
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'super_admin',
    })

    // Upsert Firestore user record
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      displayName: name,
      role: 'super_admin',
      isStaff: true,
      organizationId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSuspended: false,
    }, { merge: true })

    await logActivity({
      actorUid: userRecord.uid,
      actorEmail: email,
      actorRole: 'super_admin',
      action: 'BOOTSTRAP_SUPER_ADMIN',
      entityType: 'user',
      entityId: userRecord.uid,
      metadata: { email, name },
    })

    return res.status(200).json({
      success: true,
      message: `Super Admin successfully provisioned for ${email}`,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: 'super_admin',
      },
    })
  } catch (err) {
    console.error('Bootstrap error:', err)
    return res.status(500).json({ error: err.message || 'Bootstrap failed' })
  }
}
