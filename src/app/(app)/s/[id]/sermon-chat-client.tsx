/**
 * Client wrapper for the sermon chat page.
 *
 * Two layout modes (toggleable via header button):
 *  - 'reader': content (passage / video / pdf) takes the center column,
 *    chat lives in a 400px right rail. Best for reading-focused study.
 *  - 'chat':   chat takes the center column, content sits in a 400px right rail
 *    (with a floating PiP video when the rail is closed). Original behavior.
 *
 * Default mode: 'reader' for passages, 'chat' for video/pdf.
 */
'use client'

import { ChatInterface } from '@/components/chat-interface'
import { SermonNotesPanel } from '@/components/sermon-notes'
import { YouTubePlayer, type YouTubePlayerHandle } from '@/components/youtube-player'
import { PdfViewer } from '@/components/pdf-viewer'
import { PassageReader } from '@/components/passages/passage-reader'
import { useInvalidateSermonList } from '@/components/sidebar'
import type { SermonNotes as SermonNotesType } from '@/types/sermon-notes'
import type { FetchedPassage } from '@/lib/bible/fetch-passages'
import type { UIMessage } from 'ai'
import { useRef, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  X,
  Minimize2,
  Maximize2,
  FileText,
  ChevronLeft,
  ArrowLeftRight,
} from 'lucide-react'

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
  passages?: FetchedPassage[]
}

type LayoutMode = 'reader' | 'chat'

function toUIMessages(dbMessages: DbMessage[]): UIMessage[] {
  return dbMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
  }))
}

function LayoutToggleButton({
  mode,
  onToggle,
  floating = false,
}: {
  mode: LayoutMode
  onToggle: () => void
  floating?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`Switch to ${mode === 'reader' ? 'chat' : 'reader'} view`}
      aria-label="Switch layout"
      className={
        floating
          ? 'absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900'
          : 'flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900'
      }
    >
      <ArrowLeftRight size={15} />
    </button>
  )
}

export function SermonChatClient({ sermon, initialMessages, notes, pdfSignedUrl, passages }: Props) {
  const messages = toUIMessages(initialMessages)
  const isPdf = sermon.source_type === 'pdf'
  const isPassages = sermon.source_type === 'passages'
  const playerRef = useRef<YouTubePlayerHandle>(null)
  const invalidateSermonList = useInvalidateSermonList()
  const router = useRouter()
  const searchParams = useSearchParams()
  const showDevTools =
    process.env.NODE_ENV === 'development' && searchParams.get('dev') === 'true'

  // When visiting a PDF sermon, invalidate the sidebar so lazily-generated thumbnails appear.
  // staleTime: Infinity ensures this runs exactly once per sermon page mount.
  useQuery({
    queryKey: ['pdf-sidebar-sync', sermon.id],
    queryFn: async () => { invalidateSermonList(); return null },
    enabled: isPdf,
    staleTime: Infinity,
    gcTime: 0,
  })

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(isPassages ? 'reader' : 'chat')
  const toggleLayout = useCallback(
    () => setLayoutMode((m) => (m === 'reader' ? 'chat' : 'reader')),
    [],
  )

  const [isNotesOpen, setIsNotesOpen] = useState(!!notes)
  const [isPipVisible, setIsPipVisible] = useState(true)
  const [isPipMinimized, setIsPipMinimized] = useState(false)
  const [isRegeneratingNotes, setIsRegeneratingNotes] = useState(false)

  const handleTimestampClick = useCallback((seconds: number) => {
    if (isPdf || isPassages) return
    if (layoutMode === 'chat' && !isNotesOpen) {
      setIsPipVisible(true)
      setIsPipMinimized(false)
    }
    playerRef.current?.seekTo(seconds)
  }, [isPdf, isPassages, isNotesOpen, layoutMode])

  const handleRegenerateNotes = useCallback(async () => {
    setIsRegeneratingNotes(true)
    try {
      const res = await authenticatedFetch(`/api/sermons/${sermon.id}/regenerate-notes`, {
        method: 'POST',
      })
      if (res.ok) router.refresh()
    } finally {
      setIsRegeneratingNotes(false)
    }
  }, [router, sermon.id])

  const headerToggle = <LayoutToggleButton mode={layoutMode} onToggle={toggleLayout} />
  const floatingToggle = (
    <LayoutToggleButton mode={layoutMode} onToggle={toggleLayout} floating />
  )

  // ───────────────────────── Reader mode ─────────────────────────
  if (layoutMode === 'reader') {
    // Passages reader: prose passage + inline study notes in the center.
    // No header bar in this view, so the toggle floats absolute over the prose.
    if (isPassages && passages) {
      return (
        <div className="flex h-full">
          <div className="relative min-w-0 flex-1">
            {floatingToggle}
            <PassageReader
              passages={passages}
              notes={notes}
              onRegenerateNotes={handleRegenerateNotes}
              isRegeneratingNotes={isRegeneratingNotes}
              showDevTools={showDevTools}
            />
          </div>
          <div className="hidden w-[400px] shrink-0 border-l border-border md:block">
            <ChatInterface
              sermonId={sermon.id}
              sermonTitle={sermon.title}
              initialMessages={messages}
            />
          </div>
        </div>
      )
    }

    // Video / PDF reader: large player + notes scroll in center, chat in rail.
    return (
      <div className="flex h-full">
        <div className="relative min-w-0 flex-1">
          {notes ? (
            <SermonNotesPanel
              sermonId={sermon.id}
              notes={notes}
              onTimestampClick={handleTimestampClick}
              sourceType={sermon.source_type}
              variant="reader"
              showDevTools={showDevTools}
              headerActions={headerToggle}
              player={
                isPdf && pdfSignedUrl ? (
                  <PdfViewer url={pdfSignedUrl} />
                ) : sermon.youtube_id ? (
                  <YouTubePlayer ref={playerRef} youtubeId={sermon.youtube_id} />
                ) : null
              }
            />
          ) : (
            <>
              {floatingToggle}
              <div className="mx-auto h-full max-w-4xl p-8">
                {isPdf && pdfSignedUrl ? (
                  <PdfViewer url={pdfSignedUrl} />
                ) : sermon.youtube_id ? (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
                    <YouTubePlayer ref={playerRef} youtubeId={sermon.youtube_id} />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
        <div className="hidden w-[400px] shrink-0 border-l border-border md:block">
          <ChatInterface
            sermonId={sermon.id}
            sermonTitle={sermon.title}
            initialMessages={messages}
            onTimestampClick={handleTimestampClick}
          />
        </div>
      </div>
    )
  }

  // ───────────────────────── Chat mode (original) ─────────────────────────
  const showPip = !isPdf && !isPassages && !isNotesOpen && isPipVisible

  return (
    <div className="flex h-full">
      <div className="relative min-w-0 flex-1">
        <ChatInterface
          sermonId={sermon.id}
          sermonTitle={sermon.title}
          initialMessages={messages}
          onTimestampClick={handleTimestampClick}
          headerActions={headerToggle}
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
            showDevTools={showDevTools}
            player={
              isPassages && passages ? (
                <PassageReader passages={passages} variant="compact" />
              ) : isPdf && pdfSignedUrl ? (
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
