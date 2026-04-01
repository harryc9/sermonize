---
paths:
  - "src/context/**"
  - "src/lib/api-auth*"
  - "src/lib/api-client*"
  - "src/lib/supabase*"
  - "src/app/api/**"
  - "src/actions/**"
  - "src/app/auth/**"
---

# Auth Architecture

Authentication uses **Supabase Auth with implicit OAuth flow**. All session state lives client-side in localStorage. There are **no auth cookies** and **no server-side session checks in middleware**. Route protection is entirely client-side via `useAuth()`.

Server-side code authenticates via **explicit Bearer tokens** passed in headers or function parameters — never cookies.

## Supabase Clients

| Client | File | Purpose |
|--------|------|---------|
| Browser (`sbc`) | `src/lib/supabase.client.ts` | Client-side auth, queries. Anon key. Implicit flow. |
| Server (`sb`) | `src/lib/supabase.ts` | Server-side ops. Service role key. Bearer token validation. |

**Do NOT** use `@supabase/ssr` `createServerClient` with cookies.

## Auth Provider

`src/context/auth-provider.tsx` — exposes `useAuth()`: `{ user, session, isLoading, isAuthenticated, signOut, refreshSession }`

## Auth Helpers

| File | Purpose |
|------|---------|
| `src/lib/api-auth.ts` | `authenticateRequest(request)` for API routes, `authenticateToken(token)` for server actions |
| `src/lib/api-client.ts` | `authenticatedFetch(url, options)` — auto-injects `Authorization: Bearer` header |

## Patterns

### API Routes
```typescript
const auth = await authenticateRequest(request)
if (!auth.success) return auth.response
const userId = auth.userId
```

### Server Actions
```typescript
const auth = await authenticateToken(token)
if (!auth.success) return { success: false, error: auth.error }
const userId = auth.userId
```

### Client → API
```typescript
const res = await authenticatedFetch('/api/endpoint')
```

### Client → Server Actions
```typescript
const { session } = useAuth()
await myServerAction(session.access_token, ...args)
```

## DO NOT

- Use `@supabase/ssr` `createServerClient` with cookies
- Set `flowType: 'pkce'` on the browser client
- Call `exchangeCodeForSession` in the callback page
- Add auth checks to `src/proxy.ts`
- Use `cookies()` from `next/headers` for session management
- Rely on server-side redirects for auth protection
