/**
 * Server actions for managing monitored Supabase projects.
 * Health metrics are pushed to BetterStack Telemetry — no local storage.
 */
'use server'

import { actionClient, throwActionError } from '@/lib/safe-action'
import { authenticateToken } from '@/lib/api-auth'
import { supabaseServer } from '@/lib/supabase.server'
import type { QueryData } from '@supabase/supabase-js'
import { z } from 'zod'

const addProjectSchema = z.object({
  token: z.string(),
  name: z.string().min(1, 'Name is required'),
  supabase_url: z.string().url('Must be a valid URL'),
  service_role_key: z.string().min(1, 'Service role key is required'),
  slack_webhook_url: z.string().url().optional().or(z.literal('')),
  failure_threshold_pct: z.number().min(1).max(100).default(10),
})

export const addMonitoredProject = actionClient
  .inputSchema(addProjectSchema)
  .action(async ({ parsedInput }) => {
    const auth = await authenticateToken(parsedInput.token)
    if (!auth.success) throwActionError(auth.error)

    const { data, error } = await supabaseServer
      .from('monitored_projects')
      .insert({
        name: parsedInput.name,
        supabase_url: parsedInput.supabase_url,
        service_role_key: parsedInput.service_role_key,
        slack_webhook_url: parsedInput.slack_webhook_url || null,
        failure_threshold_pct: parsedInput.failure_threshold_pct,
      })
      .select()
      .single()

    if (error) throwActionError(error.message)
    return data
  })

const removeProjectSchema = z.object({
  token: z.string(),
  project_id: z.string().uuid(),
})

export const removeMonitoredProject = actionClient
  .inputSchema(removeProjectSchema)
  .action(async ({ parsedInput }) => {
    const auth = await authenticateToken(parsedInput.token)
    if (!auth.success) throwActionError(auth.error)

    const { error } = await supabaseServer
      .from('monitored_projects')
      .update({ is_active: false })
      .eq('id', parsedInput.project_id)

    if (error) throwActionError(error.message)
    return { removed: true }
  })

const getProjectsSchema = z.object({
  token: z.string(),
})

function projectsQuery() {
  return supabaseServer
    .from('monitored_projects')
    .select('id, name, supabase_url, slack_webhook_url, failure_threshold_pct, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
}

export type MonitoredProject = QueryData<ReturnType<typeof projectsQuery>>[number]

export const getMonitoredProjects = actionClient
  .inputSchema(getProjectsSchema)
  .action(async ({ parsedInput }) => {
    const auth = await authenticateToken(parsedInput.token)
    if (!auth.success) throwActionError(auth.error)

    const { data, error } = await projectsQuery()

    if (error) throwActionError(error.message)
    return data ?? []
  })
