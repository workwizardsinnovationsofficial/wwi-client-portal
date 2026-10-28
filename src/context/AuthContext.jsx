import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, onSnapshot, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { ROLES, IS_ADMIN_ROLE, IS_EXECUTIVE_ADMIN } from '../lib/firestoreSchema'

const AuthContext = createContext(null)

function ensureIdTokenMethod(userObj) {
  if (!userObj) return null
  if (typeof userObj.getIdToken !== 'function') {
    userObj.getIdToken = async () => 'master_admin_session_token'
  }
  return userObj
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wwi_active_session')
      return saved ? ensureIdTokenMethod(JSON.parse(saved)) : null
    } catch {
      return null
    }
  })
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem('wwi_user_profile')
      return savedProfile ? JSON.parse(savedProfile) : null
    } catch {
      return null
    }
  })
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let unsubscribeDoc = null

    // Restore saved session (master admin or client session)
    const savedSession = localStorage.getItem('wwi_active_session')
    const savedProfile = localStorage.getItem('wwi_user_profile')

    if (savedSession && savedProfile) {
      try {
        const parsedUser = ensureIdTokenMethod(JSON.parse(savedSession))
        const parsedProfile = JSON.parse(savedProfile)
        setUser(parsedUser)
        setUserProfile(parsedProfile)
        setLoading(false)

        // Load organization profile if associated
        if (parsedProfile.organizationId) {
          getDoc(doc(db, 'organizations', parsedProfile.organizationId))
            .then((orgSnap) => {
              if (orgSnap.exists()) {
                setOrganization({ id: orgSnap.id, ...orgSnap.data() })
              }
            })
            .catch((orgErr) => console.warn('Org restore notice:', orgErr))
        }

        // Sync with Firestore live document
        const userRef = doc(db, 'users', parsedUser.uid)
        unsubscribeDoc = onSnapshot(
          userRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const freshData = { id: snapshot.id, ...snapshot.data() }
              if (freshData.isSuspended) {
                setAuthError('Your account has been suspended. Please contact Work Wizards Innovations administration.')
                localStorage.removeItem('wwi_active_session')
                localStorage.removeItem('wwi_user_profile')
                setUser(null)
                setUserProfile(null)
                setOrganization(null)
                return
              }
              setUserProfile(freshData)
              if (freshData.organizationId) {
                try {
                  const orgSnap = await getDoc(doc(db, 'organizations', freshData.organizationId))
                  if (orgSnap.exists()) {
                    setOrganization({ id: orgSnap.id, ...orgSnap.data() })
                  }
                } catch (e) {
                  // non-blocking
                }
              }
            }
          },
          (err) => {
            console.warn('Realtime snapshot notice:', err)
          }
        )
      } catch (e) {
        console.error('Session restore error:', e)
        setLoading(false)
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError(null)

      if (firebaseUser) {
        setUser(firebaseUser)

        // Realtime listener for the user profile document in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid)
        if (unsubscribeDoc) unsubscribeDoc()
        unsubscribeDoc = onSnapshot(
          userRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data()

              if (data.isSuspended) {
                setAuthError('Your account has been suspended. Please contact Work Wizards Innovations administration.')
                await signOut(auth)
                localStorage.removeItem('wwi_active_session')
                localStorage.removeItem('wwi_user_profile')
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
              const isMaster = firebaseUser.email?.includes('wwi-admin-9326')
              const initialRole = isMaster ? ROLES.SUPER_ADMIN : ROLES.CLIENT

              setUserProfile({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                role: initialRole,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
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
        // Only clear if not in an active local session
        if (!localStorage.getItem('wwi_active_session')) {
          setUser(null)
          setUserProfile(null)
          setOrganization(null)
          if (unsubscribeDoc) unsubscribeDoc()
        }
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

    const rawInput = (loginInput || '').trim()
    const inputLower = rawInput.toLowerCase()
    const cleanPassword = (password || '').trim()

    let normalizedEmail = rawInput
    if (!normalizedEmail.includes('@')) {
      normalizedEmail = `${inputLower}@wwi.org.in`
    }

    const isMasterAdmin =
      (inputLower === 'wwi-admin-9326' ||
        inputLower === 'wwi-admin-9326@wwi.org.in' ||
        normalizedEmail.toLowerCase() === 'wwi-admin-9326@wwi.org.in') &&
      password === 'wwiPVTLTD@9326'

    // 1. Guaranteed Master Admin sign-in
    if (isMasterAdmin) {
      const adminUser = {
        uid: 'wwi-admin-9326',
        email: 'wwi-admin-9326@wwi.org.in',
        displayName: 'WWI Admin',
      }
      const adminProfile = {
        id: 'wwi-admin-9326',
        email: 'wwi-admin-9326@wwi.org.in',
        username: 'wwi-admin-9326',
        name: 'WWI Executive Admin',
        displayName: 'WWI Admin',
        role: ROLES.SUPER_ADMIN,
        isStaff: true,
        organizationId: null,
        isSuspended: false,
      }

      let activeUser = adminUser

      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
        if (userCredential?.user) {
          activeUser = userCredential.user
        }
      } catch (err) {
        if (
          err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential'
        ) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
            if (userCredential?.user) {
              activeUser = userCredential.user
            }
          } catch {
            // Fall back to active master admin user
          }
        }
      }

      ensureIdTokenMethod(activeUser)
      setUser(activeUser)
      setUserProfile(adminProfile)
      localStorage.setItem('wwi_active_session', JSON.stringify(activeUser))
      localStorage.setItem('wwi_user_profile', JSON.stringify(adminProfile))

      try {
        await setDoc(doc(db, 'users', activeUser.uid), adminProfile, { merge: true })
      } catch (docErr) {
        console.warn('Firestore master admin sync notice:', docErr)
      }

      return activeUser
    }

    // 2. Standard sign-in for client and team users: Try Firebase Auth if email provided
    if (rawInput.includes('@')) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, rawInput, password)
        if (userCredential?.user) {
          const currentUser = ensureIdTokenMethod(userCredential.user)
          localStorage.removeItem('wwi_active_session')
          localStorage.removeItem('wwi_user_profile')

          // Check if profile exists in Firestore
          try {
            const snap = await getDoc(doc(db, 'users', currentUser.uid))
            if (snap.exists()) {
              const data = snap.data()
              setUserProfile({ id: snap.id, ...data })
              if (data.organizationId) {
                const orgSnap = await getDoc(doc(db, 'organizations', data.organizationId))
                if (orgSnap.exists()) {
                  setOrganization({ id: orgSnap.id, ...orgSnap.data() })
                }
              }
            }
          } catch (e) {
            console.warn('Profile fetch notice:', e)
          }

          return currentUser
        }
      } catch (err) {
        // Fall through to Firestore credential check below
      }
    }

    // 3. Resilient Firestore Lookup (supports Email, Username, Name, or Organization Identifier)
    try {
      let matchedDoc = null

      // Fast indexed queries
      const queries = [
        query(collection(db, 'users'), where('email', '==', rawInput)),
        query(collection(db, 'users'), where('email', '==', inputLower)),
        query(collection(db, 'users'), where('username', '==', inputLower)),
        query(collection(db, 'users'), where('name', '==', rawInput)),
      ]

      for (const q of queries) {
        try {
          const snap = await getDocs(q)
          if (!snap.empty) {
            matchedDoc = snap.docs[0]
            break
          }
        } catch (qErr) {
          // continue
        }
      }

      // If not found yet, perform case-insensitive scan of users collection
      if (!matchedDoc) {
        try {
          const allUsersSnap = await getDocs(collection(db, 'users'))
          matchedDoc = allUsersSnap.docs.find((d) => {
            const u = d.data()
            return (
              (u.email && u.email.toLowerCase() === inputLower) ||
              (u.username && u.username.toLowerCase() === inputLower) ||
              (u.name && u.name.toLowerCase() === inputLower) ||
              (u.displayName && u.displayName.toLowerCase() === inputLower)
            )
          })

          // Check if login input is an Organization Identifier
          if (!matchedDoc) {
            const orgsSnap = await getDocs(collection(db, 'organizations'))
            const matchedOrg = orgsSnap.docs.find((o) => {
              const org = o.data()
              return (
                (org.identifier && org.identifier.toLowerCase() === inputLower) ||
                (org.officialEmail && org.officialEmail.toLowerCase() === inputLower) ||
                (org.name && org.name.toLowerCase() === inputLower)
              )
            })

            if (matchedOrg) {
              matchedDoc = allUsersSnap.docs.find(
                (d) => d.data().organizationId === matchedOrg.id && d.data().role === 'client'
              )
            }
          }
        } catch (scanErr) {
          console.warn('Users scan notice:', scanErr)
        }
      }

      if (!matchedDoc) {
        throw new Error(`Account not found for "${rawInput}". Please check your username or official email.`)
      }

      const userData = matchedDoc.data()

      if (userData.isSuspended) {
        throw new Error('Your account has been suspended. Please contact Work Wizards Innovations administration.')
      }

      // Check assigned password or temporary password
      const assignedPassword = userData.password || userData.temporaryPassword
      const isPasswordValid =
        assignedPassword &&
        (String(assignedPassword).trim() === cleanPassword || String(assignedPassword) === password)

      if (!isPasswordValid) {
        throw new Error('Incorrect password. Please verify and try again.')
      }

      // Load organization profile if associated
      let orgData = null
      if (userData.organizationId) {
        try {
          const orgSnap = await getDoc(doc(db, 'organizations', userData.organizationId))
          if (orgSnap.exists()) {
            orgData = { id: orgSnap.id, ...orgSnap.data() }
            setOrganization(orgData)
          }
        } catch (orgErr) {
          console.warn('Organization load notice:', orgErr)
        }
      }

      const clientUser = ensureIdTokenMethod({
        uid: matchedDoc.id,
        email: userData.email,
        displayName: userData.displayName || userData.name || userData.username || 'Client',
        role: userData.role || 'client',
      })

      const profile = {
        id: matchedDoc.id,
        ...userData,
        organizationName: orgData?.name || userData.organizationName || 'Client Workspace',
      }

      setUser(clientUser)
      setUserProfile(profile)
      localStorage.setItem('wwi_active_session', JSON.stringify(clientUser))
      localStorage.setItem('wwi_user_profile', JSON.stringify(profile))

      return clientUser
    } catch (lookupErr) {
      throw lookupErr
    }
  }

  const logout = async () => {
    localStorage.removeItem('wwi_active_session')
    localStorage.removeItem('wwi_user_profile')
    try {
      await signOut(auth)
    } catch (err) {
      console.warn('SignOut error:', err)
    }
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
