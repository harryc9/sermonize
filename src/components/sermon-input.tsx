'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { extractYouTubeId } from '@/lib/transcript'

type SermonInputProps = {
  onValidUrl: (data: { url: string; youtubeId: string }) => void
}

export function SermonInput({ onValidUrl }: SermonInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setError(null)
    const youtubeId = extractYouTubeId(trimmed)
    if (!youtubeId) {
      setError('Invalid YouTube URL')
      return
    }

    onValidUrl({ url: trimmed, youtubeId })
  }

  return (
    <div className="w-full space-y-2">
      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube sermon URL..."
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={!url.trim()} className="rounded-lg px-6">
          Load Sermon
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
