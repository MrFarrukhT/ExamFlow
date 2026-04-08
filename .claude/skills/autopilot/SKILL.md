---
name: autopilot
description: "Fully autonomous persona-driven development loop. Define a persona (student, cheater, admin), and the system creates what's missing, restructures what's wrong, heals code, polishes the experience, and stress-tests — all without human intervention. Launch and walk away."
---

# Autopilot — Autonomous Development Engine

You are an autonomous product development engine. You receive a persona. You become that persona. You walk the entire product through their eyes. You identify what's missing, what's broken, what's ugly, and what's fragile. Then you build, fix, polish, and harden — all in one continuous loop.

**Zero human intervention.** Every change gets a checkpoint commit. Git history is the safety net. You make professional judgment calls and execute them. The user reviews the git log later.

---

## Project Context

This is a **vanilla HTML/CSS/JavaScript** exam testing platform:

- **IELTS System:** `http://localhost:3002` — Express server (`local-database-server.js`)
- **Cambridge System:** `http://localhost:3003` — Express server (`cambridge-database-server.js`)
- **Admin Panel:** `http://localhost:3000` — Express server (`admin/server.js`)
- **Frontend:** Static HTML files served directly, JS in `assets/js/`, CSS in `assets/css/`
- **Database:** PostgreSQL (Neon serverless)
- **Roles:** Student, Invigilator, Admin
- **No framework, no build step** — vanilla DOM, files served by Express

---

## Invocation

```
/autopilot                              # Interactive — choose persona
/autopilot ielts student                # IELTS student taking an exam
/autopilot cambridge a2 student         # Cambridge A2 Key student
/autopilot cheater                      # Student trying to cheat/exploit
/autopilot invigilator                  # Invigilator managing a room
/autopilot admin scoring                # Admin scoring submissions
/autopilot admin management             # Admin managing the platform
/autopilot --continue                   # Resume from autopilot-cursor.json
```

### Interactive Menu (no arguments)

```
Who are you today?

── STUDENTS ──
 1. IELTS student — full exam day (launcher → login → all skills → submit)
 2. Cambridge A1 Movers student — young learner taking the test
 3. Cambridge A2 Key student — reading, writing, listening, speaking
 4. Cambridge B1 Preliminary student — intermediate exam
 5. Cambridge B2 First student — upper-intermediate exam
 6. Nervous first-timer — never seen the platform before
 7. Cheater — trying to exploit every weakness

── STAFF ──
 8. Invigilator — managing 20 students in a room
 9. Admin — scoring a batch of submissions
10. Admin — setting up a new exam session
11. Admin — managing student results and reports

── META ──
 0. Full rotation — cycle through all personas automatically
```

---

## The Autopilot Loop

```
REPEAT until context runs low or no improvements remain:

  ┌─────────────────────────────────────────┐
  │  PHASE 1: BECOME THE PERSONA            │
  │  Map their complete journey.             │
  │  What do they need? What exists?         │
  │  What's MISSING?                         │
  └──────────────────┬──────────────────────┘
                     │
  ┌──────────────────▼──────────────────────┐
  │  PHASE 2: CREATE WHAT'S MISSING         │
  │  Build features, pages, flows that      │
  │  this persona needs but don't exist.    │
  │  This is the creation pass.             │
  └──────────────────┬──────────────────────┘
                     │
  ┌──────────────────▼──────────────────────┐
  │  PHASE 3: RESTRUCTURE (architect)       │
  │  If the structure is wrong for this     │
  │  persona's journey, fix it.             │
  │  Skip if structure is sound.            │
  └──────────────────┬──────────────────────┘
                     │
  ┌──────────────────▼──────────────────────┐
  │  PHASE 4: HEAL (code quality)           │
  │  Fix code issues in the persona's       │
  │  journey. Security, API, database.      │
  └──────────────────┬──────────────────────┘
                     │
  ┌──────────────────▼──────────────────────┐
  │  PHASE 5: EXPERIENCE (eye)              │
  │  Walk every page as this persona.       │
  │  Polish, rebuild, or elevate.           │
  └──────────────────┬──────────────────────┘
                     │
  ┌──────────────────▼──────────────────────┐
  │  PHASE 6: STRESS TEST (scenario)        │
  │  Attack the persona's flows.            │
  │  What breaks? Fix and guard.            │
  └──────────────────┬──────────────────────┘
                     │
  ┌──────────────────▼──────────────────────┐
  │  PHASE 7: JOURNAL & LOOP                │
  │  Log everything. Advance cursor.        │
  │  Pick next persona or deepen current.   │
  └─────────────────────────────────────────┘
```

---

## Phase 1: BECOME THE PERSONA

### Map Their Complete Journey

For the chosen persona, answer every question:

1. **Who are they?** Age, technical skill, emotional state, goal.
2. **What's their complete journey?** Every page, every click, start to finish.
3. **What do they expect to see?** At each step, what would a well-designed product show them?
4. **What actually exists?** Walk the codebase — read the HTML, JS, CSS for their journey.
5. **What's the gap?** List everything that SHOULD exist but DOESN'T.

### Persona Examples

**"IELTS Student — Full Exam Day"**
```
Journey: Open launcher → Enter name/ID → Select mock → Start reading → 
         Answer questions → Timer warns → Submit → Start writing → 
         Write essays → Submit → Start listening → Play audio → 
         Answer → Submit → See results? → Leave
         
Expectations: Clear instructions, smooth transitions, answer persistence,
              timer visibility, confidence they won't lose work, 
              clear submission confirmation
              
Gaps to check: Is there a results page? Is there a "you're done" screen?
               Can they review answers before submitting? 
               Is there a practice mode?
```

**"Cheater"**
```
Journey: Open DevTools → Inspect timer → Try to manipulate → 
         Open second tab → Try parallel submission → 
         Try URL manipulation → Try to access other students' data →
         Try to submit after deadline → Try to modify scores
         
Expectations (of the platform): Block all of these. Log attempts.
                                 Alert the invigilator.
```

### Output: Journey Map + Gap List

```markdown
## Persona: {name}
Journey: {step → step → step}

### What Exists
- ✅ {feature/page that works}
- ✅ {feature/page that works}

### What's Missing (Creation Targets)
- ❌ {feature/page that should exist} — Priority: {HIGH/MEDIUM/LOW}
- ❌ {feature/page that should exist} — Priority: {HIGH/MEDIUM/LOW}

### What's Broken (Fix Targets)
- 🔧 {issue} — Severity: {CRITICAL/HIGH/MEDIUM}

### What's Ugly (Polish Targets)
- 🎨 {visual/UX issue}

### What's Fragile (Harden Targets)
- 💥 {scenario that could break}
```

---

## Phase 2: CREATE WHAT'S MISSING

This is the phase no other skill has. You don't just fix what exists — you build what should exist.

### Before creating anything:
```bash
git add -A && git commit -m "autopilot: checkpoint before creation phase — {persona}"
```

### Creation Principles

1. **Match existing patterns** — Read similar pages/features before building. New HTML should look like existing HTML. New JS should follow existing module patterns.
2. **Minimal viable feature** — Build the thing that matters, not the perfect version. A simple "exam complete" page is better than no page.
3. **Wire it in** — New pages must be linked from navigation. New API endpoints must be called from the frontend. Don't create orphans.
4. **Verify it works** — `node --check` for JS, open in browser for HTML.

### What Gets Created

For this project, common creation targets:

| Gap | What to Build |
|-----|---------------|
| No "exam complete" confirmation | A clean completion page with summary |
| No answer review before submit | A review modal/page showing all answers |
| No practice mode | A flag in the launcher that runs a mini test |
| No progress indicator | Visual progress bar in the test interface |
| Missing empty states | Proper messaging when no data exists |
| No error recovery guidance | User-friendly error pages with next steps |
| Missing admin feature | New admin page/section for the workflow |
| Incomplete flow | The missing step in a multi-step process |

### For each creation:

1. **Read similar existing pages** — understand the patterns
2. **Build it** — HTML + CSS + JS following existing conventions
3. **Wire it in** — add links, navigation, API calls
4. **Verify:**
   ```bash
   node --check {new-js-file} 2>&1
   ```
5. **Commit:**
   ```bash
   git add -A && git commit -m "autopilot: create {feature} for {persona} journey"
   ```

### Creation Quality

- Use existing CSS classes from `assets/css/`
- Use inline `<style>` for page-specific styles if needed
- Use vanilla JS — no framework imports
- Match the visual language of existing pages
- Include proper `<title>`, meta tags, and script imports

---

## Phase 3: RESTRUCTURE (if needed)

Look at the persona's journey across the codebase. Is the structure right?

### Quick structural check:
- Are the files for this journey organized logically?
- Is there duplication that makes changes harder?
- Are there god files that should be split?
- Is the navigation architecture right for this persona?

**If structure is sound:** Skip this phase. Log "Structure OK for {persona}."

**If structure needs work:** Execute the architect pattern:
1. Identify max 3 structural decisions relevant to this persona
2. Checkpoint commit
3. Execute each sequentially
4. Verify syntax
5. Commit each

```bash
git add -A && git commit -m "autopilot: restructure — {what changed}"
```

---

## Phase 4: HEAL (Code Quality)

Focus the heal pass on the persona's journey — not the entire codebase.

### Scope the scan to this persona's files:
- The HTML pages they visit
- The JS modules those pages load
- The server endpoints those pages call
- The CSS those pages use

### Run the heal pattern:
1. Scan for issues in those files only
2. Rank top 5 fixable findings
3. Fix sequentially (not in worktrees — directly on main)
4. Verify with `node --check`
5. Commit:
   ```bash
   git add -A && git commit -m "autopilot: heal — {summary}"
   ```

---

## Phase 5: EXPERIENCE (Eye)

Walk every page in the persona's journey. Use playwright-cli to screenshot and interact.

### The eye pattern, focused on this persona:
1. **Open the app** at the persona's entry point
2. **Walk every page** they would visit, in order
3. **Screenshot every state** — initial, filled, error, empty, submitted
4. **Judge each page:** Polish, Rebuild, or Elevate?
5. **Make changes** directly (not via worktrees)
6. **Verify** with another screenshot
7. **Commit:**
   ```bash
   git add -A && git commit -m "autopilot: eye — {summary}"
   ```

---

## Phase 6: STRESS TEST (Scenario)

Attack the persona's flows. Think like an adversary version of this persona.

### The scenario pattern, focused on this persona:
1. **Identify 5-8 scenarios** specific to this persona's journey
2. **Execute** — curl for API tests, browser for behavioral
3. **Fix what breaks** — directly, sequentially
4. **Commit:**
   ```bash
   git add -A && git commit -m "autopilot: scenario — {summary}"
   ```

---

## Phase 7: JOURNAL & ADVANCE

### Update autopilot-journal.md

```markdown
# Autopilot Journal

## Session: YYYY-MM-DD HH:mm
Persona: {who}
System: {IELTS / Cambridge / Both}

### Phase 1: Journey Map
- Gaps identified: {N}
- Creation targets: {list}

### Phase 2: Creation
- Built: {N} new features/pages
- {feature} — committed as {hash}

### Phase 3: Structure
- Decisions: {N} (or "Skipped — structure sound")
- {decision} — committed as {hash}

### Phase 4: Heal
- Fixed: {N} findings
- Deferred: {N}

### Phase 5: Experience
- Pages improved: {N}
- Mode: {polish/rebuild/elevate per page}

### Phase 6: Scenario
- Tested: {N} scenarios
- Broke: {N} → Fixed: {N}

### Session Stats
Total commits: {N}
Total files changed: {N}
Persona journey coverage: {percentage or list}
```

### Update autopilot-cursor.json

```json
{
  "lastRun": "YYYY-MM-DD HH:mm",
  "lastPersona": "ielts-student",
  "completedPersonas": ["ielts-student", "cambridge-a2-student"],
  "currentRotation": 3,
  "totalSessions": 5,
  "stats": {
    "featuresCreated": 8,
    "structuralDecisions": 3,
    "codeHealed": 15,
    "experienceImprovements": 22,
    "scenariosTested": 40,
    "totalCommits": 88
  }
}
```

---

## Full Rotation (Persona 0)

When running full rotation or via `/loop`:

1. Read `autopilot-cursor.json`
2. Pick the next persona in sequence (or the least-covered one)
3. Run the full loop for that persona
4. Advance the cursor
5. If context remains, pick next persona

### Rotation Order (optimized)
1. IELTS student (core journey)
2. Cambridge A2 Key student (most used Cambridge level)
3. Admin scoring (critical workflow)
4. Invigilator (room management)
5. Cheater (security hardening)
6. Cambridge B1 student
7. Cambridge B2 student
8. Cambridge A1 student
9. Admin management
10. Nervous first-timer (onboarding/UX)

---

## Integration with /loop

```
/loop 30m /autopilot --continue    # Every 30 min, continue rotation
/loop 1h /autopilot ielts student  # Every hour, deepen IELTS student experience
```

Each iteration is self-contained. Reads cursor fresh, reads journal to avoid repeating work.

---

## Sequential Execution — No Worktrees

All work happens on the current branch, sequentially. No worktrees. No parallel code changes.

**Why:**
- More reliable than worktree merges
- Checkpoint commits give the same safety as branches
- No merge conflicts, no state drift
- Simpler to review in git log

**Subagents are fine for:**
- READ-ONLY research (reading code, exploring codebase)
- Generating plans/analysis

**Subagents are NOT used for:**
- Making code changes (do it yourself, sequentially)
- Committing (only you commit)

---

## The Key Difference

| Skill | Does |
|-------|------|
| /heal | Fixes what's broken in code |
| /eye | Improves what exists visually |
| /scenario | Tests what could break |
| /architect | Restructures what's wrong |
| **/autopilot** | **All of the above + builds what's missing, driven by a persona's complete journey** |

The creation phase is what makes /autopilot unique. Other skills operate on what exists. /autopilot also identifies and builds what should exist but doesn't.

---

## When to Use

- **Starting a new work session** — `/autopilot` with the persona most relevant to current priorities
- **Overnight/unattended runs** — `/loop 30m /autopilot --continue` for continuous improvement
- **Before a client demo** — `/autopilot {client's persona}` to ensure their journey is complete
- **After major changes** — `/autopilot 0` to verify all personas still have complete journeys
- **When you don't know what to work on** — `/autopilot` will find the highest-value work

---

## Stopping Conditions

Stop the current session when:
- **Context window is running low** — commit what you have, cursor saves progress
- **No improvements found** in the current phase — move to next phase
- **All phases complete** for this persona — advance to next persona or stop
- **Server is down** and can't be restarted — log and stop

Never stop mid-change. Always commit or revert before stopping.
