/**
 * Inngest function: fetches Bible verses for a passages-mode sermon and
 * generates structured study notes via LLM. No audio, no transcription —
 * pure DB lookup + one LLM call.
 *
 * Lives in the worker per .claude/rules/inngest.md.
 */
import { inngest } from '@/inngest/client'
import { supabaseServer } from '@/lib/supabase.server'
import { fetchPassages, type FetchedPassage } from '@/lib/bible/fetch-passages'
import { generatePassageNotes } from '@/lib/generate-passage-notes'
import type { ParsedRef } from '@/lib/bible/usfm'

export const generatePassageNotesFn = inngest.createFunction(
  {
    id: 'generate-passage-notes',
    triggers: [{ event: 'passages/generate-notes' }],
    retries: 2,
    concurrency: [{ limit: 5 }],
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
    const { sermon_id } = event.data as { sermon_id: string }

    await step.run('set-fetching', async () => {
      await supabaseServer
        .from('sermons')
        .update({ status: 'processing', processing_step: 'fetching_passages' })
        .eq('id', sermon_id)
    })

    const fetched = await step.run('fetch-verses', async () => {
      const { data: sermon, error } = await supabaseServer
        .from('sermons')
        .select('passages')
        .eq('id', sermon_id)
        .single()

      if (error || !sermon?.passages) {
        throw new Error('Sermon not found or missing passages payload')
      }

      const payload = sermon.passages as { translation: string; refs: ParsedRef[] }
      const passages = await fetchPassages(payload.refs, payload.translation)

      const empty = passages.filter((p) => p.verses.length === 0)
      if (empty.length === passages.length) {
        throw new Error('None of the requested passages returned any verses')
      }

      return passages
    })

    await step.run('save-verses', async () => {
      // Store fetched passages in `transcript` so the chat endpoint can
      // load them through the same select-and-pass flow.
      await supabaseServer
        .from('sermons')
        .update({
          transcript: JSON.parse(JSON.stringify(fetched)),
          processing_step: 'generating_notes',
        })
        .eq('id', sermon_id)
    })

    const notes = await step.run('generate-notes', async () => {
      return await generatePassageNotes(fetched as FetchedPassage[])
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

    return { sermon_id, passage_count: fetched.length }
  },
)
