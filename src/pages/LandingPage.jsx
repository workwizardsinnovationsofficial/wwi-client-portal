import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FolderKanban,
  FileBox,
  CreditCard,
  MessageSquare,
  LifeBuoy,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  ChevronRight,
  FileText,
  UploadCloud,
  BellRing,
  Eye,
  Building2,
  Users,
} from 'lucide-react'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'

export function LandingPage() {
  const { user, isStaff } = useAuth()
  const [activeTab, setActiveTab] = useState('progress')

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-neutral-800 selection:text-white flex flex-col font-sans">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/85 border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo and Brand - Redirects to https://wwi.org.in */}
          <a
            href="https://wwi.org.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group"
            title="Visit Work Wizards Innovations Official Website (https://wwi.org.in)"
          >
            <div className="w-8 h-8 rounded-lg bg-white text-neutral-950 font-black text-sm flex items-center justify-center tracking-wider shadow-md group-hover:scale-105 transition-transform">
              W
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white uppercase group-hover:underline flex items-center gap-1.5">
                Work Wizards Innovations
                <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-white transition-colors" />
              </div>
              <div className="text-[10px] text-neutral-400 -mt-0.5 font-medium">
                Enterprise Client Portal
              </div>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-400 font-medium">
            <a href="#features" className="hover:text-white transition">
              Capabilities
            </a>
            <a href="#deliverables" className="hover:text-white transition">
              Deliverables & R2
            </a>
            <a href="#invoicing" className="hover:text-white transition">
              Billing & Verification
            </a>
            <a
              href="https://wwi.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition flex items-center gap-1 text-neutral-300"
            >
              Company Website
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link to={isStaff ? '/admin' : '/portal'}>
                <Button variant="primary" size="sm" className="bg-white text-neutral-950 hover:bg-neutral-200 font-semibold shadow-sm">
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm" className="bg-white text-neutral-950 hover:bg-neutral-200 font-semibold shadow-sm">
                  Client Sign In <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden border-b border-neutral-800/60">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-neutral-800/40 via-neutral-700/20 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          {/* Engineering Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-neutral-700 bg-neutral-900/90 text-xs text-neutral-300 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-white">Built by Work Wizards Innovations Pvt Ltd</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-400">Official Client Portal</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Manage Your Project Progress at a{' '}
            <span className="bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500 bg-clip-text text-transparent">
              Single Dashboard
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Gain complete visibility into sprint milestones, review API & architectural docs, verify invoice payments with instant screenshot uploads, and connect directly with WWI engineering leads.
          </p>

          {/* Dual CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={user ? (isStaff ? '/admin' : '/portal') : '/login'} className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white text-neutral-950 font-bold text-sm hover:bg-neutral-200 transition-all shadow-lg flex items-center justify-center gap-2">
                {user ? 'Open Your Workspace' : 'Sign In to Client Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a
              href="https://wwi.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              Visit Work Wizards Innovations
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </a>
          </div>

          {/* Key Assurance Chips */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Real-time Velocity Updates</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cloudflare R2 Document Vault</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instant Invoice Verification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Native Web Push Alerts</span>
            </div>
          </div>
        </div>

        {/* 3. Interactive Hero Dashboard Showcase */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-12">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 shadow-2xl p-4 sm:p-6 backdrop-blur-xl">
            {/* Top Window Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-neutral-400">
                  portal.wwi.org.in / client-overview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-[10px]">
                  LIVE SYNC ACTIVE
                </span>
              </div>
            </div>

            {/* Interactive Showcase Tabs */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-neutral-800 pb-4">
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'progress'
                    ? 'bg-white text-neutral-950'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                Project Progress
              </button>
              <button
                onClick={() => setActiveTab('deliverables')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'deliverables'
                    ? 'bg-white text-neutral-950'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-white'
                }`}
              >
                <FileBox className="w-3.5 h-3.5" />
                Deliverables & Docs
              </button>
              <button
                onClick={() => setActiveTab('invoicing')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'invoicing'
                    ? 'bg-white text-neutral-950'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Invoice Verification
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'support'
                    ? 'bg-white text-neutral-950'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-white'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Request a Call
              </button>
            </div>

            {/* Tab 1: Project Progress View */}
            {activeTab === 'progress' && (
              <div className="py-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                      Active Development • Sprint 4
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Enterprise Cloud Architecture & Mobile Suite
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">78%</span>
                    <span className="text-xs text-neutral-400 block">Milestones Completed</span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden border border-neutral-700/60">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700" style={{ width: '78%' }} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-neutral-800/60 border border-neutral-700/60 rounded-lg">
                    <span className="text-neutral-400 block text-[11px]">Next Milestone:</span>
                    <span className="font-semibold text-white">Staging Release & UAT Deploy</span>
                  </div>
                  <div className="p-3 bg-neutral-800/60 border border-neutral-700/60 rounded-lg">
                    <span className="text-neutral-400 block text-[11px]">Sprint Delivery Date:</span>
                    <span className="font-semibold text-white">14 Nov 2026 (On Track)</span>
                  </div>
                  <div className="p-3 bg-neutral-800/60 border border-neutral-700/60 rounded-lg">
                    <span className="text-neutral-400 block text-[11px]">Assigned Engineering Lead:</span>
                    <span className="font-semibold text-white">WWI Tech Team Lead</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Deliverables & Docs View */}
            {activeTab === 'deliverables' && (
              <div className="py-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-semibold">Client Deliverable Vault (Cloudflare R2 Storage)</span>
                  <span className="text-emerald-400 text-[11px] font-mono">3 Verified Files</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-neutral-800/60 border border-neutral-700/60 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-neutral-400" />
                      <div>
                        <div className="font-semibold text-white">API_Architecture_Specification_v2.4.pdf</div>
                        <div className="text-[11px] text-neutral-400">Added by Client • 4.2 MB • Stored on R2</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                      Live in Vault
                    </span>
                  </div>
                  <div className="p-3 bg-neutral-800/60 border border-neutral-700/60 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-neutral-400" />
                      <div>
                        <div className="font-semibold text-white">Security_Audit_and_Review_Doc.pdf</div>
                        <div className="text-[11px] text-neutral-400">Official Deliverable • 1.8 MB</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 text-[10px] font-semibold">
                      Ready to Download
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Invoicing View */}
            {activeTab === 'invoicing' && (
              <div className="py-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-semibold">Instant Payment Proof & Settlement</span>
                  <span className="text-neutral-400 text-[11px]">UTR Verification Workflow</span>
                </div>
                <div className="p-4 bg-neutral-800/80 border border-neutral-700/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-white">INV-2026-004</span>
                      <div className="text-xs text-neutral-400">Milestone 2 Delivery Payment</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                      Verification Pending
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-neutral-700/60">
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Amount:</span>
                      <span className="font-mono font-bold text-emerald-400">₹75,000 INR</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">UTR Reference:</span>
                      <span className="font-mono text-white">HDFC99823411</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Receipt Screenshot:</span>
                      <span className="text-neutral-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Attached
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Support View */}
            {activeTab === 'support' && (
              <div className="py-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-semibold">Direct Communication & Assistance</span>
                  <span className="text-emerald-400 text-[11px]">Average Response: &lt; 30 mins</span>
                </div>
                <div className="p-4 bg-neutral-800/70 border border-neutral-700/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      Request a Call with Engineering Team
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Need clarification or sprint discussion? Request an immediate callback from our leadership team.
                    </p>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap transition">
                    Schedule Callback
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Core Capabilities Grid */}
      <section id="features" className="py-20 bg-neutral-900/40 border-b border-neutral-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Engineered for Frictionless Client Collaboration
            </h2>
            <p className="text-sm text-neutral-400">
              Everything enterprise leadership and technical stakeholders need to monitor deliverables, payments, and communications in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Real-Time Milestone Tracking</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Track completion percentage, sprint delivery targets, blockers, and next immediate actions updated live by WWI developers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center">
                <FileBox className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-base font-bold text-white">Cloudflare R2 Document Vault</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Post and download large architectural specifications, API schemas, review PDFs, and test releases with zero bandwidth throttling.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">One-Click Proof Verification</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Upload payment screenshots and UTR references right from invoice actions. WWI audits and marks invoices as paid with full audit logging.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center">
                <BellRing className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white">Browser Web Push Alerts</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Receive instant desktop alerts when project messages, milestone handoffs, or ticket updates occur — never miss a critical release.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-white">Instant "Request a Call"</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Skip long ticket queues. Request priority callbacks directly to your phone number for urgent architectural decisions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-white">Role-Governed Security</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Enterprise client access is strictly siloed per organization. Passwords, API tokens, and contracts are shielded behind strict Firestore rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. About Work Wizards Innovations Banner */}
      <section className="py-16 border-b border-neutral-800/60 bg-gradient-to-b from-neutral-900/30 to-neutral-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                Pioneering Enterprise Solutions
              </span>
              <h3 className="text-2xl font-bold text-white">
                Work Wizards Innovations Pvt Ltd
              </h3>
              <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                We engineer scalable cloud backends, modern web applications, high-throughput data platforms, and cross-platform mobile solutions for global businesses.
              </p>
            </div>
            <a
              href="https://wwi.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-200 transition-all shadow-md flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              Explore Our Services
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* 6. Official Footer */}
      <footer className="mt-auto bg-neutral-950 border-t border-neutral-800/80 py-12 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo and Name - Click redirects to https://wwi.org.in */}
            <a
              href="https://wwi.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group hover:opacity-90 transition"
              title="Click to visit Work Wizards Innovations Pvt Ltd (https://wwi.org.in)"
            >
              <div className="w-8 h-8 rounded-lg bg-white text-neutral-950 font-black text-sm flex items-center justify-center tracking-wider group-hover:scale-105 transition-transform">
                W
              </div>
              <div className="text-left">
                <span className="text-sm font-bold tracking-tight text-white uppercase group-hover:underline flex items-center gap-1.5">
                  Work Wizards Innovations Pvt Ltd
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  https://wwi.org.in
                </span>
              </div>
            </a>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
              <a
                href="https://wwi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition flex items-center gap-1"
              >
                Official Site
                <ExternalLink className="w-3 h-3" />
              </a>
              <Link to="/login" className="hover:text-white transition">
                Client Sign In
              </Link>
              <Link to="/bootstrap" className="hover:text-white transition">
                Admin Console
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500 text-center sm:text-left">
            <div>
              &copy; {new Date().getFullYear()} Work Wizards Innovations Pvt Ltd. All rights reserved.
            </div>
            <div className="font-medium text-neutral-400">
              Built with precision by{' '}
              <a
                href="https://wwi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline font-semibold"
              >
                Work Wizards Innovations Pvt Ltd
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
