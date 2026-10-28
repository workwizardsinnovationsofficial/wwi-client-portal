/**
 * WWI Clienter Firestore Schema & Domain Model Constants
 */

export const COLLECTIONS = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  PROJECTS: 'projects',
  CONTRACTS: 'contracts',
  MILESTONES: 'milestones',
  INVOICES: 'invoices',
  MEETINGS: 'meetings',
  DELIVERABLES: 'deliverables',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  SUPPORT_TICKETS: 'supportTickets',
  SUBMISSIONS: 'submissions',
  NOTIFICATIONS: 'notifications',
  ACTIVITY_LOGS: 'activityLogs',
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEAM_MEMBER: 'team_member',
  CLIENT: 'client',
}

export const IS_ADMIN_ROLE = (role) => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEAM_MEMBER].includes(role)
export const IS_EXECUTIVE_ADMIN = (role) => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role)

export const PROJECT_STATUSES = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  IN_REVIEW: 'in_review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
}

export const MEETING_STATUSES = {
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  RESCHEDULE_REQUESTED: 'reschedule_requested',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const MEETING_MODES = {
  GOOGLE_MEET: 'google_meet',
  ZOOM: 'zoom',
  PHONE: 'phone',
  IN_PERSON: 'in_person',
}

export const DELIVERABLE_VISIBILITY = {
  INTERNAL: 'internal',
  CLIENT_VISIBLE: 'client_visible',
}

export const TICKET_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_CLIENT: 'waiting_for_client',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
}

export const TICKET_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const SUBMISSION_TYPES = {
  REQUIREMENTS: 'requirements',
  DOCUMENTS: 'documents',
  FEEDBACK: 'feedback',
  CHANGE_REQUEST: 'change_request',
  ISSUE_REPORT: 'issue_report',
  UAT_RESULTS: 'uat_results',
  MILESTONE_ACCEPTANCE: 'milestone_acceptance',
  DELIVERABLE_APPROVAL: 'deliverable_approval',
}

export const SUBMISSION_STATUSES = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}
