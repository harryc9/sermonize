---
paths:
  - "src/actions/**"
  - "**/*.action.ts"
---

# Server Actions with next-safe-action

All server actions use `actionClient` from `@/lib/safe-action`.

## Standard Pattern

```typescript
import { actionClient, throwActionError } from '@/lib/safe-action'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
})

export const createUser = actionClient
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const { email, name } = parsedInput
    const existing = await db.users.findUnique({ where: { email } })
    if (existing) throwActionError('User already exists')
    return await db.users.create({ data: { email, name } })
  })
```

## Critical Gotchas

### Every action MUST have `.inputSchema()` — even no-input actions

```typescript
// ❌ Crashes at runtime
export const getItems = actionClient.action(async () => { ... })

// ✅ Use empty schema
export const getItems = actionClient
  .inputSchema(z.object({}))
  .action(async () => { ... })
```

### Never pass server actions directly as `mutationFn` or `queryFn`

Always wrap in an arrow function — extra args from React Query will cause a crash:

```typescript
// ❌ Extra args leak through
const mutation = useMutation({ mutationFn: createUser })

// ✅ Wrap in arrow function
const mutation = useMutation({
  mutationFn: async (input: Parameters<typeof createUser>[0]) => {
    const result = await createUser(input)
    if (result.serverError) throw new Error(result.serverError)
    return result
  },
})
```

## Response Format

```typescript
type SafeActionResult<T> = {
  data?: T               // Your returned data (if successful)
  validationErrors?: {}  // Zod validation errors
  serverError?: string   // ActionError or unexpected errors
}
```

## Client-Side Usage

```typescript
const mutation = useMutation({
  mutationFn: async (input) => {
    const result = await createUser(input)
    if (result.serverError) throw new Error(result.serverError)
    return result
  },
  onSuccess: (result) => {
    if (result.data) toast.success('Done!')
  },
})
```
