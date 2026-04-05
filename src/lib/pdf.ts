/**
 * PDF utilities:
 * - extractPdfPages: text extraction via Unstructured.io API
 * - generatePdfThumbnail: renders page 1 to a JPEG buffer (server-side)
 */
import { UnstructuredClient } from 'unstructured-client'
import { Strategy } from 'unstructured-client/sdk/models/shared'
import type { TranscriptSegment } from '@/types'

const IGNORED_ELEMENT_TYPES = new Set(['Header', 'Footer', 'PageBreak'])

/** Renders the first page of a PDF to a JPEG buffer (server-side). */
export async function generatePdfThumbnail(buffer: ArrayBuffer): Promise<Buffer> {
  const { createCanvas } = await import('@napi-rs/canvas')
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as typeof import('pdfjs-dist')

  // Disable worker for Node.js server-side rendering
  GlobalWorkerOptions.workerSrc = ''

  const canvasFactory = {
    create(width: number, height: number) {
      const canvas = createCanvas(width, height)
      return { canvas, context: canvas.getContext('2d') }
    },
    reset(obj: { canvas: ReturnType<typeof createCanvas> }, width: number, height: number) {
      obj.canvas.width = width
      obj.canvas.height = height
    },
    destroy(obj: { canvas: ReturnType<typeof createCanvas> }) {
      obj.canvas.width = 0
      obj.canvas.height = 0
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await getDocument({ data: new Uint8Array(buffer), canvasFactory } as any).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const scale = 240 / viewport.width
  const scaledViewport = page.getViewport({ scale })

  const { canvas, context } = canvasFactory.create(
    Math.round(scaledViewport.width),
    Math.round(scaledViewport.height),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (page as any).render({ canvasContext: context, viewport: scaledViewport }).promise

  return canvas.toBuffer('image/jpeg')
}

function getClient() {
  return new UnstructuredClient({
    security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY! },
  })
}

export async function extractPdfPages(
  buffer: ArrayBuffer,
  filename: string,
): Promise<TranscriptSegment[]> {
  const client = getClient()

  const response = await client.general.partition({
    partitionParameters: {
      files: {
        content: buffer,
        fileName: filename,
      },
      strategy: Strategy.HiRes,
    },
  })

  if (typeof response === 'string' || !Array.isArray(response))
    throw new Error('Unexpected response from Unstructured API')

  // Group text by page number
  const pageMap = new Map<number, string[]>()

  for (const element of response) {
    if (IGNORED_ELEMENT_TYPES.has(element.type)) continue

    const text = element.text?.trim()
    if (!text) continue

    const page: number = element.metadata?.page_number ?? 1
    const existing = pageMap.get(page)
    if (existing) existing.push(text)
    else pageMap.set(page, [text])
  }

  // Sort pages and build segments
  return Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, texts]) => ({
      text: texts.join(' '),
      offset: pageNumber,
      duration: 0,
    }))
}
