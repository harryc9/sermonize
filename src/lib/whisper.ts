/**
 * Whisper transcription via OpenAI API.
 * Handles chunking for files > 24MB (Whisper's 25MB limit with safety margin).
 */
import { createReadStream } from 'node:fs'
import { stat, unlink } from 'node:fs/promises'
import OpenAI from 'openai'
import { splitAudio } from '@/lib/audio'
import type { TranscriptSegment } from '@/types'

const MAX_FILE_SIZE = 24 * 1024 * 1024 // 24MB safety margin under 25MB limit
const MAX_CHUNK_DURATION_SEC = 20 * 60 // 20-minute chunks

const openai = new OpenAI()

async function transcribeFile(
  filePath: string,
  offsetMs: number = 0,
): Promise<TranscriptSegment[]> {
  const response = await openai.audio.transcriptions.create({
    file: createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  })

  const result = response as unknown as {
    segments?: Array<{ start: number; end: number; text: string }>
  }

  if (!result.segments?.length) return []

  return result.segments.map((seg) => ({
    text: seg.text.trim(),
    offset: Math.round(seg.start * 1000) + offsetMs,
    duration: Math.round((seg.end - seg.start) * 1000),
  }))
}

/**
 * Transcribes an audio file using OpenAI Whisper.
 * Automatically splits files > 24MB into chunks and merges results.
 * offsetMs shifts all timestamps (used when transcribing a subsection of a video).
 */
export async function transcribeAudio(
  filePath: string,
  offsetMs: number = 0,
): Promise<TranscriptSegment[]> {
  const fileStats = await stat(filePath)

  if (fileStats.size <= MAX_FILE_SIZE) {
    return transcribeFile(filePath, offsetMs)
  }

  const chunks = await splitAudio(filePath, MAX_CHUNK_DURATION_SEC)
  const results = await Promise.all(
    chunks.map((chunk) =>
      transcribeFile(chunk.filePath, offsetMs + chunk.offsetSec * 1000),
    ),
  )

  for (const chunk of chunks) {
    if (chunk.filePath !== filePath) {
      await unlink(chunk.filePath).catch(() => {})
    }
  }

  return results.flat()
}
