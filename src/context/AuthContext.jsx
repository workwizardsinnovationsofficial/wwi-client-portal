import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { ROLES, IS_ADMIN_ROLE, IS_EXECUTIVE_ADMIN } from '../lib/firestoreSchema'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let unsubscribeDoc = null

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError(null)

      if (firebaseUser) {
        setUser(firebaseUser)

        // Realtime listener for the user profile document in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid)
        unsubscribeDoc = onSnapshot(
          userRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data()

              if (data.isSuspended) {
                setAuthError('Your account has been suspended. Please contact Work Wizards Innovations administration.')
                await signOut(auth)
                setUser(null)
                setUserProfile(null)
                setOrganization(null)
                setLoading(false)
                return
              }

              setUserProfile({ id: snapshot.id, ...data })

              // If associated with an organization, fetch organization profile
              if (data.organizationId) {
                try {
                  const orgRef = doc(db, 'organizations', data.organizationId)
                  const orgSnap = await getDoc(orgRef)
                  if (orgSnap.exists()) {
                    setOrganization({ id: orgSnap.id, ...orgSnap.data() })
                  }
                } catch (orgErr) {
                  console.warn('Failed to load organization:', orgErr)
                }
              } else {
                setOrganization(null)
              }
            } else {
              // Minimal profile if document does not exist yet
              // Check if master admin
              const isMaster = firebaseUser.email?.includes('wwi-admin-9326')
              const initialRole = isMaster ? ROLES.SUPER_ADMIN : ROLES.CLIENT

              setUserProfile({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                role: initialRole,
                displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              })
            }
            setLoading(false)
          },
          (err) => {
            console.error('Firestore user snapshot error:', err)
            setLoading(false)
          }
        )
      } else {
        setUser(null)
        setUserProfile(null)
        setOrganization(null)
        if (unsubscribeDoc) unsubscribeDoc()
        setLoading(false)
      }
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeDoc) unsubscribeDoc()
    }
  }, [])

  const login = async (loginInput, password) => {
    setAuthError(null)

    let normalizedEmail = loginInput.trim()
    if (!normalizedEmail.includes('@')) {
      // Map username to official domain email for Firebase Auth
      normalizedEmail = `${normalizedEmail.toLowerCase()}@wwi.org.in`
    }

    const isMasterAdmin =
      (loginInput.trim().toLowerCase() === 'wwi-admin-9326' ||
        normalizedEmail === 'wwi-admin-9326@wwi.org.in') &&
      password === 'wwiPVTLTD@9326'

    let userCredential
    try {
      userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
    } catch (err) {
      // If master admin and not created yet, automatically provision in Firebase Auth!
      if (
        isMasterAdmin &&
        (err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/invalid-email')
      ) {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
        } catch (createErr) {
          throw err
        }
      } else {
        throw err
      }
    }

    const currentUser = userCredential.user

    // Ensure Master Admin always has super_admin profile in Firestore
    if (isMasterAdmin) {
      try {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            email: normalizedEmail,
            username: 'wwi-admin-9326',
            name: 'WWI Admin',
            displayName: 'WWI Admin',
            role: ROLES.SUPER_ADMIN,
            isStaff: true,
            organizationId: null,
            isSuspended: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      } catch (docErr) {
        console.warn('Could not upsert master admin profile doc:', docErr)
      }
    }

    return currentUser
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setUserProfile(null)
    setOrganization(null)
  }

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email)
  }

  const role = userProfile?.role || ROLES.CLIENT
  const isSuperAdmin = role === ROLES.SUPER_ADMIN
  const isExecutive = IS_EXECUTIVE_ADMIN(role)
  const isStaff = IS_ADMIN_ROLE(role)
  const isClient = role === ROLES.CLIENT
  const organizationId = userProfile?.organizationId || null

  const value = {
    user,
    userProfile,
    organization,
    role,
    organizationId,
    isSuperAdmin,
    isExecutive,
    isStaff,
    isClient,
    loading,
    authError,
    login,
    logout,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
