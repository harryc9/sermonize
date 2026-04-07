/**
 * /s/[id] — Sermon page. Shows processing progress, chat, or error
 * depending on the sermon's current status.
 */
import type { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase.server'
import { downloadFromR2, getDownloadUrl, uploadToR2 } from '@/lib/r2'
import { generatePdfThumbnail } from '@/lib/pdf'
import type { SermonNotes } from '@/types/sermon-notes'
import type { FetchedPassage } from '@/lib/bible/fetch-passages'
import { notFound } from 'next/navigation'
import { SermonChatClient } from './sermon-chat-client'
import { SermonProcessingView } from './sermon-processing-view'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabaseServer
    .from('sermons')
    .select('title, youtube_id')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Sermon not found' }

  const title = data.title ?? 'Sermon'
  const description = `Chat with "${title}" — ask about quotes, verses, themes, and timestamps.`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Sermonize`,
      description,
      ...(data.youtube_id && {
        images: [`https://img.youtube.com/vi/${data.youtube_id}/hqdefault.jpg`],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Sermonize`,
      description,
    },
  }
}

export default async function SermonPage({ params }: Props) {
  const { id } = await params

  const sermonResult = await supabaseServer
    .from('sermons')
    .select('id, title, youtube_id, source_type, pdf_url, pdf_thumbnail_url, user_id, status, processing_step, notes, transcript')
    .eq('id', id)
    .single()

  if (sermonResult.error || !sermonResult.data) notFound()

  const sermon = sermonResult.data

  if (sermon.status !== 'completed') {
    return <SermonProcessingView sermon={sermon} />
  }

  const messagesResult = await supabaseServer
    .from('messages')
    .select('id, role, content, created_at')
    .eq('sermon_id', id)
    .order('created_at', { ascending: true })

  let pdfSignedUrl: string | undefined
  if (sermon.source_type === 'pdf' && sermon.pdf_url) {
    pdfSignedUrl = await getDownloadUrl(sermon.pdf_url)

    // Lazily generate thumbnail for PDFs uploaded before this feature
    if (!sermon.pdf_thumbnail_url) {
      try {
        const pdfBuffer = await downloadFromR2(sermon.pdf_url)
        const jpegBuffer = await generatePdfThumbnail(pdfBuffer.buffer as ArrayBuffer)
        const thumbnailKey = `thumbnails/${sermon.user_id}/${id}.jpg`
        await uploadToR2(thumbnailKey, jpegBuffer, 'image/jpeg')
        await supabaseServer
          .from('sermons')
          .update({ pdf_thumbnail_url: thumbnailKey })
          .eq('id', id)
      } catch {
        // Non-fatal — thumbnail will be generated on next visit
      }
    }
  }

  const passages =
    sermon.source_type === 'passages'
      ? ((sermon.transcript as unknown as FetchedPassage[]) ?? [])
      : undefined

  return (
    <SermonChatClient
      sermon={sermon}
      initialMessages={messagesResult.data ?? []}
      notes={(sermon.notes as SermonNotes) ?? null}
      pdfSignedUrl={pdfSignedUrl}
      passages={passages}
    />
  )
}
