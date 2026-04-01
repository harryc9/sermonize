---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Zod v4 Gotchas

## `z.record()` requires TWO arguments

In Zod v4, `z.record(schema)` with one arg treats it as the **key type**, not the value type (breaking change from v3). The value type is left `undefined`, causing runtime crashes.

```typescript
// ❌ BROKEN in Zod v4
z.record(z.string())
z.record(z.any())
z.record(z.unknown())

// ✅ Always pass two args: z.record(keyType, valueType)
z.record(z.string(), z.string())
z.record(z.string(), z.unknown())
```

## AI SDK tool `inputSchema`: use `jsonSchema()` for open records

The AI SDK's `asSchema()` sets `additionalProperties: false` on all nested objects, breaking tools that accept arbitrary key-value pairs. Use `jsonSchema()` from `ai` directly:

```typescript
import { jsonSchema, tool } from 'ai'

// ❌ Even correct 2-arg z.record() gets additionalProperties: false from AI SDK
tool({ inputSchema: z.object({ query_params: z.record(z.string(), z.string()).optional() }) })

// ✅ Use jsonSchema() to preserve additionalProperties
tool({
  inputSchema: jsonSchema<{ query_params?: Record<string, string> }>({
    type: 'object',
    properties: {
      query_params: { type: 'object', additionalProperties: { type: 'string' } },
    },
    additionalProperties: false,
  }),
})
```
