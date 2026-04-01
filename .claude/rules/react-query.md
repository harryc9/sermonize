---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# React Query Conventions

## Query Key Structure

Use **nested arrays**: `['resource', 'action', ...params]`

- Start with the **primary resource** name
- Follow with **action/subtype** when applicable
- End with **specific identifiers**
- Use `snake_case` for multi-word resources: `['sermon_chunks']`
- Singular for specific item: `['sermon', id]`; plural for collections: `['sermons']`

```typescript
// ✅ Examples
['sermons']                     // All sermons
['sermon', sermonId]            // Specific sermon
['sermon', sermonId, 'chunks']  // Chunks for a sermon
['chat', sermonId, 'messages']  // Chat messages for a sermon
```

## Query Key Functions

Export query key functions alongside hooks for consistent cache invalidation:

```typescript
export const sermonQueryKeys = {
  all: () => ['sermons'] as const,
  detail: (id: string) => ['sermon', id] as const,
  chunks: (id: string) => ['sermon', id, 'chunks'] as const,
}
```

## Mutation Pattern

Never pass server actions directly as `mutationFn` — always wrap in an arrow function (see server-actions rule).

```typescript
const mutation = useMutation({
  mutationFn: async (input: { title: string }) => {
    const result = await createSermon(input)
    if (result.serverError) throw new Error(result.serverError)
    return result
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: sermonQueryKeys.all() })
  },
})
```
