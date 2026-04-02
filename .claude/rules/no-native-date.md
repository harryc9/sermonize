# No Native Date

**NEVER use native `Date` or `Date.now()`.** Always use Luxon's `DateTime` for all date/time operations.

## Banned

```typescript
// ❌ All banned
Date.now()
new Date()
new Date('2024-01-01')
Date.parse(str)
someDate.toISOString()
someDate.getTime()
```

## Use Instead

```typescript
import { DateTime } from 'luxon'

DateTime.now().toMillis()          // Current timestamp (millis)
DateTime.now().toISO()             // Current ISO string
DateTime.fromISO('2024-01-01')     // Parse date string
DateTime.fromMillis(timestamp)     // Unix timestamp → DateTime
DateTime.now() > DateTime.fromISO(someDate)  // Comparisons
DateTime.now().toFormat('yyyy-MM-dd')        // Formatting
DateTime.fromISO(date).toRelative()          // "3 hours ago"
```

If you encounter existing `Date` / `Date.now()` usage, refactor it to Luxon when touching that code.
