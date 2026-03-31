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
    .describe('Bible verse references mentioned in the sermon, e.g. "John 3:16"'),
})

export type SermonNotes = z.infer<typeof sermonNotesSchema>
