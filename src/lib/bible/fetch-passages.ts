/**
 * Fetches Bible verses from the bible_verses table for a list of parsed
 * references, and formats them for LLM consumption.
 */
import { supabaseServer } from '@/lib/supabase.server'
import { type ParsedRef, refToDisplay, usfmToDisplay } from '@/lib/bible/usfm'

export type PassageVerse = {
  book: string // USFM
  chapter: number
  verse: number
  text: string
}

export type FetchedPassage = {
  ref: ParsedRef
  display: string // "Romans 8:1-17"
  verses: PassageVerse[] // ordered by (chapter, verse)
}

/**
 * Loads each ref's verses from Supabase. Whole-chapter refs return all verses
 * in that chapter; verse-range refs return the slice. Refs that resolve to
 * zero verses (bad references) are returned with an empty verses array — the
 * caller decides how to surface that.
 */
export async function fetchPassages(
  refs: ParsedRef[],
  translation: string = 'BSB',
): Promise<FetchedPassage[]> {
  return Promise.all(
    refs.map(async (ref) => {
      let query = supabaseServer
        .from('bible_verses')
        .select('book, chapter, verse, text')
        .eq('translation', translation)
        .eq('book', ref.book)
        .eq('chapter', ref.chapter)
        .order('verse', { ascending: true })

      if (ref.verse_start != null) {
        query = query.gte('verse', ref.verse_start)
        const end = ref.verse_end ?? ref.verse_start
        query = query.lte('verse', end)
      }

      const { data, error } = await query
      if (error) {
        console.error('[fetch-passages] DB error', error, ref)
        return { ref, display: refToDisplay(ref), verses: [] }
      }

      return {
        ref,
        display: refToDisplay(ref),
        verses: (data ?? []) as PassageVerse[],
      }
    }),
  )
}

/**
 * Renders fetched passages as a single prompt-ready string. Each verse is
 * tagged with its display reference so the LLM can cite it directly.
 */
export function formatPassagesForPrompt(passages: FetchedPassage[]): string {
  return passages
    .map((p) => {
      const header = `=== ${p.display} ===`
      const lines = p.verses.map(
        (v) => `[${usfmToDisplay(v.book)} ${v.chapter}:${v.verse}] ${v.text}`,
      )
      return [header, ...lines].join('\n')
    })
    .join('\n\n')
}
