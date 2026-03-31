/**
 * Browser-side Supabase client using anon key.
 * Import as: import { sbc } from '@/lib/supabase.client'
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.public.types'

export const sbc = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
)
