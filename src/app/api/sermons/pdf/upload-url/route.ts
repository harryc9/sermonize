/**
 * POST /api/sermons/pdf/upload-url
 * Creates a pending sermon row and returns a presigned R2 PUT URL.
 * The client uploads the PDF directly to R2, then calls /api/sermons/pdf/finalize.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { getUploadUrl } from '@/lib/r2'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  let filename: string
  try {
    const body = await request.json()
    filename = body.filename
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!filename || typeof filename !== 'string' || !filename.toLowerCase().endsWith('.pdf'))
    return NextResponse.json({ error: 'A PDF filename is required' }, { status: 400 })

  const sermonId = crypto.randomUUID()
  const storageKey = `${auth.userId}/${sermonId}.pdf`
  const thumbnailKey = `thumbnails/${auth.userId}/${sermonId}.jpg`

  // Generate presigned upload URLs before touching the DB
  let uploadUrl: string
  let thumbnailUploadUrl: string
  try {
    ;[uploadUrl, thumbnailUploadUrl] = await Promise.all([
      getUploadUrl(storageKey),
      getUploadUrl(thumbnailKey),
    ])
  } catch (err) {
    console.error('[pdf/upload-url] Failed to generate presigned URLs', err)
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 })
  }

  const { error: dbError } = await supabaseServer
    .from('sermons')
    .insert({
      id: sermonId,
      user_id: auth.userId,
      source_type: 'pdf',
      pdf_url: storageKey,
      pdf_filename: filename,
      title: filename.replace(/\.pdf$/i, ''),
      status: 'pending',
      transcript: [],
    })

  if (dbError) {
    console.error('[pdf/upload-url] DB insert error', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ sermonId, uploadUrl, thumbnailUploadUrl, thumbnailKey })
}
