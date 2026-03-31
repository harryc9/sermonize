/**
 * POST /api/sermons/[id]/regenerate-notes — Regenerates sermon notes from the existing transcript.
 * Works for both first-time generation (older sermons) and re-generation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { generateSermonNotes } from '@/lib/generate-sermon-notes'
import { formatTranscriptForPrompt } from '@/lib/transcript'
import type { TranscriptSegment } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { id } = await params

  const { data: sermon, error } = await supabaseServer
    .from('sermons')
    .select('id, transcript, status, user_id')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (error || !sermon)
    return NextResponse.json({ error: 'Sermon not found' }, { status: 404 })

  if (sermon.status !== 'completed')
    return NextResponse.json({ error: 'Sermon not yet completed' }, { status: 400 })

  const segments = sermon.transcript as unknown as TranscriptSegment[]
  if (!segments?.length)
    return NextResponse.json({ error: 'No transcript available' }, { status: 400 })

  const formattedTranscript = formatTranscriptForPrompt(segments)
  const notes = await generateSermonNotes(formattedTranscript)

  await supabaseServer
    .from('sermons')
    .update({ notes: JSON.parse(JSON.stringify(notes)) })
    .eq('id', id)

  return NextResponse.json({ notes })
}
