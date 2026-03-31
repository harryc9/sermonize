/**
 * POST /api/chat — Streams AI responses about a sermon using its full transcript as context.
 * Persists user and assistant messages to the database.
 */
import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText } from 'ai'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { formatTranscriptForPrompt } from '@/lib/transcript'
import type { TranscriptSegment } from '@/types'
import type { SermonNotes } from '@/types/sermon-notes'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { messages, sermonId } = await request.json()

  if (!sermonId)
    return new Response('Missing sermonId', { status: 400 })

  const { data: sermon, error } = await supabaseServer
    .from('sermons')
    .select('*')
    .eq('id', sermonId)
    .eq('user_id', auth.userId)
    .single()

  if (error || !sermon)
    return new Response('Sermon not found', { status: 404 })

  const lastUserMessage = [...messages].reverse().find(
    (m: { role: string }) => m.role === 'user',
  )

  if (lastUserMessage) {
    const userContent =
      lastUserMessage.content ??
      lastUserMessage.parts
        ?.filter((p: { type: string }) => p.type === 'text')
        .map((p: { text: string }) => p.text)
        .join('') ??
      ''

    if (userContent) {
      await supabaseServer.from('messages').insert({
        sermon_id: sermonId,
        user_id: auth.userId,
        role: 'user',
        content: userContent,
      })
    }
  }

  const segments = sermon.transcript as unknown as TranscriptSegment[]
  const formattedTranscript = formatTranscriptForPrompt(segments)

  const notes = sermon.notes as unknown as SermonNotes | null
  const notesBlock = notes
    ? `\nSERMON NOTES (pre-generated summary, highlights, and verses):
Summary: ${notes.summary}
Key Highlights:
${notes.highlights.map((h) => `- [${h.timestamp}] ${h.text}`).join('\n')}
Bible Verses Referenced: ${notes.verses.length > 0 ? notes.verses.join(', ') : 'None mentioned'}\n`
    : ''

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are a sermon study assistant. Answer questions about this sermon using the transcript and notes below. Be precise, thoughtful, and pastoral in tone.
${notesBlock}
TRANSCRIPT:
${formattedTranscript}

Rules:
- Cite timestamps exactly as they appear in the transcript using [M:SS] or [H:MM:SS] format — do NOT wrap them in parentheses
- Quote exact words from the transcript when the user asks for quotes — never paraphrase
- Identify and cite Bible verse references (e.g., John 3:16) mentioned in the sermon
- If the user asks about something not covered in the sermon, say so clearly
- When summarizing, organize by the main points/themes of the sermon
- Use the sermon notes as a reference for key themes, highlights, and verse citations
- Keep responses focused and concise unless the user asks for detail`,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      if (text) {
        await supabaseServer.from('messages').insert({
          sermon_id: sermonId,
          user_id: auth.userId,
          role: 'assistant',
          content: text,
        })
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
