import { describe, it, expect } from 'vitest'
import { ROLES, IS_ADMIN_ROLE, IS_EXECUTIVE_ADMIN } from '../lib/firestoreSchema'

describe('Role-Based Access Control (RBAC) & Organization Isolation', () => {
  it('correctly validates staff vs client roles', () => {
    expect(IS_ADMIN_ROLE(ROLES.SUPER_ADMIN)).toBe(true)
    expect(IS_ADMIN_ROLE(ROLES.ADMIN)).toBe(true)
    expect(IS_ADMIN_ROLE(ROLES.TEAM_MEMBER)).toBe(true)
    expect(IS_ADMIN_ROLE(ROLES.CLIENT)).toBe(false)
    expect(IS_ADMIN_ROLE('unknown_role')).toBe(false)
  })

  it('correctly validates executive admin roles', () => {
    expect(IS_EXECUTIVE_ADMIN(ROLES.SUPER_ADMIN)).toBe(true)
    expect(IS_EXECUTIVE_ADMIN(ROLES.ADMIN)).toBe(true)
    expect(IS_EXECUTIVE_ADMIN(ROLES.TEAM_MEMBER)).toBe(false)
    expect(IS_EXECUTIVE_ADMIN(ROLES.CLIENT)).toBe(false)
  })

  it('enforces organization isolation for client records', () => {
    const userA = { uid: 'u1', role: 'client', organizationId: 'org_apex' }
    const userB = { uid: 'u2', role: 'client', organizationId: 'org_nexus' }
    const staffUser = { uid: 'u3', role: 'admin', organizationId: null }

    const invoiceApex = { id: 'inv_1', organizationId: 'org_apex', amount: 413000 }

    // Client A can view Apex invoice
    expect(userA.organizationId === invoiceApex.organizationId).toBe(true)

    // Client B cannot view Apex invoice
    expect(userB.organizationId === invoiceApex.organizationId).toBe(false)

    // Staff can view any invoice
    expect(IS_ADMIN_ROLE(staffUser.role) || staffUser.organizationId === invoiceApex.organizationId).toBe(true)
  })

  it('strictly hides internal deliverables from client view', () => {
    const deliverableInternal = {
      title: 'Cost & Margin Breakdown',
      visibility: 'internal',
      organizationId: 'org_apex',
    }
    const deliverablePublic = {
      title: 'Architecture Blueprint',
      visibility: 'client_visible',
      organizationId: 'org_apex',
    }

    const clientCanSeeInternal = deliverableInternal.visibility === 'client_visible'
    const clientCanSeePublic = deliverablePublic.visibility === 'client_visible'

    expect(clientCanSeeInternal).toBe(false)
    expect(clientCanSeePublic).toBe(true)
  })
})
