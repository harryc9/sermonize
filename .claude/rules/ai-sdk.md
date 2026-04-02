---
paths:
  - "src/inngest/**"
  - "src/lib/ai*"
  - "src/actions/**"
  - "**/*.ts"
---

# AI SDK Conventions

## `generateObject` is removed — use `generateText` with `Output.object()`

```typescript
import { generateText, Output } from 'ai'

const { output } = await generateText({
  model: openai('gpt-4o-mini'),
  output: Output.object({ schema: myZodSchema }),
  prompt: '...',
})
```

Other `Output` helpers: `Output.array()`, `Output.choice()`, `Output.json()`

## Default Models

- **Mini/fast tasks** (extraction, classification, mapping): `openai('gpt-4o-mini')`
- Use larger models only when explicitly needed for complex reasoning

## Other Deprecations

| Old | New |
|-----|-----|
| `maxTokens` | `maxOutputTokens` |
| `maxSteps` | `stopWhen: stepCountIs(n)` |
| Tool `parameters` | `inputSchema` |
