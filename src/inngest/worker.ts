/**
 * Inngest Worker Server for Railway
 *
 * Express server for long-running Inngest functions that exceed Vercel's
 * timeout limits. Handles audio download (yt-dlp) + transcription (Whisper)
 * which require CLI binaries and can take several minutes.
 *
 * Architecture:
 * - Inngest Cloud orchestrates all functions (scheduling, retries, state)
 * - This worker handles: transcribe-sermon
 * - Vercel handles: future short-lived functions
 */

import { DateTime } from 'luxon'

async function main() {
  const { default: express } = await import('express')
  const { serve } = await import('inngest/express')
  const { inngest } = await import('./client')
  const { transcribeSermon } = await import('./functions/transcribe-sermon')

  const app = express()
  const port = process.env.PORT || 3001

  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_, res) => {
    res.json({
      status: 'ok',
      service: 'sermonize-inngest-worker',
      timestamp: DateTime.now().toISO(),
    })
  })

  app.get('/', (_, res) => {
    res.json({
      service: 'Sermonize Inngest Worker',
      description: 'Handles sermon transcription pipeline',
      endpoints: {
        health: '/health',
        inngest: '/api/inngest',
      },
    })
  })

  app.use(
    '/api/inngest',
    serve({
      client: inngest,
      functions: [transcribeSermon],
    }),
  )

  app.listen(port, () => {
    console.log(`[Worker] Inngest worker running on port ${port}`)
    console.log(`[Worker] Environment: ${process.env.NODE_ENV}`)
    console.log(`[Worker] Health check: http://localhost:${port}/health`)
    console.log(`[Worker] Inngest endpoint: http://localhost:${port}/api/inngest`)
    console.log('[Worker] Functions registered: transcribe-sermon')
  })
}

main().catch(console.error)
