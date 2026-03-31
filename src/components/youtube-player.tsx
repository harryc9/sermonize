/**
 * Embeds a YouTube player with programmatic seekTo support via the IFrame Player API.
 * Exposes a ref handle so parent components can seek to specific timestamps.
 */
'use client'

import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react'

export type YouTubePlayerHandle = {
  seekTo: (seconds: number) => void
}

type YouTubePlayerProps = {
  youtubeId: string
  className?: string
}

declare global {
  type YTPlayerState = number
  type YTPlayer = {
    seekTo: (seconds: number, allowSeekAhead: boolean) => void
    playVideo: () => void
    destroy: () => void
  }
  type YTPlayerOptions = {
    videoId: string
    playerVars?: Record<string, string | number>
    events?: {
      onReady?: (event: { target: YTPlayer }) => void
    }
  }

  interface Window {
    YT?: {
      Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiLoadPromise: Promise<void> | null = null

function loadYouTubeAPI(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise<void>((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    window.onYouTubeIframeAPIReady = () => resolve()
    document.head.appendChild(script)
  })

  return apiLoadPromise
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer({ youtubeId, className }, ref) {
    const playerRef = useRef<YTPlayer | null>(null)
    const containerIdRef = useRef(`yt-player-${youtubeId}`)
    const isInitializedRef = useRef(false)

    const initPlayer = useCallback(
      (node: HTMLDivElement | null) => {
        if (!node || isInitializedRef.current) return
        isInitializedRef.current = true

        loadYouTubeAPI().then(() => {
          if (!window.YT) return
          new window.YT.Player(containerIdRef.current, {
            videoId: youtubeId,
            playerVars: { rel: 0, modestbranding: 1 },
            events: {
              onReady: (event) => {
                playerRef.current = event.target
              },
            },
          })
        })
      },
      [youtubeId],
    )

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        if (!playerRef.current) return
        playerRef.current.seekTo(seconds, true)
        playerRef.current.playVideo()
      },
    }))

    return (
      <div className={className}>
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <div ref={initPlayer} id={containerIdRef.current} className="h-full w-full" />
        </div>
      </div>
    )
  },
)
