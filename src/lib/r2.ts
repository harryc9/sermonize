/**
 * Cloudflare R2 storage helpers.
 * S3-compatible — uses @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = process.env.R2_BUCKET_NAME!

function r2() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ACCOUNT_ID!,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  })
}

/** Presigned PUT URL for direct browser upload. Default 10-minute expiry. */
export async function getUploadUrl(key: string, expiresIn = 600): Promise<string> {
  return getSignedUrl(r2(), new PutObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

/** Presigned GET URL for serving files to the browser. Default 1-hour expiry. */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

/** Download object as a Buffer (for use in the Inngest worker). */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const response = await r2().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))

  if (!response.Body) throw new Error('R2 response body is empty')

  const chunks: Buffer[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/** Upload a buffer to R2. */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }))
}

/** Delete an object from R2. */
export async function deleteFromR2(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
