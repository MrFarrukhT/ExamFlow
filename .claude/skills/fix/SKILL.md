---
name: fix
description: "Automated fix engine: reads open findings from audit and smart-test ledgers, prioritizes by severity, spawns subagents to fix code in parallel, verifies fixes compile, and updates ledger entries. Closes the diagnose-fix-verify loop. Use when asked to fix findings, resolve issues, or close the quality cycle."
---

# Fix — Automated Finding Resolution Engine

## What This Is

The missing half of the quality cycle. `/smart-test` and `/audit` **find** issues. `/fix` **resolves** them — reading open findings from both ledgers, fixing the code, verifying the fix compiles, and updating the ledger with the commit hash.

Subagents act as **senior developers** — they read the finding, understand the context, implement the minimal correct fix, and confirm it doesn't break anything.

### Critical Invariant: Ledger Round-Trip

**Every run MUST:**
1. **START** by reading both ledgers and selecting target findings
2. **END** by updating fixed findings in both ledgers with `status: "fixed"` and `fixedInCommit`

Fixes applied without ledger updates are invisible to future `/audit` and `/smart-test` runs.

---

## Modes

| Mode | Command | Purpose |
|------|---------|---------|
| **Auto** | `/fix` | Fix top priority open finding (1 CRITICAL, or up to 3 HIGH, or up to 5 MEDIUM) |
| **Batch** | `/fix N` | Fix up to N findings, highest severity first |
| **Targeted** | `/fix <fingerprint>` | Fix a specific finding by fingerprint |
| **Category** | `/fix --category=security` | Fix all open findings in a category |
| **Severity** | `/fix --severity=CRITICAL` | Fix all open findings at a severity level |
| **Dry Run** | `/fix --dry-run` | Show what would be fixed, don't change code |
| **Ledger** | `/fix --ledger=audit` | Only fix findings from the audit ledger |
| **Ledger** | `/fix --ledger=smart-test` | Only fix findings from the findings ledger |

### Examples
```
/fix                              # auto-pick highest priority
/fix 10                           # fix up to 10 findings
/fix bug:users-route:admin-self-deactivation-lockout
/fix --category=security          # all open security findings
/fix --severity=CRITICAL          # all open CRITICALs
/fix --dry-run                    # preview only
/fix --category=a11y --severity=MEDIUM   # combine filters
/fix --ledger=audit --severity=HIGH      # audit HIGHs only
```

---

## Orchestration Flow

### Step 0: Pre-flight

Read these ground truth documents using the Read tool (not an agent):

1. **`.claude/rules/audit-rules.md`** — severity classification, false positive patterns
2. **`references/fix-strategies.md`** — fix patterns per category
3. **`references/fix-agent-prompt.md`** — subagent instructions

### Step 1: Load both ledgers (MANDATORY — DO NOT SKIP)

> **HARD GATE: You MUST read BOTH ledgers BEFORE any fixes. No exceptions.**

Read using the Read tool (not an agent):

1. **`lms/test-results/findings-ledger.json`** — smart-test findings
2. **`lms/test-results/audit-ledger.json`** — audit findings

Parse both and build a unified list of open findings:
```
Unified finding = {
  source: "smart-test" | "audit",
  fingerprint: string,
  title: string,
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  category: string,
  location: string,
  recommendation?: object,  // audit findings have this
  note?: string,
  liveVerified?: boolean
}
```

**Checkpoint:** Before proceeding, state: "Ledgers loaded: {N} open smart-test findings, {N} open audit findings. {N} total fixable."

### Step 2: Select and prioritize findings

**2a. Filter by mode arguments:**
- No args → auto-select (see below)
- Number N → top N by priority
- Fingerprint → exact match
- `--category=X` → filter by category
- `--severity=X` → filter by severity level
- `--ledger=X` → filter by source ledger
- Combine filters with AND logic

**2b. Exclude unfixable findings:**
Skip findings with these statuses: `fixed`, `accepted`, `superseded`

Also skip findings that:
- Have `acceptedReason` set (intentionally deferred)
- Reference files that don't exist (superseded by deletion)
- Are best-practices/upgrade recommendations (dependency upgrades need manual testing)
- Are `best-practices:general:*` findings (project-wide patterns, not point fixes)

**2c. Priority ordering:**
1. CRITICAL severity first
2. Within same severity: `liveVerified: true` first (confirmed real)
3. Within same verification status: higher `seenCount` first (persistent issues)
4. Within same count: security category first, then bug, then a11y, then ux, then tech-debt

**2d. Auto-select logic (bare `/fix`):**
- If any CRITICAL open: pick 1 CRITICAL
- Else if any HIGH open: pick up to 3 HIGH
- Else if any MEDIUM open: pick up to 5 MEDIUM
- Else: pick up to 5 LOW

**2e. Dry run (`--dry-run`):**
Output the prioritized list to chat and stop:
```
Would fix 3 findings:
1. [CRITICAL] bug:users-route:admin-self-deactivation-lockout (audit)
   Location: lms/src/app/api/users/[id]/route.ts:115-118
   Strategy: Add server-side guard preventing self-deactivation

2. [HIGH] security:comments.ts:slide-comments-missing-stripHtml (smart-test)
   Location: lms/src/lib/schemas/comments.ts:171
   Strategy: Add stripHtml transform to slide comment schema

3. [HIGH] bug:useDeepLinking.ts:tab-override-searchparams-dependency (smart-test)
   Location: lms/src/hooks/lesson/useDeepLinking.ts:52-101
   Strategy: Remove searchParams from useEffect dependency array
```
Then stop — do not proceed to Step 3.

### Step 3: Group findings by file and spawn fix agents

**3a. Group by primary file:**
Multiple findings in the same file should be fixed by the same agent to avoid conflicts.

```
Group 1: lms/src/app/api/users/[id]/route.ts
  - bug:users-route:admin-self-deactivation-lockout
  - (any other findings in this file)

Group 2: lms/src/lib/schemas/comments.ts
  - security:comments.ts:slide-comments-missing-stripHtml

Group 3: lms/src/hooks/lesson/useDeepLinking.ts
  - bug:useDeepLinking.ts:tab-override-searchparams-dependency
```

**3b. Spawn fix agents in parallel (one per file group):**

Each agent receives:
- The finding(s) assigned to it (title, location, severity, category, note, recommendation)
- The fix-agent-prompt from `references/fix-agent-prompt.md`
- The relevant fix strategy from `references/fix-strategies.md`

**3c. Concurrency limits:**
- Max 5 parallel fix agents (to avoid file conflicts and context pressure)
- If more than 5 groups, batch them: run first 5, wait, run next 5

**3d. Agent isolation:**
Each fix agent works on its assigned file(s) only. It must NOT modify files outside its assignment. If a fix requires changes in multiple unrelated files, the agent should fix only its primary file and note the secondary files needed.

### Step 4: Verify fixes compile

After all fix agents return:

**4a. Run TypeScript compilation check:**
```bash
cd lms && npx tsc --noEmit 2>&1 | head -50
```

**4b. If compilation fails:**
- Identify which fix caused the error (from the error file path)
- Spawn a single repair agent with the error output and the problematic file
- The repair agent fixes the compilation error
- Re-run tsc check
- If still failing after 2 repair attempts, **revert that specific fix** using `git checkout -- <file>` and mark the finding as `status: "open"` with a note: "Fix attempted but caused compilation errors"

**4c. If compilation succeeds:**
All fixes are valid. Proceed to Step 5.

### Step 5: Update ledgers

> **HARD GATE: You MUST update both ledgers. Fixes without ledger updates are invisible.**

**5a. Get current commit hash:**
```bash
git rev-parse --short HEAD
```
Note: The fixes are not committed yet at this point. The commit hash will be updated after the user commits. For now, use `"pending"` as the fixedInCommit value.

**5b. Update findings-ledger.json (smart-test):**
For each fixed finding that came from the smart-test ledger:
```json
{
  "status": "fixed",
  "fixedInRun": "fix-YYYYMMDD-HHmm",
  "fixedInCommit": "pending"
}
```

**5c. Update audit-ledger.json:**
For each fixed finding that came from the audit ledger:
```json
{
  "status": "fixed",
  "fixedInCommit": "pending"
}
```

**5d. Write both ledgers** using the Write tool directly — do NOT delegate to a subagent.

### Step 6: Report results

Output to chat:

```
## Fix Results

**Fixed: {N}/{M}** ({N} successful, {M} attempted)
**Compilation:** Pass / Fail (with details)

### Fixed
| # | Severity | Finding | Source | File |
|---|----------|---------|--------|------|
| 1 | CRITICAL | Admin self-deactivation lockout | smart-test | users/[id]/route.ts |
| 2 | HIGH | Slide comments missing stripHtml | smart-test | schemas/comments.ts |

### Failed (if any)
| # | Severity | Finding | Reason |
|---|----------|---------|--------|
| 1 | HIGH | Deep linking tab override | Compilation error — reverted |

### Remaining Open
- CRITICAL: {N}
- HIGH: {N}
- MEDIUM: {N}
- LOW: {N}
- **Total open:** {N}

Run `/fix` again to continue, or `/fix --dry-run` to preview next batch.
```

---

## Fix Quality Rules

### What makes a good fix

1. **Minimal** — Change only what's needed. Don't refactor surrounding code.
2. **Correct** — Fix the actual root cause, not a symptom.
3. **Safe** — Don't introduce new issues. Check for side effects.
4. **Consistent** — Follow existing patterns in the codebase.
5. **Compilable** — Must pass `tsc --noEmit`.

### What to avoid

1. **Over-engineering** — Don't add abstractions for a one-line fix.
2. **Scope creep** — Don't fix adjacent issues that weren't in the finding.
3. **Breaking changes** — Don't change function signatures without updating all callers.
4. **New dependencies** — Don't add packages for simple fixes.
5. **Comments explaining the fix** — The code should be self-evident. Don't add `// FIX: ...` comments.

### When NOT to fix automatically

Some findings should not be auto-fixed. Skip and report as "manual intervention needed":

1. **Dependency upgrades** (`upgrade_dependency` action) — Need manual testing for breaking changes
2. **Architecture refactors** (god files, duplication across 5+ files) — Need design decisions
3. **Database migrations** (adding indexes, constraints) — Need migration files + deployment
4. **Feature-level changes** (missing features, new UI flows) — Need product decisions
5. **Configuration changes** (CSP, security headers) — Need environment-specific testing
6. **Findings with `acceptedReason`** — Intentionally deferred

---

## Ledger Update Rules

### Findings Ledger (smart-test)

When marking a finding as fixed:
```json
{
  "fingerprint": "existing-fingerprint",
  "status": "fixed",
  "fixedInRun": "fix-YYYYMMDD-HHmm",
  "fixedInCommit": "pending"
}
```

Preserve ALL other fields. Only update `status`, `fixedInRun`, and `fixedInCommit`.

### Audit Ledger

When marking a finding as fixed:
```json
{
  "fingerprint": "existing-fingerprint",
  "status": "fixed",
  "fixedInCommit": "pending"
}
```

Preserve ALL other fields. Only update `status` and `fixedInCommit`.

### Post-Commit Update

After the user runs `/commit` or commits manually, the commit hash should replace `"pending"` in both ledgers. This can be done by:
1. The user running `/fix --update-commit <hash>` (updates all "pending" entries)
2. Or the next `/audit` or `/smart-test` run detecting the fixes and recording the actual commit

---

## Integration with Other Skills

### After `/fix`, the user can:
- `/commit` — Commit the fixes
- `/smart-test verify` — Browser-verify that the fixes work
- `/audit live` — Re-verify audit findings in browser
- `/audit diff` — Re-audit only changed files
- `/fix --dry-run` — See what's next to fix
- `/fix` — Continue fixing more findings

### The full quality cycle:
```
/smart-test  →  finds runtime bugs, UX issues
/audit       →  finds code quality, security issues
/fix         →  resolves findings from both
/commit      →  commits the fixes
/smart-test verify  →  confirms fixes in browser
/audit diff  →  re-audits changed files
```

---

## Tips for Fix Agents

1. **Read the file first** — Always read the full file before editing. Understand context.
2. **Read the finding carefully** — The `note` and `recommendation` fields contain important context.
3. **Check for related patterns** — If fixing a missing validation, check if similar endpoints have the same issue.
4. **Use existing utilities** — If `stripHtml` exists in the codebase, import it; don't create a new one.
5. **Test edge cases mentally** — Will your fix handle null? Empty string? Very long input?
6. **Don't touch tests** — Fix agents don't write tests. That's a separate concern.
7. **One finding = one fix** — Don't bundle unrelated changes.
