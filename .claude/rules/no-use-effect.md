---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# No useEffect

**NEVER use `useEffect`.** There is almost always a better, more declarative alternative. `useEffect` causes race conditions, stale closures, unnecessary re-renders, and infinite loops.

## Alternatives

| Instead of useEffect for… | Use this |
|---|---|
| Data fetching | React Query (`useQuery` / `useSuspenseQuery`) or server components |
| Subscribing to external stores | `useSyncExternalStore` |
| Derived/computed values | `useMemo` or compute inline during render |
| Responding to prop/state changes | Handle in the event handler that caused the change |
| One-time initialization | `useRef` + lazy init, or move to module scope |
| DOM measurements / refs | `useLayoutEffect` only if truly needed (e.g., measuring before paint) |
| Syncing with URL params | `nuqs` (`useQueryState` / `useQueryStates`) |
| Form state | Controlled inputs or `react-hook-form` |
| Event listeners (window, document) | Dedicated custom hook (e.g., `useEventListener`) |

## Examples

```tsx
// ❌ BAD
useEffect(() => {
  fetch('/api/data').then(res => res.json()).then(setData)
}, [])

// ✅ GOOD
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData })
```

```tsx
// ❌ BAD
const [fullName, setFullName] = useState('')
useEffect(() => { setFullName(`${firstName} ${lastName}`) }, [firstName, lastName])

// ✅ GOOD
const fullName = `${firstName} ${lastName}`
```

```tsx
// ❌ BAD
useEffect(() => {
  if (status === 'success') navigate('/dashboard')
}, [status])

// ✅ GOOD
const handleSubmit = async () => {
  const result = await submitForm()
  if (result.success) navigate('/dashboard')
}
```

If you encounter existing `useEffect` usage, refactor it to a declarative alternative when touching that code.
