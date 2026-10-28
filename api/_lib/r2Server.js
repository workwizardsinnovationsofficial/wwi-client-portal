import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let s3ClientInstance = null

export function getR2Client() {
  if (s3ClientInstance) {
    return s3ClientInstance
  }

  const accountId = process.env.R2_ACCOUNT_ID || '6c28b0e0827eba9ab14775371b708494'
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`

  if (!accessKeyId || !secretAccessKey) {
    return null // Explicitly indicates credentials pending configuration
  }

  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return s3ClientInstance
}

export function getR2BucketName() {
  return process.env.R2_BUCKET_NAME || 'wwi-client-portal'
}

/**
 * Generate short-lived presigned upload URL (PUT)
 */
export async function createPresignedUploadUrl({
  key,
  contentType = 'application/octet-stream',
  expiresIn = 900, // 15 minutes
}) {
  const client = getR2Client()
  if (!client) {
    throw new Error('Cloudflare R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are not configured on the server.')
  }

  const bucket = getR2BucketName()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn })
  return {
    uploadUrl,
    key,
    bucket,
    expiresIn,
  }
}

/**
 * Generate short-lived presigned download URL (GET)
 */
export async function createPresignedDownloadUrl({
  key,
  expiresIn = 600, // 10 minutes
}) {
  const client = getR2Client()
  if (!client) {
    throw new Error('Cloudflare R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are not configured on the server.')
  }

  const bucket = getR2BucketName()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const downloadUrl = await getSignedUrl(client, command, { expiresIn })
  return {
    downloadUrl,
    key,
    bucket,
    expiresIn,
  }
}
