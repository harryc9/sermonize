/**
 * Zod schema and TypeScript type for auto-generated sermon notes.
 * Reused by the Inngest generation step and UI components.
 */
import { z } from 'zod'

export const sermonNotesSchema = z.object({
  summary: z.string().describe('2-3 sentence overview of the sermon'),
  highlights: z
    .array(
      z.object({
        text: z.string().describe('Key point or quote from the sermon'),
        timestamp: z.string().describe('Timestamp in [M:SS] or [H:MM:SS] format'),
        offset: z.number().describe('Offset in seconds for YouTube seek'),
      }),
    )
    .describe('5-10 key highlights from the sermon with timestamps'),
  verses: z
    .array(z.string())
    .transform((refs) => refs.filter((r) => r.includes(':')))
    .describe('Bible verse references with specific verse numbers only, e.g. "John 3:16" or "Mark 11:1-21" — never broad chapters like "1 Kings 1"'),
  discussion_questions: z
    .array(z.string())
    .describe('3-5 open-ended discussion questions for small group conversation, grounded in the sermon themes and Scripture referenced'),
  prayer: z
    .string()
    .describe('A short closing prayer (3-5 sentences) that reflects the sermon central message and invites personal application'),
})

export type SermonNotes = z.infer<typeof sermonNotesSchema>
