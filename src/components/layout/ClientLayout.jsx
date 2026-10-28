import React, { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

export function ClientLayout() {
  const { user, loading, isStaff } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded bg-wwi-dark animate-pulse" />
          <div className="text-xs text-wwi-muted">Loading your client portal...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If a staff member visits /portal, allow it or let them view client perspective
  return (
    <div className="flex h-screen bg-white overflow-hidden text-wwi-text">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar mobile onCloseMobile={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
