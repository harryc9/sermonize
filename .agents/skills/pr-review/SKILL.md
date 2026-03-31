---
name: pr-review
description: >-
  Fetch code review suggestions from a GitHub PR (Bugbot, Greptile, human reviewers)
  and fix them. Use when the user says "fix PR comments", "address review feedback",
  "fix PR suggestions", "look at PR reviews", or references a PR number with review fixes.
---

# PR Review Fixes

Fetch review comments from a GitHub PR, summarize them, and apply fixes.

## Workflow

### Step 1: Identify the PR

Determine the PR number. Sources (in priority order):
1. User provides a PR number or URL
2. Current branch has an open PR — detect with: `gh pr view --json number,url`
3. Ask the user

### Step 2: Fetch all review comments

```bash
# Review comments (inline code suggestions)
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments

# General PR comments (summary reviews from bots like Greptile)
gh api repos/{owner}/{repo}/issues/{pr_number}/comments

# Review verdicts
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews
```

### Step 3: Parse and categorize

Extract actionable suggestions from the JSON responses. Ignore Vercel deploy comments and other non-review noise.

Group by severity:
- **HIGH / P1** — Security, data loss, silent failures → fix immediately
- **MEDIUM / P2** — Bugs, incorrect behavior → fix
- **LOW / P3** — Style, minor improvements → fix if straightforward

Present a summary to the user before fixing:

```
### Cursor Bugbot
1. **HIGH** — file.ts: [description]
2. **Medium** — file.tsx: [description]

### Greptile
3. **P1** — file.ts: [description]
4. **P2** — file.tsx: [description]

All N are valid. Want me to fix them?
```

### Step 4: Apply fixes

After user confirms, fix all issues. For each fix:
1. Read the file at the referenced location
2. Understand the surrounding context
3. Apply the minimal correct fix
4. Check for linter errors after editing

### Step 5: Commit and push

After all fixes are applied:
1. Stage only the changed files
2. Commit with message: `fix: address PR review feedback`
3. Push to the same branch

## Common review patterns

| Reviewer | Comment format | Severity field |
|----------|---------------|----------------|
| Cursor Bugbot | `### [Title]\n\n**[Severity] Severity**` | High, Medium, Low |
| Greptile | Badge image `p1.svg`, `p2.svg`, `p3.svg` | P1, P2, P3 |
| Human | Free-form text | Infer from context |