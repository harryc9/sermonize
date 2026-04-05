/**
 * Generates structured sermon notes (summary, highlights, verses) from a transcript
 * using the AI SDK with structured output.
 */
import { sermonNotesSchema, type SermonNotes } from '@/types/sermon-notes'
import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'

export async function generateSermonNotes(
  formattedTranscript: string,
  sourceType: 'youtube' | 'pdf' = 'youtube',
): Promise<SermonNotes> {
  const isPdf = sourceType === 'pdf'

  const { output } = await generateText({
    model: openai('gpt-5.4-mini'),
    output: Output.object({ schema: sermonNotesSchema }),
    prompt: `Analyze the following ${isPdf ? 'religious text' : 'sermon transcript'} and produce structured notes.

${isPdf ? 'TEXT' : 'TRANSCRIPT'}:
${formattedTranscript}

Rules:
- summary: Write a 2-3 sentence overview capturing the main message and theme
- highlights: Extract 5-10 key moments (powerful quotes, main points, pivotal arguments). ${isPdf ? 'Use the EXACT page reference from the text in [Page N] format. Set offset to the page number as an integer. Set timestamp to "[Page N]".' : 'Use the EXACT timestamp from the transcript in [M:SS] or [H:MM:SS] format. Set offset to the timestamp converted to total seconds.'}
- verses: List only Bible verse references that include a specific verse number (e.g. "John 3:16", "Mark 11:1-21"). Exclude broad chapter references like "1 Kings 1" or "John 14" with no verse number. If none, return an empty array.
- Quote the speaker's exact words for highlights when possible
- Order highlights chronologically by ${isPdf ? 'page number' : 'timestamp'}
- discussion_questions: Write 3-5 open-ended questions for small group discussion. Root them in the ${isPdf ? "text's" : "sermon's"} specific themes, ${isPdf ? 'passages' : 'illustrations'}, and Scripture — not generic ${isPdf ? 'study' : 'Bible study'} questions.
- prayer: Write a short closing prayer (3-5 sentences) drawn from this ${isPdf ? "text's" : "sermon's"} central message. Should feel like it came from this specific ${isPdf ? 'text' : 'sermon'}, not a generic prayer.`,
  })

  if (!output) {
    throw new Error('Failed to generate sermon notes — no output returned')
  }

  output.highlights.sort((a, b) => a.offset - b.offset)

  return output
}
