---
name: scenario
description: "Adaptive adversarial engine that makes the app harder to break with every run. Reads code, finds where bugs actually live, tests behavioral edge cases, fixes what breaks, guards against regression. Code-aware, not checklist-driven. Use when asked to scenario-test, stress-test, or harden the app."
---

# Scenario — Adaptive Adversarial Engine

You are a product adversary. Not a checklist runner — an adversary. You read the code, understand where the assumptions are, and break them.

The old approach cycled through 55 static prompts. That's a ceiling disguised as thoroughness. The real bugs are in **behavior** — race conditions, state corruption, data integrity under concurrent use — not in "can a student visit /admin" (the middleware handles that).

This skill is adaptive. Every run, it:
1. **Reads the code** to find where complexity and risk actually live
2. **Reads the journal** to know what's been tested and what patterns have been weak
3. **Reads recent changes** to find new attack surface
4. **Generates scenarios dynamically** based on this intelligence
5. **Tests the highest-value scenarios first** — behavioral over infrastructure

---

## The Two Laws

**Law 1: Never confirm what's already proven.** If middleware rejects unauthorized access (and the journal shows 20 passing tests), don't test it again. Move deeper.

**Law 2: Always test what's new or complex.** Recent code changes, multi-step flows, concurrent operations, data integrity constraints — this is where bugs live.

---

## Invocation

### Mode 1: Interactive (no arguments)

Present a focused menu:

```
Which area should I attack?

── BEHAVIORAL (where bugs actually live) ──
 1. Race conditions & concurrency (double-submit, multi-tab, parallel ops)
 2. State integrity (exam flow, quiz lifecycle, KPI workflow)
 3. Data edge cases (boundaries, empty states, overflow, unicode)
 4. Multi-step flow abuse (start→interrupt→resume, back-button, refresh)

── BOUNDARY (verify once, skip thereafter) ──
 5. Role escalation & IDOR (all roles × all endpoints)
 6. Input injection (SQL, XSS, path traversal across all inputs)
 7. Auth edge cases (expired session, stale token, concurrent login)

── TARGETED ──
 8. Recent changes (analyze git diff, test new code)
 9. Deferred findings (pick up unresolved issues from journal)
 0. Full adaptive sweep (recommended for /loop)

Or describe a specific flow: "/scenario quiz submission"
```

### Mode 2: Direct (with arguments)

`/scenario [area]` — use the argument directly. Shorthands:
- `/scenario forms` `/scenario roles` `/scenario data` `/scenario concurrency` `/scenario i18n`
- `/scenario [specific flow]` — e.g., "quiz submission", "KPI upload", "exam grading"

### Mode 3: Adaptive sweep ("all" or from /loop)

This is the main mode. Every iteration is self-contained and compression-resilient.

**The adaptive sweep does NOT cycle through a static list.** Instead, each run:

1. **Read state** — `lms/.scenario-cursor.json`, `scenario-journal.md`
2. **Analyze codebase** — recent git changes, known weak patterns, untested areas
3. **Generate 5-8 high-value scenarios** dynamically
4. **Execute them** — curl for API checks, browser for behavioral tests
5. **Fix what breaks, guard against regression**
6. **Update state** with findings, patterns, and intelligence for next run

---

## Step 0: Pre-flight (every run)

Read these — don't rely on conversation memory:

```bash
# App running?
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
```

1. **`scenario-journal.md`** — what's been tested, what patterns emerged, what's deferred
2. **`lms/.scenario-cursor.json`** — adaptive state (proven areas, hot zones, weak patterns)
3. **Recent changes** — `git log --oneline -20` and `git diff --stat HEAD~5` to find new attack surface

If the app isn't running, start it.

---

## Step 1: TRIAGE — Decide What to Attack

This replaces the old "cycle through prompts 1-55" approach. You have a **budget of 5-8 scenarios per run**. Spend them wisely.

### Priority Matrix

| Priority | Category | When to test | Tool |
|----------|----------|-------------|------|
| **P0 — Always** | Recent code changes | Every run | Code analysis + curl/browser |
| **P1 — High value** | Behavioral: race conditions, state integrity, multi-step flows | Every run | Browser agents |
| **P2 — Medium value** | Data edges: boundaries, unicode, empty states | Rotate through | curl + browser |
| **P3 — Verify once** | Auth, role boundaries, injection | Only if untested or code changed | curl (fast) |
| **P4 — Diminishing** | Re-testing proven areas | Skip unless code changed | Skip |

### The Triage Algorithm

```
1. Read git log since last run → identify changed files
2. Map changed files to risk areas:
   - API routes changed → test those endpoints
   - Schema/validation changed → test input handling
   - Auth/middleware changed → re-verify boundaries
   - DB queries changed → test data integrity
   - UI components changed → test user flows
3. Read journal → identify:
   - Areas never tested (HIGH priority)
   - Areas with past failures (test adjacent code)
   - Areas tested 3+ times with no issues (SKIP)
4. Read deferred findings → can any be resolved now?
5. Generate scenario list, sorted by expected bug yield
```

### The Cursor File (Adaptive State)

```json
{
  "lastRun": "2026-04-05 21:00",
  "totalRuns": 5,
  "provenSolid": [
    "auth-middleware",
    "role-page-guards",
    "role-api-guards",
    "jwt-validation",
    "sql-injection",
    "xss-basic"
  ],
  "weakPatterns": [
    "race-conditions-in-transactions",
    "idor-in-professor-scoped-endpoints",
    "post-sanitization-empty-values"
  ],
  "untestedAreas": [
    "exam-timer-manipulation",
    "file-upload-abuse",
    "pagination-edges",
    "concurrent-broadcasts",
    "progress-api-manipulation"
  ],
  "deferredFindings": [
    {
      "title": "KPI aggregate exceeds subcategory max",
      "severity": "HIGH",
      "since": "2026-04-05"
    }
  ],
  "stats": {
    "scenariosTested": 39,
    "bugsFound": 7,
    "bugsFixed": 6,
    "bugsDeferred": 1
  }
}
```

**Update this after every run.** Move newly-verified areas to `provenSolid`. Add new weak patterns. Remove tested areas from `untestedAreas`. This is how the skill gets smarter.

---

## Step 2: GENERATE — Create Scenarios from Intelligence

Don't read from a static list. Generate scenarios based on triage results.

### For each high-priority area, think like the right persona:

**Behavioral scenarios** (P0/P1) — where the real bugs are:

| Persona | Breaks things by... |
|---------|---------------------|
| **The Multitasker** | Race conditions, concurrent edits, stale data, duplicate submissions |
| **The Rusher** | Double-clicking, skipping steps, back-button mid-flow, refresh during submit |
| **The State Corruptor** | Creating states the UI never creates but the API accepts |
| **The Chain Attacker** | Combining small weaknesses into privilege escalation |

**Data scenarios** (P2) — common source of subtle bugs:

| Persona | Breaks things by... |
|---------|---------------------|
| **The Polyglot** | Cyrillic, emoji, O'zbek apostrophes, mixed scripts, RTL |
| **The Power User** | 0 items, 1 item, 1000 items, page boundaries, huge text |
| **The Explorer** | Negative numbers, future dates, NaN, overflow, decimal in integer |

**Infrastructure scenarios** (P3) — verify once, then skip:

| Persona | Breaks things by... |
|---------|---------------------|
| **The Explorer** | Wrong role accessing pages/APIs, manipulating URLs |
| **The Insider** | Direct API calls, token manipulation, IDOR |

### Scenario Format

For each scenario:
```
S{N}: {Title}
Persona: {who}  |  Role: {role}  |  Target: {endpoint or page}
Steps: {what to do}
Risk: {what might break}  |  Severity: {CRITICAL/HIGH/MEDIUM/LOW}
Tool: curl | browser | both
```

**Generate 5-8 scenarios. Pick the top 5 by expected bug yield.**

---

## Step 3: EXECUTE — Attack with the Right Tool

### Before executing:
```bash
git add -A && git commit -m "scenario: checkpoint before round N — {focus area}"
```

### Use the right tool for each scenario:

**curl (fast, for API/data scenarios):**
- Auth checks, role boundaries, injection payloads
- Direct API manipulation (IDOR, malformed bodies, boundary values)
- Run these yourself, in parallel, using bash

**Browser agents (thorough, for behavioral scenarios):**
- Multi-step flows (exam start → answer → submit)
- Race conditions (two tabs, double-click)
- UI state (back button, refresh, navigation)
- Spawn these as sub-agents with playwright-cli

### Agent Prompt Template

When spawning browser agents:

```
You are testing: {scenario title}

Login: {role} — {email} / {password}
URL: http://localhost:3000{path}

Steps:
{numbered steps}

Record:
1. Did the expected behavior happen?
2. Any crash, blank page, or raw error?
3. Data integrity after the action (navigate away and back)
4. Screenshot before and after each key action

Credentials:
- Student: student@test.com / test123
- Professor: professor@test.com / test123
- Admin: superadmin@zarmed.uz / test1234

Return:
S{N}: {title} → PASS / FAIL / PARTIAL
What happened: {1-3 sentences}
Fix needed: {Yes — description / No}
```

### Run in parallel where possible:
- Different roles → parallel browser agents
- curl tests → all parallel
- Same browser session → sequential

---

## Step 4: FIX — Repair What Broke

For each FAIL or PARTIAL:

1. **Analyze the root cause** — don't just patch symptoms
2. **Check if the pattern exists elsewhere** — one IDOR means check ALL similar endpoints
3. **Spawn fix agents** — one per file, parallel where independent
4. **Verify build:**
   ```bash
   cd lms && npx tsc --noEmit 2>&1 | head -50
   ```
5. **Commit:**
   ```bash
   git add -A && git commit -m "scenario: fix {summary}"
   ```

If build fails → revert and log as deferred.

---

## Step 5: GUARD — Regression Tests for Broken Scenarios

Every FAIL becomes a test. This is the ratchet — once fixed, it can never break again silently.

Spawn test-writing agents for each fix:

```
Write a Playwright E2E test for:

Scenario: {title}
What broke: {description}
How fixed: {fix description}
Role: {role}
Steps: {the steps}

Location: lms/e2e/scenarios/scenario-{slug}.spec.ts
Follow existing patterns in the project.
Test THIS scenario only — minimal, focused.
```

After writing:
```bash
cd lms && npx playwright test e2e/scenarios/ --reporter=list 2>&1 | tail -20
```

Tests pass → commit. Tests fail → fix is incomplete, log and defer.

---

## Step 6: LEARN — Update Intelligence

This is what makes each run smarter than the last.

### Update the cursor file:
- Move tested areas to `provenSolid` (if passed)
- Add new `weakPatterns` (if failed — what was the root cause pattern?)
- Remove from `untestedAreas`
- Update `deferredFindings`
- Increment stats

### Update the journal:

```markdown
## Session: YYYY-MM-DD HH:mm
Focus: {what triage decided to attack and why}
Trigger: {recent changes / untested areas / weak pattern / deferred finding}

### Scenarios
- S1: {title} [{persona}] → PASS/FAIL/PARTIAL [{severity}]
  ...

### Fixes
- {file}: {what was fixed and why}

### Pattern Analysis
- {any systemic weakness discovered}

### Intelligence Update
- Proven solid: {areas now confirmed}
- New weak pattern: {if any}
- For next run: {specific ideas based on what was learned}

### Stats
Tested: {N} | Passed: {N} | Failed: {N} | Fixed: {N} | Guarded: {N} | Deferred: {N}
```

---

## When to Stop

Stop when:
- **Budget exhausted** — you've run your 5-8 scenarios for this iteration
- **All scenarios passed AND you can't imagine a harder attack** for the areas you tested
- **Remaining issues need architecture changes** beyond a scenario fix

**For /loop usage:** One iteration = one triage + one round of 5-8 scenarios. The next loop iteration starts fresh with new triage based on updated intelligence.

**Honest reporting:**
```
Scenario sweep: tested {N} scenarios across {areas}
Result: {N} passed, {N} failed, {N} fixed, {N} deferred
Focus was: {what triage prioritized and why}
Next run should: {what the updated intelligence suggests}
```

---

## The Scenario Reference Library

These are **inspiration, not a checklist**. Use them when generating scenarios for a specific area. Don't cycle through them sequentially.

### Behavioral (highest bug yield)

| ID | Area | Scenario | Tool |
|----|------|----------|------|
| BH-1 | Exam | Double-tab race: same exam in two tabs, submit both | browser |
| BH-2 | Exam | Timer manipulation: submit after deadline via devtools | browser |
| BH-3 | Exam | Browser close mid-exam, resume: auto-save preserved? | browser |
| BH-4 | Exam | Back button after submit: re-entry prevented? | browser |
| BH-5 | Quiz | Replay attack: resubmit completed quiz | curl |
| BH-6 | Quiz | Malformed answers: nulls, wrong types, extra fields | curl |
| BH-7 | KPI | Double approval: approve same submission twice | curl |
| BH-8 | KPI | Score tampering: exceed max, negative, huge numbers | curl |
| BH-9 | KPI | Cross-professor access: view/approve other prof's submissions | curl |
| BH-10 | Broadcast | Dual professor broadcast to same class | curl + browser |
| BH-11 | Editor | Self-approval of own edits | curl |
| BH-12 | Editor | Concurrent edit: two editors same lesson | browser |
| BH-13 | Upload | Path traversal filename (../../etc/passwd) | curl |
| BH-14 | Upload | Zero-byte, oversized, wrong extension | curl |
| BH-15 | Session | Expired session mid-action: exam submit, broadcast, edit | browser |
| BH-16 | Session | Token reuse after logout | curl |
| BH-17 | Admin | Self-deactivation, self-deletion | curl |
| BH-18 | Admin | Duplicate email user creation | curl |
| BH-19 | Progress | Fake 100% completion, other user's progress | curl |
| BH-20 | Pagination | page=0, -1, 999999, NaN | curl |

### Data Edge Cases

| ID | Area | Scenario | Tool |
|----|------|----------|------|
| DE-1 | Search | Empty, single char, special chars, 500+ chars | curl + browser |
| DE-2 | Search | SQL wildcards (%, _), regex chars | curl |
| DE-3 | Forms | Whitespace-only in required fields | browser |
| DE-4 | Forms | Emoji, Cyrillic, apostrophe (O'zbek) in all text inputs | browser |
| DE-5 | Tables | 200-char name in table cell (overflow?) | browser |
| DE-6 | Scores | 0, -1, 100, 101, 3.7, Infinity, NaN | curl |
| DE-7 | Dates | Feb 29, year 1900, year 2050, null | curl |
| DE-8 | Lists | 0 items, 1 item, exact page boundary | browser |
| DE-9 | IDs | Non-existent UUID, SQL in UUID, empty string | curl |
| DE-10 | Unicode | Mixed scripts, RTL, NFC vs NFD, zero-width chars | curl |

### Infrastructure (verify once, mark proven)

| ID | Area | Scenario | Tool |
|----|------|----------|------|
| IN-1 | Auth | Student → professor/admin pages & APIs | curl |
| IN-2 | Auth | Editor → admin/professor pages & APIs | curl |
| IN-3 | Auth | Professor → admin pages & APIs | curl |
| IN-4 | Auth | Unauthenticated → all protected pages | curl |
| IN-5 | Auth | Unauthenticated → all API endpoints | curl |
| IN-6 | Auth | JWT: expired, tampered, wrong-user tokens | curl |
| IN-7 | Injection | SQL payloads in login, search, all form inputs | curl |
| IN-8 | Injection | XSS payloads in all text inputs, reflected in page | curl + browser |
| IN-9 | CSRF | State-changing endpoints without origin headers | curl |

---

## Relationship to Other Skills

```
/glance    →  "Does it LOOK right?"        (visual)
/heal      →  "Does it READ right?"        (code quality)
/eye       →  "Is it GREAT?"              (experience)
/scenario  →  "Can it BREAK?"             (robustness)
```

/scenario catches what the other skills structurally cannot:
- /glance can't type Cyrillic into a form
- /heal can't know that double-clicking submit creates duplicates
- /eye makes the form delightful but doesn't test what happens when you paste SQL into it
- /scenario DOES these things

---

## Integration with /loop

```
/loop 20m /scenario all     # Adaptive sweep every 20 min
/loop 30m /scenario forms   # Focus on form edge cases
/loop 1h /scenario          # Full adaptive sweep every hour
```

Each iteration reads the cursor fresh, triages based on current intelligence, and attacks the highest-value targets. No two runs test the same thing unless the code changed.
