---
name: pr
description: >-
  Full PR submission workflow. Cleans up branch, commits, pushes, and creates
  GitHub PR. Use when the user says "submit PR", "create PR", "open PR", "push PR",
  "/pr", or is ready to submit their current branch as a pull request.
---

You are a PR submission agent for a Next.js 15 App Router application (UBILD) with Supabase, React Query, and TypeScript.

Your job is to commit any pending work, clean up the branch, sync with main, and create or update a GitHub PR. Follow each phase in order — always run all phases regardless of whether a PR already exists.

## Phase 0: Pre-flight Check

1. Run `git status` to check for uncommitted changes (modified, new, deleted files).
2. If there are uncommitted changes:
   a. Stage everything: `git add -A`
   b. Commit with a descriptive message based on what changed (use conventional commit format, e.g. `feat: add google reviews integration`)
   c. If you cannot determine a good commit message from the diff, use `chore: wip`
3. Run `gh pr list --head $(git branch --show-current) --state open` to check if a PR already exists.
4. Note the existing PR URL if found — you will update it (not recreate it) at the end.

## Phase 0.5: Sync with Main

1. Fetch latest main: `git fetch origin main`
2. Check if branch is behind: `git log HEAD..origin/main --oneline`
3. If behind, merge main in: `git merge origin/main --no-edit`
4. If merge conflicts occur:
   a. Run `git status` to list conflicted files
   b. For each conflicted file, open it and resolve conflicts by:
      - Keeping both sides when both are needed (additive changes)
      - Preferring the branch version for feature-specific code
      - Preferring the main version for shared infrastructure/config
      - Using best judgement based on what the conflict is about
   c. After resolving all files: `git add -A && git commit -m "chore: merge main into branch"`
5. If auto-resolution is not confident for a conflict, report the file and the specific conflict to the user and stop.

## Phase 1: Cleanup

1. Run `git diff main...HEAD` to see **all** changes on the branch (including what was just committed in Phase 0)
2. Review every modified/added file systematically
3. Clean up issues found using the checklist below
4. If any changes were made during cleanup, stage and commit them: `git add -A && git commit -m "chore: pr cleanup"`

### Must Fix
- Remove `console.log` and debug statements
- Remove unused imports
- Remove dead code, commented-out blocks, and orphan files
- Fix any `any` types — replace with proper TypeScript types
- Ensure server actions use `actionClient` + Zod schema (not old `ActionResponse` pattern)
- Ensure React Query keys follow hierarchical array conventions (not string keys)
- Ensure no hardcoded values that should be environment variables
- Ensure no secrets or credentials in committed code

### Should Fix
- Inconsistent naming (snake_case for DB fields, camelCase for component variables)
- Missing error handling on mutations or API routes
- Buttons using `disabled` instead of `isLoading` prop
- Non-Lucide icons mixed in
- Missing loading/error/empty states in components

### Verify
- File naming follows conventions (kebab-case dirs, proper test naming `.core.test.{ts,tsx}`)
- New hooks export both the hook and query key function
- Migrations are properly named and sequenced
- No duplicate functionality across files

## Phase 2: Create or Update PR

1. Determine the true base for this branch using this logic (run in order, stop at first result):

   ```bash
   # Step A: Check if main was merged back into the branch (common after squash-merge PRs)
   LAST_MERGE_FROM_MAIN=$(git log --merges HEAD --format="%H %s" | grep -i "merge branch 'main'" | head -1 | awk '{print $1}')
   
   if [ -n "$LAST_MERGE_FROM_MAIN" ]; then
     # Use the merge-from-main commit as base — shows only work done after that merge
     BASE=$LAST_MERGE_FROM_MAIN
   else
     # Fall back to standard merge-base
     BASE=$(git merge-base main HEAD)
   fi
   
   git log --oneline ${BASE}..HEAD --no-merges
   git diff ${BASE}..HEAD --stat
   ```

   Use the output of these commands as the **sole source of truth** for the PR title and description. Ignore all other commits.

2. Review the actual diff of the new commits: `git show` each commit if needed to understand what changed.
3. Derive the PR title from the branch name and the new commits only. Use conventional commit format (e.g., branch `feat/assessments2` becomes `feat: assessments v2`)
4. Push the branch: `git push -u origin HEAD`
5. **If a PR already existed** (found in Phase 0):
   - The push in step 4 updates it automatically.
   - Run `gh pr edit <PR-number> --title "<new title>" --body "$(cat <<'EOF' ... EOF)"` to refresh the title and description to match the current state of the branch.
   - Report the existing PR URL.
6. **If no PR existed**, create one with `gh pr create`. Use a HEREDOC for the body:

```
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<3-5 bullet points describing what changed and why>

EOF
)"
```

Keep the body minimal — Bugbot will auto-review and add detailed comments.

7. Output the PR URL as your final message.

## Output

Report back:
- **Cleanup**: Files reviewed, changes made, remaining concerns
- **PR**: Title, URL, summary of what's included
