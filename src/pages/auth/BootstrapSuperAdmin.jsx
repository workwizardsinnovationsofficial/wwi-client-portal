import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react'

export function BootstrapSuperAdmin() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const navigate = useNavigate()

  const handleBootstrap = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, secretKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Bootstrap failed')
      }

      setSuccess(true)
    } catch (err) {
      console.error('Bootstrap error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between max-w-lg w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-wwi-dark flex items-center justify-center text-white text-xs font-bold tracking-wider">
            W
          </div>
          <span className="text-sm font-bold tracking-tight text-wwi-text uppercase">
            Work Wizards Innovations
          </span>
        </div>
        <Link to="/login" className="text-xs text-wwi-muted hover:text-wwi-text">
          Cancel & Return to Login
        </Link>
      </div>

      <div className="max-w-lg w-full mx-auto my-8">
        <div className="border border-wwi-border rounded-xl p-8 bg-white shadow-sm">
          <div className="mb-6 flex items-start gap-3">
            <div className="p-2 rounded bg-neutral-100 text-wwi-dark shrink-0 mt-0.5 border border-wwi-border">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-wwi-text">
                Bootstrap Super Administrator
              </h1>
              <p className="text-xs text-wwi-muted mt-1">
                One-time initial provisioning procedure for Work Wizards Innovations leadership and IT administrators.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="p-4 rounded bg-green-50 border border-green-200 text-xs text-green-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Super Administrator Provisioned Successfully</div>
                  <div className="mt-1 text-green-700">
                    The account for <span className="font-medium">{email}</span> has been granted executive privileges.
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Proceed to Sign In <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <Input
                label="Administrator Full Name"
                required
                placeholder="e.g. Work Wizards Executive Admin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Official Admin Email"
                type="email"
                required
                placeholder="admin@workwizards.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Master Password"
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Input
                label="Bootstrap Secret Key"
                type="password"
                required
                helperText="Required if a Super Admin is already configured in the system."
                placeholder="Configured in BOOTSTRAP_SECRET_KEY"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                Initialize Super Administrator
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-wwi-muted">
        Restricted administrative endpoint • Access is audit-logged
      </div>
    </div>
  )
}
