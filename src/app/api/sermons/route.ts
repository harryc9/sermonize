/**
 * POST /api/sermons — Creates a pending sermon row and dispatches an Inngest
 * event to handle download + transcription in the background.
 * Deduplicates by (youtube_id, user_id) — returns existing sermon if already processed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { inngest } from '@/inngest/client'

const STUCK_THRESHOLD_MINUTES = 5

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { data, error } = await supabaseServer
    .from('sermons')
    .select('id, title, youtube_id, status, processing_step, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sermons: data })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  try {
    const { url, youtubeId, startMs, endMs } = await request.json()

    if (!url || !youtubeId)
      return NextResponse.json({ error: 'Missing URL or YouTube ID' }, { status: 400 })

    const { data: existing } = await supabaseServer
      .from('sermons')
      .select('*')
      .eq('youtube_id', youtubeId)
      .eq('user_id', auth.userId)
      .single()

    if (existing) {
      const isStuck =
        (existing.status === 'pending' || existing.status === 'processing') &&
        DateTime.fromISO(existing.created_at).diffNow('minutes').minutes < -STUCK_THRESHOLD_MINUTES

      if (isStuck) {
        await supabaseServer
          .from('sermons')
          .update({ status: 'pending', error: null })
          .eq('id', existing.id)

        try {
          await inngest.send({
            name: 'sermon/transcribe',
            data: {
              sermon_id: existing.id,
              youtube_id: youtubeId,
              youtube_url: url,
              start_ms: startMs,
              end_ms: endMs,
            },
          })
        } catch (sendErr) {
          console.error('[sermons] Inngest send failed for stuck retry', sendErr)
          await supabaseServer
            .from('sermons')
            .update({
              status: 'error',
              error: 'Failed to start processing. Please try again.',
            })
            .eq('id', existing.id)
          return NextResponse.json(
            { error: 'Failed to start processing. Please try again.' },
            { status: 500 },
          )
        }

        return NextResponse.json({ sermon: { ...existing, status: 'pending' } })
      }

      return NextResponse.json({ sermon: existing })
    }

    const { data: sermon, error } = await supabaseServer
      .from('sermons')
      .insert({
        user_id: auth.userId,
        youtube_url: url,
        youtube_id: youtubeId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('[sermons] DB insert error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await inngest.send({
        name: 'sermon/transcribe',
        data: {
          sermon_id: sermon.id,
          youtube_id: youtubeId,
          youtube_url: url,
          start_ms: startMs,
          end_ms: endMs,
        },
      })
    } catch (sendErr) {
      console.error('[sermons] Inngest send failed, rolling back sermon', sendErr)
      await supabaseServer
        .from('sermons')
        .update({
          status: 'error',
          error: 'Failed to start processing. Please try again.',
        })
        .eq('id', sermon.id)
      return NextResponse.json(
        { error: 'Failed to start processing. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ sermon })
  } catch (err) {
    console.error('[sermons] FAILED', err)
    const message = err instanceof Error ? err.message : 'Failed to process video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
