/**
 * Inngest function: downloads YouTube audio, transcribes via Whisper,
 * generates structured sermon notes via LLM, and saves everything to Supabase.
 * Each major phase is a step so it survives Vercel timeouts via checkpointing.
 */
import { inngest } from '@/inngest/client'
import { supabaseServer } from '@/lib/supabase.server'
import { downloadAudio, getYouTubeTitle } from '@/lib/audio'
import { transcribeAudio } from '@/lib/whisper'
import { formatTranscriptForPrompt } from '@/lib/transcript'
import { generateSermonNotes } from '@/lib/generate-sermon-notes'
import type { TranscriptSegment } from '@/types'
import { unlink } from 'node:fs/promises'

export const transcribeSermon = inngest.createFunction(
  {
    id: 'transcribe-sermon',
    triggers: [{ event: 'sermon/transcribe' }],
    retries: 2,
    concurrency: [{ limit: 3 }],
    onFailure: async ({ event, error }) => {
      const sermonId = (event.data.event as { data: { sermon_id: string } })
        ?.data?.sermon_id
      if (!sermonId) return

      await supabaseServer
        .from('sermons')
        .update({ status: 'error', error: error.message, processing_step: null })
        .eq('id', sermonId)
    },
  },
  async ({ event, step }) => {
    const { sermon_id, youtube_id, youtube_url, start_ms, end_ms } =
      event.data as {
        sermon_id: string
        youtube_id: string
        youtube_url: string
        start_ms?: number
        end_ms?: number
      }

    await step.run('set-processing', async () => {
      await supabaseServer
        .from('sermons')
        .update({ status: 'processing', processing_step: 'downloading' })
        .eq('id', sermon_id)
    })

    const title = await step.run('fetch-title', async () => {
      try {
        return await getYouTubeTitle(youtube_id)
      } catch {
        return null
      }
    })

    if (title) {
      await step.run('save-title', async () => {
        await supabaseServer
          .from('sermons')
          .update({ title })
          .eq('id', sermon_id)
      })
    }

    const startSec = start_ms != null ? start_ms / 1000 : undefined
    const endSec = end_ms != null ? end_ms / 1000 : undefined

    const { filePath, sizeBytes } = await step.run('download-audio', async () => {
      return await downloadAudio(youtube_id, startSec, endSec)
    })

    await step.run('set-transcribing', async () => {
      await supabaseServer
        .from('sermons')
        .update({ processing_step: 'transcribing' })
        .eq('id', sermon_id)
    })

    const transcript = await step.run('transcribe', async () => {
      try {
        const offsetMs = start_ms ?? 0
        console.log(`[transcribe] starting whisper, file size: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB`)
        return await transcribeAudio(filePath, offsetMs)
      } finally {
        await unlink(filePath).catch(() => {})
      }
    })

    await step.run('save-transcript', async () => {
      if (transcript.length === 0) {
        await supabaseServer
          .from('sermons')
          .update({
            transcript: JSON.parse(JSON.stringify(transcript)),
            status: 'error',
            error: 'No speech detected in audio',
            processing_step: null,
          })
          .eq('id', sermon_id)
        return
      }

      await supabaseServer
        .from('sermons')
        .update({
          transcript: JSON.parse(JSON.stringify(transcript)),
          processing_step: 'generating_notes',
        })
        .eq('id', sermon_id)
    })

    if (transcript.length === 0) {
      return { sermon_id, segments: 0 }
    }

    const notes = await step.run('generate-notes', async () => {
      const segments = transcript as unknown as TranscriptSegment[]
      const formattedTranscript = formatTranscriptForPrompt(segments)
      return await generateSermonNotes(formattedTranscript)
    })

    await step.run('save-notes', async () => {
      await supabaseServer
        .from('sermons')
        .update({
          notes: JSON.parse(JSON.stringify(notes)),
          status: 'completed',
          processing_step: null,
        })
        .eq('id', sermon_id)
    })

    return { sermon_id, segments: transcript.length }
  },
)
