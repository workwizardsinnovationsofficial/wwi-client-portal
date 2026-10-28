import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const TIMEZONE_KOLKATA = 'Asia/Kolkata'

/**
 * Merge Tailwind class names cleanly
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency in Indian Rupees (INR)
 * e.g., 125000 -> "₹1,25,000.00"
 */
export function formatCurrencyINR(amount, includeDecimals = true) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount)
}

/**
 * Convert Date/Timestamp to Asia/Kolkata time and format
 */
export function formatDateKolkata(dateInput, formatPattern = 'dd MMM yyyy, hh:mm a') {
  if (!dateInput) return '—'
  
  let dateObj
  if (typeof dateInput?.toDate === 'function') {
    dateObj = dateInput.toDate()
  } else if (dateInput instanceof Date) {
    dateObj = dateInput
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    dateObj = new Date(dateInput)
  } else if (dateInput?.seconds) {
    dateObj = new Date(dateInput.seconds * 1000)
  } else {
    return '—'
  }

  if (isNaN(dateObj.getTime())) return '—'

  try {
    const zoned = toZonedTime(dateObj, TIMEZONE_KOLKATA)
    return format(zoned, formatPattern)
  } catch (err) {
    console.error('Date format error:', err)
    return dateObj.toLocaleDateString('en-IN')
  }
}

/**
 * Relative time ago
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '—'
  let dateObj
  if (typeof dateInput?.toDate === 'function') {
    dateObj = dateInput.toDate()
  } else if (dateInput instanceof Date) {
    dateObj = dateInput
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    dateObj = new Date(dateInput)
  } else if (dateInput?.seconds) {
    dateObj = new Date(dateInput.seconds * 1000)
  } else {
    return '—'
  }

  if (isNaN(dateObj.getTime())) return '—'

  try {
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (err) {
    return 'recently'
  }
}

/**
 * Extract user initials for avatar
 */
export function getInitials(name = '') {
  if (!name) return 'WWI'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Generate human-friendly ID prefixes
 */
export function generateCode(prefix = 'WWI', length = 6) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${result}`
}

/**
 * Human readable file size
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
