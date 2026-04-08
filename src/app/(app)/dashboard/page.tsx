/**
 * Dashboard — sermon URL input or Bible passages input.
 * Auth guard handled by the (app) layout.
 */
'use client'

import { RecommendedSermons } from '@/components/recommended-sermons'
import { SermonInput } from '@/components/sermon-input'
import { PassagesInput } from '@/components/passages/passages-input'
import { PassagesConfirm } from '@/components/passages/passages-confirm'
import { useInvalidateSermonList } from '@/components/sidebar'
import { TimeRangeSelector } from '@/components/time-range-selector'
import { authenticatedFetch } from '@/lib/api-client'
import type { FetchedPassage } from '@/lib/bible/fetch-passages'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Mode = 'youtube' | 'passages'

type AppState =
  | { step: 'input' }
  | { step: 'time_select'; url: string; youtubeId: string }
  | { step: 'passages_confirm'; passages: FetchedPassage[]; rawInput: string }

export default function DashboardPage() {
  const [mode, setMode] = useState<Mode>('youtube')
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const invalidateSermonList = useInvalidateSermonList()

  async function startTranscription(url: string, youtubeId: string, startMs?: number, endMs?: number) {
    setError(null)
    setIsLoading(true)

    try {
      const res = await authenticatedFetch('/api/sermons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, youtubeId, startMs, endMs }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to start transcription')
        return
      }

      invalidateSermonList()
      router.push(`/s/${data.sermon.id}`)
    } catch {
      setError('Failed to connect. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handlePassagesCreated(sermonId: string) {
    invalidateSermonList()
    router.push(`/s/${sermonId}`)
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      {state.step === 'input' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-12">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Go deeper in your Bible study
            </h2>
            <p className="mt-2 text-muted-foreground">
              {mode === 'youtube'
                ? 'Paste any sermon, podcast, or teaching and start a Bible study.'
                : 'Pick a set of passages and start a Bible study from Scripture itself.'}
            </p>
          </div>

          <div className="flex gap-1 rounded-full border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setMode('youtube')}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                mode === 'youtube'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              YouTube
            </button>
            <button
              type="button"
              onClick={() => setMode('passages')}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                mode === 'passages'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Bible passages
            </button>
          </div>

          <div className="relative w-full max-w-lg">
            {mode === 'youtube' ? (
              <SermonInput
                onValidUrl={({ url, youtubeId }) =>
                  setState({ step: 'time_select', url, youtubeId })
                }
              />
            ) : (
              <PassagesInput
                onParsed={({ passages, rawInput }) =>
                  setState({ step: 'passages_confirm', passages, rawInput })
                }
              />
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {mode === 'youtube' && (
            <RecommendedSermons
              onSelect={({ url, youtubeId }) =>
                setState({ step: 'time_select', url, youtubeId })
              }
            />
          )}
        </div>
      )}

      {state.step === 'time_select' && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <TimeRangeSelector
            youtubeId={state.youtubeId}
            onConfirm={(startMs, endMs) =>
              startTranscription(state.url, state.youtubeId, startMs, endMs)
            }
            onBack={() => setState({ step: 'input' })}
            isLoading={isLoading}
          />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      )}

      {state.step === 'passages_confirm' && (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-8">
          <PassagesConfirm
            initialPassages={state.passages}
            rawInput={state.rawInput}
            onBack={() => setState({ step: 'input' })}
            onCreated={handlePassagesCreated}
          />
        </div>
      )}
    </div>
  )
}
