/**
 * Inngest serve endpoint for Vercel.
 * Registers short-lived functions here.
 * Long-running functions (transcribe-sermon) run on Railway worker.
 */
import { inngest } from '@/inngest/client'
import { authHealthCheck } from '@/inngest/functions/auth-health-check'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [authHealthCheck],
})
