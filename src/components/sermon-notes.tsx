/**
 * Sermon notes as a collapsible right-side panel (no Dialog).
 * SermonNotesPanel: panel body with embedded player, highlights with clickable
 * timestamps, and referenced Bible verses. Supports regeneration.
 */
'use client'

import { authenticatedFetch } from '@/lib/api-client'
import { buildVerseUrl } from '@/lib/bible-utils'
import type { SermonNotes as SermonNotesType } from '@/types/sermon-notes'
import { BookOpen, Loader2, RefreshCw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

type PanelProps = {
  sermonId: string
  notes: SermonNotesType
  onTimestampClick: (seconds: number) => void
  onClose: () => void
  player: ReactNode
}

export function SermonNotesPanel({ sermonId, notes, onTimestampClick, onClose, player }: PanelProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const router = useRouter()

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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-serif text-sm font-semibold">Sermon Notes</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            title="Regenerate notes"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="aspect-video w-full">{player}</div>

        <div className="px-4 py-5">
          <p className="text-sm leading-relaxed text-gray-500">{notes.summary}</p>

          <div className="mt-8">
            <h4 className="border-b border-gray-100 pb-2 font-serif text-[11px] font-semibold uppercase tracking-widest text-gray-400">Key Highlights</h4>
            <ul className="mt-3 space-y-3">
              {notes.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-700">
                  <button
                    type="button"
                    onClick={() => onTimestampClick(Math.max(0, h.offset - 10))}
                    className="mt-0.5 shrink-0 cursor-pointer rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium tabular-nums text-primary transition-colors hover:bg-primary/20"
                  >
                    {h.timestamp.replace(/[[\]]/g, '')}
                  </button>
                  <span>{h.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {notes.verses.length > 0 && (
            <div className="mt-8">
              <h4 className="border-b border-gray-100 pb-2 font-serif text-[11px] font-semibold uppercase tracking-widest text-gray-400">Verses Referenced</h4>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {notes.verses.map((verse) => (
                  <a
                    key={verse}
                    href={buildVerseUrl(verse)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
                  >
                    <BookOpen size={10} />
                    {verse}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
