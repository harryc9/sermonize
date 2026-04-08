'use client'

/**
 * Reading-first view of the loaded passages for a passages-mode sermon.
 * Renders as the central content of the page (not a side rail), with
 * full prose typography. Optionally appends summary + discussion questions
 * inline below the passage as a quiet study companion.
 */
import type { FetchedPassage } from '@/lib/bible/fetch-passages'
import type { SermonNotes } from '@/types/sermon-notes'
import { Loader2, RefreshCw } from 'lucide-react'

type Props = {
  passages: FetchedPassage[]
  notes?: SermonNotes | null
  onRegenerateNotes?: () => void
  isRegeneratingNotes?: boolean
  showDevTools?: boolean
  variant?: 'prose' | 'compact'
}

export function PassageReader({
  passages,
  notes,
  onRegenerateNotes,
  isRegeneratingNotes,
  showDevTools = false,
  variant = 'prose',
}: Props) {
  if (variant === 'compact') return <CompactPassageReader passages={passages} />

  return (
    <div className="h-full overflow-y-auto bg-background">
      <article className="mx-auto max-w-[68ch] px-6 py-12 sm:px-10 sm:py-16">
        {passages.map((p, idx) => (
          <section key={`${p.display}-${idx}`} className={idx > 0 ? 'mt-14' : ''}>
            <h2 className="font-serif text-3xl font-semibold text-gray-900">
              {p.display}
            </h2>
            <div className="mt-6 font-serif text-lg leading-[1.8] text-gray-800">
              {p.verses.map((v, vIdx) => {
                const showChapterBreak = vIdx > 0 && v.verse === 1
                return (
                  <span key={`${v.chapter}-${v.verse}`}>
                    {showChapterBreak && (
                      <span className="mr-1 align-baseline font-sans text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {v.chapter}
                      </span>
                    )}
                    <sup className="mr-0.5 select-none align-super font-sans text-[10px] font-medium text-gray-300">
                      {v.verse}
                    </sup>
                    {v.text}{' '}
                  </span>
                )
              })}
            </div>
          </section>
        ))}

        {notes && (
          <aside className="mt-20 border-t border-gray-100 pt-10">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Study Notes
              </h3>
              {showDevTools && onRegenerateNotes && (
                <button
                  type="button"
                  onClick={onRegenerateNotes}
                  disabled={isRegeneratingNotes}
                  title="Regenerate notes"
                  className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                >
                  {isRegeneratingNotes ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </button>
              )}
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              {notes.summary}
            </p>

            {notes.discussion_questions && notes.discussion_questions.length > 0 && (
              <div className="mt-10">
                <h4 className="font-serif text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Discussion Questions
                </h4>
                <ol className="mt-4 space-y-3">
                  {notes.discussion_questions.map((q, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[15px] leading-relaxed text-gray-700"
                    >
                      <span className="mt-0.5 shrink-0 font-serif text-sm font-semibold text-gray-300">
                        {i + 1}.
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        )}
      </article>
    </div>
  )
}

/**
 * Compact rendering for the side-rail layout (chat-first mode). Stays
 * legible inside ~400px.
 */
function CompactPassageReader({ passages }: { passages: FetchedPassage[] }) {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="space-y-6 p-4">
        {passages.map((p, idx) => (
          <section key={`${p.display}-${idx}`}>
            <h3 className="font-serif text-lg font-semibold text-gray-900">
              {p.display}
            </h3>
            <div className="mt-2 text-sm leading-relaxed text-gray-700">
              {p.verses.map((v) => (
                <span key={`${v.chapter}-${v.verse}`}>
                  <sup className="mr-1 text-xs text-gray-400">{v.verse}</sup>
                  {v.text}{' '}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
