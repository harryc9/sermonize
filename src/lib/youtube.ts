/**
 * YouTube Data API helpers.
 */

const MAX_DURATION_MS = 2.5 * 60 * 60 * 1000 // 2 hours 30 minutes

type VideoItem = {
  id: string
  contentDetails?: { duration: string }
  snippet?: { title?: string; defaultAudioLanguage?: string; defaultLanguage?: string }
}

type VideosResponse = {
  items: VideoItem[]
}

export type VideoDetails = {
  title: string | null
  durationMs: number
  language: string | null
}

/**
 * Parse an ISO 8601 duration (PT1H30M10S) to milliseconds.
 */
function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return (hours * 3600 + minutes * 60 + seconds) * 1000
}

/**
 * Fetch details (duration + language) for a list of YouTube video IDs.
 * Returns a Map of videoId → { durationMs, language }.
 */
export async function getVideoDetails(
  videoIds: string[],
): Promise<Map<string, VideoDetails>> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set')
  if (videoIds.length === 0) return new Map()

  const details = new Map<string, VideoDetails>()

  // YouTube API allows max 50 IDs per request
  const BATCH_SIZE = 50
  for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
    const batch = videoIds.slice(i, i + BATCH_SIZE)
    const params = new URLSearchParams({
      part: 'contentDetails,snippet',
      id: batch.join(','),
      key: apiKey,
    })

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    )

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`YouTube videos API error ${res.status}: ${body}`)
    }

    const data: VideosResponse = await res.json()

    for (const item of data.items) {
      const durationMs = item.contentDetails?.duration
        ? parseIsoDuration(item.contentDetails.duration)
        : 0
      const language =
        item.snippet?.defaultAudioLanguage ??
        item.snippet?.defaultLanguage ??
        null

      const title = item.snippet?.title ?? null
      details.set(item.id, { title, durationMs, language })
    }
  }

  return details
}

/**
 * Fetch durations for a list of YouTube video IDs.
 * Returns a Map of videoId → duration in milliseconds.
 */
export async function getVideoDurations(
  videoIds: string[],
): Promise<Map<string, number>> {
  const details = await getVideoDetails(videoIds)
  const durations = new Map<string, number>()
  for (const [id, d] of details) {
    durations.set(id, d.durationMs)
  }
  return durations
}

/**
 * Check if a video's effective duration is within the allowed limit.
 * If startMs/endMs are provided, uses the selected range instead.
 */
export function isWithinDurationLimit(
  durationMs: number,
  startMs?: number,
  endMs?: number,
): boolean {
  const effectiveMs =
    startMs != null && endMs != null ? endMs - startMs : durationMs
  return effectiveMs <= MAX_DURATION_MS
}

/**
 * Fetch the title of a single YouTube video via the Data API.
 */
export async function getVideoTitle(videoId: string): Promise<string | null> {
  try {
    const details = await getVideoDetails([videoId])
    const item = details.get(videoId)
    return item?.title ?? null
  } catch {
    return null
  }
}

export { MAX_DURATION_MS }
