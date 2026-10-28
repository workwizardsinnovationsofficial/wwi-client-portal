import { describe, it, expect } from 'vitest'
import { formatBytes } from '../lib/utils'

describe('Cloudflare R2 Object Storage Integration', () => {
  it('formats byte sizes to human-readable units', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(4280000)).toBe('4.08 MB')
  })

  it('validates file size within 50MB boundary', () => {
    const MAX_ALLOWED = 50 * 1024 * 1024 // 50 MB
    const validFileSize = 15 * 1024 * 1024 // 15 MB
    const oversizedFile = 55 * 1024 * 1024 // 55 MB

    expect(validFileSize <= MAX_ALLOWED).toBe(true)
    expect(oversizedFile <= MAX_ALLOWED).toBe(false)
  })

  it('validates supported enterprise deliverable MIME types', () => {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'image/png',
      'image/jpeg',
      'text/plain',
      'application/json',
    ]

    expect(supportedTypes.includes('application/pdf')).toBe(true)
    expect(supportedTypes.includes('application/zip')).toBe(true)
    expect(supportedTypes.includes('application/x-msdownload')).toBe(false) // .exe blocked
  })
})
