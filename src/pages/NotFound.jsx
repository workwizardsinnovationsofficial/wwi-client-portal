import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-wwi-surface border border-wwi-border flex items-center justify-center text-wwi-muted mb-4">
        <FileQuestion className="w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-wwi-text mb-2">Page Not Found</h1>
      <p className="text-xs text-wwi-muted max-w-sm mb-6">
        The requested record or view does not exist or may have been moved.
      </p>
      <Link to="/">
        <Button variant="secondary" icon={ArrowLeft}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  )
}
