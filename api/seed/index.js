import { authenticateRequest } from '../_lib/authMiddleware.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'
import { logActivity } from '../_lib/audit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require super_admin or admin
  const caller = await authenticateRequest(req, res, ['super_admin', 'admin'])
  if (!caller) return

  const fbAdmin = getFirebaseAdmin()
  const db = fbAdmin.firestore()

  try {
    const now = new Date()
    const nowIso = now.toISOString()

    // 1. Organizations
    const org1Ref = db.collection('organizations').doc('org_apex_solutions')
    await org1Ref.set({
      name: 'Apex Enterprise Solutions Pvt Ltd',
      identifier: 'WWI-ORG-APEX',
      primaryContact: 'Rajesh Sharma',
      officialEmail: 'rajesh.sharma@apexenterprise.com',
      phone: '+91 98450 12345',
      address: 'Prestige Tech Park, Marathahalli-Sarjapur Ring Road, Bangalore 560103',
      gstin: '29AABCA1234F1Z9',
      status: 'active',
      assignedTeam: ['Nikhil Verma (Lead)', 'Priya Nair (Senior Architect)'],
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    const org2Ref = db.collection('organizations').doc('org_nexus_health')
    await org2Ref.set({
      name: 'Nexus HealthTech Innovations',
      identifier: 'WWI-ORG-NEXUS',
      primaryContact: 'Dr. Ananya Sen',
      officialEmail: 'ananya.sen@nexushealth.org',
      phone: '+91 98200 54321',
      address: 'Cyber City, Tower B, Gurugram, Haryana 122002',
      gstin: '06AACCN5678R1Z2',
      status: 'active',
      assignedTeam: ['Amitabh Rao (Solutions Architect)', 'Rohan Iyer (Security Lead)'],
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    // 2. Projects
    const prj1Ref = db.collection('projects').doc('prj_cloud_erp')
    await prj1Ref.set({
      code: 'PRJ-ERP-2026',
      name: 'Cloud ERP & Workflow Modernization',
      description: 'End-to-end modernization of enterprise procurement and financial orchestration services.',
      organizationId: 'org_apex_solutions',
      organizationName: 'Apex Enterprise Solutions Pvt Ltd',
      contractRef: 'WWI-CTR-2026-088',
      category: 'Enterprise Software',
      startDate: '2026-01-15',
      targetCompletionDate: '2026-06-30',
      projectOwner: 'Nikhil Verma',
      authorizedTeam: ['Nikhil Verma', 'Priya Nair'],
      status: 'in_progress',
      completionPercentage: 65,
      blockers: 'Awaiting client approval on Phase 3 security specifications.',
      nextActions: 'Deliver API integration guide and test suite for staging deployment.',
      clientNotes: 'Phase 2 milestone delivered and staging environment deployed.',
      internalNotes: 'Private review of microservices latency needed before final UAT.',
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    const prj2Ref = db.collection('projects').doc('prj_telehealth')
    await prj2Ref.set({
      code: 'PRJ-HLT-2026',
      name: 'HIPAA-Compliant Telehealth Consultation Hub',
      description: 'Encrypted real-time clinical consultations and patient records interchange.',
      organizationId: 'org_nexus_health',
      organizationName: 'Nexus HealthTech Innovations',
      contractRef: 'WWI-CTR-2026-104',
      category: 'Healthcare SaaS',
      startDate: '2026-02-01',
      targetCompletionDate: '2026-08-15',
      projectOwner: 'Amitabh Rao',
      authorizedTeam: ['Amitabh Rao', 'Rohan Iyer'],
      status: 'in_progress',
      completionPercentage: 40,
      blockers: 'None',
      nextActions: 'Complete WebRTC media bridge integration.',
      clientNotes: 'Architecture design document approved; core backend endpoints ready.',
      internalNotes: 'Audit log storage strategy in R2 confirmed.',
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    // 3. Milestones
    await db.collection('milestones').doc('ms_erp_1').set({
      projectId: 'prj_cloud_erp',
      organizationId: 'org_apex_solutions',
      title: 'Discovery & Enterprise Architecture Blueprint',
      description: 'High-level architectural design and database entity mapping.',
      plannedDate: '2026-02-15',
      actualDate: '2026-02-14',
      status: 'completed',
      completionPercentage: 100,
      createdAt: nowIso,
    }, { merge: true })

    await db.collection('milestones').doc('ms_erp_2').set({
      projectId: 'prj_cloud_erp',
      organizationId: 'org_apex_solutions',
      title: 'Core Microservices & Data Migration Pipeline',
      description: 'Deployment of containerized services and migration of legacy datasets.',
      plannedDate: '2026-04-10',
      actualDate: null,
      status: 'in_progress',
      completionPercentage: 70,
      createdAt: nowIso,
    }, { merge: true })

    // 4. Invoices
    await db.collection('invoices').doc('inv_wwi_2026_001').set({
      invoiceNumber: 'WWI-INV-2026-001',
      organizationId: 'org_apex_solutions',
      organizationName: 'Apex Enterprise Solutions Pvt Ltd',
      projectId: 'prj_cloud_erp',
      projectName: 'Cloud ERP & Workflow Modernization',
      clientContactName: 'Rajesh Sharma',
      clientEmail: 'rajesh.sharma@apexenterprise.com',
      issueDate: '2026-02-15',
      dueDate: '2026-03-02',
      currency: 'INR',
      status: 'paid',
      subtotal: 350000,
      taxRate: 18,
      taxAmount: 63000,
      totalAmount: 413000,
      amountPaid: 413000,
      balanceDue: 0,
      description: 'Milestone 1 — Discovery & Enterprise Architecture Blueprint',
      lineItems: [
        {
          description: 'Enterprise System Architecture & Schema Specification',
          quantity: 1,
          unitPrice: 200000,
          taxRate: 18,
          amount: 200000,
        },
        {
          description: 'Cloud Infrastructure Provisioning & CI/CD Pipeline Setup',
          quantity: 1,
          unitPrice: 150000,
          taxRate: 18,
          amount: 150000,
        },
      ],
      payments: [
        {
          paymentId: 'PAY-INIT-01',
          amount: 413000,
          date: '2026-02-28',
          mode: 'RTGS',
          reference: 'HDFCR20260228009841',
          notes: 'Full payment received against Milestone 1 invoice',
          recordedBy: caller.uid,
          recordedAt: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    await db.collection('invoices').doc('inv_wwi_2026_002').set({
      invoiceNumber: 'WWI-INV-2026-002',
      organizationId: 'org_apex_solutions',
      organizationName: 'Apex Enterprise Solutions Pvt Ltd',
      projectId: 'prj_cloud_erp',
      projectName: 'Cloud ERP & Workflow Modernization',
      clientContactName: 'Rajesh Sharma',
      clientEmail: 'rajesh.sharma@apexenterprise.com',
      issueDate: '2026-03-15',
      dueDate: '2026-03-30',
      currency: 'INR',
      status: 'overdue',
      subtotal: 450000,
      taxRate: 18,
      taxAmount: 81000,
      totalAmount: 531000,
      amountPaid: 150000,
      balanceDue: 381000,
      description: 'Milestone 2 — Core Microservices & Data Migration Pipeline',
      lineItems: [
        {
          description: 'Core Microservices Architecture & API Implementation',
          quantity: 1,
          unitPrice: 300000,
          taxRate: 18,
          amount: 300000,
        },
        {
          description: 'Legacy Data Migration & Verification Scripts',
          quantity: 1,
          unitPrice: 150000,
          taxRate: 18,
          amount: 150000,
        },
      ],
      payments: [
        {
          paymentId: 'PAY-INIT-02',
          amount: 150000,
          date: '2026-03-25',
          mode: 'NEFT',
          reference: 'SBIN0029381726',
          notes: 'Partial advance against Milestone 2',
          recordedBy: caller.uid,
          recordedAt: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    // 5. Meetings
    await db.collection('meetings').doc('meet_wwi_01').set({
      title: 'Bi-Weekly Architecture Sync & Security Review',
      purpose: 'Sprint review and cloud security checkpoint',
      agenda: '1. Review Phase 2 microservices delivery\n2. Security testing sign-off\n3. Next sprint deliverables',
      organizationId: 'org_apex_solutions',
      organizationName: 'Apex Enterprise Solutions Pvt Ltd',
      projectId: 'prj_cloud_erp',
      projectName: 'Cloud ERP & Workflow Modernization',
      requestedBy: caller.uid,
      requestedByEmail: caller.email,
      requestedDate: '2026-11-05T10:30:00.000Z',
      durationMinutes: 45,
      mode: 'google_meet',
      status: 'confirmed',
      meetingUrl: 'https://meet.google.com/wwi-apex-sync',
      confirmedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    // 6. Deliverables Metadata
    await db.collection('deliverables').doc('deliv_erp_spec').set({
      title: 'Enterprise Architecture & Cloud Security Specification v2.1',
      description: 'Comprehensive architectural diagram, cloud topology, and security audit criteria.',
      organizationId: 'org_apex_solutions',
      projectId: 'prj_cloud_erp',
      version: '2.1',
      category: 'Technical Specification',
      visibility: 'client_visible',
      fileName: 'Apex_ERP_Architecture_Spec_v2.1.pdf',
      fileSize: 4280000,
      storageKey: 'projects/prj_cloud_erp/specs/Apex_ERP_Architecture_Spec_v2.1.pdf',
      publishedBy: caller.email,
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    // 7. Support Tickets
    await db.collection('supportTickets').doc('tck_wwi_101').set({
      ticketNumber: 'TCK-2026-101',
      subject: 'Staging Environment SSO Redirect Configuration',
      description: 'Need assistance pointing Okta SAML callback URL to the new staging cluster domain.',
      organizationId: 'org_apex_solutions',
      organizationName: 'Apex Enterprise Solutions Pvt Ltd',
      projectId: 'prj_cloud_erp',
      category: 'Integration',
      priority: 'high',
      status: 'in_progress',
      assignedTo: 'Nikhil Verma',
      createdBy: caller.uid,
      createdByName: 'Rajesh Sharma',
      createdByEmail: 'rajesh.sharma@apexenterprise.com',
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    // 8. Submissions
    await db.collection('submissions').doc('sub_wwi_201').set({
      submissionNumber: 'SUB-2026-201',
      title: 'UAT Feedback for Procurement Approval Workflow',
      submissionType: 'uat_results',
      description: 'Completed user acceptance testing on procurement approval rules. Approved with 1 minor change request.',
      organizationId: 'org_apex_solutions',
      projectId: 'prj_cloud_erp',
      projectName: 'Cloud ERP & Workflow Modernization',
      status: 'under_review',
      submittedBy: caller.uid,
      submitterName: 'Rajesh Sharma',
      submitterEmail: 'rajesh.sharma@apexenterprise.com',
      reviewerNotes: 'Under review by WWI Solutions Architecture team.',
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true })

    await logActivity({
      actorUid: caller.uid,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: 'SEED_INITIAL_DATABASE',
      entityType: 'database',
      entityId: 'all',
      metadata: { seedVersion: '1.0' },
    })

    return res.status(200).json({
      success: true,
      message: 'Database successfully seeded with realistic enterprise data.',
      seeded: {
        organizations: 2,
        projects: 2,
        milestones: 2,
        invoices: 2,
        meetings: 1,
        deliverables: 1,
        supportTickets: 1,
        submissions: 1,
      },
    })
  } catch (err) {
    console.error('Seed error:', err)
    return res.status(500).json({ error: err.message || 'Seed failed' })
  }
}
