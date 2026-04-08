/**
 * Extracts Bible passage references from user input — text or image.
 * Used by /api/passages/parse to power the dashboard's "paste a plan" flow.
 */
import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { bookNameToUsfm, type ParsedRef } from '@/lib/bible/usfm'

const parseSchema = z.object({
  refs: z
    .array(
      z.object({
        book: z.string().describe('Full book name as written, e.g. "Romans", "1 Kings", "Song of Solomon"'),
        chapter: z.number().int().positive(),
        verse_start: z
          .number()
          .int()
          .positive()
          .nullable()
          .describe('First verse number, or null if the reference is a whole chapter'),
        verse_end: z
          .number()
          .int()
          .positive()
          .nullable()
          .describe('Last verse number, or null if the reference is a whole chapter or single verse'),
      }),
    )
    .describe('All Bible passage references found in the input. Empty array if none.'),
})

const SYSTEM_PROMPT = `You extract Bible passage references from a user's input. The input may be free-form text (typed) or a screenshot of a reading plan.

Rules:
- Return one entry per distinct passage. Do not merge separate passages.
- A passage is one of:
  - A whole chapter: "Proverbs 20" → { book: "Proverbs", chapter: 20 }
  - A verse range: "Romans 8:1-17" → { book: "Romans", chapter: 8, verse_start: 1, verse_end: 17 }
  - A single verse: "John 3:16" → { book: "John", chapter: 3, verse_start: 16, verse_end: 16 }
- For chapter ranges like "Proverbs 20-22", return ONE entry per chapter (Proverbs 20, Proverbs 21, Proverbs 22).
- Use full English book names ("1 Corinthians", not "1Cor"). Numbered books always start with "1 ", "2 ", or "3 ".
- "Psalm 23" and "Psalms 23" both refer to the same book — return as "Psalm".
- Ignore everything that isn't a Bible passage reference (commentary, dates, headings, plan titles).
- If you cannot find any references, return an empty array.`

export type ParsePassageInput = {
  text?: string
  imageBase64?: string // raw base64 (no data URL prefix)
  imageMimeType?: string // e.g. 'image/png', 'image/jpeg'
}

export async function parsePassageInput(
  input: ParsePassageInput,
): Promise<ParsedRef[]> {
  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: string; mediaType: string }
  > = []

  if (input.text) {
    userContent.push({ type: 'text', text: input.text })
  }

  if (input.imageBase64) {
    userContent.push({
      type: 'image',
      image: input.imageBase64,
      mediaType: input.imageMimeType ?? 'image/png',
    })
    if (!input.text) {
      userContent.push({
        type: 'text',
        text: 'Extract every Bible passage reference visible in this image.',
      })
    }
  }

  if (userContent.length === 0) return []

  const { output } = await generateText({
    model: openai('gpt-5.4-mini'),
    output: Output.object({ schema: parseSchema }),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  if (!output) return []

  // Canonicalize book names → USFM. Drop refs with unrecognized books.
  const refs: ParsedRef[] = []
  for (const r of output.refs) {
    const usfm = bookNameToUsfm(r.book)
    if (!usfm) {
      console.warn('[parse-passage-input] unknown book', r.book)
      continue
    }
    const verseStart = r.verse_start ?? undefined
    const verseEnd = r.verse_end ?? verseStart
    refs.push({
      book: usfm,
      chapter: r.chapter,
      verse_start: verseStart,
      verse_end: verseEnd,
    })
  }
  return refs
}
