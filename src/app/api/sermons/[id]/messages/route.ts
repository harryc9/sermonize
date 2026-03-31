/**
 * GET /api/sermons/[id]/messages — Returns chat history for a sermon.
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
    .from('messages')
    .select('id, role, content, created_at')
    .eq('sermon_id', id)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: true })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages: data })
}
