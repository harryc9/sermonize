/**
 * Server-side auth helpers for API routes and Server Actions.
 * Uses Bearer token validation against Supabase.
 */
import { supabaseServer } from '@/lib/supabase.server'
import { type NextRequest, NextResponse } from 'next/server'

type AuthResult =
  | { success: true; userId: string }
  | { success: false; response: NextResponse }

type TokenAuthResult =
  | { success: true; userId: string }
  | { success: false; error: string }

export async function authenticateRequest(
  request: NextRequest,
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[auth] missing/invalid Authorization header:', authHeader ? 'present but no Bearer prefix' : 'missing')
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const token = authHeader.substring(7)

  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser(token)

  if (authError || !user) {
    console.error('[auth] token validation failed:', authError?.message ?? 'no user returned')
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { success: true, userId: user.id }
}

export async function authenticateToken(
  token: string,
): Promise<TokenAuthResult> {
  if (!token) {
    return { success: false, error: 'No token provided' }
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser(token)

  if (authError || !user) {
    return { success: false, error: authError?.message || 'Unauthorized' }
  }

  return { success: true, userId: user.id }
}
