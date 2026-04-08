/**
 * One-time seed script: parses data/bsb.txt (TSV from bereanbible.com)
 * and inserts ~31,100 BSB verses into the bible_verses table.
 *
 * Idempotent: skips seeding if BSB rows already exist. To force re-seed,
 * manually `delete from bible_verses where translation='BSB'` first.
 *
 * Run with:
 *   bun --env-file=.env scripts/seed-bible-verses.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { supabaseServer } from '../src/lib/supabase.server'
import { bookNameToUsfm } from '../src/lib/bible/usfm'

const TRANSLATION = 'BSB'
const BATCH_SIZE = 1000

type Row = {
  translation: string
  book: string
  chapter: number
  verse: number
  text: string
}

async function main() {
  const { count } = await supabaseServer
    .from('bible_verses')
    .select('*', { count: 'exact', head: true })
    .eq('translation', TRANSLATION)

  if (count && count > 0) {
    console.log(`[seed] BSB already seeded (${count} rows). Skipping.`)
    return
  }

  const path = join(process.cwd(), 'data', 'bsb.txt')
  const raw = readFileSync(path, 'utf8')
  // Strip BOM if present
  const text = raw.replace(/^\uFEFF/, '')
  const lines = text.split('\n')

  const rows: Row[] = []
  let unknownBooks = new Set<string>()

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '')
    if (!line) continue
    const tabIdx = line.indexOf('\t')
    if (tabIdx === -1) continue
    const ref = line.slice(0, tabIdx).trim()
    const verseText = line.slice(tabIdx + 1).trim()
    if (!verseText) continue

    // Match "Book Name 1:1" — handles numbered books like "1 Kings 1:1"
    const m = ref.match(/^(.+?)\s+(\d+):(\d+)$/)
    if (!m) continue

    const [, bookName, chStr, vStr] = m
    const usfm = bookNameToUsfm(bookName)
    if (!usfm) {
      unknownBooks.add(bookName)
      continue
    }

    rows.push({
      translation: TRANSLATION,
      book: usfm,
      chapter: parseInt(chStr, 10),
      verse: parseInt(vStr, 10),
      text: verseText,
    })
  }

  if (unknownBooks.size > 0) {
    console.error('[seed] Unknown book names:', [...unknownBooks])
    process.exit(1)
  }

  console.log(`[seed] Parsed ${rows.length} verses. Inserting in batches of ${BATCH_SIZE}...`)

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabaseServer.from('bible_verses').insert(batch)
    if (error) {
      console.error(`[seed] Insert failed at batch ${i}:`, error)
      process.exit(1)
    }
    console.log(`[seed] ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`)
  }

  console.log('[seed] Done.')
}

main().catch((err) => {
  console.error('[seed] FAILED', err)
  process.exit(1)
})
