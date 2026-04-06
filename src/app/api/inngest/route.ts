/**
 * Inngest serve endpoint for Vercel.
 *
 * All Inngest functions are registered on the worker (src/inngest/worker.ts).
 * This route exists only so Vercel can receive Inngest webhook events
 * (e.g. cron triggers) and forward them to the worker.
 */
import { inngest } from '@/inngest/client'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
})
