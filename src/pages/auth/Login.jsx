import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { ShieldCheck, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, isStaff } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      // Navigate based on role once context updates; default to /admin or /portal
      navigate('/admin')
    } catch (err) {
      console.error('Sign-in error:', err)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid official email or password. Please verify and try again.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed sign-in attempts. Please wait a few minutes or reset your password.')
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-wwi-dark flex items-center justify-center text-white text-xs font-bold tracking-wider">
            W
          </div>
          <span className="text-sm font-bold tracking-tight text-wwi-text uppercase">
            Work Wizards Innovations
          </span>
        </div>
        <span className="text-[11px] font-mono text-neutral-400">Clienter v1.0</span>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="border border-wwi-border rounded-xl p-8 bg-white shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-wwi-text">
              Sign In to Your Workspace
            </h1>
            <p className="text-xs text-wwi-muted mt-1">
              Enter your credentials to access client projects, invoices, and deliverables.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Official Email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@workwizards.in or client@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-wwi-text">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-wwi-muted hover:text-wwi-text underline transition"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-wwi-border flex items-center justify-between text-xs text-wwi-muted">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
              <span>Role-governed security</span>
            </div>
            <Link
              to="/bootstrap"
              className="text-[11px] text-neutral-400 hover:text-wwi-text transition"
            >
              First-time Super Admin setup →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-wwi-muted">
        Work Wizards Innovations Pvt Ltd &copy; {new Date().getFullYear()}. All rights reserved.
      </div>
    </div>
  )
}
