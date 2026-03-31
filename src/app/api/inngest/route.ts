import { inngest } from '@/inngest/client'
import { transcribeSermon } from '@/inngest/functions/transcribe-sermon'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [transcribeSermon],
})
