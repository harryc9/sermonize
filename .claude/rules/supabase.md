---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Supabase Conventions

## Schema Changes

- **Do not** add SQL files under `supabase/migrations/` unless the user explicitly asks for a tracked migration
- Apply DDL with **Supabase MCP** (`apply_migration`): `name` in snake_case + full `query` SQL
- After schema changes, regenerate types with **`bun run update-types`** — writes `src/types/supabase.public.types.ts`
- **Do not** use Supabase MCP `generate_typescript_types` or hand-edit the types file

## TypeScript Typing

Use Supabase's generated types as the single source of truth. Never manually redefine types that `Tables<>`, `QueryData`, or `Pick<Tables<>>` can provide.

```typescript
import type { Tables } from '@/types/supabase.public.types'
import type { QueryData } from '@supabase/supabase-js'
```

### Pattern: Server Action → Client Component

```typescript
// actions/my-action.ts
const MY_SELECT = `*, businesses!inner (id, name)` as const

function myQuery() {  // factory function — never a module-level const (mutable builder)
  return sb.from('sermons').select(MY_SELECT)
}

export type SermonWithRelations = QueryData<ReturnType<typeof myQuery>>[number]

export const getSermon = actionClient
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const { data } = await myQuery().eq('id', parsedInput.id).single()
    return data
  })
```

```typescript
// components/my-component.tsx
import type { SermonWithRelations } from '@/actions/my-action'
// No manual type definitions needed
```

## Anti-patterns

```typescript
// ❌ Never cast with as any
const city = getCity(job as any)

// ❌ Never manually redefine table types
type MySermon = { id: string; title: string }  // drifts from schema

// ✅ Use Tables<>
type MySermon = Pick<Tables<'sermons'>, 'id' | 'title'>

// ❌ Never store query builders as module-level constants (filters stack)
const query = sb.from('sermons').select('*')

// ✅ Factory function returns fresh builder each call
function sermonQuery() { return sb.from('sermons').select('*') }
```
