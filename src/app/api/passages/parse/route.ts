/**
 * POST /api/passages/parse — Extracts Bible passage references from a text or
 * image input, fetches the resolved verses for preview, and returns both so
 * the dashboard can show a confirm-before-submit screen.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { parsePassageInput } from '@/lib/parse-passage-input'
import { fetchPassages } from '@/lib/bible/fetch-passages'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { text, imageBase64, imageMimeType, translation } = body as {
      text?: string
      imageBase64?: string
      imageMimeType?: string
      translation?: string
    }

    if (!text && !imageBase64) {
      return NextResponse.json(
        { error: 'Provide either text or imageBase64' },
        { status: 400 },
      )
    }

    const refs = await parsePassageInput({ text, imageBase64, imageMimeType })

    if (refs.length === 0) {
      return NextResponse.json({
        refs: [],
        passages: [],
        warning: 'No Bible passage references found in the input.',
      })
    }

    const passages = await fetchPassages(refs, translation ?? 'BSB')

    return NextResponse.json({ refs, passages })
  } catch (err) {
    console.error('[passages/parse] FAILED', err)
    const message = err instanceof Error ? err.message : 'Failed to parse input'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
