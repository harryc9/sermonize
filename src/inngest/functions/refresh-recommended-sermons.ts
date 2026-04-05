/**
 * Daily cron: fetches the latest upload from each curated sermon channel
 * and caches them in platform_cache. This keeps the dashboard "Popular sermons"
 * fresh with guaranteed English-language, high-quality content.
 *
 * Runs on Vercel (short-lived — a few YouTube API calls + DB upsert).
 */
import { supabaseServer } from '@/lib/supabase.server'
import { getVideoDetails, isWithinDurationLimit } from '@/lib/youtube'
import { DateTime } from 'luxon'
import { inngest } from '../client'
import type { Json } from '@/types/supabase.public.types'

const CACHE_KEY = 'recommended_sermons'

/**
 * Curated channels: each channel ID's uploads playlist is derived by
 * replacing the "UC" prefix with "UU".
 */
const CURATED_CHANNELS = [
  { id: 'UCIQqvZbHSwX0yKNVK1MyYjQ', name: 'Elevation Church' },
  { id: 'UCYv-siSKd3Gn9IsliO95gIw', name: 'Transformation Church' },
  { id: 'UCQmUmqrMGfnesNpdL7T282Q', name: 'Gospel in Life' },
  { id: 'UCzT4tQfAZEsm_yMql_10dpg', name: 'Passion City Church' },
  { id: 'UCoDt562cJaageYU-LYKt4Pw', name: 'Life.Church' },
  { id: 'UC3TNl3-7XmrPuju9W0EXRUw', name: 'Crazy Love (Francis Chan)' },
  { id: 'UCnrFlpro0xfYjz6s5Xa8WWw', name: 'Desiring God' },
  { id: 'UC5tzTmPEue1OMqkT9CIAP0g', name: 'The Village Church' },
  { id: 'UCRZweRCzcK5ObXPCNKvdMOQ', name: 'Tony Evans' },
  { id: 'UCSYGkbzVd5-EzAMEpf3EaGg', name: 'Hillsong Church' },
  { id: 'UCkvTYtzvEDc7i0ATeWC-wHg', name: 'Saddleback Church' },
  { id: 'UCpOWgvfOZEdkzv1tIdazi_g', name: 'Watermark Community Church' },
]

type PlaylistItem = {
  snippet: {
    title: string
    channelTitle: string
    resourceId: { videoId: string }
    thumbnails: { medium?: { url: string }; default?: { url: string } }
    publishedAt: string
  }
}

type PlaylistResponse = {
  items?: PlaylistItem[]
}

export type CachedRecommendedSermon = {
  youtube_id: string
  youtube_url: string
  title: string
  channel: string
  thumbnail_url: string
  published_at: string
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export const refreshRecommendedSermons = inngest.createFunction(
  { id: 'refresh-recommended-sermons', triggers: [{ cron: '0 10 * * *' }] }, // daily at 10:00 UTC (6am ET)
  async () => {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set')

    // Fetch the latest video from each channel's uploads playlist
    const candidates: { videoId: string; title: string; channel: string; thumbnail: string; publishedAt: string }[] = []

    await Promise.all(
      CURATED_CHANNELS.map(async (ch) => {
        const uploadsPlaylistId = ch.id.replace(/^UC/, 'UU')
        const params = new URLSearchParams({
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: '3',
          key: apiKey,
        })

        try {
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
          )
          if (!res.ok) return

          const data: PlaylistResponse = await res.json()
          if (!data.items?.length) return

          for (const item of data.items) {
            candidates.push({
              videoId: item.snippet.resourceId.videoId,
              title: decodeHtmlEntities(item.snippet.title),
              channel: decodeHtmlEntities(item.snippet.channelTitle),
              thumbnail:
                item.snippet.thumbnails.medium?.url ??
                item.snippet.thumbnails.default?.url ??
                `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
              publishedAt: item.snippet.publishedAt,
            })
          }
        } catch {
          // Skip channels that fail — don't break the whole cron
        }
      }),
    )

    if (candidates.length === 0) throw new Error('No videos fetched from any channel')

    // Filter by duration
    const videoIds = candidates.map((c) => c.videoId)
    const details = await getVideoDetails(videoIds)

    const MIN_DURATION_MS = 15 * 60 * 1000 // 15 minutes — skip shorts/clips

    const filtered = candidates.filter((c) => {
      const info = details.get(c.videoId)
      return (
        info != null &&
        info.durationMs >= MIN_DURATION_MS &&
        isWithinDurationLimit(info.durationMs)
      )
    })

    // Sort by publish date (newest first), take top 8
    filtered.sort(
      (a, b) =>
        DateTime.fromISO(b.publishedAt).toMillis() -
        DateTime.fromISO(a.publishedAt).toMillis(),
    )

    const sermons: CachedRecommendedSermon[] = filtered.slice(0, 8).map((c) => ({
      youtube_id: c.videoId,
      youtube_url: `https://www.youtube.com/watch?v=${c.videoId}`,
      title: c.title,
      channel: c.channel,
      thumbnail_url: c.thumbnail,
      published_at: c.publishedAt,
    }))

    const { error } = await supabaseServer.from('platform_cache').upsert(
      {
        key: CACHE_KEY,
        value: sermons as unknown as Json,
        updated_at: DateTime.now().toISO()!,
      },
      { onConflict: 'key' },
    )

    if (error) throw new Error(`Failed to cache sermons: ${error.message}`)

    return { cached: sermons.length, updated_at: DateTime.now().toISO() }
  },
)
