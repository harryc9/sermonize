/**
 * POST /api/sermons/pdf/finalize
 * Called after the client has uploaded the PDF directly to R2.
 * Dispatches the Inngest pdf/process event to start text extraction.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { inngest } from '@/inngest/client'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  let sermonId: string
  let thumbnailKey: string | undefined
  try {
    const body = await request.json()
    sermonId = body.sermonId
    thumbnailKey = body.thumbnailKey
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!sermonId || typeof sermonId !== 'string')
    return NextResponse.json({ error: 'sermonId is required' }, { status: 400 })

  const { data: sermon, error } = await supabaseServer
    .from('sermons')
    .select('id, pdf_url, status')
    .eq('id', sermonId)
    .eq('user_id', auth.userId)
    .single()

  if (error || !sermon)
    return NextResponse.json({ error: 'Sermon not found' }, { status: 404 })

  if (sermon.status !== 'pending')
    return NextResponse.json({ error: 'Sermon is not in pending state' }, { status: 400 })

  if (thumbnailKey) {
    await supabaseServer
      .from('sermons')
      .update({ pdf_thumbnail_url: thumbnailKey })
      .eq('id', sermonId)
  }

  try {
    await inngest.send({
      name: 'pdf/process',
      data: { sermon_id: sermonId, storage_path: sermon.pdf_url },
    })
  } catch (sendErr) {
    console.error('[pdf/finalize] Inngest send failed', sendErr)
    await supabaseServer
      .from('sermons')
      .update({ status: 'error', error: 'Failed to start processing. Please try again.' })
      .eq('id', sermonId)
    return NextResponse.json(
      { error: 'Failed to start processing. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ sermon })
}
