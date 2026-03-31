/**
 * GET /api/sermons/[id]/status — Lightweight polling endpoint for transcription progress.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { id } = await params

  const { data, error } = await supabaseServer
    .from('sermons')
    .select('id, status, error, title, processing_step')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'Sermon not found' }, { status: 404 })

  return NextResponse.json(data)
}
