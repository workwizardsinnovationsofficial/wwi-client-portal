import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Public Firebase client configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB25XH6sua_qkKNn_QNZP3u8uqc_xf8TWY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'client-portal-9326.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'client-portal-9326',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'client-portal-9326.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '437012768834',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:437012768834:web:3fab63a88b0ff6705f25db',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-FS2D2YHWEE',
}

// Ensure singleton instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)

// Optional emulator connection for development & automated tests
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    console.info('Connected to Firebase local emulators')
  } catch (e) {
    // Already connected or emulators not reachable
  }
}

export default app
