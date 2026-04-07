/**
 * POST /api/chat — Streams AI responses about a sermon using its full transcript as context.
 * Persists user and assistant messages to the database.
 */
import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText } from 'ai'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import { formatTranscriptForPrompt, formatPdfForPrompt } from '@/lib/transcript'
import { formatPassagesForPrompt, type FetchedPassage } from '@/lib/bible/fetch-passages'
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

  const isPassages = sermon.source_type === 'passages'
  const isPdf = sermon.source_type === 'pdf'

  let formattedContent: string
  if (isPassages) {
    const passages = sermon.transcript as unknown as FetchedPassage[]
    formattedContent = formatPassagesForPrompt(passages)
  } else {
    const segments = sermon.transcript as unknown as TranscriptSegment[]
    formattedContent = isPdf
      ? formatPdfForPrompt(segments)
      : formatTranscriptForPrompt(segments)
  }

  const notes = sermon.notes as unknown as SermonNotes | null
  const notesLabel = isPassages ? 'STUDY NOTES' : 'SERMON NOTES'
  const notesBlock = notes
    ? `\n${notesLabel} (pre-generated summary, highlights, and verses):
Summary: ${notes.summary}
Key Highlights:
${notes.highlights.map((h) => `- [${h.timestamp}] ${h.text}`).join('\n')}
Bible Verses Referenced: ${notes.verses.length > 0 ? notes.verses.join(', ') : 'None mentioned'}\n`
    : ''

  const modelMessages = await convertToModelMessages(messages)

  const sourceLabel = isPassages
    ? 'set of Bible passages'
    : isPdf
      ? 'religious text'
      : 'sermon'
  const contentLabel = isPassages
    ? 'passages'
    : isPdf
      ? 'document content'
      : 'transcript'
  const contentHeader = isPassages
    ? 'PASSAGES'
    : isPdf
      ? 'DOCUMENT CONTENT'
      : 'TRANSCRIPT'

  const citationRule = isPassages
    ? 'Cite verses using [Book Chapter:Verse] format exactly as they appear (e.g. [Romans 8:1]) — do NOT wrap in parentheses'
    : isPdf
      ? 'Cite page numbers exactly as they appear using [Page X] format — do NOT wrap in parentheses'
      : 'Cite timestamps exactly as they appear in the transcript using [M:SS] or [H:MM:SS] format — do NOT wrap them in parentheses'

  const groundingRule = isPassages
    ? 'CRITICAL: Only quote verses that appear in the passages above. NEVER invent or paraphrase Bible text. If a user asks about a verse not in the loaded passages, say so clearly and offer to discuss what is loaded.'
    : `If the user asks about something not covered in the ${isPdf ? 'document' : 'sermon'}, say so clearly`

  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are a pastoral study assistant. Answer questions about this ${sourceLabel} using the ${contentLabel} and notes below. Be precise, thoughtful, and pastoral in tone.
${notesBlock}
${contentHeader}:
${formattedContent}

Rules:
- ${citationRule}
- Quote exact words from the ${contentLabel} when the user asks for quotes — never paraphrase
- ${groundingRule}
- When summarizing, organize by the main themes of the ${isPassages ? 'passages' : isPdf ? 'text' : 'sermon'}
- Use the notes as a reference for key themes, highlights, and verse citations
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
