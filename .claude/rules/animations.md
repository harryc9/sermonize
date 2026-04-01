---
paths:
  - "**/*.tsx"
  - "src/components/**"
---

# Animation & Transition Guidelines

## Duration Scale

- **Micro-interactions** (hover, toggle, icon swap): `duration-150`
- **Content transitions** (fade in/out): `duration-200`
- **Panel/modal transitions** (drawers, dialogs): `duration-300`

## Easing

- **Entering** elements: `ease-out`
- **Exiting** elements: `ease-in`
- **State changes** (toggle): `ease-in-out`
- Never use `linear` for UI elements

## What to Animate

- **Prefer**: `opacity`, `transform` (GPU-accelerated, no layout reflow)
- **Avoid**: `width`, `height`, `top`, `left`, `margin`, `padding` (layout jank)

## Crossfade Pattern (icon swap, loading states)

```tsx
<span className="relative w-4 h-4">
  <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
    <LoadingSpinner />
  </span>
  <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
    <Icon />
  </span>
</span>
```

## Anti-patterns

- No `animate-bounce` or `animate-ping` on persistent UI elements
- No transitions longer than 500ms
- No animations on page load (except loading spinners)
- No layout-shifting animations
