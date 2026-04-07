---
name: sweep
description: "Full quality sweep for the Test System: optionally runs /architect (structure), then /heal (code), /glance or /eye (visual), and /scenario (user behavior) in sequence. Four layers, four angles, one clean app. Adapted for vanilla HTML/CSS/JS exam platform."
---

# Sweep — Complete Quality Pass

Four skills. Four layers. One session. The app comes out right on every dimension.

```
/sweep      = /heal → /glance → /scenario              (automated loop)
/sweep full = /architect → /heal → /eye → /scenario     (with structural decisions)
```

---

## Project Context

This is a **vanilla HTML/CSS/JavaScript** exam testing platform with:
- **IELTS Server:** `http://localhost:3002` (`local-database-server.js`)
- **Cambridge Server:** `http://localhost:3003` (`cambridge-database-server.js`)
- **Admin Panel:** `http://localhost:3000` (`admin/server.js`)
- **No TypeScript, no build step** — verification uses `node --check` and browser testing
- **Roles:** Student, Invigilator, Admin

---

## Why Four Layers

Each skill is blind to what the others see:

| Skill | Sees | Blind to |
|-------|------|----------|
| **/architect** | Product structure, page hierarchy, wrong abstractions | Line-level code. Pixels. User behavior. |
| **/heal** | Code patterns, security holes, dead code, duplication | How it looks. How users behave. |
| **/glance** | Visual hierarchy, empty states, spacing, polish | Code quality. Edge case inputs. |
| **/scenario** | What breaks when real users do real things | Code internals. Visual design. |

Running all four is **multiplicative** — /architect moves the walls, /heal fixes the wiring, /glance improves the paint, /scenario proves the doors open.

---

## Invocation

```
/sweep                    # Automated — heal + glance + scenario (no architect)
/sweep full               # Complete — architect (interactive) + heal + eye + scenario
/sweep fast               # 1 round each, speed over thoroughness
/sweep deep               # 3+ rounds each, maximum coverage
/sweep --skip=glance      # Skip visual pass (e.g., backend-only changes)
/sweep --skip=scenario    # Skip scenario testing (e.g., no browser available)
/sweep --only=heal,glance # Run only specified skills
```

---

## The Sequence

### Phase 0: ARCHITECT (Structural Decisions) — `/sweep full` only

```
/architect
```

**Why first:** No point polishing code against the wrong structure. If two server files should be merged or a dashboard should be split, fix that first.

**Runs:** Once. Proposes max 5 ADRs. Waits for user approval. Executes approved decisions.

**Output:** Updated `architect-decisions.md`, committed structural changes.

**Note:** Phase 0 is interactive (requires approval). For fully automated sweeps, use bare `/sweep`.

---

### Phase 1: HEAL (Code Quality)

```
/heal
```

**Why first:** Fix the code before looking at it or testing it. No point screenshotting a page with a security hole.

**Runs until:** No more fixable findings or max rounds reached.

**Verification:** `node --check` for JS files, browser test for HTML.

**Output:** Updated `heal-journal.md`, updated `audit-ledger.json`, committed fixes.

**Transition:** "Code healed: {N} findings fixed, {N} deferred. Moving to visual pass."

---

### Phase 2: EXPERIENCE (Visual + UX Quality)

**Default (`/sweep`):** `/glance` — fast visual polish, surface-level
**Deep (`/sweep deep` or `/sweep full`):** `/eye` — deep experience review, every interaction, rebuilds allowed

| Mode | Skill | Depth | Can rebuild pages? |
|------|-------|-------|--------------------|
| fast/default | /glance | Screenshots only | No — polish only |
| deep/full | /eye | Every click, form, state | Yes — rebuild or polish |

**Output:** Updated journal, committed improvements.

**Transition:** "Experience improved: {N} changes landed. Moving to scenario testing."

---

### Phase 3: SCENARIO (User Behavior)

```
/scenario
```

**Why last:** Code is clean, UI is polished. Now test whether real user behavior breaks anything.

**Key scenarios for this project:**
- Student submitting test with network dropout
- Timer expiring mid-test
- Multiple students submitting simultaneously
- Admin scoring while student is still testing
- Speaking test audio recording failures
- Browser back button during test
- Large audio file upload for speaking tests

**Output:** Updated `scenario-journal.md`, committed fixes.

---

## The Final Report

After all phases:

```markdown
# Sweep Report — {YYYY-MM-DD}

## Phase 1: Heal (Code Quality)
- Rounds: {N}
- Fixed: {N} findings
- Deferred: {N} (need manual work)
- Domains: {security, api, database, architecture, frontend}

## Phase 2: Experience (Visual + UX)
- Skill used: {/glance or /eye}
- Rounds: {N}
- Polishes landed: {N}
- Rebuilds landed: {N}
- Reverted: {N}

## Phase 3: Scenario (User Behavior)
- Rounds: {N}
- Scenarios tested: {N}
- Broke: {N} → Fixed: {N} → Guarded: {N}

## Summary
Total commits: {N}
Total files changed: {N}

## Still Needs Human Attention
{List of deferred items from all phases}
```

---

## Speed Modes

### `/sweep fast`
- /architect: skipped
- /heal: 1 round, CRITICAL+HIGH only
- /glance: 1 round, student persona only
- /scenario: 1 round, top 3 scenarios only

### `/sweep` (default)
- /architect: skipped
- /heal: up to 3 rounds, all severities
- /glance: up to 3 rounds, all personas (student, invigilator, admin)
- /scenario: up to 2 rounds, top 5 scenarios per round

### `/sweep full`
- /architect: full product review, max 5 ADRs, awaits approval
- /heal: up to 3 rounds, all severities
- **/eye**: deep experience review — every page, every interaction, rebuilds allowed
- /scenario: up to 2 rounds, top 5 scenarios per round

### `/sweep deep`
- /architect: full product review + focused reviews per role
- /heal: up to 5 rounds, all severities, all domains
- **/eye**: deep experience — every page, every state, every interaction, rebuilds allowed
- /scenario: up to 3 rounds, all scenario categories

---

## Integration with /loop

```
/loop 1h /sweep fast    # Every hour: heal + glance + scenario (quick)
/loop 8h /sweep deep    # Every 8 hours: comprehensive deep clean
```

Journals prevent repeating work across iterations.

---

## Interruption Handling

If interrupted:
- Current phase completes its round and commits
- Remaining phases logged as "skipped"
- Next `/sweep` picks up where this one left off

---

## When NOT to Use /sweep

- **Mid-feature development** — still writing code, don't sweep yet
- **Before architecture decisions** — /sweep fixes within existing architecture
- **Emergency hotfix** — use /heal targeted or manual fix
- **When only one layer matters** — just use /heal, /glance, or /scenario directly
