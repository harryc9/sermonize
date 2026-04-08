/**
 * Sermon notes as a collapsible right-side panel (no Dialog).
 * SermonNotesPanel: panel body with embedded player, highlights with clickable
 * timestamps, and referenced Bible verses. Supports regeneration.
 */
'use client'

import { authenticatedFetch } from '@/lib/api-client'
import { buildVerseUrl } from '@/lib/bible-utils'
import { cn } from '@/lib/utils'
import type { SermonNotes as SermonNotesType } from '@/types/sermon-notes'
import { BookOpen, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState, type ReactNode } from 'react'

type PanelProps = {
  sermonId: string
  notes: SermonNotesType
  onTimestampClick: (seconds: number) => void
  onClose?: () => void
  player: ReactNode
  sourceType?: string
  variant?: 'rail' | 'reader'
  headerActions?: ReactNode
  showDevTools?: boolean
}

export function SermonNotesPanel({ sermonId, notes, onTimestampClick, onClose, player, sourceType, variant = 'rail', headerActions, showDevTools = false }: PanelProps) {
  const isReader = variant === 'reader'
  const [isRegenerating, setIsRegenerating] = useState(false)
  const router = useRouter()
  const isPassages = sourceType === 'passages'

  // Scroll-affordance state: show a fade gradient at the bottom of the notes
  // scroll container when there's more content below. Signals to users hovering
  // the (non-scrollable) YouTube iframe that the panel itself scrolls.
  const [hasOverflow, setHasOverflow] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(false)

  const updateScrollState = useCallback((el: HTMLDivElement) => {
    const overflow = el.scrollHeight - el.clientHeight > 4
    setHasOverflow(overflow)
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4)
  }, [])

  const scrollContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      updateScrollState(el)
      // Observe size changes (fonts loading, regeneration) so the fade
      // stays accurate without useEffect.
      const ro = new ResizeObserver(() => updateScrollState(el))
      ro.observe(el)
      for (const child of Array.from(el.children)) ro.observe(child)
    },
    [updateScrollState],
  )

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => updateScrollState(e.currentTarget),
    [updateScrollState],
  )

  // Resizable passage reader (passages mode only). Drag the divider to adjust.
  const [readerHeight, setReaderHeight] = useState(400)
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const handleResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragStateRef.current = { startY: e.clientY, startHeight: readerHeight }
    const onMove = (ev: PointerEvent) => {
      const state = dragStateRef.current
      if (!state) return
      const delta = ev.clientY - state.startY
      const next = Math.max(120, Math.min(window.innerHeight - 200, state.startHeight + delta))
      setReaderHeight(next)
    }
    const onUp = () => {
      dragStateRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [readerHeight])

  async function handleRegenerate() {
    setIsRegenerating(true)
    try {
      const res = await authenticatedFetch(`/api/sermons/${sermonId}/regenerate-notes`, {
        method: 'POST',
      })
      if (res.ok) router.refresh()
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Collapse tab — mirrors the expand tab on the chat side. Only shown in rail mode. */}
      {!isReader && onClose && (
        <button
          type="button"
          onClick={onClose}
          title="Close notes"
          className="absolute left-0 top-1/2 z-10 hidden -translate-x-full -translate-y-1/2 items-center gap-1 rounded-l-lg border border-r-0 border-border bg-background px-1.5 py-3 text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 md:flex"
        >
          <ChevronRight size={14} />
        </button>
      )}

      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-serif text-sm font-semibold">
          {sourceType === 'pdf' ? 'Document Notes' : 'Sermon Notes'}
        </h3>
        <div className="flex items-center gap-1">
          {headerActions}
          {showDevTools && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              title="Regenerate notes (dev only)"
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            >
              {isRegenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {isPassages ? (
        <>
          <div className="w-full shrink-0" style={{ height: readerHeight }}>
            {player}
          </div>
          <div
            onPointerDown={handleResizeStart}
            title="Drag to resize"
            className="group relative h-1.5 w-full shrink-0 cursor-row-resize bg-border transition-colors hover:bg-gray-300"
          >
            <div className="absolute inset-x-0 -top-1 -bottom-1" />
          </div>
        </>
      ) : isReader ? (
        <div className="w-full shrink-0 px-8 pt-8">
          <div className="mx-auto aspect-video max-w-2xl overflow-hidden rounded-xl bg-black">
            {player}
          </div>
        </div>
      ) : (
        <div className="aspect-video w-full shrink-0">{player}</div>
      )}

      <div className="relative min-h-0 flex-1">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className={isReader ? 'mx-auto max-w-2xl px-8 py-8' : 'px-4 py-5'}>
          <p className="text-sm leading-relaxed text-gray-500">{notes.summary}</p>

          {!isPassages && (
          <div className="mt-8">
            <h4 className="border-b border-gray-100 pb-2 font-serif text-[11px] font-semibold uppercase tracking-widest text-gray-400">Key Highlights</h4>
            <ul className="mt-3 space-y-3">
              {notes.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-700">
                  <button
                    type="button"
                    onClick={() => onTimestampClick(Math.max(0, h.offset - 10))}
                    className="mt-0.5 shrink-0 cursor-pointer text-xs font-medium tabular-nums text-gray-500 underline decoration-dotted decoration-gray-400 underline-offset-2 transition-colors hover:decoration-gray-600"
                  >
                    {h.timestamp.replace(/[[\]]/g, '')}
                  </button>
                  <span>{h.text}</span>
                </li>
              ))}
            </ul>
          </div>
          )}

          {!isPassages && notes.verses.length > 0 && (
            <div className="mt-8">
              <h4 className="border-b border-gray-100 pb-2 font-serif text-[11px] font-semibold uppercase tracking-widest text-gray-400">Verses Referenced</h4>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(notes.verses)].map((verse) => (
                  <a
                    key={verse}
                    href={buildVerseUrl(verse)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-600 underline decoration-dotted decoration-gray-400 underline-offset-2 transition-colors hover:decoration-gray-600 hover:text-gray-900"
                  >
                    <BookOpen size={10} />
                    {verse}
                  </a>
                ))}
              </div>
            </div>
          )}

          {notes.discussion_questions && notes.discussion_questions.length > 0 && (
            <div className="mt-8">
              <h4 className="border-b border-gray-100 pb-2 font-serif text-[11px] font-semibold uppercase tracking-widest text-gray-400">Discussion Questions</h4>
              <ol className="mt-3 space-y-2.5">
                {notes.discussion_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-700">
                    <span className="mt-0.5 shrink-0 font-serif text-xs font-semibold text-gray-300">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

        </div>
      </div>
      {/* Bottom fade affordance: tells users the panel scrolls even when they
          hover the YouTube iframe (which swallows wheel events). */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent transition-opacity duration-200 ease-out',
          hasOverflow && !isAtBottom ? 'opacity-100' : 'opacity-0',
        )}
      />
      </div>
    </div>
  )
}
