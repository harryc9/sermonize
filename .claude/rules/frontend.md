---
paths:
  - "**/*.tsx"
  - "src/components/**"
  - "src/app/**"
---

# Grout Design System

## Philosophy

Typography-first, extreme minimalism. Every element must earn its place. Inspired by Sesame, Linear, and Vercel.

## Color

- **Primary**: Orange — `--primary: 24.6 95% 53.1%` in `globals.css`
- **Color restraint**: Orange ONLY on CTAs and small brand accents. Everything else is black + gray + white.
- **Background**: Off-white `#fafafa`, not pure white
- **Use semantic tokens only** — never hardcode `bg-orange-*` / `text-orange-*`:
  - `bg-primary` / `text-primary` / `text-primary-foreground`
  - `bg-primary/10` for tinted backgrounds, `hover:bg-primary/90` for hover, `border-primary/20` for subtle borders
- **Neutral palette**: `gray-900` headings, `gray-400` secondary, `gray-200` borders, `gray-50` subtle fills

## Typography

- **Two fonts**: Lora (`font-serif`) for headings, DM Sans (`font-sans`) for everything else
- **Never mix**: headings/display numbers are serif, body is sans
- **Heading sizes**: `text-5xl sm:text-6xl lg:text-7xl` for hero h1, `text-3xl sm:text-4xl` for section headings
- **Secondary text**: `text-gray-400` for subtitles, `text-gray-300` for disclaimers
- **Labels/eyebrows**: `text-sm uppercase tracking-widest text-gray-400 font-medium`

```tsx
// ✅
<h1 className="font-serif font-semibold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-gray-900">
<p className="text-xl text-gray-400 max-w-md leading-relaxed">

// ❌ Sans on headings
<h1 className="font-sans text-5xl font-bold">
```

## Visual Style

- **Flat design** — zero shadows on cards, containers, or any UI element (CTA buttons may optionally use `shadow-sm`)
- **No gradients** on surfaces
- **No decorative elements** — no icon containers with colored backgrounds, no badge pills for labels
- **Borders**: `border-gray-100` for dividers, `border-gray-200` for card borders
- **Rounded corners**: `rounded-lg` for buttons, `rounded-2xl` for cards/containers

## Spacing

- **Generous whitespace** — err on MORE space
- **Hero**: `pt-24 sm:pt-32 lg:pt-40`
- **Sections**: `py-24` minimum
- **Grid gaps**: `gap-16 lg:gap-20` for hero grid, `gap-6` for card grids

## Components

### Buttons
- Primary CTA: `bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8`
- Secondary: `bg-gray-900 hover:bg-gray-800 text-white`
- Use `isLoading` prop, never `disabled`
- Icons inside `<Button>` need NO margin — button has `gap-2`
- **Never use `asChild` on `<Button>` with multiple children** (icon + text) — Slot crashes. Wrap `<Button>` inside `<Link>` instead:
  ```tsx
  // ❌ Crashes
  <Button asChild><Link href="/"><Icon /> Text</Link></Button>
  // ✅
  <Link href="/"><Button><Icon /> Text</Button></Link>
  ```
- Only one primary CTA per section

### Cards
- `border border-gray-200 rounded-2xl` — no shadow
- Highlighted: `border-gray-900 border-2`

## Anti-patterns

- ❌ Hardcoded color classes (`bg-orange-500`)
- ❌ Shadows on anything except CTA buttons
- ❌ Badges as labels — use `text-sm uppercase tracking-widest` text
- ❌ Icon containers with colored backgrounds
- ❌ Multiple CTAs competing in the same section
- ❌ `variant="secondary"` on any component
- ❌ Icon margins inside buttons (`mr-2`)
- ❌ `disabled` instead of `isLoading`
- ❌ Pure white (`#fff`) backgrounds — use `#fafafa`
- ❌ `CheckCircle2` icons — use `Check` from lucide-react instead
