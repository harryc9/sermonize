# Sermonize — Claude Guide

## What It Is

Paste a YouTube URL → chat about the sermon. Users can ask about quotes, Bible verses, themes, and timestamps. The full transcript lives in the LLM context window (no RAG — a 60-min sermon is ~12K tokens).

**Local dev:** `http://localhost:4004` (`bun run dev`)

---

## App Structure

```
src/
  app/
    (public)/           # Landing page + auth (no auth guard)
    (app)/              # Auth-guarded shell with sidebar
      dashboard/        # URL input → time range selector → kick off processing
      s/[id]/           # Sermon page: shows processing progress OR chat interface
    api/
      sermons/          # REST endpoints (create, status, retry, regenerate-notes, messages)
      chat/             # AI SDK streaming chat endpoint
      inngest/          # Inngest webhook receiver
  components/           # Shared UI (chat-interface, sermon-notes, sidebar, youtube-player, ...)
  inngest/
    functions/          # transcribe-sermon (the core background job)
    worker.ts           # Standalone Express server for long-running Inngest work
  lib/                  # audio.ts, whisper.ts, transcript.ts, generate-sermon-notes.ts, ...
  types/
    supabase.public.types.ts   # Auto-generated — never hand-edit (bun run update-types)
```

---

## Processing Pipeline

1. User submits YouTube URL (optionally selecting a time range)
2. `POST /api/sermons` creates a `sermons` row (`status: pending`) and fires `sermon/transcribe` Inngest event
3. Inngest `transcribe-sermon` function runs in the **worker** (not Vercel — it can exceed timeout limits):
   - Downloads audio via yt-dlp → sets `processing_step: downloading`
   - Transcribes via OpenAI Whisper → sets `processing_step: transcribing`
   - Generates structured sermon notes via LLM → sets `processing_step: generating_notes`
   - Saves transcript + notes → sets `status: completed`
4. `/s/[id]` polls `/api/sermons/[id]/status` and switches from `SermonProcessingView` to `SermonChatClient` on completion

**Sermon statuses:** `pending` → `processing` → `completed` | `error`
**Processing steps:** `downloading` → `transcribing` → `generating_notes`

---

## Database Tables (Supabase)

| Table | Purpose |
|---|---|
| `sermons` | Core record: youtube_id, title, status, processing_step, transcript (JSONB), notes (JSONB), error |
| `messages` | Chat history per sermon (role, content, linked to sermons) |
| `monitored_projects` | Internal health-check infra (unrelated to product) |

**Supabase project ID:** `ianwczkdgcllsijnsmgz`

---

## Worker vs. Next.js

The Inngest worker (`src/inngest/worker.ts`) is a **separate process** — deployed as a Docker container via `Dockerfile.worker`. It handles long-running jobs (audio download + Whisper transcription) that would time out on Vercel. The Next.js app only receives webhooks from Inngest (`/api/inngest`) and serves the UI.

To run locally: `bun run worker` in a separate terminal alongside `bun run dev`.

---

## Key Commands

```bash
bun run dev          # Next.js dev server on :4004
bun run worker       # Inngest worker (separate terminal)
bun run update-types # Regenerate Supabase TypeScript types
bun run test         # Vitest unit tests
bun run typecheck    # tsc --noEmit
```

---

## Planning

When entering Plan mode for a non-trivial feature or change, write a detailed design document to `docs/` before touching any code, in the appropriate subdirectory:

- `docs/features/<name>.md` — new user-facing functionality
- `docs/architecture/<name>.md` — structural/system-level decisions
- `docs/bugs/<name>.md` — non-trivial bug investigations
- `docs/infra/<name>.md` — deployment, CI, worker, environment changes

The doc should cover: what problem it solves, proposed approach, files/components affected, DB schema changes (if any), and open questions. This gives a reviewable artifact and keeps the plan grounded.

---

## Browser Automation

Use the `chrome-devtools` CLI (not MCP tools) for all browser interaction:

```bash
chrome-devtools navigate_page --url "http://localhost:4004/"
chrome-devtools take_screenshot --fullPage true --filePath /tmp/shot.png
chrome-devtools take_snapshot   # get element UIDs from a11y tree
chrome-devtools click "uid"
chrome-devtools fill "uid" "text"
```

See `.agents/skills/chrome-devtools-cli/SKILL.md` for full reference.

---

## Good-to-Knows

- **Never use native `Date`** — always Luxon `DateTime` (see `.claude/rules/no-native-date.md`)
- **Never use `useEffect`** for data fetching or side effects — use React Query or server components (see `.claude/rules/no-use-effect.md`)
- **Zod v4**: `z.record()` requires two args — `z.record(z.string(), z.string())` (see `.claude/rules/zod-v4.md`)
- **AI SDK**: `generateObject` is removed — use `generateText` with `Output.object()` (see `.claude/rules/ai-sdk.md`)
- **Supabase types**: never hand-edit `supabase.public.types.ts`; run `bun run update-types` after schema changes
- **Styling**: orange only on CTAs; Lora serif for headings, DM Sans for body; no shadows on cards (see `.claude/rules/frontend.md`)
- **Package manager:** `bun` only — never `npm` or `yarn`
- **Environment variables:** never paste secrets/API keys directly into bash commands — always use `bun --env-file=.env scripts/my-script.ts`
