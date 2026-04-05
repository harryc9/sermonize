/**
 * find-church-contacts.ts
 *
 * Finds small-medium churches in US/Canada that actively post sermons on YouTube.
 * Extracts channel info + any contact email found in the channel description.
 *
 * Usage:
 *   YOUTUBE_API_KEY=your_key bun scripts/find-church-contacts.ts
 *
 * Output:
 *   church-contacts.csv  — deduplicated list of channels
 *
 * YouTube Data API quota cost: ~2,000–4,000 units per run (free tier = 10,000/day)
 * Get a free API key: https://console.cloud.google.com → Enable "YouTube Data API v3"
 */

import { writeFileSync } from 'fs'
import { DateTime } from 'luxon'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.YOUTUBE_API_KEY
if (!API_KEY) {
  console.error('Error: YOUTUBE_API_KEY env var is required')
  process.exit(1)
}

const TARGET_COUNTRIES = new Set(['US', 'CA'])
const MIN_SUBSCRIBERS = 1_000
const MAX_SUBSCRIBERS = 150_000
const DAYS_SINCE_UPLOAD = 45 // channels that uploaded within this many days
const OUTPUT_FILE = 'outreach/church-contacts.csv'
const MAX_RESULTS_PER_QUERY = 200 // 4 pages of 50 results

// Varied queries to cast a wide net across denominations + regions
const SEARCH_QUERIES = [
  'church sunday sermon 2025',
  'pastor sunday service 2025',
  'baptist church sermon',
  'evangelical church service',
  'pentecostal church sunday',
  'presbyterian sermon 2025',
  'methodist church service',
  'non-denominational church sermon',
  'canadian church sermon',
  'church sermon toronto',
  'church sermon vancouver',
  'church sermon calgary',
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelRow = {
  channelId: string
  channelName: string
  subscriberCount: number
  country: string
  email: string
  website: string
  youtubeUrl: string
  description: string
}

// ---------------------------------------------------------------------------
// YouTube API helpers
// ---------------------------------------------------------------------------

async function youtubeGet(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  url.searchParams.set('key', API_KEY!)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube API error on ${endpoint}: ${err}`)
  }
  return res.json()
}

/** Search recent sermon videos and return unique channel IDs */
async function searchChannelIds(query: string, publishedAfter: string): Promise<string[]> {
  const channelIds: string[] = []
  let pageToken: string | undefined

  for (let page = 0; page < 4; page++) {
    const params: Record<string, string> = {
      part: 'snippet',
      type: 'video',
      q: query,
      publishedAfter,
      maxResults: '50',
      relevanceLanguage: 'en',
    }
    if (pageToken) params.pageToken = pageToken

    const data = await youtubeGet('search', params)
    const ids: string[] = (data.items ?? []).map((item: any) => item.snippet?.channelId).filter(Boolean)
    channelIds.push(...ids)

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return channelIds
}

/** Fetch full channel details for up to 50 channel IDs at a time */
async function fetchChannelDetails(ids: string[]): Promise<ChannelRow[]> {
  const rows: ChannelRow[] = []

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const data = await youtubeGet('channels', {
      part: 'snippet,statistics,brandingSettings',
      id: batch.join(','),
      maxResults: '50',
    })

    for (const item of data.items ?? []) {
      const stats = item.statistics ?? {}
      const snippet = item.snippet ?? {}
      const branding = item.brandingSettings?.channel ?? {}

      const subscriberCount = parseInt(stats.subscriberCount ?? '0', 10)
      const country: string = snippet.country ?? branding.country ?? ''
      const description: string = snippet.description ?? ''

      if (!TARGET_COUNTRIES.has(country)) continue
      if (subscriberCount < MIN_SUBSCRIBERS || subscriberCount > MAX_SUBSCRIBERS) continue

      const email = extractEmail(description)
      const website = extractWebsite(description)

      rows.push({
        channelId: item.id,
        channelName: snippet.title ?? '',
        subscriberCount,
        country,
        email,
        website,
        youtubeUrl: `https://www.youtube.com/channel/${item.id}`,
        description: description.slice(0, 300).replace(/\n/g, ' '),
      })
    }
  }

  return rows
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function extractEmail(text: string): string {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  return match?.[0] ?? ''
}

function extractWebsite(text: string): string {
  const match = text.match(/https?:\/\/(?!youtube\.com|youtu\.be|fb\.com|facebook\.com|instagram\.com|twitter\.com|tiktok\.com)[^\s,)>]+/)
  return match?.[0] ?? ''
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function toCSV(rows: ChannelRow[]): string {
  const headers = ['Channel Name', 'Country', 'Subscribers', 'Email', 'Website', 'YouTube URL', 'Description']
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

  const lines = [
    headers.join(','),
    ...rows.map(r =>
      [r.channelName, r.country, r.subscriberCount, r.email, r.website, r.youtubeUrl, r.description]
        .map(escape)
        .join(',')
    ),
  ]
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const publishedAfter = DateTime.now().minus({ days: DAYS_SINCE_UPLOAD }).toISO()!
  console.log(`Searching for sermons uploaded after ${publishedAfter}`)

  const allChannelIds = new Set<string>()

  for (const query of SEARCH_QUERIES) {
    console.log(`  Querying: "${query}"...`)
    try {
      const ids = await searchChannelIds(query, publishedAfter)
      ids.forEach(id => allChannelIds.add(id))
      console.log(`    Found ${ids.length} channel IDs (total unique so far: ${allChannelIds.size})`)
    } catch (err) {
      console.warn(`  Skipping query due to error:`, err)
    }
  }

  console.log(`\nFetching details for ${allChannelIds.size} unique channels...`)
  const rows = await fetchChannelDetails([...allChannelIds])

  console.log(`\nAfter filtering (US/CA, ${MIN_SUBSCRIBERS}–${MAX_SUBSCRIBERS} subs): ${rows.length} channels`)

  // Sort by subscriber count descending
  rows.sort((a, b) => b.subscriberCount - a.subscriberCount)

  const withEmail = rows.filter(r => r.email)
  const withWebsite = rows.filter(r => r.website)
  console.log(`  With email in description: ${withEmail.length}`)
  console.log(`  With website in description: ${withWebsite.length}`)

  writeFileSync(OUTPUT_FILE, toCSV(rows), 'utf-8')
  console.log(`\nSaved to ${OUTPUT_FILE}`)
  console.log(`Next step: use Hunter.io or Apollo.io to enrich the website column for missing emails`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
