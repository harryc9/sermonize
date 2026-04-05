'use client'

import { useCallback, useRef, useState } from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTimestamp } from '@/lib/transcript'

type TimeRangeSelectorProps = {
  youtubeId: string
  onConfirm: (startMs: number, endMs: number) => void
  onBack: () => void
}

const MIN_RANGE_MS = 30_000

export function TimeRangeSelector({ youtubeId, onConfirm, onBack }: TimeRangeSelectorProps) {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [startMs, setStartMs] = useState(0)
  const [endMs, setEndMs] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleReady = useCallback((event: YouTubeEvent) => {
    const player = event.target
    playerRef.current = player
    const dur = player.getDuration() * 1000
    setDurationMs(dur)
    setEndMs(dur)
    setIsReady(true)
  }, [])

  const seekTo = useCallback((ms: number) => {
    playerRef.current?.seekTo(ms / 1000, true)
  }, [])

  const getMsFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || durationMs === 0) return 0
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return Math.round(ratio * durationMs)
    },
    [durationMs],
  )

  const handlePointerDown = useCallback(
    (handle: 'start' | 'end') => (e: React.PointerEvent) => {
      e.preventDefault()
      setActiveHandle(handle)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeHandle) return
      const ms = getMsFromPointer(e.clientX)

      if (activeHandle === 'start') {
        const clamped = Math.min(ms, endMs - MIN_RANGE_MS)
        setStartMs(Math.max(0, clamped))
        seekTo(Math.max(0, clamped))
      } else {
        const clamped = Math.max(ms, startMs + MIN_RANGE_MS)
        setEndMs(Math.min(durationMs, clamped))
        seekTo(Math.min(durationMs, clamped))
      }
    },
    [activeHandle, startMs, endMs, durationMs, getMsFromPointer, seekTo],
  )

  const handlePointerUp = useCallback(() => {
    setActiveHandle(null)
  }, [])

  const startPercent = durationMs > 0 ? (startMs / durationMs) * 100 : 0
  const endPercent = durationMs > 0 ? (endMs / durationMs) * 100 : 100
  const selectedDuration = endMs - startMs

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8">
      <div className="text-center">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-gray-900">
          Select sermon portion
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Drag the handles to isolate the sermon section
        </p>
      </div>

      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200">
        <YouTube
          videoId={youtubeId}
          opts={{
            width: '100%',
            height: '360',
            playerVars: {
              modestbranding: 1,
              rel: 0,
            },
          }}
          onReady={handleReady}
          className="aspect-video w-full [&>iframe]:h-full [&>iframe]:w-full"
        />
      </div>

      {isReady && (
        <div className="w-full max-w-2xl space-y-4">
          <div
            ref={trackRef}
            className="relative h-10 cursor-pointer select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gray-100" />

            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-900"
              style={{
                left: `${startPercent}%`,
                width: `${endPercent - startPercent}%`,
              }}
            />

            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
              style={{ left: `${startPercent}%` }}
              onPointerDown={handlePointerDown('start')}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-900 bg-white">
                <div className="h-2 w-0.5 rounded-full bg-gray-900" />
              </div>
            </div>

            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
              style={{ left: `${endPercent}%` }}
              onPointerDown={handlePointerDown('end')}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-900 bg-white">
                <div className="h-2 w-0.5 rounded-full bg-gray-900" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-mono text-gray-400">{formatTimestamp(startMs)}</span>
            <span className="text-gray-400">
              Selected: {formatTimestamp(selectedDuration)}
            </span>
            <span className="font-mono text-gray-400">{formatTimestamp(endMs)}</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-400 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => onConfirm(startMs, endMs)}
              className="rounded-lg px-8"
            >
              Start Chat
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
