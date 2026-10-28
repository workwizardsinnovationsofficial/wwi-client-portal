import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { formatCurrencyINR, formatDateKolkata } from './utils'

/**
 * Generate official Work Wizards Innovations Pvt Ltd (WWI) Tax Invoice PDF
 */
export function generateInvoicePDF(invoice, organization = {}, project = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Colors
  const black = [23, 23, 23]
  const grayMuted = [102, 102, 102]
  const grayLight = [245, 245, 245]
  const borderGray = [229, 229, 229]

  // Header - Company Brand
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...black)
  doc.text('WORK WIZARDS INNOVATIONS PVT LTD', 14, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...grayMuted)
  doc.text('CIN: U72900KA2023PTC174829 | GSTIN: 29AABCW9876Q1Z5', 14, 25)
  doc.text('Registered Office: Bangalore, Karnataka, India', 14, 29)
  doc.text('Email: billing@workwizards.in | Web: https://workwizards.in', 14, 33)

  // Invoice Title & Status
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...black)
  doc.text('TAX INVOICE', 196, 22, { align: 'right' })

  // Status Badge box
  const statusStr = (invoice.status || 'ISSUED').toUpperCase()
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  let statusBg = [240, 240, 240]
  let statusTextColor = [23, 23, 23]
  if (statusStr === 'PAID') {
    statusBg = [235, 247, 238]
    statusTextColor = [22, 163, 74]
  } else if (statusStr === 'OVERDUE') {
    statusBg = [254, 242, 242]
    statusTextColor = [220, 38, 38]
  }
  doc.setFillColor(...statusBg)
  doc.roundedRect(160, 28, 36, 7, 1, 1, 'F')
  doc.setTextColor(...statusTextColor)
  doc.text(statusStr, 178, 33, { align: 'center' })

  // Divider line
  doc.setDrawColor(...borderGray)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  // Invoice Metadata & Bill To Columns
  let y = 46

  // Left side: Bill To
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...grayMuted)
  doc.text('BILLED TO:', 14, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...black)
  doc.text(organization.name || invoice.organizationName || 'Client Organization', 14, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...grayMuted)
  doc.text(`Contact: ${organization.primaryContact || invoice.clientContactName || 'Authorized Representative'}`, 14, y + 11)
  doc.text(`Email: ${organization.officialEmail || invoice.clientEmail || '—'}`, 14, y + 16)
  if (organization.gstin) {
    doc.text(`GSTIN: ${organization.gstin}`, 14, y + 21)
  }
  if (organization.address) {
    doc.text(organization.address, 14, y + 26)
  }

  // Right side: Invoice Details
  const rightColX = 130
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...grayMuted)
  doc.text('INVOICE NUMBER:', rightColX, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...black)
  doc.text(invoice.invoiceNumber || 'INV-0000', 196, y, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...grayMuted)
  doc.text('ISSUE DATE:', rightColX, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...black)
  doc.text(formatDateKolkata(invoice.issueDate, 'dd MMM yyyy'), 196, y + 6, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...grayMuted)
  doc.text('DUE DATE:', rightColX, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...black)
  doc.text(formatDateKolkata(invoice.dueDate, 'dd MMM yyyy'), 196, y + 12, { align: 'right' })

  if (project.name || invoice.projectName) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...grayMuted)
    doc.text('PROJECT:', rightColX, y + 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...black)
    doc.text(project.name || invoice.projectName, 196, y + 18, { align: 'right' })
  }

  // Line items table
  const lineItems = invoice.lineItems || []
  const tableRows = lineItems.map((item, index) => {
    const qty = Number(item.quantity) || 1
    const unitPrice = Number(item.unitPrice) || 0
    const taxRate = Number(item.taxRate) || 0
    const amount = qty * unitPrice
    return [
      index + 1,
      item.description || 'Professional Services',
      qty.toString(),
      formatCurrencyINR(unitPrice),
      taxRate > 0 ? `${taxRate}%` : '0%',
      formatCurrencyINR(amount),
    ]
  })

  // Fallback if no line items
  if (tableRows.length === 0) {
    tableRows.push([
      1,
      invoice.description || 'Enterprise Development & Support Services',
      '1',
      formatCurrencyINR(invoice.subtotal || invoice.totalAmount || 0),
      '18%',
      formatCurrencyINR(invoice.subtotal || invoice.totalAmount || 0),
    ])
  }

  doc.autoTable({
    startY: y + 36,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Tax %', 'Amount']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: grayLight,
      textColor: black,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      textColor: black,
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: borderGray,
    tableLineWidth: 0.2,
  })

  // Summary box below table
  const finalY = doc.lastAutoTable.finalY + 8

  // Bank & Payment Details (Left)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...grayMuted)
  doc.text('PAYMENT INSTRUCTIONS:', 14, finalY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...black)
  doc.text('Beneficiary: Work Wizards Innovations Pvt Ltd', 14, finalY + 5)
  doc.text('Bank: HDFC Bank Ltd', 14, finalY + 10)
  doc.text('Account Number: 50200084729103', 14, finalY + 15)
  doc.text('IFSC Code: HDFC0000053 (Bangalore Branch)', 14, finalY + 20)
  doc.text('UPI ID: workwizards@hdfcbank', 14, finalY + 25)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...grayMuted)
  doc.text('Please quote invoice number in NEFT/RTGS/IMPS transaction remarks.', 14, finalY + 31)

  // Totals calculations (Right)
  const totalsX = 130
  const subtotal = Number(invoice.subtotal) || Number(invoice.totalAmount) || 0
  const taxAmount = Number(invoice.taxAmount) || (subtotal * 0.18)
  const total = Number(invoice.totalAmount) || (subtotal + taxAmount)
  const paid = Number(invoice.amountPaid) || 0
  const balanceDue = Number(invoice.balanceDue !== undefined ? invoice.balanceDue : (total - paid))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...grayMuted)
  doc.text('Subtotal:', totalsX, finalY)
  doc.setTextColor(...black)
  doc.text(formatCurrencyINR(subtotal), 196, finalY, { align: 'right' })

  doc.setTextColor(...grayMuted)
  doc.text('GST / Tax:', totalsX, finalY + 6)
  doc.setTextColor(...black)
  doc.text(formatCurrencyINR(taxAmount), 196, finalY + 6, { align: 'right' })

  doc.setDrawColor(...borderGray)
  doc.line(totalsX, finalY + 9, 196, finalY + 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...black)
  doc.text('Total Amount:', totalsX, finalY + 15)
  doc.text(formatCurrencyINR(total), 196, finalY + 15, { align: 'right' })

  if (paid > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(22, 163, 74)
    doc.text('Amount Paid:', totalsX, finalY + 21)
    doc.text(`-${formatCurrencyINR(paid)}`, 196, finalY + 21, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...black)
    doc.text('Balance Due:', totalsX, finalY + 27)
    doc.text(formatCurrencyINR(balanceDue), 196, finalY + 27, { align: 'right' })
  }

  // Footer notes & signature
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...borderGray)
  doc.line(14, pageHeight - 25, 196, pageHeight - 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...grayMuted)
  doc.text('This is a computer-generated tax invoice generated by WWI Clienter platform.', 14, pageHeight - 19)
  doc.text('Work Wizards Innovations Pvt Ltd • Strictly confidential', 14, pageHeight - 15)

  doc.setFont('helvetica', 'bold')
  doc.text('Authorised Signatory', 196, pageHeight - 15, { align: 'right' })

  return doc
}

/**
 * Trigger browser download for an invoice PDF
 */
export function downloadInvoicePDF(invoice, organization, project) {
  const doc = generateInvoicePDF(invoice, organization, project)
  const filename = `${invoice.invoiceNumber || 'WWI-INVOICE'}.pdf`
  doc.save(filename)
}
