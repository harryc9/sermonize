/**
 * YouTube audio download via Apify + audio utilities.
 */
import { execFile } from 'node:child_process'
import { downloadViaApify } from './apify'

export type DownloadResult = {
  filePath: string
  sizeBytes: number
}

export function execAsync(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${cmd} failed: ${stderr || error.message}`))
      else resolve({ stdout, stderr })
    })
  })
}

/**
 * Downloads audio from a YouTube video as a low-bitrate mono MP3.
 */
export async function downloadAudio(
  youtubeId: string,
  startSec?: number,
  endSec?: number,
): Promise<DownloadResult> {
  return await downloadViaApify(youtubeId, startSec, endSec)
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
