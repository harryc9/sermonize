# Sermonize

Talk to any sermon. Paste a YouTube URL and chat about the details — quotes, verses, themes, and timestamps.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Database / Auth:** Supabase
- **AI:** Vercel AI SDK + OpenAI
- **Transcription:** AssemblyAI
- **Background Jobs:** Inngest
- **UI:** Tailwind CSS, Shadcn UI, Radix
- **Runtime:** Bun

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
#          SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ASSEMBLYAI_API_KEY

# Run dev server
bun dev          # → http://localhost:4004

# Run Inngest worker (separate terminal)
bun run worker
```

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start dev server on port 4004 |
| `bun run build` | Production build |
| `bun run worker` | Inngest background worker |
| `bun run update-types` | Regenerate Supabase TypeScript types |
| `bun test` | Run unit tests (Vitest) |
| `bun run test:e2e` | Run E2E tests (Stagehand) |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |

## How It Works

1. User pastes a YouTube sermon URL
2. Optionally selects a time range to focus on
3. AssemblyAI transcribes the audio (via Inngest background job)
4. AI generates structured sermon notes (key points, scripture references, takeaways)
5. User chats with the sermon — full transcript is injected into LLM context (~12K tokens for a 60-min sermon, no RAG needed)
