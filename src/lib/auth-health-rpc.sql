-- Deploy this function on each Supabase project you want to monitor.
-- Queries auth.sessions, auth.users, and auth.refresh_tokens for health metrics.
-- Uses SECURITY DEFINER to access the auth schema from PostgREST.
--
-- NOTE: This tracks success metrics (logins, signups, token refreshes).
-- Login failures are not stored in the database — they only appear in
-- Supabase's analytics logs. If you need failure tracking, add an
-- application-level auth event logger.

CREATE OR REPLACE FUNCTION public.auth_health_metrics(window_start timestamptz)
RETURNS TABLE (
  login_success bigint,
  login_failure bigint,
  signups bigint,
  token_refreshes bigint,
  total_events bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH
  new_sessions AS (
    SELECT COUNT(*) AS cnt
    FROM auth.sessions
    WHERE created_at > window_start
  ),
  new_signups AS (
    SELECT COUNT(*) AS cnt
    FROM auth.users
    WHERE created_at > window_start
  ),
  refreshes AS (
    SELECT COUNT(*) AS cnt
    FROM auth.refresh_tokens
    WHERE updated_at > window_start
      AND parent IS NOT NULL
  )
  SELECT
    s.cnt AS login_success,
    0::bigint AS login_failure,
    u.cnt AS signups,
    r.cnt AS token_refreshes,
    (s.cnt + u.cnt + r.cnt) AS total_events
  FROM new_sessions s, new_signups u, refreshes r;
$$;
