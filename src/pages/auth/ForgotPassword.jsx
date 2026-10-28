import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err.message || 'Failed to send password reset email. Please verify your address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-wwi-dark flex items-center justify-center text-white text-xs font-bold tracking-wider">
            W
          </div>
          <span className="text-sm font-bold tracking-tight text-wwi-text uppercase">
            Work Wizards Innovations
          </span>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto my-8">
        <div className="border border-wwi-border rounded-xl p-8 bg-white shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-wwi-text">
              Reset Your Password
            </h1>
            <p className="text-xs text-wwi-muted mt-1">
              Enter your official email and we will send you a secure password reset link.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="p-4 rounded bg-green-50 border border-green-200 text-xs text-green-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Reset Link Dispatched</div>
                  <div className="mt-1 text-green-700">
                    If an account exists for <span className="font-medium">{email}</span>, a secure password setup link has been sent to your inbox.
                  </div>
                </div>
              </div>
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Official Email"
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                Send Password Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-wwi-muted hover:text-wwi-text transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-wwi-muted">
        Work Wizards Innovations Pvt Ltd &copy; {new Date().getFullYear()}
      </div>
    </div>
  )
}
