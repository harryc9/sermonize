'use client'

/**
 * Confirmation step after passage parsing. Shows the parsed refs as compact
 * cards with a one-line preview so the user can sanity-check before kicking
 * off notes generation. Layout fits in 100vh with a sticky Start Study CTA.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/api-client'
import type { ParsedRef } from '@/lib/bible/usfm'
import type { FetchedPassage } from '@/lib/bible/fetch-passages'
import { ChevronLeft, X } from 'lucide-react'

type Props = {
  initialPassages: FetchedPassage[]
  rawInput: string
  onBack: () => void
  onCreated: (sermonId: string) => void
}

export function PassagesConfirm({
  initialPassages,
  rawInput,
  onBack,
  onCreated,
}: Props) {
  const [passages, setPassages] = useState<FetchedPassage[]>(initialPassages)
  const [translation] = useState('BSB')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      const refs: ParsedRef[] = passages.map((p) => p.ref)
      const res = await authenticatedFetch('/api/sermons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: 'passages',
          refs,
          translation,
          passages_input: rawInput || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create study')
      return data.sermon as { id: string }
    },
    onSuccess: (sermon) => onCreated(sermon.id),
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create study')
    },
  })

  function removeAt(idx: number) {
    setPassages((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex max-h-full w-full max-w-xl flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 transition-colors duration-150 hover:text-gray-900"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <div className="text-sm text-gray-400">
          Translation: <span className="text-gray-900">{translation}</span>
        </div>
      </div>

      <h3 className="shrink-0 pb-3 text-sm font-medium uppercase tracking-widest text-gray-400">
        Found {passages.length} passage{passages.length === 1 ? '' : 's'}
      </h3>

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {passages.length === 0 ? (
          <p className="text-sm text-gray-400">
            All passages removed. Go back and try a different input.
          </p>
        ) : (
          <div className="space-y-2">
            {passages.map((p, idx) => (
              <PassageCard
                key={`${p.display}-${idx}`}
                passage={p}
                onRemove={() => removeAt(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="flex shrink-0 flex-col items-center gap-2 pt-4">
        <Button
          type="button"
          onClick={() => createMutation.mutate()}
          isLoading={createMutation.isPending}
          disabled={passages.length === 0}
          className="w-full max-w-xs rounded-lg"
        >
          Start Study
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function PassageCard({
  passage,
  onRemove,
}: {
  passage: FetchedPassage
  onRemove: () => void
}) {
  const verseCount = passage.verses.length
  const firstVerse = passage.verses[0]
  const preview = firstVerse
    ? truncate(firstVerse.text, 110)
    : null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="font-serif text-base font-semibold text-gray-900">
            {passage.display}
          </div>
          {verseCount > 0 ? (
            <div className="text-xs text-gray-400">
              {verseCount} verse{verseCount === 1 ? '' : 's'}
            </div>
          ) : (
            <div className="text-xs text-destructive">not found</div>
          )}
        </div>
        {preview && (
          <p className="mt-0.5 truncate text-sm text-gray-500">{preview}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
        aria-label={`Remove ${passage.display}`}
      >
        <X size={14} />
      </button>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`
}
