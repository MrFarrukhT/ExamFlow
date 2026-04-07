---
name: audit
description: "Multi-agent code quality system: spawns subagents that research best practices, analyze architecture, verify findings in browser, and produce actionable reports with impact analysis. Use when asked to audit, review code quality, or do a deep code review."
---

# Code Audit — Multi-Agent Code Quality System

## What This Is

A deep, multi-agent code quality system that goes far beyond static linting. Subagents act as **senior code reviewers** — they research current best practices, analyze architecture, trace dependency graphs, verify findings in a live browser, and produce actionable reports with concrete code changes and impact analysis.

The system has **7 modes** from quick structural scan to full autonomous pipeline.

### Critical Invariant: Audit Ledger is the Source of Truth

**Every run MUST:**
1. **START** by reading `lms/test-results/audit-ledger.json` and injecting open findings into subagent prompts
2. **END** by writing all new/updated findings back to the ledger

This applies to ALL invocations — first run, follow-up analysis, any mode. Findings reported only in chat are considered lost. The ledger is what persists across conversations.

---

## Modes

| Mode | Command | Purpose | Web Research | Browser | Code |
|------|---------|---------|-------------|---------|------|
| **Pipeline** | `/audit` | Full autonomous pipeline — scan → research → analyze → live-verify → impact → report | Yes | Yes | Yes |
| **Scan** | `/audit scan` | Structural inventory only (fast, no judgment) | No | No | Yes |
| **Security** | `/audit security` | Deep security analysis + browser probing | No | Yes | Yes |
| **Architecture** | `/audit architecture` | Dead code, abstractions, dependency graph, simplification | No | No | Yes |
| **Best Practices** | `/audit best-practices` | Web research for current recommendations | Yes | No | Yes |
| **Impact** | `/audit impact [path]` | "What breaks if we remove X?" analysis | No | No | Yes |
| **Live** | `/audit live` | Browser-verify all open findings | No | Yes | Yes |
| **Diff** | `/audit diff` | Audit only what changed since last run | No | Optional | Yes |

### Mode selection
- `/audit` — **runs the full pipeline automatically** (scan → research → analyze → live-verify → impact → report)
- `/audit scan` — structural inventory only (fast, outputs to chat)
- `/audit security` — security agent + live verification of CRITICAL findings
- `/audit architecture` — architecture agent + impact analysis
- `/audit best-practices` — web research agents only (4 parallel)
- `/audit best-practices --refresh` — force refresh even if cache is fresh
- `/audit impact src/lib/auth.ts` — dependency tree for specific file/directory
- `/audit live` — browser-verify all open findings in ledger
- `/audit diff` — audit only files changed since last run
- `/audit diff --base=abc1234` — changes since specific commit

---

## Orchestration Flow (All Modes)

### Step 0: Pre-flight

Read these ground truth documents using the Read tool (not an agent):

1. **`.claude/rules/audit-rules.md`** — severity classification, false positive patterns, verification checklist
2. **`.claude/docs/ARCHITECTURE.md`** — system structure, roles, patterns
3. **`.claude/docs/BUSINESS_LOGIC.md`** — workflows, rules, constraints
4. **`.claude/docs/API_CONTRACTS.md`** — all API endpoints

### Step 1: Load persistent state (MANDATORY — DO NOT SKIP)

> **HARD GATE: You MUST read the audit ledger BEFORE spawning any subagent. No exceptions.**
> **This step is non-negotiable even for manual/ad-hoc runs, repeated invocations, or follow-up analysis.**

Read using the Read tool (not an agent):

1. **`lms/test-results/audit-ledger.json`** — previous findings across all runs. **Parse the JSON and count open findings per domain.** You will inject these into subagent prompts.

If the file doesn't exist, initialize with:
```json
{
  "version": 1,
  "lastRunAt": null,
  "lastRunCommit": null,
  "runs": [],
  "bestPracticesCache": {},
  "dependencyGraph": null,
  "findings": []
}
```

**Checkpoint:** Before proceeding, you must be able to state: "Audit ledger loaded: {N} total findings, {N} open." If you cannot state this, you skipped this step — go back.

### Step 2: SCAN — Build structural map (orchestrator, no subagents)

This step runs for ALL modes except `live` and `impact`.

**2a. Directory Inventory**

Count files in each major directory:
```
Glob: lms/src/app/api/**/route.ts        → API routes
Glob: lms/src/components/**/*.tsx          → Components
Glob: lms/src/lib/**/*.ts                  → Library files
Glob: lms/migrations/*.sql                 → Migrations
```

**2b. API Route Mapping**

For each API route file, extract:
1. HTTP methods exported (GET, POST, PUT, DELETE, PATCH)
2. Auth wrapper used (withAuth, withPermission, getSession, or NONE)
3. Roles/permissions if wrapper present

Output format:
```
/api/admin/users/route.ts: GET[admin], POST[admin]
/api/auth/login/route.ts: POST[NO_AUTH] (expected)
/api/courses/[id]/route.ts: GET[?], PUT[?] <- flag if no auth
```

**2c. Build Import Graph**

For a representative sample of files (all files in `src/lib/`, `src/app/api/`, and top-level component files):
1. Extract `import ... from '...'` statements
2. Resolve relative imports to absolute paths
3. Store as adjacency list in memory
4. Detect orphan files (exported but never imported anywhere)
5. Detect god files (>500 lines with many responsibilities)
6. Detect circular dependencies (A → B → A)

**Save scan results in memory for subsequent steps.**

### Step 3: Parse mode and spawn agents

Determine which mode to run based on arguments after `/audit`.

---

#### Pipeline Mode (bare `/audit`)

The pipeline runs phases sequentially. Each phase builds on the previous one's output.

**Phase 1: RESEARCH** (4 parallel best-practices-agents)

Read `references/best-practices-prompt.md` for the agent prompt.

First, check `bestPracticesCache` in the ledger. If cache exists and is <7 days old, skip this phase and use cached results (unless `--refresh` flag is set).

Spawn 4 agents in parallel:
- Agent 1: Next.js 16 security patterns + Server Component/Action best practices
- Agent 2: React 19 best practices, deprecations, new features not being used
- Agent 3: PostgreSQL security advisories + query optimization patterns
- Agent 4: Dependency freshness — check top-level deps in package.json for major version gaps, deprecation, known CVEs

Each agent uses WebSearch + WebFetch to research, then compares findings against the codebase.

Collect recommendations and update `bestPracticesCache` in the ledger.

Report to user: "Research complete — {N} recommendations across {N} sources."

**Phase 2: ANALYZE** (5 parallel domain agents)

Spawn 5 agents in parallel, each receiving:
- The structural scan from Step 2
- The best-practices research from Phase 1 (relevant subset)
- Open findings from the ledger for their domain
- Reference to `.claude/rules/audit-rules.md` for classification

| Agent | Prompt File | Focus |
|-------|-------------|-------|
| security-agent | `references/security-prompt.md` | Auth gaps, injection, IDOR, secrets, CSRF, rate limiting |
| types-agent | `references/types-prompt.md` | `any` usage, Zod coverage, type consistency, inference quality |
| api-agent | `references/api-prompt.md` | Endpoint consistency, validation, error handling, response shapes |
| database-agent | `references/database-prompt.md` | N+1, indexes, migrations, query safety, transactions |
| architecture-agent | `references/architecture-prompt.md` | Dead code, god files, circular deps, duplication, over-abstraction |

**Pass open findings context to each agent** (see Subagent Context Injection below).

Collect all findings from agents.

Report to user: "Analysis complete — {N} findings across {N} domains."

**Phase 3: LIVE-VERIFY** (sequential, single agent)

Read `references/live-verify-prompt.md` for the agent prompt.

1. Collect all HIGH and CRITICAL findings from Phase 2
2. Filter to those that have browser-testable implications:
   - Missing auth → can we access the endpoint without login?
   - Broken validation → can we submit bad data?
   - Wrong data display → does the page show incorrect information?
3. Spawn live-verify-agent with the filtered list
4. Agent opens browser, authenticates per role, tests each finding
5. Returns `liveVerified: true/false` for each finding
6. Findings that fail live verification get annotated: "code-only finding, not exploitable in current runtime state"

Skip this phase if no HIGH+ findings have browser-testable implications.

Report to user: "Live verification complete — {N}/{N} findings confirmed in browser."

**Phase 4: IMPACT** (sequential, single agent)

For all architecture findings of type "dead code", "removable abstraction", or "unnecessary dependency":

1. Use the import graph from Step 2c
2. For each candidate removal:
   - Walk the graph: who imports this file/export?
   - Transitively: what pages/routes are affected?
3. Classify each:
   - `safe_to_remove` — 0 importers, no side effects
   - `needs_migration` — importers exist but can be redirected (list them)
   - `cannot_remove` — deep dependency chain, removal too risky
4. Update findings with impact analysis

Report to user: "Impact analysis complete — {N} safe to remove, {N} need migration."

**After all phases:** Run Step 4 (merge and report).

---

#### Scan Mode (`/audit scan`)

Runs only Step 0-2. Outputs structural inventory to chat:
- File counts per directory
- API route auth map
- God files detected
- Orphan files detected
- Circular dependencies detected

No ledger update, no report file. Fast diagnostic.

---

#### Security Mode (`/audit security`)

1. Run Steps 0-2 (pre-flight + scan)
2. Spawn security-agent with full scan context
3. For CRITICAL findings: spawn live-verify-agent to confirm in browser
4. Run Step 4 (merge into ledger, write report)

Updates ledger for security domain only.

---

#### Architecture Mode (`/audit architecture`)

1. Run Steps 0-2 (pre-flight + scan)
2. Spawn architecture-agent with import graph
3. Run impact analysis for "removable" findings
4. Run Step 4 (merge into ledger, write report)

Updates ledger for architecture domain only.

---

#### Best Practices Mode (`/audit best-practices`)

1. Run Step 0-1 (pre-flight + load ledger)
2. Spawn 4 best-practices-agents in parallel
3. Update `bestPracticesCache` in ledger
4. If concrete violations found, add as findings and run Step 4
5. Otherwise, output recommendations to chat only

---

#### Impact Mode (`/audit impact [target]`)

Takes a file path, directory, or grep pattern.

1. Run Step 0-2 (need the import graph)
2. For the target file(s):
   - Find all direct importers
   - Find all transitive importers
   - Map to affected routes/pages
3. Output dependency tree to chat:

```
src/lib/auth.ts
  Direct importers (15):
    src/app/api/auth/login/route.ts
    src/app/api/auth/me/route.ts
    src/lib/api-middleware.ts
    ...
  Transitive importers (via api-middleware.ts): 87 route files
  Affected pages: /admin/*, /professor/*, /student/*, /editor/*
  Verdict: CANNOT_REMOVE (critical infrastructure, 102 total dependents)
```

No ledger update. Diagnostic only.

---

#### Live Mode (`/audit live`)

1. Run Step 0-1 (pre-flight + load ledger)
2. Collect all open findings from the ledger
3. Filter to browser-testable findings
4. Spawn live-verify-agent with the full list
5. Update `liveVerified` status in ledger
6. Output results to chat

Good for running after code changes to check if previous findings are still exploitable.

---

#### Diff Mode (`/audit diff`)

1. Run Steps 0-2 (pre-flight + scan)
2. Determine base commit: ledger's `lastRunCommit`, or `--base=` argument, or `HEAD~1`
3. Run `git diff {base}..HEAD --name-only -- 'lms/src/'`
4. Map changed files to audit domains:
   - `auth.ts`, `middleware.ts`, `api-middleware.ts` → security
   - `route.ts` → security + api
   - `*.tsx` components → architecture
   - `types.ts`, `schemas/*.ts` → types
   - `db.ts`, `migrations/*.sql` → database
   - `lib/*.ts` → architecture
5. Spawn only affected domain agents, scoped to changed files + their direct dependents
6. Run Step 4 (merge into ledger, write report)

---

### Subagent Context Injection (All Modes)

When spawning any domain subagent, include this context from the ledger:

```
**Known open findings in your domain ({N} total):**
These issues were found in previous runs and are still open. If you encounter the same issue:
- Note it as "RECURRING — [fingerprint]" in your finding
- Do NOT rewrite the full description — just confirm it still exists
- If the severity has changed, note the new severity
- Focus your effort on finding NEW issues not in this list

{list of open finding titles + fingerprints for this domain}
```

This prevents subagents from wasting tokens re-describing known issues and focuses them on new discoveries.

---

## Step 4: Merge findings into ledger and write report

This step runs after all subagents have returned, for ALL modes (except scan and impact).

**4a. Collect all findings** from subagent results.

**4b. For each finding, generate fingerprint:**
```
fingerprint = "{domain}:{primary_file_basename}:{slugified_title_keywords}"
```
Example: `security:route.ts:missing-auth-delete-users`

**4c. Match against ledger** (see `references/schemas.md` for matching rules):
- Fingerprint exact match → update existing entry (lastSeenRun, seenCount, lastSeenAt)
- File overlap >60% AND title keyword overlap >50% → update existing entry
- No match → new finding, add to ledger

**4d. Check for resolved findings:**
- For each `open` finding in the ledger whose domain was tested in this run:
  - If NOT found by any subagent → mark as `fixed`, record `fixedInCommit` from current HEAD
- For findings in domains NOT tested → leave unchanged

**4e. Check for regressions:**
- Any finding changing from `fixed` back to `open` → mark as `regressed`, promote severity to CRITICAL

**4f. Write the markdown report** to `lms/test-results/audit-{YYYY-MM-DD-HHmm}.md`

Use the report format from the Report Format section below.

**4g. Update `lms/test-results/audit-ledger.json`** with all changes. **Use the Write tool directly — do NOT delegate ledger writes to a subagent.**

**4h. Output executive summary to user in chat.**

> **HARD GATE: Step 4 is MANDATORY. You MUST update the audit ledger after all agents complete. The ledger is the persistent source of truth — chat messages are ephemeral.**

---

## Finding Format (All Agents)

Every finding across all agents uses this format:

```markdown
### [{SEVERITY}] [{DOMAIN}] {Title}

**Location:** `{file_path}:{line_start}-{line_end}`
**Related files:** {comma-separated list of file basenames}
**Live verified:** {Yes / No / N/A}

**Code:**
```typescript
{3-10 lines of actual code from the file, with line numbers}
```

**What's wrong:** {1-2 sentences}
**Why it matters:** {impact on users, security, or maintainability}
**Industry standard:** {what best practices say, with source URL if from web research}

**Impact analysis:**
- Routes affected: {list of URL routes that use this code}
- Roles affected: {list of user roles impacted}
- Removable: {Yes (0 dependents) / Needs migration (N dependents) / No}
- Dependents: {list of files that import this}

**Recommendation:**
- Action: {wrap_with_auth | add_validation | extract_to_shared | remove_dead_code | add_index | replace_pattern | simplify | upgrade_dependency | ...}
- Effort: {5 minutes | 30 minutes | 2 hours | half day | ...}
- Suggested code:
```typescript
{concrete replacement code}
```
```

**For recurring findings** (matches an open finding from the ledger):
```markdown
### RECURRING — {fingerprint}
Still present. {Optional note if severity or behavior changed.}
```

---

## Severity Calibration

Use the decision tree from `.claude/rules/audit-rules.md` as the ground truth. Summary:

**CRITICAL (S1)** — Must fix immediately:
- Missing authentication on data-modifying endpoints
- SQL injection (string concatenation in queries)
- Exposed credentials in source code
- Path traversal vulnerabilities
- Regressions (was fixed, came back — auto-promoted)

**HIGH (S2)** — Fix within 1 sprint:
- Inconsistent authorization (some paths protected, others not)
- Missing rate limiting on auth endpoints
- XSS vulnerabilities
- IDOR (Insecure Direct Object Reference)

**MEDIUM (S3)** — Plan to fix:
- `any` type usage reducing type safety
- Inconsistent error handling patterns
- Dead/unreachable code
- Missing database indexes
- N+1 query patterns

**LOW (S4)** — Nice to have:
- Naming convention violations
- Unused imports
- Code style inconsistencies
- Minor accessibility issues

### False Positive Patterns (DO NOT flag)

Refer to `.claude/rules/audit-rules.md` for the complete list. Key exclusions:
- `/api/auth/login` without auth (it's the login endpoint)
- Template literals with `$1, $2` placeholders (parameterized queries)
- `catch (e: any)` (standard pattern)
- `console.error` in catch blocks (legitimate logging)
- Large `types.ts` (centralized types is intentional)
- Feature flag code behind toggles

---

## Report Format

```markdown
# Code Audit Report — {YYYY-MM-DD HH:mm}

## Executive Summary

**Mode:** {mode name}
**Run ID:** audit-{YYYYMMDD-HHmm}
**Commit:** {git short hash}
**Domains analyzed:** {list}

### Findings Summary
| | New | Recurring | Regressed | Resolved | Accepted |
|---|---|---|---|---|---|
| CRITICAL | {n} | {n} | {n} | — | {n} |
| HIGH | {n} | {n} | {n} | — | {n} |
| MEDIUM | {n} | {n} | {n} | — | {n} |
| LOW | {n} | {n} | {n} | — | {n} |
| **Total** | **{n}** | **{n}** | **{n}** | **{n}** | **{n}** |

### Top 3 Issues Requiring Immediate Attention
1. {one-line summary} {NEW|REGRESSED}
2. {one-line summary} {NEW|REGRESSED}
3. {one-line summary} {NEW|RECURRING}

### Codebase Statistics
- **API Routes:** {n} files
- **Components:** {n} files
- **Library modules:** {n} files
- **Database tables:** {n} tables
- **Migrations:** {n} files

---

## Regressions (was fixed, came back)
{Auto-promoted to CRITICAL}

## New Findings
{Grouped by domain, ordered by severity}

### Security
{findings with domain=security}

### Architecture
{findings with domain=architecture}

### API Quality
{findings with domain=api}

### Type Safety
{findings with domain=types}

### Database
{findings with domain=database}

### Best Practices
{findings with domain=best-practices}

---

## Recurring Findings (still unfixed)

| Fingerprint | Title | Severity | First Seen | Times Seen |
|-------------|-------|----------|------------|------------|
| {fp} | {title} | {sev} | {date} | {n} |

---

## Resolved Since Last Run

| Fingerprint | Title | Was Severity | Fixed In |
|-------------|-------|-------------|----------|
| {fp} | {title} | {sev} | {commit} |

---

## Suppressed (Accepted)
{Count} findings suppressed as accepted known issues.

---

## Impact Analysis Summary
{For architecture findings with impact data}

### Safe to Remove
| File | Lines | Reason |
|------|-------|--------|
| {path} | {n} | {reason} |

### Needs Migration
| File | Dependents | Migration Steps |
|------|-----------|----------------|
| {path} | {n} | {steps} |

---

## Best Practices Gaps
{Recommendations from web research with source URLs}

---

## What's Working Well
{Positive observations — patterns correctly applied, good security posture, etc.}

---

## Appendix: Ledger Stats
**Total findings in ledger:** {n}
**Open:** {n} | **Fixed:** {n} | **Accepted:** {n} | **Regressed:** {n}
**Oldest open finding:** {date} — {title}
```

---

## Accepting Findings

To suppress a finding in future runs:
```
/audit accept {fingerprint} --reason="explanation"
```

This sets `status: "accepted"` and `acceptedReason` in the audit ledger. The finding will appear in the "Suppressed" count but not in the main findings sections.

To re-open an accepted finding:
```
/audit reopen {fingerprint}
```

---

## Tips for All Subagents

1. **Read before judging** — always read the actual file, never trust grep alone
2. **Code snippets are mandatory** — every finding needs 3-10 lines of actual code with line numbers
3. **Check for compensating controls** — middleware, wrappers, or parent components may handle the issue
4. **Be specific** — "line 47 uses string interpolation in SQL" is useful; "database could be better" is not
5. **Check the false positive list** in `.claude/rules/audit-rules.md` before reporting
6. **Include the fix** — every finding must have a concrete, copy-pasteable code recommendation
7. **Distinguish essential from accidental complexity** — 6 user roles is essential (medical education); 3 different auth patterns is accidental
8. **Impact matters** — a critical finding on a dead code path is really just LOW
