# Time Range Selector

Select a portion of a YouTube video to transcribe instead of the full video. Church service recordings are often 1.5-2+ hours, but the sermon is only 30-50 minutes. Users need a way to isolate just the sermon portion.

---

## PRODUCT

### Problem

Full church service videos on YouTube contain worship, announcements, offering, and other segments before/after the actual sermon. Users only want to chat about the sermon itself, not the entire service. Sending irrelevant transcript context to the LLM wastes tokens and degrades answer quality.

### User Flow

1. User pastes a YouTube URL (existing flow)
2. System fetches the full transcript and loads the video
3. **New step**: A time range selector appears with:
   - An embedded YouTube player for visual reference
   - A dual-handle timeline slider below the player
   - A filmstrip of thumbnail frames along the slider track for visual guidance
   - Start/end time displays updating as handles are dragged
4. User drags start and end handles to isolate the sermon portion
5. Player seeks to the handle position as user drags, providing live preview
6. User clicks "Start Chat" to proceed with only the selected transcript range
7. If user skips (clicks "Use Full Video"), the entire transcript is used as before

### Key Behaviors

- **Optional**: Users can skip and use the full transcript
- **Live preview**: Dragging a handle seeks the embedded player to that timestamp
- **Time display**: Start and end times shown as `HH:MM:SS` or `MM:SS`
- **Filmstrip**: Thumbnail frames along the slider track give visual context of the video timeline
- **Persistent**: If a user returns to the same video, the previously selected range could be remembered (future enhancement)

### Edge Cases

- Very short videos (< 5 min): Time selector still appears but may not be useful
- Videos without captions: Already handled — error shown before this step
- Live streams: May not have storyboard data; filmstrip degrades gracefully to plain slider

---

## TECH

### Architecture Overview

```
URL Input → Fetch Transcript → Time Range Selector → Chat
                                     │
                          ┌──────────┼──────────────┐
                          │          │              │
                    YouTube      Dual-Range     Filmstrip
                    Player       Slider         Thumbnails
                          │          │              │
                          └──────────┼──────────────┘
                                     │
                              Filter transcript
                              segments by range
                                     │
                                  Chat API
                            (only selected segments
                             in system prompt)
```

### Current Data Model

The transcript is already stored with per-segment timestamps:

```typescript
type TranscriptSegment = {
  text: string
  offset: number   // ms from video start
  duration: number  // ms
}
```

Filtering is trivial: `segments.filter(s => s.offset >= startMs && s.offset + s.duration <= endMs)`

### Component Breakdown

#### 1. `TimeRangeSelector` (new component)

Parent orchestrator. Receives the full transcript, youtube video ID, and video duration. Emits `onConfirm(startMs, endMs)` and `onSkip()`.

Props:
- `youtubeId: string`
- `transcript: TranscriptSegment[]`
- `onConfirm: (startMs: number, endMs: number) => void`
- `onSkip: () => void`

#### 2. Embedded YouTube Player (`react-youtube`)

- Install `react-youtube` package
- Renders the video in a compact player
- `onReady` callback captures the player instance and reads `getDuration()`
- Exposes `seekTo(seconds)` — called when slider handles are dragged

#### 3. Dual-Handle Range Slider (custom)

- Build custom — existing npm packages are outdated/unmaintained
- Two draggable handles on a horizontal track representing 0 to video duration
- `onChange(startMs, endMs)` fires on drag, updating the time displays and triggering player seek
- Minimum 30-second gap between handles (configurable)
- Touch-friendly for mobile

#### 4. Filmstrip Thumbnails

Two approaches, ordered by reliability:

**Approach A — Server-side frame extraction (reliable, heavier)**
- API route `/api/thumbnails` accepts `youtubeId` and `timestamps[]`
- Uses `yt-dlp` to download low-res video, `ffmpeg` to extract frames at intervals
- Returns array of thumbnail data URLs or serves from temp storage
- Pros: Fully reliable, any timestamp
- Cons: Requires `yt-dlp` + `ffmpeg` on server, adds latency on first load

**Approach B — YouTube storyboard URL pattern (fragile, lighter)**
- Storyboard sprites at `https://i.ytimg.com/sb/{VIDEO_ID}/storyboard3_L2/M{N}.jpg`
- Requires `sigh` signature parameter extracted from YouTube's player response
- Proxy through our API route to avoid CORS
- Pros: No server processing, fast
- Cons: Undocumented API, signature extraction is fragile, may break

**Recommended: Start with Approach A** for reliability. Cache extracted thumbnails in Supabase Storage so the cost is paid once per video. Fall back gracefully to a plain slider (no filmstrip) if extraction fails.

**Alternative MVP shortcut**: Skip filmstrip entirely for v1. The embedded player seeking to handle positions already provides strong visual guidance. Add filmstrip as a v2 enhancement.

### Data Flow Changes

#### Page state machine (updated `page.tsx`)

```
URL_INPUT → LOADING → TIME_SELECT → CHAT
                         │
                    (skip) → CHAT (full transcript)
```

New state shape:
```typescript
type AppState =
  | { step: 'input' }
  | { step: 'time_select'; sermon: Sermon; transcript: TranscriptSegment[] }
  | { step: 'chat'; sermonId: string; title: string | null; startMs?: number; endMs?: number }
```

#### Chat API changes (`/api/chat/route.ts`)

Accept optional `startMs` and `endMs` in the request body. Filter transcript segments before building the system prompt:

```typescript
const { messages, sermonId, startMs, endMs } = await request.json()

let segments = sermon.transcript as TranscriptSegment[]
if (startMs != null && endMs != null) {
  segments = segments.filter(s => s.offset >= startMs && s.offset + s.duration <= endMs)
}

const formattedTranscript = formatTranscriptForPrompt(segments)
```

#### `ChatInterface` changes

Pass `startMs` and `endMs` through to the `DefaultChatTransport` body:

```typescript
transport: new DefaultChatTransport({
  api: '/api/chat',
  body: { sermonId, startMs, endMs },
})
```

#### Sermon API changes (`/api/sermons/route.ts`)

Return the transcript data in the response so the client can render the time selector. Currently the transcript is stored but the response just returns the sermon row — the transcript JSON field is already included.

### Dependencies

- `react-youtube` — YouTube IFrame Player API wrapper for React
- `yt-dlp` + `ffmpeg` — server-side only, for filmstrip thumbnail extraction (if using Approach A)

### Database Changes

None required for MVP. The time range is passed client-side per chat session. If we want to persist selected ranges per sermon, we'd add `start_ms` and `end_ms` columns to `sermons` later.

---

## IMPLEMENTATION STEPS

### Step 1: Embedded YouTube player + dual-range slider
- Install `react-youtube`
- Build `TimeRangeSelector` component with embedded player
- Build custom dual-handle range slider
- Wire up handle drag → player seek
- Add time display labels
- Wire into page flow (URL input → time select → chat)

### Step 2: Transcript filtering in chat API
- Accept `startMs` / `endMs` in `/api/chat` request body
- Filter transcript segments before prompt construction
- Pass range through `ChatInterface` → `DefaultChatTransport` body
- Test: select a 5-min window, verify chat only references content in that window

### Step 3: Filmstrip thumbnails
- Create `/api/thumbnails` route for server-side frame extraction
- Install `yt-dlp` and `ffmpeg` as server dependencies (or use hosted binaries)
- Extract ~20 evenly-spaced frames from the video
- Cache thumbnails in Supabase Storage keyed by `youtube_id`
- Render thumbnail strip along the slider track
- Graceful fallback: plain slider if extraction fails

### Step 4: Polish and edge cases
- Mobile touch support for slider handles
- Keyboard accessibility (arrow keys to nudge handles)
- Loading states while video/thumbnails load
- "Use Full Video" skip button styling
- Handle very long videos (3+ hours) with appropriate step sizes
