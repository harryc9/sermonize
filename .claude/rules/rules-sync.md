---
paths:
  - ".cursor/rules/**"
  - ".claude/rules/**"
---

# Rules Directory Sync

`.cursor/rules/` and `.claude/rules/` are parallel rule sets for the same project. They must be kept in sync.

**Whenever you add, edit, or delete a rule file in one directory, make the equivalent change in the other.**

## Mapping

| `.cursor/rules/` | `.claude/rules/` |
|---|---|
| `global.mdc` | `global.md` |
| `product-info.mdc` | `product-info.md` |
| `no-use-effect.mdc` | `no-use-effect.md` |
| `no-native-date.mdc` | `no-native-date.md` |
| `zod-v4.mdc` | `zod-v4.md` |
| `frontend.mdc` | `frontend.md` |
| `gtk.mdc` | `global.md` (merged) |
| `auth-architecture.mdc` + `api-server-actions-authentication.mdc` | `auth-architecture.md` |
| `server-actions.mdc` + `next-safe-action-mutations.mdc` | `server-actions.md` |
| `supabase-types.mdc` + `supabase-schema-mcp.mdc` | `supabase.md` |
| `react-query-keys.mdc` | `react-query.md` |
| `testing-best-practices.mdc` + `testing-no-mocks.mdc` + `testing-no-shortest.mdc` | `testing.md` |
| `ai-sdk-conventions.mdc` | `ai-sdk.md` |
| `hooks-mutations-optimistic-updates.mdc` | `optimistic-updates.md` |
| `animations.mdc` | `animations.md` |

## Format Differences

- Cursor uses `.mdc` with `alwaysApply` / `globs` frontmatter
- Claude uses `.md` with `paths` frontmatter (same glob patterns)
- `alwaysApply: true` + no globs → no `paths` in Claude (always loads)
- `alwaysApply: false` + globs → `paths:` in Claude
