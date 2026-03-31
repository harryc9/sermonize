/**
 * Core application types for Sermonize.
 */
import type { Tables } from '@/types/supabase.public.types'

export type Sermon = Tables<'sermons'>

export type TranscriptSegment = {
  text: string
  offset: number
  duration: number
}
