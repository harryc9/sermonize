/**
 * Inngest function: downloads a PDF from Supabase Storage, extracts text via
 * Unstructured.io API, generates sermon notes via LLM, and saves to Supabase.
 */
import { inngest } from '@/inngest/client'
import { supabaseServer } from '@/lib/supabase.server'
import { extractPdfPages } from '@/lib/pdf'
import { formatPdfForPrompt } from '@/lib/transcript'
import { generateSermonNotes } from '@/lib/generate-sermon-notes'
import { downloadFromR2 } from '@/lib/r2'
import type { TranscriptSegment } from '@/types'

export const processPdfSermon = inngest.createFunction(
  {
    id: 'process-pdf-sermon',
    triggers: [{ event: 'pdf/process' }],
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
    const { sermon_id, storage_path } = event.data as {
      sermon_id: string
      storage_path: string
    }

    await step.run('set-processing', async () => {
      await supabaseServer
        .from('sermons')
        .update({ status: 'processing', processing_step: 'extracting' })
        .eq('id', sermon_id)
    })

    const transcript = await step.run('extract-text', async () => {
      const filename = storage_path.split('/').pop() ?? 'sermon.pdf'
      const buffer = await downloadFromR2(storage_path)
      return await extractPdfPages(buffer.buffer as ArrayBuffer, filename)
    })

    await step.run('save-transcript', async () => {
      if (transcript.length === 0) {
        await supabaseServer
          .from('sermons')
          .update({
            transcript: [],
            status: 'error',
            error: 'No text could be extracted from the PDF',
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
      return { sermon_id, pages: 0 }
    }

    const notes = await step.run('generate-notes', async () => {
      const segments = transcript as unknown as TranscriptSegment[]
      const formattedText = formatPdfForPrompt(segments)
      return await generateSermonNotes(formattedText, 'pdf')
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

    return { sermon_id, pages: transcript.length }
  },
)
