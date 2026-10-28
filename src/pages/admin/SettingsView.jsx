import React from 'react'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { Shield, Cloud, Database, Key, Server, CheckCircle2, AlertTriangle } from 'lucide-react'

export function SettingsView() {
  const firebaseConfigured = true // Active client SDK

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings & Infrastructure"
        description="Configure corporate entity information, tax registration, Cloudflare R2 private bucket, and authentication boundaries."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Identity & Tax Registration */}
        <Card title="Corporate Identity & Invoicing Setup">
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-wwi-muted block mb-0.5">Legal Entity Name:</span>
              <span className="font-semibold text-wwi-text">Work Wizards Innovations Pvt Ltd</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-wwi-muted block mb-0.5">CIN:</span>
                <span className="font-mono text-wwi-text">U72900KA2023PTC174829</span>
              </div>
              <div>
                <span className="text-wwi-muted block mb-0.5">GSTIN:</span>
                <span className="font-mono text-wwi-text">29AABCW9876Q1Z5</span>
              </div>
            </div>
            <div>
              <span className="text-wwi-muted block mb-0.5">Registered Office:</span>
              <span className="text-wwi-text">Bangalore, Karnataka, India</span>
            </div>
            <div>
              <span className="text-wwi-muted block mb-0.5">Default Currency & Timezone:</span>
              <span className="text-wwi-text font-medium">INR (₹) • Asia/Kolkata</span>
            </div>
          </div>
        </Card>

        {/* Bank & Settlement Instructions */}
        <Card title="Official Payment Instructions">
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-wwi-muted block mb-0.5">Beneficiary Name:</span>
              <span className="font-semibold text-wwi-text">Work Wizards Innovations Pvt Ltd</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-wwi-muted block mb-0.5">Bank:</span>
                <span className="text-wwi-text">HDFC Bank Ltd</span>
              </div>
              <div>
                <span className="text-wwi-muted block mb-0.5">Account Number:</span>
                <span className="font-mono text-wwi-text">50200084729103</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-wwi-muted block mb-0.5">IFSC Code:</span>
                <span className="font-mono text-wwi-text">HDFC0000053</span>
              </div>
              <div>
                <span className="text-wwi-muted block mb-0.5">UPI ID:</span>
                <span className="font-mono text-wwi-text">workwizards@hdfcbank</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Cloudflare R2 Bucket Status */}
        <Card title="Cloudflare R2 Private Document Store">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-wwi-border">
              <span className="text-wwi-muted">Storage Engine:</span>
              <span className="font-medium text-wwi-text flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-neutral-600" />
                Cloudflare R2 (S3 API v3)
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-wwi-border">
              <span className="text-wwi-muted">Bucket Name:</span>
              <span className="font-mono text-wwi-text">wwi-client-portal</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-wwi-border">
              <span className="text-wwi-muted">Account ID:</span>
              <span className="font-mono text-wwi-text">6c28b0e0827eba9ab14775371b708494</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-wwi-border">
              <span className="text-wwi-muted">Bucket Region:</span>
              <span className="font-mono text-wwi-text">auto</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-wwi-muted">Access Security:</span>
              <Badge variant="success" size="xs">
                Private • Authorized Signed URLs Only
              </Badge>
            </div>
          </div>
        </Card>

        {/* Firebase Environment Status */}
        <Card title="Firebase Authentication & Cloud Firestore">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-wwi-border">
              <span className="text-wwi-muted">Project ID:</span>
              <span className="font-mono text-wwi-text">client-portal-9326</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-wwi-border">
              <span className="text-wwi-muted">Auth Domain:</span>
              <span className="font-mono text-wwi-text">client-portal-9326.firebaseapp.com</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-wwi-border">
              <span className="text-wwi-muted">Client Auth SDK:</span>
              <Badge variant="success" size="xs">
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-wwi-muted">Security Rules:</span>
              <Badge variant="dark" size="xs">
                Strict Deny-By-Default + RBAC Enforced
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
