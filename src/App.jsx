import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import { AdminLayout } from './components/layout/AdminLayout'
import { ClientLayout } from './components/layout/ClientLayout'

// Public Auth Pages
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { BootstrapSuperAdmin } from './pages/auth/BootstrapSuperAdmin'
import { NotFound } from './pages/NotFound'
import { AccessDenied } from './pages/AccessDenied'

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { ClientsList } from './pages/admin/ClientsList'
import { ClientDetail } from './pages/admin/ClientDetail'
import { ProjectsList } from './pages/admin/ProjectsList'
import { ProjectDetail } from './pages/admin/ProjectDetail'
import { ContractsList } from './pages/admin/ContractsList'
import { InvoicesList } from './pages/admin/InvoicesList'
import { MeetingsList } from './pages/admin/MeetingsList'
import { DeliverablesList } from './pages/admin/DeliverablesList'
import { MessagesView } from './pages/admin/MessagesView'
import { SupportList } from './pages/admin/SupportList'
import { TeamManagement } from './pages/admin/TeamManagement'
import { ActivityAuditLog } from './pages/admin/ActivityAuditLog'
import { SettingsView } from './pages/admin/SettingsView'

// Client Pages
import { ClientDashboard } from './pages/client/ClientDashboard'
import { ClientProjectsList } from './pages/client/ClientProjectsList'
import { ClientProjectDetail } from './pages/client/ClientProjectDetail'
import { ClientContractsList } from './pages/client/ClientContractsList'
import { ClientInvoicesList } from './pages/client/ClientInvoicesList'
import { ClientMeetingsList } from './pages/client/ClientMeetingsList'
import { ClientDeliverablesList } from './pages/client/ClientDeliverablesList'
import { ClientMessagesView } from './pages/client/ClientMessagesView'
import { ClientSupportList } from './pages/client/ClientSupportList'
import { ClientProfile } from './pages/client/ClientProfile'
import { LandingPage } from './pages/LandingPage'

export function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/bootstrap" element={<BootstrapSuperAdmin />} />

      {/* Admin Route Group */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/:clientId" element={<ClientDetail />} />
        <Route path="projects" element={<ProjectsList />} />
        <Route path="projects/:projectId" element={<ProjectDetail />} />
        <Route path="contracts" element={<ContractsList />} />
        <Route path="invoices" element={<InvoicesList />} />
        <Route path="meetings" element={<MeetingsList />} />
        <Route path="deliverables" element={<DeliverablesList />} />
        <Route path="messages" element={<MessagesView />} />
        <Route path="support" element={<SupportList />} />
        <Route path="submissions" element={<Navigate to="/admin/deliverables" replace />} />
        <Route path="team" element={<TeamManagement />} />
        <Route path="activity" element={<ActivityAuditLog />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>

      {/* Client Route Group */}
      <Route path="/portal" element={<ClientLayout />}>
        <Route index element={<ClientDashboard />} />
        <Route path="projects" element={<ClientProjectsList />} />
        <Route path="projects/:projectId" element={<ClientProjectDetail />} />
        <Route path="contracts" element={<ClientContractsList />} />
        <Route path="invoices" element={<ClientInvoicesList />} />
        <Route path="meetings" element={<ClientMeetingsList />} />
        <Route path="deliverables" element={<ClientDeliverablesList />} />
        <Route path="messages" element={<ClientMessagesView />} />
        <Route path="support" element={<ClientSupportList />} />
        <Route path="submissions" element={<Navigate to="/portal/deliverables" replace />} />
        <Route path="profile" element={<ClientProfile />} />
      </Route>

      {/* Error & Fallback Routes */}
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
export default App
