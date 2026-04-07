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
import { hashPassages, refToDisplay, type ParsedRef } from '@/lib/bible/usfm'

const STUCK_THRESHOLD_MINUTES = 5

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { data, error } = await supabaseServer
    .from('sermons')
    .select('id, title, youtube_id, pdf_url, pdf_thumbnail_url, source_type, status, processing_step, created_at')
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
    const body = await request.json()

    // Branch: passages mode (Bible study from predetermined passages)
    if (body.source_type === 'passages') {
      return handlePassagesCreate(auth.userId, body)
    }

    const { url, youtubeId, startMs, endMs } = body

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
      .is('hidden_at', null)

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

type PassagesCreateBody = {
  source_type: 'passages'
  refs: ParsedRef[]
  translation?: string
  passages_input?: string
}

async function handlePassagesCreate(userId: string, body: PassagesCreateBody) {
  const refs = body.refs ?? []
  const translation = body.translation ?? 'BSB'

  if (!Array.isArray(refs) || refs.length === 0) {
    return NextResponse.json(
      { error: 'No passages provided' },
      { status: 400 },
    )
  }
  if (refs.length > 25) {
    return NextResponse.json(
      { error: 'Too many passages (max 25 per study)' },
      { status: 400 },
    )
  }

  const passagesPayload = { translation, refs }
  const passagesHash = hashPassages(refs, translation)

  // Per-user dedup
  const { data: existing } = await supabaseServer
    .from('sermons')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', 'passages')
    .eq('passages_hash', passagesHash)
    .is('hidden_at', null)
    .maybeSingle()

  if (existing) {
    const isStuck =
      (existing.status === 'pending' || existing.status === 'processing') &&
      DateTime.fromISO(existing.created_at).diffNow('minutes').minutes <
        -STUCK_THRESHOLD_MINUTES

    if (isStuck) {
      await supabaseServer
        .from('sermons')
        .update({ status: 'pending', error: null })
        .eq('id', existing.id)

      try {
        await inngest.send({
          name: 'passages/generate-notes',
          data: { sermon_id: existing.id },
        })
      } catch (sendErr) {
        console.error('[sermons] Inngest send failed for stuck passages', sendErr)
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

  // Cross-user dedup: identical (translation, refs) already completed → copy
  const { data: shared } = await supabaseServer
    .from('sermons')
    .select('title, transcript, notes, passages')
    .eq('source_type', 'passages')
    .eq('passages_hash', passagesHash)
    .eq('status', 'completed')
    .not('transcript', 'is', null)
    .limit(1)
    .maybeSingle()

  if (shared) {
    const { data: copied, error: copyError } = await supabaseServer
      .from('sermons')
      .insert({
        user_id: userId,
        source_type: 'passages',
        title: shared.title ?? buildPassagesTitle(refs),
        transcript: shared.transcript,
        notes: shared.notes,
        passages: shared.passages ?? passagesPayload,
        passages_hash: passagesHash,
        passages_input: body.passages_input ?? null,
        status: 'completed',
      })
      .select()
      .single()

    if (copyError) {
      console.error('[sermons] Failed to copy shared passages study', copyError)
      return NextResponse.json({ error: copyError.message }, { status: 500 })
    }
    return NextResponse.json({ sermon: copied })
  }

  // Fresh insert
  const { data: sermon, error } = await supabaseServer
    .from('sermons')
    .insert({
      user_id: userId,
      source_type: 'passages',
      title: buildPassagesTitle(refs),
      transcript: [],
      passages: passagesPayload,
      passages_hash: passagesHash,
      passages_input: body.passages_input ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[sermons] DB insert error (passages)', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await inngest.send({
      name: 'passages/generate-notes',
      data: { sermon_id: sermon.id },
    })
  } catch (sendErr) {
    console.error('[sermons] Inngest send failed for new passages', sendErr)
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
}

function buildPassagesTitle(refs: ParsedRef[]): string {
  if (refs.length === 0) return 'Bible Study'
  if (refs.length <= 3) return refs.map(refToDisplay).join(', ')
  return `${refToDisplay(refs[0])} +${refs.length - 1} more`
}
