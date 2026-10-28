import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  LogOut,
  User,
  Shield,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '../common/Badge'
import { getInitials } from '../../lib/utils'
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export function Navbar({ onToggleMobileNav, title }) {
  const { user, userProfile, role, organization, logout, isStaff } = useAuth()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotificationMenu, setShowNotificationMenu] = useState(false)
  const [notifications, setNotifications] = useState([])

  // Realtime notifications for current user
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setNotifications(list.slice(0, 8))
    }, (err) => {
      console.warn('Notifications listener warning:', err.message)
    })
    return () => unsub()
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        read: true,
        readAt: new Date().toISOString(),
      })
    } catch (e) {
      // non-blocking
    }
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  const roleLabel = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    team_member: 'Team Member',
    client: 'Client Portal',
  }[role] || 'User'

  return (
    <header className="h-14 bg-white border-b border-wwi-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden p-1.5 rounded text-wwi-muted hover:text-wwi-text hover:bg-wwi-surface transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold text-wwi-text tracking-tight uppercase">
            Work Wizards Innovations
          </span>
          <span className="text-neutral-300">/</span>
          <span className="text-xs text-wwi-muted font-normal">
            {isStaff ? 'Operations Management' : organization?.name || 'Client Workspace'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu)
              setShowProfileMenu(false)
            }}
            className="p-1.5 rounded-full text-wwi-muted hover:text-wwi-text hover:bg-wwi-surface transition relative"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600" />
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-wwi-border rounded-lg shadow-lg z-50 overflow-hidden text-xs">
              <div className="px-4 py-3 border-b border-wwi-border flex items-center justify-between bg-wwi-surface">
                <span className="font-semibold text-wwi-text">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="neutral" size="xs">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-wwi-border">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-wwi-muted">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`p-3 transition hover:bg-neutral-50 cursor-pointer ${
                        !n.read ? 'bg-neutral-50/60 font-medium' : ''
                      }`}
                    >
                      <div className="text-wwi-text">{n.title || 'Update'}</div>
                      <div className="text-neutral-500 text-[11px] mt-0.5">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-wwi-border mx-1" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotificationMenu(false)
            }}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-wwi-surface transition text-left"
          >
            <div className="w-7 h-7 rounded-full bg-wwi-dark text-white flex items-center justify-center text-[11px] font-semibold">
              {getInitials(userProfile?.name || user?.email)}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-wwi-text leading-tight">
                {userProfile?.name || user?.email?.split('@')[0]}
              </div>
              <div className="text-[10px] text-wwi-muted leading-tight">{roleLabel}</div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-wwi-border rounded-lg shadow-lg z-50 overflow-hidden text-xs py-1">
              <div className="px-4 py-2.5 border-b border-wwi-border bg-wwi-surface">
                <p className="font-semibold text-wwi-text truncate">{userProfile?.name || 'User'}</p>
                <p className="text-[11px] text-wwi-muted truncate">{user?.email}</p>
                <div className="mt-1.5">
                  <Badge variant={isStaff ? 'dark' : 'neutral'} size="xs">
                    {roleLabel}
                  </Badge>
                </div>
              </div>

              {!isStaff && (
                <Link
                  to="/portal/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-wwi-text hover:bg-wwi-surface transition"
                >
                  <User className="w-3.5 h-3.5 text-wwi-muted" />
                  Organization Profile
                </Link>
              )}

              {isStaff && (
                <Link
                  to="/admin/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-wwi-text hover:bg-wwi-surface transition"
                >
                  <Shield className="w-3.5 h-3.5 text-wwi-muted" />
                  System Settings
                </Link>
              )}

              <div className="border-t border-wwi-border my-1" />

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
