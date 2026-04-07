---
name: smart-test
description: "LLM-judged app review: spawns subagents that explore the live app via browser AND read source code to find bugs, UX issues, architectural debt, and business logic flaws. Produces a comprehensive report. Use when asked to smart-test, AI-test, review the app, or do an intelligent quality assessment."
---

# Smart Test — LLM-Judged Application Review

## What This Is

A multi-layer intelligent review system that goes far beyond deterministic testing. Subagents act as **senior technical advisors** — they open a real browser, look at what users see, read the source code behind it, and reason about whether the whole system makes sense together.

The system has **7 modes** that form an evolution from basic review to autonomous continuous quality assurance.

### Critical Invariant: Findings Ledger is the Source of Truth

**Every run MUST:**
1. **START** by reading `lms/test-results/findings-ledger.json` and injecting open findings into subagent prompts
2. **END** by writing all new/updated findings back to the ledger

This applies to ALL invocations — first run, follow-up "deeper analysis", manual agent spawning, any mode. Findings reported only in chat are considered lost. The ledger is what persists across conversations.

---

## Modes

| Mode | Command | Purpose | Browser | Code |
|------|---------|---------|---------|------|
| **Pipeline** | `/smart-test` | **Full autonomous pipeline** — crawl → baseline → default sweep → deep → adversary | Yes | Yes |
| **Default** | `/smart-test sweep` | Zone-based sweep only (original behavior) | Yes | Yes |
| **Crawl** | `/smart-test crawl` | Autonomous route discovery — builds app-map.json | Yes | No |
| **Deep** | `/smart-test deep [zone]` | Edge case testing using app-map | Yes | Yes |
| **Diff** | `/smart-test diff` | Test only what changed since last run | Yes | Yes |
| **Adversary** | `/smart-test adversary [zone]` | Actively try to break things | Yes | Yes |
| **Baseline** | `/smart-test baseline` | Snapshot current state as "known good" | Yes | No |
| **Verify** | `/smart-test verify` | Post-change browser verification | Yes | No |

### Mode selection
- `/smart-test` — **runs the full pipeline automatically** (crawl → baseline → sweep → deep → adversary → consolidated report)
- `/smart-test sweep` — zone-based sweep only (the original `/smart-test` behavior)
- `/smart-test sweep student professor` — sweep only specified zones
- `/smart-test --quick` — browser only, skip code review (applies to sweep)
- `/smart-test --code-only` — code review only, skip browser (applies to sweep)
- `/smart-test crawl` — discover all routes, build app-map
- `/smart-test crawl --role=student` — crawl only as student role
- `/smart-test deep student` — deep edge-case testing for student zone
- `/smart-test deep --forms` — only test forms across all zones
- `/smart-test diff` — test changes since last smart-test run
- `/smart-test diff --base=abc1234` — test changes since specific commit
- `/smart-test adversary` — adversarial testing on all zones
- `/smart-test adversary admin` — adversarial testing on admin zone only
- `/smart-test baseline` — snapshot all zones as known-good
- `/smart-test verify` — verify most recent git changes in browser

---

## Orchestration Flow (All Modes)

### Step 0: Pre-flight checks

```bash
# Check app is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
```
If not 200, tell the user to start the dev server first.

### Step 1: Load persistent state (MANDATORY — DO NOT SKIP)

⚠️ **HARD GATE: You MUST read the findings ledger BEFORE spawning any subagent. No exceptions.**
⚠️ **This step is non-negotiable even for manual/ad-hoc runs, repeated invocations, or "deeper analysis" follow-ups.**

Read these files using the Read tool (not an agent):

1. **`lms/test-results/findings-ledger.json`** — previous findings across all runs. **Parse the JSON and count open findings per zone.** You will inject these into subagent prompts in Step 3.
2. **`lms/test-results/app-map.json`** — route inventory from previous crawl/discovery

If `lms/test-results/known-issues.json` exists (legacy), migrate it into the findings ledger:
- Read each entry, convert to a ledger finding with `status: "accepted"` and `acceptedReason`
- Append to ledger findings array
- Delete `known-issues.json`

**Checkpoint:** Before proceeding to Step 2, you must be able to state: "Ledger loaded: {N} total findings, {N} open." If you cannot state this, you skipped this step — go back.

### Step 2: Build route skeleton from code (Hybrid Route Discovery)

**This step runs for ALL modes** (except `baseline` which needs browser only). It replaces the expensive pure-browser crawl as the primary route discovery mechanism.

**Phase A — Static analysis (no browser, ~5 seconds):**

1. Use Glob to find all `page.tsx` and `route.ts` files under `lms/src/app/`:
   ```
   Glob: lms/src/app/**/page.tsx
   Glob: lms/src/app/**/route.ts
   ```

2. Convert file paths to routes:
   - `src/app/student/page.tsx` → `{ path: "/student", role: "student", type: "page", source: "static" }`
   - `src/app/api/users/route.ts` → `{ path: "/api/users", type: "api", source: "static" }`
   - `src/app/student/study/[lessonId]/page.tsx` → `{ path: "/student/study/[lessonId]", role: "student", type: "page", dynamic: true, source: "static" }`
   - `src/app/(landing)/about-zarmed/page.tsx` → `{ path: "/about-zarmed", role: "public", type: "page", source: "static" }`

3. Determine role from path prefix:
   - `/student/**` → student
   - `/professor/**` → professor
   - `/admin/**` → admin
   - `/editor/**` → editor
   - `/(landing)/**` or no role prefix → public
   - `/api/**` → api (assign consuming roles from imports)

4. For dynamic routes (`[param]` segments), find one real ID:
   - Check if there's a corresponding list API (e.g., `/api/courses` for `/admin/courses/[id]`)
   - Or grep test fixtures/seed data for sample IDs

5. Write/update `lms/test-results/app-map.json` with `source: "static"` entries

**Phase B — Browser enrichment (only in `crawl` or `pipeline` mode):**

If the mode is `crawl` or `pipeline`, ALSO spawn crawl agents to enrich the skeleton with interactive element details (forms, tabs, modals, buttons). Pass the route skeleton to crawl agents so they don't waste time discovering routes — they only add element inventories.

For all other modes, the static skeleton is sufficient.

### Step 3: Parse mode and spawn agents

Determine which mode to run based on the first argument after `/smart-test`.

**If no arguments** (bare `/smart-test`), run **Pipeline mode** — the full autonomous sequence:

#### Pipeline Mode Orchestration

The pipeline runs phases sequentially. Each phase builds on the previous one's output.

**Phase 1: Route Discovery** (already done in Step 2)
- Static analysis built the route skeleton
- Spawn crawl agents to enrich with interactive element details (one per role, in parallel)
- Read `references/crawl-prompt.md` for the crawl agent prompt
- Report to user: "Discovery complete — {N} pages, {N} API routes from code; enriched {N} pages via browser"

**Phase 2: Baseline** — Snapshot current state
- Read `references/schemas.md` for format
- Spawn one baseline agent per role **in parallel**
- Each visits every page, records element counts, key text, API response shapes
- Write `lms/test-results/baseline.json`
- Report to user: "Baseline captured at commit {hash}"

**Phase 3: Sweep** — Full zone-based review (the original smart-test)
- Spawn one agent per zone (student, professor, admin, editor, public, api-architecture) **in parallel**
- Each agent does browser review + code review using the inline template below
- **Pass the zone's open findings from the ledger** to each agent (see subagent context injection below)
- Collect findings

**Phase 4: Deep** — Edge case stress-testing
- Read `references/deep-prompt.md`
- Read `lms/test-results/app-map.json` (from Phase 1)
- Spawn one deep agent per zone **in parallel**
- Each agent systematically tests every form, button, and interaction with edge cases
- Collect findings

**Phase 5: Adversary** — Security testing
- Read `references/adversary-prompt.md`
- Spawn one adversary agent per role + one unauthenticated **in parallel**
- Each tries IDOR, privilege escalation, XSS, SQL injection, auth bypass
- Collect findings

**After all phases:** run Step 4 (merge and report).

**Note:** Pipeline mode will take significant time (30+ minutes depending on app size). The user has stated they have unlimited tokens and time. Between phases, give the user a brief progress update.

#### Other modes

For non-pipeline modes, read the appropriate reference file:
- Default/sweep → use the inline subagent template below
- Crawl → read `references/crawl-prompt.md`
- Deep → read `references/deep-prompt.md` (requires app-map.json — if missing, run Step 2 Phase B first)
- Adversary → read `references/adversary-prompt.md`
- Verify → read `references/verify-prompt.md`
- Diff → read `references/diff-engine.md`, then spawn targeted agents
- Baseline → read `references/schemas.md` for format, then crawl + snapshot

#### Subagent context injection (all modes)

When spawning any subagent, include this context from the ledger:

```
**Known open findings in your zone ({N} total):**
These issues were found in previous runs and are still open. If you encounter the same issue:
- Note it as "RECURRING — [fingerprint]" in your finding
- Do NOT rewrite the full description — just confirm it still exists
- If the severity has changed, note the new severity
- Focus your effort on finding NEW issues not in this list

{list of open finding titles + fingerprints for this zone}
```

This prevents subagents from wasting tokens re-describing known issues and focuses them on new discoveries.

### Step 4: Merge findings into ledger and write report

This step runs after all subagents have returned, for ALL modes.

**4a. Collect all findings** from subagent results.

**4b. For each finding, generate fingerprint:**
```
fingerprint = "{category}:{primary_file_basename}:{slugified_title_keywords}"
```

**4c. Match against ledger** (see `references/schemas.md` for matching rules):
- Fingerprint match → update existing entry (lastSeenRun, seenCount)
- File+title similarity match → update existing entry
- No match → new finding, add to ledger

**4d. Check for resolved findings:**
- For each `open` finding in the ledger whose zone was tested in this run:
  - If NOT found by any subagent → mark as `fixed`, record `fixedInCommit`
- For findings in zones NOT tested → leave unchanged

**4e. Check for regressions:**
- Any finding changing from `fixed` back to `open` → mark as `regressed`, promote to CRITICAL

**4f. Write the markdown report** to `lms/test-results/smart-test-{YYYY-MM-DD-HHmm}.md`:
- The report is a **view** of the ledger — it doesn't replace it
- Use the enhanced report format below (with NEW/RECURRING/REGRESSED/RESOLVED sections)

**4g. Update `lms/test-results/findings-ledger.json`** with all changes. **Use the Write tool directly — do NOT delegate ledger writes to a subagent.**

**4h. Output executive summary to user in chat.**

⚠️ **HARD GATE: Step 4 is MANDATORY. You MUST update the findings ledger after all agents complete, even if the user doesn't explicitly ask. The ledger is the persistent source of truth — chat messages are ephemeral. If you present findings in chat without writing them to the ledger, the work is lost.**

---

## Mode: Default (Full Sweep)

This is the original smart-test behavior. Spawn one agent per zone in parallel.

### Test Zones

| Zone | Type | Scope |
|------|------|-------|
| `student` | Browser + Code | Student-facing pages, enrollment flow, study flow, quiz taking |
| `professor` | Browser + Code | Professor dashboard, analytics, KPI, feed, lesson management |
| `admin` | Browser + Code | Admin dashboard, user management, courses, submissions, logs |
| `editor` | Browser + Code | Editor workflow, lesson editing, my-edits, review cycle |
| `public` | Browser only | Landing pages, programs, about, dormitory, campuses |
| `api-architecture` | Code only | API route patterns, auth middleware, database queries, type safety |

### Subagent Prompt Template (Default Mode)

Fill in `{ZONE}`, `{PAGES}`, `{EMAIL}`, `{PASSWORD}`, `{SOURCE_PATHS}` per zone.

---

You are a senior technical advisor reviewing the LMS application at http://localhost:3000.

**Your zone:** {ZONE}
**Pages to test:** {PAGES}
**Source code to review:** {SOURCE_PATHS}

You examine TWO things: what the USER sees (browser) and what the CODE does (source). Your job is to find the gap between intent and reality.

#### Part A: Browser Review

**A1. Open browser and authenticate**
```
playwright-cli -s={ZONE} open http://localhost:3000/login
```
If your zone requires login:
- Email: {EMAIL}
- Password: {PASSWORD}

Use snapshot refs to fill the login form, click submit, handle any onboarding.

**A2. For each page, do ALL of these:**

Navigate + Snapshot + Screenshot:
```
playwright-cli -s={ZONE} goto {page_url}
playwright-cli -s={ZONE} snapshot
playwright-cli -s={ZONE} screenshot --filename={ZONE}-{page-slug}.png
```

Read the snapshot and screenshot. Judge:
- Are there "undefined", "null", "NaN", "[object Object]" values visible?
- Are counts/numbers reasonable? (no negatives, no impossibly large values)
- Is text in the expected language? Any untranslated strings?
- Is the page stuck in a loading state? (spinner visible after 10s)
- Does the information hierarchy make sense for this user role?
- Would a real user (medical student, professor, admin) understand what to do on this page?
- Are empty states helpful or confusing? ("No data" vs explaining why)

Check console + network:
```
playwright-cli -s={ZONE} console error
playwright-cli -s={ZONE} network
```
Flag: unhandled exceptions, 500s, 404s on API calls, failed fetches, hydration errors.

Interact with key elements — click filters, tabs, search. Verify state actually changes:
```
playwright-cli -s={ZONE} eval "document.querySelectorAll('tr').length"
```

**A3. UX Judgment**

For each page, answer (skip if N/A):
1. **Workflow clarity** — Can the user complete their task without guessing?
2. **Error recovery** — If something fails, does the user know what happened?
3. **Data density** — Too much or too little information?
4. **Consistency** — Same patterns as similar pages?
5. **Accessibility** — Interactive elements labeled? Keyboard navigable?

**A4. Close browser**
```
playwright-cli -s={ZONE} close
```

#### Part B: Code Review

Read the source files for your zone.

**B1. Frontend Code (page.tsx, components)**
- Dead code — Props declared but never passed? State set but never read?
- Consistency — Same data fetching pattern as sibling pages?
- Component health — Any component >300 lines?
- Hardcoded values — Magic numbers, hardcoded URLs?

**B2. API Routes (route.ts)**
- Validation — Zod/schema before use? Raw `request.json()` without parsing?
- Auth consistency — All data-modifying endpoints check permissions?
- Response shape — Similar endpoints return similar shapes?
- Error handling — Structured responses or 500 bubbles?

**B3. Business Logic**
Trace key workflows end-to-end:
- **Student:** browse → start lesson → study → quiz → progress
- **Professor:** dashboard → analytics → KPI → feed
- **Admin:** users → courses → submissions → logs
- **Editor:** lessons → edit → submit → review

**B4. Technical Debt Markers**
- Legacy + new patterns coexisting
- TODO/FIXME/HACK comments
- Unused exports
- `userId` vs `user_id` vs `uid` inconsistency
- Copy-paste code across files
- Abstractions used exactly once

#### Part C: Severity Calibration

**You MUST use this decision tree to assign severity. Do not over-classify.**

**CRITICAL** — answer YES to at least one:
- Can a user lose data? (quiz answers, progress, uploads disappear or corrupt)
- Can a user see another user's private data? (IDOR, data leak)
- Is an entire feature completely non-functional? (page won't load, form never submits)
- Can this be exploited for unauthorized access? (auth bypass, privilege escalation)

**HIGH** — answer YES to at least one:
- Does the user see wrong/misleading data? (wrong score, wrong count, wrong name)
- Is a common workflow broken for >10% of attempts? (not edge cases — real usage)
- Does this affect every user of a role? (all students, all professors)

**MEDIUM** — answer YES to at least one:
- Is there a console error on a production page? (unhandled exception, failed fetch)
- Does an uncommon workflow fail? (edge case, specific sequence of actions)
- Is there a visual glitch that a user would notice? (layout shift, artifact, overlap)
- Is there a performance issue measurable in the UI? (>2s delay, jank)

**LOW** — everything else:
- Cosmetic issues with no functional impact
- Code quality observations (no user-facing effect)
- Optimization opportunities
- Accessibility improvements
- Naming inconsistencies

**Calibration examples (use these as anchors):**
| Finding | Correct Severity | Why |
|---------|-----------------|-----|
| Quiz auto-submits on refresh | CRITICAL | Data loss — student loses quiz progress |
| Score shows 73% but only 7/20 correct | HIGH | Wrong data displayed to user |
| Tooltip shows [object Object] | MEDIUM | Visual glitch, user notices |
| Tab has vertical bar artifact on hover | MEDIUM | Visual glitch, no data impact |
| Console warning about missing key prop | LOW | No user impact |
| Unused import in component | LOW | Code quality only |

#### Part D: Write Findings

Use the standard finding format (see Report Format section below).

**For recurring findings:** If a finding matches one from the known open findings list provided to you, write it as:
```markdown
### RECURRING — {fingerprint}
Still present. {Optional: note if severity changed or behavior differs from previous report.}
```
Do NOT rewrite the full description for recurring findings. Focus your tokens on NEW discoveries.

---

## Mode: Crawl

**Purpose:** Build a complete route inventory with interactive element details. Uses **hybrid discovery** — static code analysis provides the route skeleton, browser crawl enriches it with element details.

**Step 1 (automatic, done by orchestrator in Step 2):** Static route skeleton from `page.tsx`/`route.ts` file paths.

**Step 2:** Read `references/crawl-prompt.md` for the browser enrichment agent prompt.

**Spawn strategy:** One agent per role (student, professor, admin, editor) + one for public. Each agent receives the pre-built route skeleton and:
1. Logs in as their role
2. Visits each page in the skeleton (no need to discover routes — they're already known)
3. Records interactive elements: forms, buttons, tabs, dropdowns, modals
4. Tries clicking things that look interactive to discover hidden elements
5. Reports back element inventories to merge into app-map.json

The orchestrator merges the static skeleton + browser element inventories into `app-map.json`.

---

## Mode: Deep

**Purpose:** Systematically test every form, interaction, and state transition with edge cases.

**Prerequisite:** `lms/test-results/app-map.json` must exist. If not, offer to run crawl first.

Read `references/deep-prompt.md` for the full agent prompt.

**Spawn strategy:** One agent per zone. Each agent reads app-map.json for its zone's forms/interactions, then:
1. Tries the happy path (correct data)
2. Tries empty submission
3. Tries wrong data types (string in number field, etc.)
4. Tries boundary values (very long strings, negative numbers, zero)
5. Tries special characters (`<script>`, SQL fragments, unicode)
6. Tests state transitions (create → edit → delete → verify deleted)
7. Tests concurrent operations (rapid clicks, double submit)

---

## Mode: Diff

**Purpose:** Test only what changed since the last run. Fast feedback loop.

Read `references/diff-engine.md` for the auto-discovery mapping logic.

**Flow:**
1. Determine base commit: ledger's `lastRunCommit`, or `--base=` argument, or `HEAD~1`
2. Run `git diff {base}..HEAD --name-only -- 'lms/src/'`
3. Map changed files to affected routes/zones using **auto-discovery** (see diff-engine.md — no static table, computed from file system)
4. Spawn agents ONLY for affected zones, testing ONLY affected pages
5. Pass the zone's open findings from the ledger so agents can confirm/clear them
6. If baseline.json exists, compare current state against baseline snapshots
7. Merge results into findings ledger (Step 4 of orchestration)

---

## Mode: Adversary

**Purpose:** Actively try to break the application. Think like an attacker.

Read `references/adversary-prompt.md` for the full agent prompt.

**Spawn strategy:** One agent per role + one unauthenticated agent. Each agent tries:
1. **IDOR** — Access other users' data by guessing/iterating IDs
2. **Privilege escalation** — Access admin pages as student, professor pages as editor
3. **Auth bypass** — Hit API endpoints without cookies, with expired tokens
4. **XSS probing** — Submit `<script>alert(1)</script>` in every text field
5. **SQL injection probing** — Submit `'; DROP TABLE--` in search/filter fields
6. **CSRF** — Check if state-changing endpoints accept requests without proper origin
7. **Data leakage** — Check API responses for fields that shouldn't be visible to this role

---

## Mode: Baseline

**Purpose:** Snapshot the current application state as "known good" for future comparison.

Read `references/schemas.md` for the baseline.json format.

**Flow:**
1. Spawn one agent per role
2. Each agent visits every page in their zone
3. For each page, record: element counts, key text content, API response shapes, visible data
4. Merge into `lms/test-results/baseline.json`
5. Record the current git commit hash as the baseline reference point

Future diff/deep runs compare against this baseline to detect regressions.

---

## Mode: Verify

**Purpose:** After a code change, immediately browser-test the affected pages. This is the "did I break anything?" check.

Read `references/verify-prompt.md` for the full agent prompt.

**Flow:**
1. Run `git diff HEAD~1 --name-only` (or diff of unstaged changes)
2. Map changed files → affected pages (using diff-engine mapping)
3. Spawn ONE lightweight agent that:
   - Opens browser
   - Navigates to each affected page
   - Takes snapshot + screenshot
   - Checks for errors (console, network, visible "undefined"/"null")
   - Verifies the change actually took effect (if deterministic)
   - Reports pass/fail per page
4. Output is brief: green checkmark or red X per page, with details only for failures

**This mode is designed to be fast** — no code review, no deep analysis. Just "does it still work?"

---

## Zone-Specific Configuration

### student
**Pages:** /student, /student/search, /student/simulation-lab, /student/study/{lessonId}
**Credentials:** student@test.com / test123
**Source paths:**
- `src/app/student/` — all page files
- `src/app/api/progress/` — progress tracking
- `src/app/api/quiz/` — quiz attempts
- `src/app/api/search/` — search endpoint
- `src/app/api/simulation/` — simulation lab
- `src/app/api/courses/` — course browsing

### professor
**Pages:** /professor, /professor/lessons, /professor/analytics, /professor/kpi, /professor/feed, /professor/students, /professor/messages, /professor/departments, /professor/profile, /professor/uploads
**Credentials:** professor@test.com / test123
**Source paths:**
- `src/app/professor/` — all page files
- `src/app/api/kpi/` — KPI endpoints
- `src/app/api/social/` — feed/posts
- `src/app/api/analytics/` — analytics
- `src/app/api/students/` — student listing

### admin
**Pages:** /admin, /admin/users, /admin/courses, /admin/lessons, /admin/materials, /admin/submissions, /admin/kpi, /admin/logs
**Credentials:** admin@zarmed.uz / admin123
**Source paths:**
- `src/app/admin/` — all page files
- `src/app/api/users/` — user management
- `src/app/api/courses/` — course management
- `src/app/api/admin/` — admin-specific endpoints
- `src/app/api/notifications/` — notification management
- `src/app/api/it-admin/` — IT admin tools

### editor
**Pages:** /editor, /editor/lessons, /editor/my-edits, /editor/lessons/{id}
**Credentials:** editor@test.com / test123
**Source paths:**
- `src/app/editor/` — all page files
- `src/app/api/editor/` — editor endpoints
- `src/app/api/lessons/` — lesson CRUD
- `src/app/api/edits/` — edit management

### public
**Pages:** /, /about-zarmed, /programs, /dormitory, /journals, /laboratories, /campuses/samarkand, /campuses/bukhara, /mission-vision, /academic-buildings
**Credentials:** (none)
**Source paths:**
- `src/app/(landing)/` — all landing page files

### api-architecture
**Pages:** (none — code only)
**Source paths:**
- `src/lib/` — shared utilities, types, auth helpers, database
- `src/app/api/auth/` — authentication
- `src/middleware.ts` — request middleware
- `src/lib/types.ts` — central type definitions

**Special instructions for api-architecture zone:**
Do NOT open a browser. Focus entirely on:
1. Auth helper consistency (`src/lib/auth.ts`)
2. Database helper safety (`src/lib/db.ts`) — parameterized queries?
3. Type comprehensiveness (`src/lib/types.ts`) — `any` usage?
4. Grep for `any` across API routes
5. Grep for `console.log` in production code
6. TODO/FIXME/HACK comments
7. Files >500 lines (god files)
8. Pattern inconsistency (pagination, error responses)

---

## Finding Format (All Modes)

Every finding across all modes uses this format:

```markdown
### [{SEVERITY}] [{CATEGORY}] {Title}

**Location:** {file path or page URL}
**Related files:** {comma-separated list of file basenames involved}
**Evidence:** {exact text, code snippet, screenshot filename}

**What's wrong:** {1-2 sentences}
**Why it matters:** {impact on users or developers}
**Suggested fix:** {concrete, actionable recommendation}
```

For **recurring findings** (matches an open finding from the ledger):
```markdown
### RECURRING — {fingerprint}
Still present. {Optional note if severity or behavior changed.}
```

**Severity levels** (see Part C: Severity Calibration in the subagent template for the full decision tree):
- **CRITICAL** — Data loss, data leak, entire feature broken, exploitable security hole
- **HIGH** — Wrong data shown, common workflow broken for all users of a role
- **MEDIUM** — Console errors, uncommon workflow failure, visual glitch, measurable perf issue
- **LOW** — Cosmetic, code quality, optimization, accessibility

**Categories:**
- `bug` — Something broken or shows wrong data
- `ux` — User experience issue
- `security` — Auth gap, data leak, missing validation
- `architecture` — Structural issue
- `tech-debt` — Legacy code, inconsistency, duplication
- `performance` — Slow queries, N+1, unnecessary re-renders
- `regression` — Was fixed, came back (auto-assigned by orchestrator for regressed findings)

---

## Report File Format

The markdown report is a **view** of the findings ledger — not the source of truth. It highlights what changed since the last run.

```markdown
# Smart Test Report — {YYYY-MM-DD HH:mm}

## Executive Summary

**Mode:** {mode name}
**Run ID:** {run-YYYYMMDD-HHmm}
**Commit:** {git short hash}
**Zones tested:** {list}
**Pages explored:** {count}
**Source files reviewed:** {count}

### Findings Summary
| | New | Recurring | Regressed | Resolved | Accepted (suppressed) |
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

---

## Regressions (was fixed, came back)
{Findings that were previously marked fixed but reappeared — auto-promoted to CRITICAL}

## New Findings
{Findings not seen in any previous run, grouped by category, ordered by severity}

### Bugs
{new findings with category=bug}

### Security
{new findings with category=security}

### UX Issues
{new findings with category=ux}

### Performance
{new findings with category=performance}

### Architecture & Technical Debt
{new findings with category=architecture or tech-debt}

---

## Recurring Findings (still unfixed)
{Findings seen in previous runs that are still present — brief list with fingerprint and seenCount}

| Fingerprint | Title | Severity | First Seen | Times Seen |
|-------------|-------|----------|------------|------------|
| {fp} | {title} | {sev} | {date} | {n} |

---

## Resolved Since Last Run
{Findings that were open but NOT found in this run — likely fixed}

| Fingerprint | Title | Was Severity | Fixed In |
|-------------|-------|-------------|----------|
| {fp} | {title} | {sev} | {commit} |

---

## Suppressed (Accepted)
{Count of suppressed findings} findings suppressed as accepted known issues.

---

## What's Working Well
{Positive observations}

## Clean Pages
{Pages that passed all checks with no issues}

---

## Appendix: Screenshots
{List of screenshot files generated}

## Appendix: Ledger Stats
**Total findings in ledger:** {n}
**Open:** {n} | **Fixed:** {n} | **Accepted:** {n} | **Regressed:** {n}
**Oldest open finding:** {date} — {title}
```

---

## Accepting Findings

To suppress a finding in future runs, use:
```
/smart-test accept {fingerprint} --reason="explanation"
```

This sets `status: "accepted"` and `acceptedReason` in the findings ledger. The finding will appear in the "Suppressed" count but not in the main findings sections.

To re-open an accepted finding:
```
/smart-test reopen {fingerprint}
```

---

## Tips for All Subagents

1. **Don't just check if things are visible** — check if they're *correct*
2. **Compare browser vs code intent** — the gap is where bugs live
3. **Think like the user role** — a medical student cares about finding their next lesson
4. **Flag inconsistencies, not preferences** — different patterns = finding; different colors = not
5. **Be specific** — "line 47 strips lesson_number" is useful; "API could be better" is not
6. **Use eval for counts** — `playwright-cli eval "document.querySelectorAll('tr').length"`
7. **Session names** — use `playwright-cli -s={ZONE}` to avoid session conflicts
8. **Read before judging** — what looks wrong in the browser might be intentional in code
