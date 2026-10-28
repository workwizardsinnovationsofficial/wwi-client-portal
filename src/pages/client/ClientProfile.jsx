import React, { useState } from 'react'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Badge } from '../../components/common/Badge'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { User, Building2, Key, ShieldCheck, Save } from 'lucide-react'

export function ClientProfile() {
  const { user, userProfile, organization } = useAuth()
  const { showSuccess, showError } = useToast()

  const [displayName, setDisplayName] = useState(userProfile?.displayName || userProfile?.name || '')
  const [phone, setPhone] = useState(userProfile?.phone || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        name: displayName,
        phone,
        updatedAt: new Date().toISOString(),
      })
      showSuccess('Profile updated successfully.')
    } catch (err) {
      showError(err.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      showError('Password must be at least 8 characters long')
      return
    }

    setUpdatingPassword(true)
    try {
      await updatePassword(auth.currentUser, newPassword)
      showSuccess('Password updated successfully. Please use your new password next time you sign in.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showError(err.message || 'Failed to update password. You may need to sign out and sign back in before changing your password.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account & Organization Settings"
        description="Manage your authorized contact information, organization registration details, and security credentials."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Account Info */}
        <Card title="My User Profile">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Official Email"
              disabled
              value={user?.email || ''}
              helperText="Controlled by organization administrator"
            />

            <Input
              label="Display Name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <Input
              label="Contact Phone"
              placeholder="+91 98450 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="flex items-center justify-between pt-2">
              <Badge variant="neutral" size="xs">
                Role: Client Portal User
              </Badge>
              <Button type="submit" variant="primary" size="sm" icon={Save} loading={savingProfile}>
                Save Profile
              </Button>
            </div>
          </form>
        </Card>

        {/* Organization Info */}
        <Card title="Client Organization Profile">
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-wwi-muted block mb-0.5">Organization Legal Name:</span>
              <span className="font-semibold text-wwi-text">{organization?.name || '—'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-wwi-muted block mb-0.5">Account Identifier:</span>
                <span className="font-mono text-wwi-text">{organization?.identifier || '—'}</span>
              </div>
              <div>
                <span className="text-wwi-muted block mb-0.5">GSTIN / Tax ID:</span>
                <span className="font-mono text-wwi-text">{organization?.gstin || '—'}</span>
              </div>
            </div>

            <div>
              <span className="text-wwi-muted block mb-0.5">Official Contact Email:</span>
              <span className="text-wwi-text">{organization?.officialEmail || '—'}</span>
            </div>

            <div>
              <span className="text-wwi-muted block mb-0.5">Registered Office Address:</span>
              <span className="text-wwi-text">{organization?.address || '—'}</span>
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-neutral-500 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Organization membership verified by Work Wizards Innovations</span>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card title="Security Credentials">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              label="Confirm New Password"
              type="password"
              required
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="secondary" size="sm" icon={Key} loading={updatingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
