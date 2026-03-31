/**
 * Audio transcription via AssemblyAI.
 * Handles file upload, polling, and word-to-segment grouping.
 * AssemblyAI processes files of any length server-side — no local chunking needed.
 */
import { readFile } from 'node:fs/promises'
import { AssemblyAI, type TranscriptWord } from 'assemblyai'
import type { TranscriptSegment } from '@/types'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

/**
 * Groups word-level timestamps into sentence-level segments
 * by splitting on sentence-ending punctuation.
 */
function wordsToSegments(
  words: TranscriptWord[],
  offsetMs: number,
): TranscriptSegment[] {
  if (!words.length) return []

  const segments: TranscriptSegment[] = []
  let current: TranscriptWord[] = []

  for (const word of words) {
    current.push(word)
    if (/[.!?]$/.test(word.text)) {
      const start = current[0].start
      const end = current[current.length - 1].end
      segments.push({
        text: current.map((w) => w.text).join(' '),
        offset: start + offsetMs,
        duration: end - start,
      })
      current = []
    }
  }

  if (current.length > 0) {
    const start = current[0].start
    const end = current[current.length - 1].end
    segments.push({
      text: current.map((w) => w.text).join(' '),
      offset: start + offsetMs,
      duration: end - start,
    })
  }

  return segments
}

/**
 * Transcribes an audio file using AssemblyAI.
 * offsetMs shifts all timestamps (used when transcribing a subsection of a video).
 */
export async function transcribeAudio(
  filePath: string,
  offsetMs: number = 0,
): Promise<TranscriptSegment[]> {
  const audioBuffer = await readFile(filePath)

  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,
    language_detection: true,
    speech_models: ['universal-3-pro', 'universal-2'],
  })

  if (transcript.status === 'error') {
    throw new Error(`Transcription failed: ${transcript.error}`)
  }

  if (!transcript.words?.length) return []

  return wordsToSegments(transcript.words, offsetMs)
}
