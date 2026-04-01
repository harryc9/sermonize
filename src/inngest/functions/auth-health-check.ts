/**
 * Inngest cron: checks auth health across all monitored Supabase projects
 * and pushes metrics to BetterStack Telemetry.
 *
 * Env vars:
 *   BETTERSTACK_SOURCE_TOKEN — from BetterStack Telemetry (Prometheus source)
 *   BETTERSTACK_INGESTING_HOST — e.g. "in.logs.betterstack.com" (default)
 *
 * PREREQUISITE: Each monitored project must have the auth_health_metrics
 * RPC function deployed. See src/lib/auth-health-rpc.sql.
 */
import { createClient } from '@supabase/supabase-js'
import { inngest } from '@/inngest/client'
import { supabaseServer } from '@/lib/supabase.server'
import { DateTime } from 'luxon'

const WINDOW_MINUTES = 5
const BETTERSTACK_HOST =
  process.env.BETTERSTACK_INGESTING_HOST ?? 'in.logs.betterstack.com'

type MetricsRow = {
  login_success: number
  login_failure: number
  signups: number
  token_refreshes: number
  total_events: number
}

async function queryProjectMetrics(
  supabaseUrl: string,
  serviceRoleKey: string,
  windowStart: string,
): Promise<MetricsRow | null> {
  const client = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await client.rpc('auth_health_metrics', {
    window_start: windowStart,
  })

  if (error) {
    console.error(`[auth-health] RPC error: ${error.message}`)
    return null
  }

  return data?.[0] ?? null
}

async function pushToBetterStack(
  projectName: string,
  metrics: MetricsRow,
) {
  const token = process.env.BETTERSTACK_SOURCE_TOKEN
  if (!token) {
    console.warn('[auth-health] BETTERSTACK_SOURCE_TOKEN not set, skipping push')
    return
  }

  const tags = { project: projectName }
  const payload = [
    { name: 'auth.login_success', gauge: { value: metrics.login_success }, tags },
    { name: 'auth.login_failure', gauge: { value: metrics.login_failure }, tags },
    { name: 'auth.signups', gauge: { value: metrics.signups }, tags },
    { name: 'auth.token_refreshes', gauge: { value: metrics.token_refreshes }, tags },
    { name: 'auth.total_events', gauge: { value: metrics.total_events }, tags },
  ]

  const res = await fetch(`https://${BETTERSTACK_HOST}/metrics`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error(
      `[auth-health] BetterStack push failed: ${res.status} ${await res.text()}`,
    )
  }
}

async function sendSlackAlert(
  webhookUrl: string,
  projectName: string,
  failureRate: number,
  threshold: number,
  metrics: MetricsRow,
) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: [
        `*Auth Alert: ${projectName}*`,
        `Failure rate \`${failureRate.toFixed(1)}%\` exceeds threshold \`${threshold}%\``,
        `Login success: ${metrics.login_success} | Login failure: ${metrics.login_failure}`,
        `Signups: ${metrics.signups} | Token refreshes: ${metrics.token_refreshes}`,
        `Window: last ${WINDOW_MINUTES} minutes`,
      ].join('\n'),
    }),
  })
}

export const authHealthCheck = inngest.createFunction(
  {
    id: 'auth-health-check',
    triggers: [{ cron: '*/5 * * * *' }],
    retries: 1,
  },
  async ({ step }) => {
    const projects = await step.run('load-projects', async () => {
      const { data } = await supabaseServer
        .from('monitored_projects')
        .select('*')
        .eq('is_active', true)

      return data ?? []
    })

    if (projects.length === 0) return { checked: 0 }

    const windowStart = DateTime.now()
      .minus({ minutes: WINDOW_MINUTES })
      .toISO()!

    const results = await step.run('check-and-push', async () => {
      let alertCount = 0

      for (const project of projects) {
        try {
          const metrics = await queryProjectMetrics(
            project.supabase_url,
            project.service_role_key,
            windowStart,
          )

          if (!metrics) continue

          await pushToBetterStack(project.name, metrics)

          const loginTotal = metrics.login_success + metrics.login_failure
          const failureRate =
            loginTotal > 0 ? (metrics.login_failure / loginTotal) * 100 : 0

          if (
            failureRate > project.failure_threshold_pct &&
            loginTotal > 0 &&
            project.slack_webhook_url
          ) {
            await sendSlackAlert(
              project.slack_webhook_url,
              project.name,
              failureRate,
              project.failure_threshold_pct,
              metrics,
            )
            alertCount++
          }
        } catch (err) {
          console.error(
            `[auth-health] Error checking ${project.name}:`,
            err instanceof Error ? err.message : err,
          )
        }
      }

      return { checked: projects.length, alerts: alertCount }
    })

    return results
  },
)
