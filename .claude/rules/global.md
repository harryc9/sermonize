You are an expert in TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Tailwind, Supabase, and Vercel AI SDK. Always assume the latest versions of each unless specified.

## Code Style

- Write concise, technical TypeScript with functional and declarative patterns; avoid classes
- Prefer iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`)
- Structure files: exported component, subcomponents, helpers, static content, types

## Naming Conventions

- Directories: lowercase with dashes (`components/auth-wizard`)
- Favor named exports for components
- Database/backend variables: `snake_case` (e.g., `user_id`, `worker_id`)
- In-component variables: `camelCase`

## TypeScript

- Use TypeScript for all code; prefer `type` over `interface`
- Avoid enums; use maps instead

## Syntax

- Use the `function` keyword for pure functions
- Avoid unnecessary curly braces in conditionals
- Use declarative TSX

## Error Handling

- Handle errors and edge cases early; use early returns and guard clauses
- Model expected errors as return values in Server Actions
- Use error boundaries for unexpected errors

## UI & Styling

- Use Shadcn UI and Tailwind for components and styling
- Implement responsive design with Tailwind CSS; use mobile-first approach

## Data Fetching

- NEVER use `useEffect` for data fetching — use React Query (`useQuery` / `useSuspenseQuery`)
- Use server components with async/await for initial data loading when possible
- For mutations, use `useMutation` with proper cache invalidation via `queryClient.invalidateQueries()`

## Performance

- Minimize `use client`, `useEffect`, and `useState`; favor React Server Components
- Use dynamic loading for non-critical components
- Use `nuqs` for URL search parameter state management
- Use `luxon` for all date/time handling — never native `Date`
- Use `bun` instead of `npm` or `yarn`
