import admin from 'firebase-admin'

let initialized = false

/**
 * Initialize Firebase Admin SDK safely as a singleton in serverless environments
 */
export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'client-portal-9326'
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (privateKey) {
    // Replace literal '\n' with real newline characters
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  try {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      })
      initialized = true
    } else {
      // In development or when credentials are not yet supplied, try default app initialization
      admin.initializeApp({
        projectId,
      })
      initialized = true
    }
  } catch (err) {
    console.error('Firebase Admin initialization error:', err.message)
  }

  return admin
}

/**
 * Verify Firebase ID Token from Authorization header (Bearer <token>)
 */
export async function verifyAuthToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header')
  }

  const token = authHeader.split('Bearer ')[1].trim()
  const fbAdmin = getFirebaseAdmin()

  try {
    const decodedToken = await fbAdmin.auth().verifyIdToken(token)
    return decodedToken
  } catch (err) {
    throw new Error(`Invalid authentication token: ${err.message}`)
  }
}
