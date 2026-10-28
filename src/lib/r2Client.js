import { auth } from './firebase'

/**
 * Cloudflare R2 Client-side integration utility
 * Interacts with secure serverless /api/r2 endpoints for presigned URLs
 */

async function getAuthHeader() {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('Authentication required for file operations')
  }
  const token = await currentUser.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Request server to generate a short-lived presigned upload URL
 */
export async function getUploadPresignedUrl({
  fileName,
  fileType,
  fileSize,
  projectId,
  organizationId,
  visibility = 'client_visible',
}) {
  const headers = await getAuthHeader()
  const res = await fetch('/api/r2/sign-upload', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      fileType,
      fileSize,
      projectId,
      organizationId,
      visibility,
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Upload authorization failed with HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Execute upload directly to Cloudflare R2 bucket using presigned PUT URL
 */
export async function uploadFileToR2(file, {
  projectId,
  organizationId,
  visibility = 'client_visible',
  onProgress,
} = {}) {
  // Step 1: Request authorized signed PUT URL from server
  const signResult = await getUploadPresignedUrl({
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    projectId,
    organizationId,
    visibility,
  })

  const { uploadUrl, key } = signResult

  // Step 2: Upload file directly to Cloudflare R2 via presigned URL
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error(`R2 direct upload failed with status ${uploadRes.status}`)
  }

  return {
    key,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    uploadedAt: new Date().toISOString(),
    visibility,
  }
}

/**
 * Request server to generate a short-lived presigned download URL
 */
export async function getDownloadPresignedUrl(key) {
  const headers = await getAuthHeader()
  const res = await fetch(`/api/r2/sign-download?key=${encodeURIComponent(key)}`, {
    headers,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Download authorization failed with HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.downloadUrl
}
