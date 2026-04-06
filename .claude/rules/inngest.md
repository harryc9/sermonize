# Inngest Conventions

## Single Worker App

All Inngest functions — including short-lived ones like crons — are registered on the **worker** (`src/inngest/worker.ts`), not the Next.js app. There should be only one Inngest app from Sermonize.

The Next.js route (`src/app/api/inngest/route.ts`) exists solely as the Vercel webhook receiver with an empty `functions: []` array. Never add functions there.

When creating a new Inngest function:
1. Add it to `src/inngest/functions/`
2. Import and register it in `src/inngest/worker.ts`
3. Do NOT add it to the Next.js route
