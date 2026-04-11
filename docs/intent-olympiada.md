---
name: Intent Plan — Zarmet Olympiada (Standalone)
description: Standalone C1 English + German Olympiada app, Reading+Listening only, crash-safe rotation across machines
type: project
---

# Intent Plan: Zarmet Olympiada (Standalone)

**Date:** 2026-04-11
**Client/Stakeholder:** Project owner
**Status:** APPROVED (2026-04-11)

---

## Vision

A tiny, bulletproof standalone test app for the Zarmet University Olympiada. Two tests only — English C1 and German C1 — Reading and Listening. A student sits down, enters their name, takes the test, walks away. **Zero data loss, even on power cut or crash.** The current Cambridge-embedded Olympiada hack gets deleted once this is proven.

---

## Goals

1. **Separate the Olympiada from Cambridge.** Cambridge is a serious platform; the Olympiada isn't. Coupling them makes both worse.
2. **Radical simplicity.** No writing, no speaking, no unanswered-counters, no post-submit breakdowns. Just take the test and finish.
3. **Absolute durability of student answers.** Local SQLite + auto JSON file backups + optional Postgres mirror. Three independent layers. If two fail, the third still has the data.
4. **Machine-rotation-safe.** One machine may host several students in sequence. Previous student data must persist on disk and must never leak into the next student's session.

---

## Scope

### In scope
- New standalone folder: `zarmet-olympiada/` at repo root
- Tiny Node.js/Express server (one file) on its own port (e.g., 3004) — no sharing code with Cambridge/IELTS servers
- Two test types: **English C1** and **German C1**
- Two skills per test: **Reading**, **Listening**
- Audio playback for Listening (local files, no streaming)
- Question banks transcribed from [cae/](cae/) and [Nemis tili/](Nemis%20tili/) source material into structured JSON
- Local SQLite database (single file, lives next to the server)
- JSON file backup of every submission written atomically to `zarmet-olympiada/backups/`
- Live answer persistence (every answer change hits SQLite + localStorage, not just on submit)
- Optional mirror upload to existing Cambridge Postgres (best-effort, never blocks local save)
- Simple results viewer (one HTML page that lists all submissions from the local DB)
- One `.bat` launcher: `Launch Zarmet Olympiada.bat` (replaces the current one)
- Rip-out of existing Cambridge Olympiada hooks — **after** the new app is proven on a real dry run

### Explicitly out of scope
- Writing section
- Speaking section
- Unanswered-question indicators during the test
- Post-submission score screens / breakdown for the student
- A1/A2/B1/B2 levels
- Any integration into `launcher.html`, `index.html`, Cambridge dashboard, or IELTS system
- Reusing `assets/js/core.js` or other shared Cambridge/IELTS frontend code
- Multi-user server (it's one student per machine; rotation is sequential, not concurrent)
- Authentication beyond "type your name" — the invigilator is the auth layer
- Mobile/responsive design beyond "it works on the lab desktops"

---

## Plan

### Priority 1: Question bank transcription
**What:** Convert the source material in [cae/](cae/) (.docx + mp3) and [Nemis tili/](Nemis%20tili/) (.pdf + m4a + answers.docx) into structured JSON question banks stored in `zarmet-olympiada/content/`.

Structure:
```
zarmet-olympiada/content/
  english-c1/
    reading.json          # parts, passages, questions, answer keys
    listening.json        # parts, questions, answer keys, audio refs
    audio/
      part1.mp3
      part2.mp3 ...
  german-c1/
    reading.json
    listening.json
    audio/
      part1.m4a ...
```

**Why:** Clean UX, one source of truth, easy to version-control, easy for the server to serve, easy for the client to render. Avoids the Cambridge pattern of one HTML file per mock which is a pain to maintain.

**Acceptance criteria:**
- [ ] English C1 Reading fully transcribed from `Advanced reading practice.docx` with correct answer keys
- [ ] English C1 Listening fully transcribed from `CAE Practice test listening.docx` with audio file(s) copied and referenced
- [ ] German C1 Reading fully transcribed from `Reading.pdf` with answer keys from `answers.docx`
- [ ] German C1 Listening fully transcribed from `Listening.pdf` with four audio parts referenced and answer keys from `answers.docx`
- [ ] Each question has a stable ID so answer persistence is robust across reloads
- [ ] JSON schema is identical across English and German so the frontend stays generic

**Execution:** /architect (decides JSON schema) → manual transcription (Claude reads the source files and writes the JSON)
**Estimated scope:** Medium

---

### Priority 2: Minimal server + durable storage
**What:** One Express server file (`zarmet-olympiada/server.js`) that:
- Serves static HTML/CSS/JS from `zarmet-olympiada/public/`
- Serves the question banks (without answer keys to the client — only correct answers stay server-side)
- Accepts answer-save pings (one per answer change) and writes to SQLite + localStorage is the frontend mirror
- Accepts submission finalization and:
  1. Commits final row in SQLite
  2. Writes atomic JSON backup file to `zarmet-olympiada/backups/YYYY-MM-DD_studentname_lang.json`
  3. Best-effort POSTs to Cambridge Postgres mirror table (non-blocking — failure is logged, never blocks student)
- Exposes a read-only results endpoint for the admin viewer

**Why:** SQLite is zero-config, battle-tested, single-file, backup-friendly. The JSON per-submission backup means even if SQLite corrupts, every completed test is also a plain text file. The Postgres mirror is a third belt.

**Acceptance criteria:**
- [ ] Server starts from the launcher .bat, stays on port 3004
- [ ] Answers persist on every change, not just on submit (tested by killing server mid-test and reloading)
- [ ] Crash test: kill server process mid-test, relaunch, student's answers are still there
- [ ] Submission writes SQLite row AND JSON backup file atomically; failure of Postgres mirror does NOT cause student-visible error
- [ ] No correct answers ever leak to the client (inspect network tab during test)
- [ ] SQLite file lives in `zarmet-olympiada/data/olympiada.db`, committed to .gitignore
- [ ] Backups folder is gitignored but auto-created on first run

**Execution:** /architect → manual implementation
**Estimated scope:** Medium

---

### Priority 3: Super-simple student interface
**What:** Three pages, period:

1. **`index.html`** — Welcome / student entry
   - Zarmet logo/header
   - Fields: Full name, group/class (optional), language selector (English C1 / German C1)
   - One big "Start" button
   - Previous student's data is visibly cleared on this page load (rotation safety)

2. **`test.html`** — The test itself
   - Skill-aware: shows Reading first, then Listening, no section selection
   - Question navigation: simple numbered buttons, no "X unanswered" counter
   - Timer in corner (plain, no alarms, no color changes)
   - Audio player for Listening with limited plays as per standard C1 rules (configurable in content JSON)
   - One "Finish test" button at the end — confirmation is a single dialog: "Finish the test? You can't come back." No scorecard, no count of answered/unanswered.

3. **`done.html`** — Thank you screen
   - "Your test has been submitted. Please wait for your invigilator."
   - No score, no breakdown, no anything
   - Auto-redirects back to `index.html` after N seconds (rotation), OR requires the invigilator to click a hidden-corner button — **decide in architect phase**

**Why:** The client explicitly said: super simple, no unanswered indicators, no post-submit counts, no clutter. The fewer moving parts the student sees, the fewer bug reports and the less stress during a real event.

**Acceptance criteria:**
- [ ] Entire frontend is under 5 files: `index.html`, `test.html`, `done.html`, one CSS, one JS
- [ ] No dependency on `assets/js/core.js`, no reuse of Cambridge CSS
- [ ] No "unanswered: N" counter anywhere in the DOM
- [ ] No score display on `done.html` or in any response
- [ ] Rotation test: finish a test, land on done, return to index — no leftover data visible, new student can start fresh
- [ ] Keyboard-navigable (Tab, Enter, number keys to pick answers)

**Execution:** /architect → manual implementation → /eye for polish pass at the end
**Estimated scope:** Medium

---

### Priority 4: Local admin / results viewer
**What:** One HTML page, `admin.html`, behind a trivial password prompt (hardcoded in server env — not real auth, just "don't accidentally show this to a student"). Shows a table of all submissions from the local SQLite: name, language, skill, start time, finish time, raw answers, auto-computed score. Export button dumps everything as JSON or CSV.

**Why:** The client chose "all options" for results — so in addition to the .json files on disk, there's also a local DB and a clickable view. After the exam, the invigilator opens `admin.html`, sees everything, exports, done.

**Acceptance criteria:**
- [ ] Password gate (simple, server-checked)
- [ ] Table lists every row in SQLite with all columns
- [ ] Click a row → see the student's full answer sheet next to the correct answers
- [ ] "Export all JSON" and "Export all CSV" buttons work
- [ ] Reading from `backups/` folder as a fallback if SQLite is unavailable

**Execution:** manual implementation
**Estimated scope:** Small

---

### Priority 5: Launcher and dry-run verification
**What:** A new `Launch Zarmet Olympiada.bat` that:
1. Starts `zarmet-olympiada/server.js` in a minimized window
2. Waits for port 3004 to be ready
3. Opens Chrome in kiosk/app mode pointed at `http://localhost:3004/`

Plus a manual dry run: take both the English C1 and German C1 tests end-to-end as a student, kill the server mid-test at least twice, verify zero data loss each time.

**Why:** No amount of code review replaces sitting down and actually using the app. And the rip-out of the old Olympiada can't happen until we've seen the new one survive real use.

**Acceptance criteria:**
- [ ] Launcher starts the server cleanly on a machine with just Node installed
- [ ] Full English C1 test completes end-to-end with answers in SQLite + JSON backup
- [ ] Full German C1 test completes end-to-end with answers in SQLite + JSON backup
- [ ] Two crash tests during the test — both recover with all answers intact
- [ ] Rotation test — second student starts fresh on the same machine, first student's data is still in DB, not visible in UI

**Execution:** /eye (as the student persona) + /scenario (to break it)
**Estimated scope:** Small

---

### Priority 6: Rip out old Cambridge Olympiada hooks
**What:** Remove all Olympiada-related code from the Cambridge system:
- The hidden C1 level handling in `launcher.html`, `index.html`, `session-manager.js`
- The `html.olympiada` CSS overrides
- The old `Launch Zarmet Olympiada.bat` (replaced by the new one)
- Any Olympiada-specific rows in `cambridge-database-server.js`, `cambridge-admin-dashboard.html`, `invigilator.html`
- Mentions in scenario/autopilot/eye journals are historical — leave those alone

**Why:** The client wants Cambridge to go back to being just Cambridge. The hack was never meant to be permanent.

**Acceptance criteria:**
- [ ] `grep -ri olympiada` in the repo returns only (a) the new `zarmet-olympiada/` folder, (b) historical journal entries, (c) this intent doc
- [ ] Cambridge Launch .bat files still work, Cambridge dashboards still work, nothing Cambridge-facing is broken
- [ ] Commit is separate from the new-app work so it can be reverted cleanly if something slipped

**Execution:** /heal (to find references) → manual removal → /scenario (Cambridge regression check)
**Estimated scope:** Small
**⚠️ Gate:** Only after Priority 5 passes. Do not rip out old hooks until the new app is proven.

---

## Execution Order

1. **Priority 1 — Question banks.** Nothing else can be tested without real content. Start here.
2. **Priority 2 — Server + durable storage.** Must exist before the frontend has anywhere to save to.
3. **Priority 3 — Student interface.** Built against priorities 1+2.
4. **Priority 4 — Admin viewer.** Needed to verify priorities 2+3 are actually saving correctly.
5. **Priority 5 — Launcher + dry run.** Full end-to-end verification as a student.
6. **Priority 6 — Rip out old hooks.** Gated on Priority 5 passing.

---

## Risks & Dependencies

- **Risk: Source material quality.** The .docx and .pdf files may have messy formatting that makes clean transcription hard. **Mitigation:** Review a sample of each during Priority 1 before committing to the full transcription; fall back to manual typing for any parts that don't parse cleanly.
- **Risk: Audio file size.** Some of the .m4a files are 11–15 MB. Loading all four at once could stall the page. **Mitigation:** Load audio per-part, not all upfront.
- **Risk: SQLite on Windows.** `better-sqlite3` needs a native build; may fail on some machines. **Mitigation:** Pin to a version with prebuilt Windows binaries (or use plain `sqlite3`); fall back to pure-JSON storage if SQLite can't install.
- **Risk: Rotation data leakage.** A bug could show previous student's answers to the next student. **Mitigation:** On `index.html` load, explicitly clear localStorage and session keys; `/scenario` specifically tests this case.
- **Dependency:** Answer keys in `Nemis tili/answers.docx` must be readable and match the question IDs.
- **Dependency:** User's approval of this plan before any code is written.

---

## Skill Routing

| Item | Skill | Notes |
|------|-------|-------|
| JSON schema for question banks | /architect | Structural decision — one schema to cover both languages |
| Server design (SQLite + backups + mirror) | /architect | Structural decision — data durability architecture |
| Question bank transcription | manual | Claude reads source files, writes JSON |
| Server implementation | manual | Straightforward Express, no architectural creativity needed |
| Frontend implementation | manual | Keep it dumb and simple |
| Student UX polish pass | /eye | After implementation, walk through as a student persona |
| Crash & rotation stress tests | /scenario | Specifically target data durability + rotation data leakage |
| Code quality sweep | /heal | Final pass before rip-out |
| Rip-out of old hooks | /heal (find) + manual (remove) | Gated on dry run success |

---

## Success Metrics

- A student can take English C1 Reading+Listening and German C1 Reading+Listening end-to-end with zero crashes
- If the server is killed at any point during the test, no answers are lost on reload
- After the exam, the invigilator opens `admin.html` and sees every student's full answer sheet — no missing rows
- `zarmet-olympiada/backups/` contains one JSON file per completed test
- Cambridge system has zero remaining Olympiada code after Priority 6
- The client says "this is actually simple" when they see the student interface

---

## Official Timings (verified 2026-04-11)

Researched from the [Cambridge English official C1 Advanced exam format page](https://www.cambridgeenglish.org/exams-and-tests/advanced/exam-format/) and the [Goethe-Zertifikat C1 Durchführungsbestimmungen](https://www.goethe.de/pro/relaunch/prf/en/Durchfuehrungsbestimmungen_C1.pdf):

| Skill | English C1 (Cambridge CAE) | German C1 (Goethe-Zertifikat) |
|---|---|---|
| Reading | **90 min** — officially "Reading and Use of English" (one combined paper) | **65 min** — Lesen |
| Listening | **40 min** — officially "about 40 minutes" | **40 min** — Hören |

**Important notes:**
- CAE Reading is officially "Reading and Use of English" — a single 90-minute paper that mixes comprehension with grammar/vocabulary tasks. Transcribe it as one unified section, not two.
- Goethe C1 Lesen and Hören are separate modules. No overlap.
- Standard listening replay policy: each recording plays **twice** (both for CAE and Goethe C1). Hard-code this per part in the content JSON, with a per-item override field in case a specific part has a different rule.

## Remaining Open Questions (not blockers)

1. **Done-screen rotation:** auto-rotate back to welcome after N seconds, or require an invigilator key combo? (Architect will default to: invigilator-gated with a hidden-corner click — safer for a real exam, avoids accidental restarts.)
2. **Student roster:** pre-loaded by invigilator before the exam, or typed at welcome by each student? (Architect will default to: typed at welcome for v1, with a stub for roster pre-load in v2.)
