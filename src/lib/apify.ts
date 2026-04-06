/**
 * Apify YouTube video downloader client.
 * Downloads video via Apify actor, then converts to mono 48k MP3 with ffmpeg.
 */
import { mkdtemp, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execAsync, type DownloadResult } from './audio'

const ACTOR_ID = 'y1IMcEPawMQPafm02'
const API_BASE = 'https://api.apify.com/v2'

type ApifyDatasetItem = {
  sourceUrl: string
  downloadUrl: string
}

/**
 * Downloads YouTube audio via Apify actor, converts to mono 48k MP3.
 * Optionally trims to a time range with ffmpeg.
 */
export async function downloadViaApify(
  youtubeId: string,
  startSec?: number,
  endSec?: number,
): Promise<DownloadResult> {
  const apiKey = process.env.APIFY_API_KEY
  if (!apiKey) throw new Error('APIFY_API_KEY is not set')

  const url = `https://www.youtube.com/watch?v=${youtubeId}`

  // Run actor synchronously and get dataset items
  const response = await fetch(
    `${API_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [url],
        quality: '360',
        includeFailedVideos: false,
        proxy: { useApifyProxy: true },
      }),
      signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Apify API error ${response.status}: ${body}`)
  }

  const items: ApifyDatasetItem[] = await response.json()
  if (!items.length || !items[0].downloadUrl) {
    throw new Error('Apify returned no download URL')
  }

  const downloadUrl = items[0].downloadUrl
  console.log(`[audio:apify] got download URL, fetching video...`)

  // Download the video file
  const tmpDir = await mkdtemp(join(tmpdir(), 'sermonize-apify-'))
  const videoPath = join(tmpDir, `${youtubeId}.mp4`)

  const videoResponse = await fetch(downloadUrl, {
    signal: AbortSignal.timeout(5 * 60 * 1000),
  })
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`)
  }

  const buffer = Buffer.from(await videoResponse.arrayBuffer())
  await writeFile(videoPath, buffer)
  console.log(`[audio:apify] downloaded ${(buffer.length / 1024 / 1024).toFixed(1)}MB video`)

  // Convert to mono 48k MP3
  const mp3Path = join(tmpDir, `${youtubeId}.mp3`)
  const ffmpegArgs = [
    '-y', '-i', videoPath,
    '-vn', // strip video
    '-ac', '1', '-ab', '48k', // mono, 48kbps
    ...(startSec != null && endSec != null
      ? ['-ss', startSec.toString(), '-t', (endSec - startSec).toString()]
      : []),
    mp3Path,
  ]

  await execAsync('ffmpeg', ffmpegArgs)
  await unlink(videoPath).catch(() => {})

  const fileStats = await stat(mp3Path)
  console.log(`[audio:apify] converted to ${(fileStats.size / 1024 / 1024).toFixed(1)}MB mp3`)
  return { filePath: mp3Path, sizeBytes: fileStats.size }
}
