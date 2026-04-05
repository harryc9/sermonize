/**
 * DELETE /api/sermons/[id] — Soft-deletes a sermon for the current user.
 * Sets hidden_at to now; transcript data is preserved for cross-user dedup.
 */
import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return auth.response

  const { id } = await params

  const { error } = await supabaseServer
    .from('sermons')
    .update({ hidden_at: DateTime.now().toISO() })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
