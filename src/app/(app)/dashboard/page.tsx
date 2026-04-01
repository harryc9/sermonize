/**
 * Dashboard — sermon URL input and time range selection.
 * Auth guard handled by the (app) layout.
 */
'use client'

import { SermonInput } from '@/components/sermon-input'
import { useInvalidateSermonList } from '@/components/sidebar'
import { TimeRangeSelector } from '@/components/time-range-selector'
import { authenticatedFetch } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type AppState =
  | { step: 'input' }
  | { step: 'time_select'; url: string; youtubeId: string }

export default function DashboardPage() {
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const invalidateSermonList = useInvalidateSermonList()

  async function startTranscription(url: string, youtubeId: string, startMs?: number, endMs?: number) {
    setError(null)

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
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
      {state.step === 'input' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Talk to any sermon
            </h2>
            <p className="mt-2 text-muted-foreground">
              Paste a YouTube URL and chat about the details — quotes, verses, themes, and timestamps.
            </p>
          </div>
          <div className="relative w-full max-w-lg">
            <SermonInput
              onValidUrl={({ url, youtubeId }) =>
                setState({ step: 'time_select', url, youtubeId })
              }
            />
          </div>
        </div>
      )}

      {state.step === 'time_select' && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <TimeRangeSelector
            youtubeId={state.youtubeId}
            onConfirm={(startMs, endMs) =>
              startTranscription(state.url, state.youtubeId, startMs, endMs)
            }
            onSkip={() =>
              startTranscription(state.url, state.youtubeId)
            }
          />
          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
