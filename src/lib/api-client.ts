/**
 * Client-side authenticated fetch helper.
 * Auto-injects Bearer token from the current Supabase session.
 */
import { sbc } from '@/lib/supabase.client'

export async function authenticatedFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await sbc.auth.getSession()

  console.log('[api-client] getSession result:', session ? `token exists (expires ${session.expires_at})` : 'NO SESSION')

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const headers = new Headers(options?.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)

  return fetch(url, {
    ...options,
    headers,
  })
}
