/**
 * Generates structured study notes for a set of Bible passages.
 * Mirrors generate-sermon-notes.ts but tailored for passage content
 * (verses instead of a transcript).
 */
import { sermonNotesSchema, type SermonNotes } from '@/types/sermon-notes'
import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import {
  type FetchedPassage,
  formatPassagesForPrompt,
} from '@/lib/bible/fetch-passages'

export async function generatePassageNotes(
  passages: FetchedPassage[],
): Promise<SermonNotes> {
  const formatted = formatPassagesForPrompt(passages)
  const passageList = passages.map((p) => p.display).join(', ')

  const { output } = await generateText({
    model: openai('gpt-5.4-mini'),
    output: Output.object({ schema: sermonNotesSchema }),
    prompt: `Analyze the following Bible passages and produce structured study notes.

PASSAGES STUDIED: ${passageList}

VERSES:
${formatted}

Rules:
- summary: Write a 2-3 sentence overview of what these passages collectively teach. Tie them together if they share themes; treat them as a unit.
- highlights: Pick 5-10 key verses (powerful statements, central claims, pivotal moments) from across the passages. For each highlight, set timestamp to the verse reference like "Romans 8:1" and offset to the verse's absolute order in the passage list (1, 2, 3, ...). Quote the verse text exactly — never paraphrase.
- verses: List Bible verse references that include a specific verse number (e.g. "Romans 8:1", "John 3:16-17"). These can include cross-references the passages allude to, or verses from within the passages themselves that are particularly significant. Exclude broad chapter-only references.
- discussion_questions: Write 3-5 open-ended discussion questions for small group conversation. Root them in the specific themes, images, and arguments of THESE passages — not generic Bible study questions.
- prayer: Write a short closing prayer (3-5 sentences) drawn from the central message of these passages. Should feel like it came from this specific study, not a generic prayer.
- Order highlights chronologically by their offset.`,
  })

  if (!output) {
    throw new Error('Failed to generate passage notes — no output returned')
  }

  output.highlights.sort((a, b) => a.offset - b.offset)

  return output
}
