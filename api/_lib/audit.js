import { getFirebaseAdmin } from './firebaseAdmin.js'

/**
 * Record an immutable audit log entry into Cloud Firestore
 */
export async function logActivity({
  actorUid,
  actorEmail,
  actorRole,
  action,
  entityType,
  entityId,
  metadata = {},
}) {
  try {
    const fbAdmin = getFirebaseAdmin()
    const db = fbAdmin.firestore()
    
    // Sanitize metadata to never include sensitive credentials or secrets
    const safeMeta = { ...metadata }
    delete safeMeta.password
    delete safeMeta.token
    delete safeMeta.secret
    delete safeMeta.privateKey

    await db.collection('activityLogs').add({
      actorUid: actorUid || 'system',
      actorEmail: actorEmail || 'system@workwizards.in',
      actorRole: actorRole || 'system',
      action,
      entityType,
      entityId: entityId || null,
      metadata: safeMeta,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Audit log failed:', err.message)
    // Non-blocking, but logged
  }
}
