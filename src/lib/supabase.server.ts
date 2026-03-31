/**
 * Server-side Supabase client using service role key.
 * Bypasses RLS — use for API routes and server actions where
 * auth is handled separately via Bearer tokens (see api-auth.ts).
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.public.types'

export const supabaseServer = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
