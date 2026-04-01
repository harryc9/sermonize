/**
 * Bible verse detection and Bible Gateway NIV URL generation.
 * Regex finds verse references in text; URL builder produces
 * biblegateway.com links with the NIV version.
 */

const BOOK_NAMES = [
  // Old Testament
  'genesis', 'gen',
  'exodus', 'exod', 'ex',
  'leviticus', 'lev',
  'numbers', 'num',
  'deuteronomy', 'deut', 'dt',
  'joshua', 'josh',
  'judges', 'judg', 'jdg',
  'ruth',
  '1 samuel', '1 sam', '1samuel', '1sam',
  '2 samuel', '2 sam', '2samuel', '2sam',
  '1 kings', '1 kgs', '1kings', '1kgs',
  '2 kings', '2 kgs', '2kings', '2kgs',
  '1 chronicles', '1 chr', '1 chron', '1chronicles', '1chr',
  '2 chronicles', '2 chr', '2 chron', '2chronicles', '2chr',
  'ezra',
  'nehemiah', 'neh',
  'esther', 'esth',
  'job',
  'psalms', 'psalm', 'ps', 'psa',
  'proverbs', 'prov', 'pr',
  'ecclesiastes', 'eccl', 'ecc',
  'song of solomon', 'song of songs', 'songs', 'song', 'sos',
  'isaiah', 'isa',
  'jeremiah', 'jer',
  'lamentations', 'lam',
  'ezekiel', 'ezek', 'eze',
  'daniel', 'dan',
  'hosea', 'hos',
  'joel',
  'amos',
  'obadiah', 'obad',
  'jonah',
  'micah', 'mic',
  'nahum', 'nah',
  'habakkuk', 'hab',
  'zephaniah', 'zeph',
  'haggai', 'hag',
  'zechariah', 'zech',
  'malachi', 'mal',

  // New Testament
  'matthew', 'matt', 'mt',
  'mark', 'mk',
  'luke', 'lk',
  'john', 'jn',
  'acts',
  'romans', 'rom',
  '1 corinthians', '1 cor', '1corinthians', '1cor',
  '2 corinthians', '2 cor', '2corinthians', '2cor',
  'galatians', 'gal',
  'ephesians', 'eph',
  'philippians', 'phil',
  'colossians', 'col',
  '1 thessalonians', '1 thess', '1thessalonians', '1thess',
  '2 thessalonians', '2 thess', '2thessalonians', '2thess',
  '1 timothy', '1 tim', '1timothy', '1tim',
  '2 timothy', '2 tim', '2timothy', '2tim',
  'titus',
  'philemon', 'phlm',
  'hebrews', 'heb',
  'james', 'jas',
  '1 peter', '1 pet', '1peter', '1pet',
  '2 peter', '2 pet', '2peter', '2pet',
  '1 john', '1john', '1jn',
  '2 john', '2john', '2jn',
  '3 john', '3john', '3jn',
  'jude',
  'revelation', 'rev',
  'revelations',
]

// Longest first so "1 corinthians" matches before "1 cor"
const sorted = [...BOOK_NAMES].sort((a, b) => b.length - a.length)
const bookPattern = sorted.map((n) => n.replace(/\s/g, '\\s+').replace('.', '\\.')).join('|')

// Matches: "Romans 12:1-2", "1 Cor. 15:42–44", "Ps 23:1", "Genesis 1:1" etc.
export const BIBLE_VERSE_RE = new RegExp(
  `(?<![\\w/])(${bookPattern})\\.?\\s+(\\d{1,3}):(\\d{1,3})(?:\\s?[–-]\\s?(\\d{1,3}))?(?![\\w/])`,
  'gi',
)

export function buildVerseUrl(verseRef: string): string {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(verseRef)}&version=NIV`
}
