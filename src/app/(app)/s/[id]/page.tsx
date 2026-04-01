/**
 * /s/[id] — Sermon page. Shows processing progress, chat, or error
 * depending on the sermon's current status.
 */
import type { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase.server'
import type { SermonNotes } from '@/types/sermon-notes'
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
    .select('id, title, youtube_id, status, processing_step, notes')
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

  return (
    <SermonChatClient
      sermon={sermon}
      initialMessages={messagesResult.data ?? []}
      notes={(sermon.notes as SermonNotes) ?? null}
    />
  )
}
