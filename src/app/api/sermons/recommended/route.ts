/**
 * GET /api/sermons/recommended — Returns the daily cached YouTube sermon
 * search results from platform_cache. Excludes sermons the user already has.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import type { CachedRecommendedSermon } from '@/inngest/functions/refresh-recommended-sermons'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { data: cached } = await supabaseServer
    .from('platform_cache')
    .select('value')
    .eq('key', 'recommended_sermons')
    .single()

  if (!cached) return NextResponse.json({ sermons: [] })

  const allSermons = cached.value as unknown as CachedRecommendedSermon[]

  // Exclude sermons the user already has
  const { data: owned } = await supabaseServer
    .from('sermons')
    .select('youtube_id')
    .eq('user_id', auth.userId)
    .not('youtube_id', 'is', null)

  const ownedIds = new Set((owned ?? []).map((r) => r.youtube_id))
  const remaining = allSermons.filter((s) => !ownedIds.has(s.youtube_id))

  const sermons = remaining.slice(0, 8)

  return NextResponse.json({ sermons })
}
