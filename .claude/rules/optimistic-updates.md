---
paths:
  - "src/hooks/**"
  - "src/components/**"
  - "**/*.tsx"
---

# Optimistic Updates with React Query

Use React Query's `useMutation` with cache-based optimistic updates for instant UI feedback.

## When to Use

- ✅ High-frequency operations (toggling, liking)
- ✅ Operations with high success rates
- ❌ Financial transactions
- ❌ Complex multi-step processes

## Basic Pattern

```typescript
const mutation = useMutation({
  mutationFn: ({ id, data }) => updateItem(id, data),
  onMutate: async ({ id, data }) => {
    await queryClient.cancelQueries({ queryKey: ['items', id] })
    const previousItem = queryClient.getQueryData(['items', id])
    queryClient.setQueryData(['items', id], data)
    return { previousItem }
  },
  onError: (err, variables, context) => {
    if (context?.previousItem) {
      queryClient.setQueryData(['items', variables.id], context.previousItem)
    }
  },
  onSettled: ({ id }) => {
    queryClient.invalidateQueries({ queryKey: ['items', id] })
  },
})
```

## Checklist

1. Cancel outgoing queries before mutating (`cancelQueries`)
2. Snapshot previous state for rollback
3. Update cache immediately (`setQueryData`)
4. Return context with snapshot
5. Roll back on error (`onError`)
6. Invalidate on settle (`onSettled`) to sync with server
