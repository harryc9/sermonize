/**
 * Client wrapper for the sermon chat page.
 * Two-column layout: Chat (flex-1) | collapsible Notes panel (w-[400px]) with embedded player.
 * When notes are closed, a floating PiP player handles chat timestamp clicks.
 */
'use client'

import { ChatInterface } from '@/components/chat-interface'
import { SermonNotesPanel } from '@/components/sermon-notes'
import { YouTubePlayer, type YouTubePlayerHandle } from '@/components/youtube-player'
import { PdfViewer } from '@/components/pdf-viewer'
import { useInvalidateSermonList } from '@/components/sidebar'
import type { SermonNotes as SermonNotesType } from '@/types/sermon-notes'
import type { UIMessage } from 'ai'
import { useRef, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { X, Minimize2, Maximize2, FileText, ChevronLeft } from 'lucide-react'

type DbMessage = {
  id: string
  role: string
  content: string
  created_at: string
}

type Props = {
  sermon: { id: string; title: string | null; youtube_id: string | null; source_type: string }
  initialMessages: DbMessage[]
  notes: SermonNotesType | null
  pdfSignedUrl?: string
}

function toUIMessages(dbMessages: DbMessage[]): UIMessage[] {
  return dbMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
  }))
}

export function SermonChatClient({ sermon, initialMessages, notes, pdfSignedUrl }: Props) {
  const messages = toUIMessages(initialMessages)
  const isPdf = sermon.source_type === 'pdf'
  const playerRef = useRef<YouTubePlayerHandle>(null)
  const invalidateSermonList = useInvalidateSermonList()

  // When visiting a PDF sermon, invalidate the sidebar so lazily-generated thumbnails appear.
  // staleTime: Infinity ensures this runs exactly once per sermon page mount.
  useQuery({
    queryKey: ['pdf-sidebar-sync', sermon.id],
    queryFn: async () => { invalidateSermonList(); return null },
    enabled: isPdf,
    staleTime: Infinity,
    gcTime: 0,
  })
  const [isNotesOpen, setIsNotesOpen] = useState(!!notes)
  const [isPipVisible, setIsPipVisible] = useState(true)
  const [isPipMinimized, setIsPipMinimized] = useState(false)

  const handleTimestampClick = useCallback((seconds: number) => {
    if (isPdf) return
    if (!isNotesOpen) {
      setIsPipVisible(true)
      setIsPipMinimized(false)
    }
    playerRef.current?.seekTo(seconds)
  }, [isPdf, isNotesOpen])

  const showPip = !isPdf && !isNotesOpen && isPipVisible

  return (
    <div className="flex h-full">
      <div className="relative min-w-0 flex-1">
        <ChatInterface
          sermonId={sermon.id}
          sermonTitle={sermon.title}
          initialMessages={messages}
          onTimestampClick={handleTimestampClick}
        />

        {/* Floating edge toggle for notes panel */}
        {notes && !isNotesOpen && (
          <button
            type="button"
            onClick={() => setIsNotesOpen(true)}
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1 rounded-l-lg border border-r-0 border-border bg-background px-1.5 py-3 text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 md:flex"
          >
            <ChevronLeft size={14} />
            <FileText size={14} />
          </button>
        )}
      </div>

      {isNotesOpen && notes && (
        <div className="fixed inset-0 z-50 bg-background md:relative md:inset-auto md:z-auto md:w-[400px] md:shrink-0 md:border-l md:border-border">
          <SermonNotesPanel
            sermonId={sermon.id}
            notes={notes}
            onTimestampClick={handleTimestampClick}
            onClose={() => setIsNotesOpen(false)}
            sourceType={sermon.source_type}
            player={
              isPdf && pdfSignedUrl ? (
                <PdfViewer url={pdfSignedUrl} />
              ) : sermon.youtube_id ? (
                <YouTubePlayer
                  ref={playerRef}
                  youtubeId={sermon.youtube_id}
                />
              ) : null
            }
          />
        </div>
      )}

      {/* PiP player when notes panel is closed */}
      {showPip && (
        <div
          className={`fixed bottom-4 left-2 z-50 overflow-hidden rounded-xl border border-border bg-background shadow-lg transition-all md:left-2 ${
            isPipMinimized ? 'w-48' : 'w-60'
          }`}
        >
          <div className="flex items-center justify-between bg-muted/50 px-2 py-1">
            <span className="truncate text-xs text-muted-foreground">
              {isPipMinimized ? 'Video' : sermon.title ?? 'Sermon Video'}
            </span>
            <div className="flex shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsPipMinimized((v) => !v)}
              >
                {isPipMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsPipVisible(false)}
              >
                <X size={12} />
              </Button>
            </div>
          </div>
          {!isPipMinimized && sermon.youtube_id && (
            <YouTubePlayer
              ref={playerRef}
              youtubeId={sermon.youtube_id}
            />
          )}
        </div>
      )}
    </div>
  )
}
