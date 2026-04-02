---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.core.test.ts"
  - "**/*.core.test.tsx"
  - "**/*.e2e.ts"
  - "**/*.e2e.tsx"
---

# Testing

## Naming Convention

Core tests (included in the main test suite) use `.core.test.{ts,tsx}`:

```
src/actions/__tests__/getSermon.core.test.ts   ✅
src/actions/__tests__/getSermon.test.ts        ❌ won't run in core suite
```

## No Mocking Supabase

**NEVER mock Supabase clients or auth functions.** All tests use real Supabase calls against the cloud project.

```typescript
// ❌ All banned
vi.mock('@/lib/supabase.client')
vi.mock('@/lib/supabase.server')
vi.mock('@/context/auth-provider')
```

**Instead:**
- Create test users with `supabaseServer.auth.admin.createUser({ email, password, email_confirm: true })`
- Sign in with real `sbc.auth.signInWithPassword()` calls
- Clean up with `supabaseServer.auth.admin.deleteUser(userId)` in `afterAll`
- Use disposable format for test emails: `test-{uuid}@sermonize-test.com`

## No Shortest

Do not use `@antiwork/shortest` for E2E testing. Use **Stagehand** (`@browserbasehq/stagehand`) with `env: "LOCAL"` instead.

## Test Structure

```typescript
describe('ComponentUnderTest', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('when rendering', () => {
    it('displays correct content', () => { ... })
  })
})
```

## What to Test (Priority)

1. Core business logic (server actions, critical functions)
2. User interactions (click handlers, form submissions)
3. Component behavior (props handling, state changes)
4. Error handling and edge cases

## Running Tests

```bash
bun test           # Core tests only
bun test --watch   # Watch mode
```
