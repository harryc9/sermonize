---
name: improve-rules
description: >-
  Audit and improve Cursor rules (.cursor/rules/*.mdc) by analyzing the codebase
  for coverage gaps, staleness, redundancy, token waste, and quality issues. Use
  when the user says "improve rules", "audit rules", "optimize rules", "review
  cursor rules", "self-improve", or wants to make their AI agent context better.
---

# Improve Cursor Rules

Perform a multi-phase audit of all `.cursor/rules/*.mdc` files against the actual codebase and produce a prioritized report with actionable suggestions.

## Workflow

### Phase 1: Rule inventory and metadata audit

1. Read every `.mdc` file in `.cursor/rules/`
2. For each rule, extract and evaluate:

| Check | Flag when |
|-------|-----------|
| `description` | Missing, empty, or under 10 words |
| `alwaysApply` | `true` but content only relevant to a file subset (should use `globs`) |
| `globs` | Missing when `alwaysApply: false` (rule is invisible) |
| Line count | Over 100 lines — candidate for splitting or condensing |
| Code examples | None present — less actionable |

3. Build a table: `rule file | alwaysApply | globs | lines | issues`

### Phase 2: Codebase pattern discovery

Sample the project to find conventions not covered by any rule:

1. Read `package.json` — note frameworks, key deps, and scripts
2. List the top-level directory tree and `src/` tree (2 levels deep)
3. Spot-check 3-5 representative files per category:
   - Server actions (`src/actions/`)
   - API routes (`src/app/api/`)
   - React components (`src/components/`)
   - Hooks (`src/hooks/`)
   - Lib/utils (`src/lib/`)
4. Note recurring patterns that have **no matching rule**:
   - Error handling style
   - Logging conventions
   - API route structure / middleware
   - File naming or export conventions
   - Environment variable usage
5. Check if any rule references a library, API, or pattern **no longer in the codebase** (staleness)

### Phase 3: Cross-rule analysis

Compare all rules against each other:

- **Redundancy**: Two rules covering the same topic — suggest merging
- **Internal contradictions**: A single rule whose examples contradict its own guidelines. Surface **both sides** with exact file/line references so the user can decide which is correct. Do NOT assume which side is wrong — present the conflict neutrally.
- **Cross-rule contradictions**: Two rules giving conflicting advice. Show both snippets side-by-side. Ask the user which version should be canonical.
- **Codebase vs rule drift**: A rule states a convention but the codebase largely does the opposite. Surface the mismatch — the user decides whether to update the rule or fix the code.
- **Terminology drift**: Same concept called different names across rules (e.g., "server action" vs "action" vs "mutation")
- **Token budget**: Sum approximate token counts for all `alwaysApply: true` rules. Flag if total exceeds ~8,000 tokens — every always-apply rule competes for context window space

### Phase 4: Quality audit per rule

Score each rule on four dimensions (1-3 scale):

| Dimension | 1 (poor) | 2 (okay) | 3 (good) |
|-----------|----------|----------|----------|
| **Actionability** | Vague guidance only | Some examples | Concrete good/bad code pairs |
| **Conciseness** | Verbose, repeated | Moderate | Tight, no filler |
| **Specificity** | Generic advice | Partially project-specific | Tailored to this codebase |
| **Formatting** | Inconsistent/broken | Mostly clean | Consistent headings, code blocks, tables |

Flag any rule scoring 1 on any dimension as needing improvement.

### Phase 5: Generate report

Present findings using this template:

```markdown
## Rules Audit Report

### Summary
- Total rules: N
- Always-apply rules: N (~X tokens)
- File-scoped rules: N
- Agent-requestable rules: N

### Critical (must fix)
Issues that cause rules to be ignored (bad metadata, invisible rules).
- **[rule-name.mdc]**: [issue] → [fix]

### Inconsistencies (user decision needed)
Internal contradictions or rule-vs-codebase drift. Present both sides neutrally.
- **[rule-name.mdc]** line N says X, but line M says Y. Which is correct?
- **[rule-a.mdc]** says X, but **[rule-b.mdc]** says Y. Which should be canonical?
- **[rule-name.mdc]** says X, but codebase does Y in N files. Update rule or fix code?

### Improvements (should fix)
Quality and efficiency improvements.
- **[rule-name.mdc]**: [issue] → [suggestion]

### Coverage Gaps
Codebase patterns with no corresponding rule.
- **[pattern]**: observed in [files] → suggest creating [rule-name.mdc]

### Redundancy / Overlap
- **[rule-a.mdc]** and **[rule-b.mdc]**: [overlap description] → [merge/split suggestion]

### Token Budget
- Total always-apply tokens: ~N
- Top 3 largest always-apply rules: [list with token counts]
- Recommendations for reducing footprint

### Per-Rule Scorecard
| Rule | Actionability | Conciseness | Specificity | Formatting | Notes |
|------|:---:|:---:|:---:|:---:|-------|
| rule-name.mdc | 2 | 3 | 2 | 3 | ... |
```

After presenting the report, ask the user to resolve each inconsistency before making changes. Only fix items after user confirms direction.

## Evaluation criteria quick-reference

**Good rule characteristics:**
- Under 80 lines (ideally under 50)
- Has concrete good/bad code examples with project-specific imports
- `description` clearly states WHAT and WHEN in under 20 words
- `alwaysApply: true` only if relevant to >70% of conversations
- Uses consistent terminology matching the codebase

**Common anti-patterns to flag:**
- Wall of text with no code examples
- Generic advice that any LLM already knows (e.g., "use descriptive variable names")
- `alwaysApply: true` on niche rules (wastes context window)
- `alwaysApply: false` with no `globs` (rule is never surfaced)
- Duplicate guidance across multiple rules
- References to deprecated libraries or old API patterns
- Overly long example sections that could be in a separate reference file
