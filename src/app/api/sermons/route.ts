/**
 * POST /api/sermons — Creates a pending sermon row and dispatches an Inngest
 * event to handle download + transcription in the background.
 * Deduplicates by (youtube_id, user_id, start_ms, end_ms) — returns existing sermon if already
 * processed. Also checks cross-user: if another user already completed the same video+time-range,
 * copies their transcript/notes instantly (no Inngest job dispatched).
 */
import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { inngest } from '@/inngest/client'
import { getDownloadUrl } from '@/lib/r2'
import { getVideoDurations, isWithinDurationLimit } from '@/lib/youtube'

const STUCK_THRESHOLD_MINUTES = 5

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { data, error } = await supabaseServer
    .from('sermons')
    .select('id, title, youtube_id, pdf_url, pdf_thumbnail_url, status, processing_step, created_at')
    .eq('user_id', auth.userId)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate presigned thumbnail URLs for PDFs that have one stored
  const sermons = await Promise.all(
    (data ?? []).map(async (sermon) => {
      if (!sermon.pdf_thumbnail_url) return sermon
      const thumbnail_url = await getDownloadUrl(sermon.pdf_thumbnail_url, 3600)
      return { ...sermon, thumbnail_url }
    }),
  )

  return NextResponse.json({ sermons })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  try {
    const { url, youtubeId, startMs, endMs } = await request.json()

    if (!url || !youtubeId)
      return NextResponse.json({ error: 'Missing URL or YouTube ID' }, { status: 400 })

    // Duration guardrail: reject videos over 2h30m (or selected range over 2h30m)
    const durations = await getVideoDurations([youtubeId])
    const videoDurationMs = durations.get(youtubeId)
    if (videoDurationMs && !isWithinDurationLimit(videoDurationMs, startMs, endMs)) {
      return NextResponse.json(
        { error: 'Video is too long. Please select a portion under 2 hours 30 minutes.' },
        { status: 400 },
      )
    }

    // Per-user dedup: match on (youtube_id, user_id, start_ms, end_ms)
    let perUserQuery = supabaseServer
      .from('sermons')
      .select('*')
      .eq('youtube_id', youtubeId)
      .eq('user_id', auth.userId)

    perUserQuery =
      startMs != null ? perUserQuery.eq('start_ms', startMs) : perUserQuery.is('start_ms', null)
    perUserQuery =
      endMs != null ? perUserQuery.eq('end_ms', endMs) : perUserQuery.is('end_ms', null)

    const { data: existing } = await perUserQuery.maybeSingle()

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

    // Cross-user dedup: reuse completed transcript from any user for same (youtube_id, start_ms, end_ms)
    let crossUserQuery = supabaseServer
      .from('sermons')
      .select('title, transcript, notes, youtube_url, youtube_id, start_ms, end_ms')
      .eq('youtube_id', youtubeId)
      .eq('status', 'completed')
      .not('transcript', 'is', null)

    crossUserQuery =
      startMs != null
        ? crossUserQuery.eq('start_ms', startMs)
        : crossUserQuery.is('start_ms', null)
    crossUserQuery =
      endMs != null ? crossUserQuery.eq('end_ms', endMs) : crossUserQuery.is('end_ms', null)

    const { data: sharedSource } = await crossUserQuery.limit(1).maybeSingle()

    if (sharedSource) {
      const { data: copiedSermon, error: copyError } = await supabaseServer
        .from('sermons')
        .insert({
          user_id: auth.userId,
          youtube_url: sharedSource.youtube_url,
          youtube_id: sharedSource.youtube_id,
          title: sharedSource.title,
          transcript: sharedSource.transcript,
          notes: sharedSource.notes,
          start_ms: sharedSource.start_ms,
          end_ms: sharedSource.end_ms,
          status: 'completed',
          source_type: 'youtube',
        })
        .select()
        .single()

      if (copyError) {
        console.error('[sermons] Failed to copy shared sermon', copyError)
        return NextResponse.json({ error: copyError.message }, { status: 500 })
      }

      return NextResponse.json({ sermon: copiedSermon })
    }

    const { data: sermon, error } = await supabaseServer
      .from('sermons')
      .insert({
        user_id: auth.userId,
        youtube_url: url,
        youtube_id: youtubeId,
        start_ms: startMs ?? null,
        end_ms: endMs ?? null,
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
