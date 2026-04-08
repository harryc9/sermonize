/**
 * Bible reference helpers — book name mapping, freeform reference parsing,
 * and display/USFM formatting. Pure functions, no I/O.
 */

export type ParsedRef = {
  book: string // USFM code, e.g. 'ROM', 'PRO', '1KI'
  chapter: number
  verse_start?: number // omit for whole-chapter
  verse_end?: number
}

/**
 * Canonical book metadata. Display name matches BSB convention exactly so we
 * can round-trip "Book chapter:verse" lookups against `bible_verses.text`.
 */
export const BOOKS: ReadonlyArray<{ usfm: string; display: string; aliases: string[] }> = [
  // Old Testament
  { usfm: 'GEN', display: 'Genesis', aliases: ['gen', 'ge', 'gn'] },
  { usfm: 'EXO', display: 'Exodus', aliases: ['ex', 'exo', 'exod'] },
  { usfm: 'LEV', display: 'Leviticus', aliases: ['lev', 'lv'] },
  { usfm: 'NUM', display: 'Numbers', aliases: ['num', 'nm', 'nb'] },
  { usfm: 'DEU', display: 'Deuteronomy', aliases: ['deut', 'deu', 'dt'] },
  { usfm: 'JOS', display: 'Joshua', aliases: ['josh', 'jos', 'jsh'] },
  { usfm: 'JDG', display: 'Judges', aliases: ['judg', 'jdg', 'jg', 'jdgs'] },
  { usfm: 'RUT', display: 'Ruth', aliases: ['rut', 'ru'] },
  { usfm: '1SA', display: '1 Samuel', aliases: ['1 sam', '1sam', '1 sa', '1sa', 'i samuel', 'first samuel'] },
  { usfm: '2SA', display: '2 Samuel', aliases: ['2 sam', '2sam', '2 sa', '2sa', 'ii samuel', 'second samuel'] },
  { usfm: '1KI', display: '1 Kings', aliases: ['1 kgs', '1kgs', '1 ki', '1ki', 'i kings', 'first kings'] },
  { usfm: '2KI', display: '2 Kings', aliases: ['2 kgs', '2kgs', '2 ki', '2ki', 'ii kings', 'second kings'] },
  { usfm: '1CH', display: '1 Chronicles', aliases: ['1 chr', '1chr', '1 ch', '1ch', 'i chronicles', 'first chronicles'] },
  { usfm: '2CH', display: '2 Chronicles', aliases: ['2 chr', '2chr', '2 ch', '2ch', 'ii chronicles', 'second chronicles'] },
  { usfm: 'EZR', display: 'Ezra', aliases: ['ezr'] },
  { usfm: 'NEH', display: 'Nehemiah', aliases: ['neh', 'ne'] },
  { usfm: 'EST', display: 'Esther', aliases: ['est', 'esth'] },
  { usfm: 'JOB', display: 'Job', aliases: ['jb'] },
  { usfm: 'PSA', display: 'Psalm', aliases: ['ps', 'psa', 'psm', 'pslm', 'psalms'] },
  { usfm: 'PRO', display: 'Proverbs', aliases: ['prov', 'pro', 'pr', 'prv'] },
  { usfm: 'ECC', display: 'Ecclesiastes', aliases: ['eccles', 'eccl', 'ecc', 'ec', 'qoh'] },
  { usfm: 'SNG', display: 'Song of Solomon', aliases: ['song', 'sos', 'song of songs', 'canticles', 'sng'] },
  { usfm: 'ISA', display: 'Isaiah', aliases: ['isa', 'is'] },
  { usfm: 'JER', display: 'Jeremiah', aliases: ['jer', 'je', 'jr'] },
  { usfm: 'LAM', display: 'Lamentations', aliases: ['lam', 'la'] },
  { usfm: 'EZK', display: 'Ezekiel', aliases: ['ezek', 'eze', 'ezk'] },
  { usfm: 'DAN', display: 'Daniel', aliases: ['dan', 'da', 'dn'] },
  { usfm: 'HOS', display: 'Hosea', aliases: ['hos', 'ho'] },
  { usfm: 'JOL', display: 'Joel', aliases: ['joe', 'jl', 'jol'] },
  { usfm: 'AMO', display: 'Amos', aliases: ['amo', 'am'] },
  { usfm: 'OBA', display: 'Obadiah', aliases: ['obad', 'oba', 'ob'] },
  { usfm: 'JON', display: 'Jonah', aliases: ['jon', 'jnh'] },
  { usfm: 'MIC', display: 'Micah', aliases: ['mic', 'mi'] },
  { usfm: 'NAM', display: 'Nahum', aliases: ['nah', 'na', 'nam'] },
  { usfm: 'HAB', display: 'Habakkuk', aliases: ['hab', 'hb'] },
  { usfm: 'ZEP', display: 'Zephaniah', aliases: ['zeph', 'zep', 'zp'] },
  { usfm: 'HAG', display: 'Haggai', aliases: ['hag', 'hg'] },
  { usfm: 'ZEC', display: 'Zechariah', aliases: ['zech', 'zec', 'zc'] },
  { usfm: 'MAL', display: 'Malachi', aliases: ['mal', 'ml'] },

  // New Testament
  { usfm: 'MAT', display: 'Matthew', aliases: ['matt', 'mat', 'mt'] },
  { usfm: 'MRK', display: 'Mark', aliases: ['mar', 'mrk', 'mk'] },
  { usfm: 'LUK', display: 'Luke', aliases: ['luk', 'lk'] },
  { usfm: 'JHN', display: 'John', aliases: ['jhn', 'jn', 'joh'] },
  { usfm: 'ACT', display: 'Acts', aliases: ['act', 'ac'] },
  { usfm: 'ROM', display: 'Romans', aliases: ['rom', 'ro', 'rm'] },
  { usfm: '1CO', display: '1 Corinthians', aliases: ['1 cor', '1cor', '1 co', '1co', 'i corinthians', 'first corinthians'] },
  { usfm: '2CO', display: '2 Corinthians', aliases: ['2 cor', '2cor', '2 co', '2co', 'ii corinthians', 'second corinthians'] },
  { usfm: 'GAL', display: 'Galatians', aliases: ['gal', 'ga'] },
  { usfm: 'EPH', display: 'Ephesians', aliases: ['eph'] },
  { usfm: 'PHP', display: 'Philippians', aliases: ['phil', 'php', 'phi', 'pp'] },
  { usfm: 'COL', display: 'Colossians', aliases: ['col'] },
  { usfm: '1TH', display: '1 Thessalonians', aliases: ['1 thess', '1thess', '1 th', '1th', 'i thessalonians', 'first thessalonians'] },
  { usfm: '2TH', display: '2 Thessalonians', aliases: ['2 thess', '2thess', '2 th', '2th', 'ii thessalonians', 'second thessalonians'] },
  { usfm: '1TI', display: '1 Timothy', aliases: ['1 tim', '1tim', '1 ti', '1ti', 'i timothy', 'first timothy'] },
  { usfm: '2TI', display: '2 Timothy', aliases: ['2 tim', '2tim', '2 ti', '2ti', 'ii timothy', 'second timothy'] },
  { usfm: 'TIT', display: 'Titus', aliases: ['tit', 'ti'] },
  { usfm: 'PHM', display: 'Philemon', aliases: ['philem', 'phm', 'pm'] },
  { usfm: 'HEB', display: 'Hebrews', aliases: ['heb'] },
  { usfm: 'JAS', display: 'James', aliases: ['jas', 'jm'] },
  { usfm: '1PE', display: '1 Peter', aliases: ['1 pet', '1pet', '1 pe', '1pe', '1 pt', '1pt', 'i peter', 'first peter'] },
  { usfm: '2PE', display: '2 Peter', aliases: ['2 pet', '2pet', '2 pe', '2pe', '2 pt', '2pt', 'ii peter', 'second peter'] },
  { usfm: '1JN', display: '1 John', aliases: ['1 jn', '1jn', '1 jhn', '1jhn', 'i john', 'first john'] },
  { usfm: '2JN', display: '2 John', aliases: ['2 jn', '2jn', '2 jhn', '2jhn', 'ii john', 'second john'] },
  { usfm: '3JN', display: '3 John', aliases: ['3 jn', '3jn', '3 jhn', '3jhn', 'iii john', 'third john'] },
  { usfm: 'JUD', display: 'Jude', aliases: ['jud', 'jd'] },
  { usfm: 'REV', display: 'Revelation', aliases: ['rev', 're', 'the revelation', 'apocalypse'] },
] as const

const NAME_TO_USFM = (() => {
  const map = new Map<string, string>()
  for (const book of BOOKS) {
    map.set(normalize(book.display), book.usfm)
    map.set(book.usfm.toLowerCase(), book.usfm)
    for (const alias of book.aliases) map.set(normalize(alias), book.usfm)
  }
  // Common alternates not covered above
  map.set(normalize('Psalms'), 'PSA')
  map.set(normalize('Song of Songs'), 'SNG')
  return map
})()

const USFM_TO_DISPLAY = new Map(BOOKS.map((b) => [b.usfm, b.display]))

function normalize(s: string): string {
  return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Maps a freeform book name to its USFM code, or null if unrecognized.
 * Handles full names, abbreviations, and numbered books in any common form.
 */
export function bookNameToUsfm(name: string): string | null {
  return NAME_TO_USFM.get(normalize(name)) ?? null
}

/** Returns the canonical display name for a USFM code, e.g. 'ROM' → 'Romans'. */
export function usfmToDisplay(usfm: string): string {
  return USFM_TO_DISPLAY.get(usfm) ?? usfm
}

/**
 * Parses a freeform reference string into one or more ParsedRef entries.
 * Supports separators: ';', ',' (when followed by a new book), and newlines.
 *
 * Examples:
 *   "Romans 8:1-17"            → [{ROM 8:1-17}]
 *   "Proverbs 20"              → [{PRO 20}]
 *   "Rom 8:1-17; Eph 2:1-10"   → [{ROM 8:1-17}, {EPH 2:1-10}]
 *   "1 Kings 1; 1 Kings 2"     → [{1KI 1}, {1KI 2}]
 *   "Proverbs 20-22"           → [{PRO 20}, {PRO 21}, {PRO 22}]   (chapter range)
 */
export function parseReference(input: string): ParsedRef[] {
  const out: ParsedRef[] = []
  // Split on semicolons and newlines. Commas are ambiguous (could be a verse
  // list within one book), so we don't split on them at the top level.
  const segments = input
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  for (const segment of segments) {
    out.push(...parseSegment(segment))
  }
  return out
}

/**
 * Parses a single segment like "Romans 8:1-17" or "Proverbs 20-22".
 * Numbered-book aware (handles "1 Kings 1", "2 Cor 5:17", "3 John 4", etc).
 */
function parseSegment(segment: string): ParsedRef[] {
  // Match: [optional book number] [book name letters/spaces] [chapter[:verses]] [optional -end]
  // Book name allows letters and spaces; numbered prefix captured separately.
  const match = segment.match(
    /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z\s.]*?)\s+(\d+)(?::(\d+)(?:[-–](\d+))?)?(?:[-–](\d+))?\s*$/,
  )
  if (!match) return []

  const [, rawBook, chStr, vStartStr, vEndStr, chEndStr] = match
  const usfm = bookNameToUsfm(rawBook.trim())
  if (!usfm) return []

  const chapter = parseInt(chStr, 10)

  // Chapter range like "Proverbs 20-22" (no colon means chEnd is set, not vEnd)
  if (chEndStr && !vStartStr) {
    const chEnd = parseInt(chEndStr, 10)
    const refs: ParsedRef[] = []
    for (let c = chapter; c <= chEnd; c++) {
      refs.push({ book: usfm, chapter: c })
    }
    return refs
  }

  if (vStartStr) {
    const verse_start = parseInt(vStartStr, 10)
    const verse_end = vEndStr ? parseInt(vEndStr, 10) : verse_start
    return [{ book: usfm, chapter, verse_start, verse_end }]
  }

  // Whole chapter
  return [{ book: usfm, chapter }]
}

/** Renders a ParsedRef as a human-readable display string. */
export function refToDisplay(ref: ParsedRef): string {
  const book = usfmToDisplay(ref.book)
  if (ref.verse_start == null) return `${book} ${ref.chapter}`
  if (ref.verse_end == null || ref.verse_end === ref.verse_start) {
    return `${book} ${ref.chapter}:${ref.verse_start}`
  }
  return `${book} ${ref.chapter}:${ref.verse_start}-${ref.verse_end}`
}

/** Renders a ParsedRef as a USFM passage id, e.g. "ROM.8.1-17". */
export function refToUsfm(ref: ParsedRef): string {
  if (ref.verse_start == null) return `${ref.book}.${ref.chapter}`
  if (ref.verse_end == null || ref.verse_end === ref.verse_start) {
    return `${ref.book}.${ref.chapter}.${ref.verse_start}`
  }
  return `${ref.book}.${ref.chapter}.${ref.verse_start}-${ref.verse_end}`
}

/**
 * Stable JSON-serializable hash key for a list of refs + translation.
 * Used for cross-user dedup of identical passage studies.
 */
export function hashPassages(refs: ParsedRef[], translation: string): string {
  const normalized = refs
    .map(refToUsfm)
    .sort()
    .join('|')
  return `${translation}::${normalized}`
}
