import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export function AccessDenied() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-wwi-text mb-2">Access Restricted</h1>
      <p className="text-xs text-wwi-muted max-w-sm mb-6">
        You do not have administrative privileges to access this area. Your current role is restricted to your organization's records.
      </p>
      <Link to="/portal">
        <Button variant="secondary" icon={ArrowLeft}>
          Return to Client Portal
        </Button>
      </Link>
    </div>
  )
}
