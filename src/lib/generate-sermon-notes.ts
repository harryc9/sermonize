/**
 * Generates structured sermon notes (summary, highlights, verses) from a transcript
 * using the AI SDK with structured output.
 */
import { sermonNotesSchema, type SermonNotes } from '@/types/sermon-notes'
import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'

export async function generateSermonNotes(
  formattedTranscript: string,
): Promise<SermonNotes> {
  const { output } = await generateText({
    model: openai('gpt-5.4-mini'),
    output: Output.object({ schema: sermonNotesSchema }),
    prompt: `Analyze the following sermon transcript and produce structured notes.

TRANSCRIPT:
${formattedTranscript}

Rules:
- summary: Write a 2-3 sentence overview capturing the main message and theme
- highlights: Extract 5-10 key moments (powerful quotes, main points, pivotal arguments). Use the EXACT timestamp from the transcript in [M:SS] or [H:MM:SS] format. Set offset to the timestamp converted to total seconds.
- verses: List every Bible verse reference mentioned (e.g. "John 3:16"). If none are mentioned, return an empty array.
- Quote the speaker's exact words for highlights when possible
- Order highlights chronologically by timestamp`,
  })

  if (!output) {
    throw new Error('Failed to generate sermon notes — no output returned')
  }

  output.highlights.sort((a, b) => a.offset - b.offset)

  return output
}
