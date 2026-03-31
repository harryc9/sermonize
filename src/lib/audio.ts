/**
 * YouTube audio download via yt-dlp CLI.
 * Downloads audio as low-bitrate mono MP3, optionally trimmed to a time range.
 */
import { execFile, spawn } from 'node:child_process'
import { mkdtemp, stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type DownloadResult = {
  filePath: string
  sizeBytes: number
}

function execAsync(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${cmd} failed: ${stderr || error.message}`))
      else resolve({ stdout, stderr })
    })
  })
}

/**
 * Runs a command and streams stderr lines containing download progress to the console.
 * yt-dlp prints progress like "[download]  45.2% of 12.34MiB at 1.23MiB/s ETA 00:05".
 */
function spawnWithProgress(cmd: string, args: string[], label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('[download]') && trimmed.includes('%'))
          console.log(`[audio:${label}] ${trimmed}`)
        else if (trimmed.startsWith('[ExtractAudio]'))
          console.log(`[audio:${label}] converting to mp3...`)
      }
    })

    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`${cmd} failed: ${stderr}`))
      else resolve()
    })

    proc.on('error', (err) => reject(new Error(`${cmd} failed: ${err.message}`)))
  })
}

function formatSecForYtdlp(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Downloads audio from a YouTube video as a low-bitrate mono MP3.
 * When a range is specified, tries yt-dlp --download-sections (fast, only downloads
 * the needed bytes). Falls back to full download + ffmpeg trim for videos where
 * --download-sections fails (live stream recordings, DASH manifests).
 */
export async function downloadAudio(
  youtubeId: string,
  startSec?: number,
  endSec?: number,
): Promise<DownloadResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'sermonize-'))
  const outputTemplate = join(tmpDir, '%(id)s.%(ext)s')
  const fullPath = join(tmpDir, `${youtubeId}.mp3`)
  const url = `https://www.youtube.com/watch?v=${youtubeId}`

  const baseArgs = [
    '-x',
    '--audio-format', 'mp3',
    '--postprocessor-args', 'ffmpeg:-ac 1 -ab 48k',
    '-o', outputTemplate,
    '--no-playlist',
    '--no-warnings',
    '--newline',
  ]

  if (startSec != null && endSec != null) {
    const startStr = formatSecForYtdlp(startSec)
    const endStr = formatSecForYtdlp(endSec)

    try {
      await spawnWithProgress('yt-dlp', [
        ...baseArgs,
        '--download-sections', `*${startStr}-${endStr}`,
        '--force-keyframes-at-cuts',
        url,
      ], 'fast')
      console.log('[audio] fast path: --download-sections succeeded')
      const fileStats = await stat(fullPath)
      return { filePath: fullPath, sizeBytes: fileStats.size }
    } catch {
      console.log('[audio] fast path failed, falling back to full download + trim')
    }

    await spawnWithProgress('yt-dlp', [...baseArgs, url], 'fallback')

    const trimmedPath = join(tmpDir, `${youtubeId}.trimmed.mp3`)
    const duration = endSec - startSec

    await execAsync('ffmpeg', [
      '-y', '-i', fullPath,
      '-ss', startSec.toString(),
      '-t', duration.toString(),
      '-c', 'copy',
      trimmedPath,
    ])

    await unlink(fullPath).catch(() => {})
    const fileStats = await stat(trimmedPath)
    return { filePath: trimmedPath, sizeBytes: fileStats.size }
  }

  await spawnWithProgress('yt-dlp', [...baseArgs, url], 'full')
  const fileStats = await stat(fullPath)
  return { filePath: fullPath, sizeBytes: fileStats.size }
}

/**
 * Fetches the title of a YouTube video via yt-dlp.
 */
export async function getYouTubeTitle(youtubeId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`
    const { stdout } = await execAsync('yt-dlp', ['--print', 'title', '--no-playlist', '--no-warnings', url])
    const title = stdout.trim()
    return title || null
  } catch {
    return null
  }
}

/**
 * Splits an audio file into chunks of maxDurationSec using ffmpeg.
 * Returns an array of { filePath, offsetSec } for each chunk.
 */
export async function splitAudio(
  filePath: string,
  maxDurationSec: number,
): Promise<Array<{ filePath: string; offsetSec: number }>> {
  const { stdout } = await execAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    filePath,
  ])

  const totalDuration = parseFloat(stdout.trim())
  if (isNaN(totalDuration)) throw new Error('Could not determine audio duration')

  if (totalDuration <= maxDurationSec) {
    return [{ filePath, offsetSec: 0 }]
  }

  const chunks: Array<{ filePath: string; offsetSec: number }> = []
  let offset = 0
  let index = 0

  while (offset < totalDuration) {
    const chunkPath = filePath.replace('.mp3', `.chunk${index}.mp3`)
    const duration = Math.min(maxDurationSec, totalDuration - offset)

    await execAsync('ffmpeg', [
      '-y', '-i', filePath,
      '-ss', offset.toString(),
      '-t', duration.toString(),
      '-c', 'copy',
      chunkPath,
    ])

    chunks.push({ filePath: chunkPath, offsetSec: offset })
    offset += maxDurationSec
    index++
  }

  return chunks
}
