import { describe, it, expect } from 'vitest'
import { formatCurrencyINR, formatDateKolkata } from '../lib/utils'
import { generateInvoicePDF } from '../lib/pdfGenerator'

describe('Invoicing & Billing Engine', () => {
  it('formats currency correctly in Indian Rupees (INR)', () => {
    expect(formatCurrencyINR(0)).toBe('₹0.00')
    expect(formatCurrencyINR(125000, false)).toContain('1,25,000')
    expect(formatCurrencyINR(350000)).toContain('3,50,000')
    expect(formatCurrencyINR(1500000)).toContain('15,00,000')
  })

  it('formats dates in Asia/Kolkata timezone', () => {
    const isoDate = '2026-03-15T09:00:00.000Z'
    const formatted = formatDateKolkata(isoDate, 'dd MMM yyyy')
    expect(formatted).toBe('15 Mar 2026')
  })

  it('generates official WWI tax invoice PDF doc without throwing', () => {
    const sampleInvoice = {
      invoiceNumber: 'WWI-INV-2026-001',
      issueDate: '2026-02-15',
      dueDate: '2026-03-02',
      status: 'paid',
      subtotal: 350000,
      taxRate: 18,
      taxAmount: 63000,
      totalAmount: 413000,
      amountPaid: 413000,
      balanceDue: 0,
      description: 'Milestone 1 — Discovery & Architecture',
      lineItems: [
        {
          description: 'Enterprise System Architecture',
          quantity: 1,
          unitPrice: 200000,
          taxRate: 18,
          amount: 200000,
        },
        {
          description: 'Cloud Infrastructure Setup',
          quantity: 1,
          unitPrice: 150000,
          taxRate: 18,
          amount: 150000,
        },
      ],
    }

    const sampleOrg = {
      name: 'Apex Enterprise Solutions Pvt Ltd',
      primaryContact: 'Rajesh Sharma',
      officialEmail: 'rajesh.sharma@apexenterprise.com',
      gstin: '29AABCA1234F1Z9',
      address: 'Bangalore, Karnataka',
    }

    const doc = generateInvoicePDF(sampleInvoice, sampleOrg, { name: 'Cloud ERP Modernization' })
    expect(doc).toBeDefined()
    expect(typeof doc.save).toBe('function')
  })
})
