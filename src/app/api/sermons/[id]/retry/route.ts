/**
 * POST /api/sermons/[id]/retry — Re-triggers transcription for a stuck sermon.
 * Resets status to 'pending' and re-sends the Inngest event.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { inngest } from '@/inngest/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { id } = await params

  const { data: sermon, error } = await supabaseServer
    .from('sermons')
    .select('id, youtube_id, youtube_url, status, user_id')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (error || !sermon)
    return NextResponse.json({ error: 'Sermon not found' }, { status: 404 })

  if (sermon.status === 'completed')
    return NextResponse.json({ error: 'Sermon already completed' }, { status: 400 })

  await supabaseServer
    .from('sermons')
    .update({ status: 'pending', error: null })
    .eq('id', id)

  try {
    await inngest.send({
      name: 'sermon/transcribe',
      data: {
        sermon_id: sermon.id,
        youtube_id: sermon.youtube_id,
        youtube_url: sermon.youtube_url,
      },
    })
  } catch (sendErr) {
    console.error('[sermons/retry] Inngest send failed', sendErr)
    await supabaseServer
      .from('sermons')
      .update({
        status: 'error',
        error: 'Failed to start processing. Please try again.',
      })
      .eq('id', id)
    return NextResponse.json(
      { error: 'Failed to start processing. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
