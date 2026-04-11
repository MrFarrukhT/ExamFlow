---
name: Intent Plan — Zarmet Olympiada Cambridge-Authentic UI
description: Make the standalone Olympiada look and feel like the real Cambridge CAE interface, plus inherit the Cambridge dashboard module-selection pattern
type: project
---

# Intent Plan: Zarmet Olympiada — Cambridge-Authentic UI

**Date:** 2026-04-11
**Client/Stakeholder:** Project owner
**Status:** APPROVED (2026-04-11)
**Follows:** [docs/intent-olympiada.md](intent-olympiada.md) (scaffold already executed through Priority 0 via ADR-033..037)

---

## Vision

Take the standalone scaffold from the last session (which the client loves for its isolation, durability, and simplicity) and transform its **frontend only** into a visual replica of the real Cambridge CAE computer-based exam, branded as Zarmet University (no Cambridge logos, no external brand association). The backend (ADR-035 durability model), the content schema (ADR-034), and the directory isolation (ADR-033) remain untouched — this is a UI rewrite on top of a proven foundation.

The test interface shown to the student during an exam should be **indistinguishable at a glance** from the real CAE interface in `cae/examples/*.png`, with three deliberate exceptions:
1. The header shield says `Zarmet University` instead of `CAMBRIDGE English`.
2. There is no yellow `X/Y` global progress pill, no "Secure Mode" badge, no hamburger menu, no bell, no wifi, no pencil icon — none of the Cambridge-system additions the client already called out as noise.
3. No Writing, no Speaking.

Everything else — typography, layout, the grey instruction banner, the two-column part 5/6/7/8 layouts, the word-formation Keyword List column, the bottom horizontal part-navigator with `Part N  X of Y` counts, the left-arrow / right-arrow / finish-checkmark bottom-right button group — matches Cambridge.

---

## Goals

1. **Visual legitimacy.** An invigilator looking at a student's screen should recognize the real CAE interface. Students who've seen real CAE practice materials should feel at home.
2. **Preserve what's already working.** Zero changes to the server's durability model, zero changes to isolation, zero new native dependencies. Frontend-only rewrite.
3. **Zarmet branding, no trademark overreach.** No Cambridge logo, no Goethe logo, no external brand usage that could cause legal or licensing issues. Zarmet University owns this experience.
4. **Full CAE Reading coverage.** All 8 parts — including Part 7 gapped-text which the current scaffold doesn't support — rendered correctly.
5. **Strict Cambridge listening.** Pre-play modal, auto-play-once, no controls, no rewind. Matches the real exam's discipline.
6. **Inherit the Cambridge module-selection flow.** Two-step: welcome → module-selection card grid → test → return to module-selection → "all modules complete" banner.

---

## Scope

### In scope

- **Test runner rewrite** — from "all-parts-scrollable" to "single-part-at-a-time with bottom part-navigator"
- **New schema question type: `gapped-text`** — paragraph-slotting UI for CAE Part 7
- **Cambridge visual grammar** — typography, grey instruction banner, part-navigator, bookmark icon, teal highlight, arrow controls
- **Welcome flow split** — welcome page (name + group + language) → dashboard (module grid) → test → back to dashboard
- **Student status endpoint** — `GET /api/student-status?studentId=...` returns which modules are done
- **Persistent `studentId`** — generated on welcome form submit, cleared on rotation via the existing 4-corner gate
- **Strict listening** — pre-play modal, auto-play-once audio, advance blocked until audio finishes playing, no visible controls
- **Zarmet-neutral chrome** — shield + `Zarmet University` wordmark instead of Cambridge logo, for both languages
- **Authentic bottom nav** — `Part N  X of Y` per-part strip showing answered counts, active-part expanded to show each question number, left/right arrows, finish checkmark in bottom-right
- **Completion banner** — "All Sections Complete. Please remain seated." on the dashboard after all modules done, with the 4-corner invigilator gate as the only way to return to welcome
- **Patterns copied from `Cambridge/dashboard-cambridge.html`** — NOT files. The file remains untouched. We reimplement the module-selection card pattern standalone inside `zarmet-olympiada/public/`.

### Explicitly out of scope

- ❌ **Yellow `X/Y` global progress pill** — explicitly rejected
- ❌ **"Secure Mode" badge** — explicitly rejected
- ❌ **Wifi icon, bell icon, hamburger menu, pencil icon** — decorative noise, not in the real exam (those icons exist in the screenshots but are Cambridge Inspera chrome, not content)
- ❌ **Cambridge logo / CAMBRIDGE English header** — replaced with Zarmet shield
- ❌ **Goethe-Institut branding** — neutral Zarmet chrome used for German C1 too (answer Q3: (c))
- ❌ **Writing section** (still out of scope)
- ❌ **Speaking section** (still out of scope)
- ❌ **Importing code from `assets/js/` or `Cambridge/`** — isolation is non-negotiable; patterns are copied by hand, not by `import`
- ❌ **Touching `shared/database.js`, `cambridge-database-server.js`, or any IELTS/Cambridge file** — zero changes outside `zarmet-olympiada/`
- ❌ **Modifying the backend durability model** (ADR-035 stays)
- ❌ **Bookmark feature** — the bookmark icon is visible in Cambridge screenshots but deferred (nice-to-have, not essential for v1)
- ❌ **Mobile / responsive design** — desktop lab machines only
- ❌ **Pre-loaded rosters** — still v1 "typed at welcome" from ADR-037
- ❌ **Cambridge rip-out** — still gated on a real dry run of the completed standalone app

---

## Plan

### Priority 1: Schema extension — `gapped-text` + Listening Part 4 (two-task)
**What:** Extend the content schema (ADR-034) with two new additions:

1. **`gapped-text` question type** for CAE Reading Part 7:
   ```json
   {
     "id": "part7",
     "title": "Part 7 — Gapped text",
     "instructions": "You are going to read an article...",
     "passage": {
       "type": "text",
       "content": "... first sentence. [[SLOT:q41]] next sentence. [[SLOT:q42]] ..."
     },
     "paragraphBank": [
       { "key": "A", "text": "This is one of the detached paragraphs..." },
       { "key": "B", "text": "Another detached paragraph..." },
       { "key": "C", "text": "..." },
       { "key": "D", "text": "..." },
       { "key": "E", "text": "..." },
       { "key": "F", "text": "..." },
       { "key": "G", "text": "..." }
     ],
     "questions": [
       { "id": "q41", "type": "gapped-text", "prompt": "41", "answer": "C", "points": 1 },
       { "id": "q42", "type": "gapped-text", "prompt": "42", "answer": "A", "points": 1 }
     ]
   }
   ```
   Rendering: passage shows `[[SLOT:q41]]` as a numbered box where a paragraph gets dropped. The right column shows the paragraphBank as cards. Drag-and-drop OR click-a-slot-then-click-a-paragraph assignment. Either interaction is acceptable.

2. **Listening Part 4 two-task support** via part-level `taskGroups` array (optional):
   ```json
   {
     "id": "part-listening-4",
     "title": "Part 4 — Multiple matching",
     "audio": { "src": "audio/part4.mp3", "autoPlay": true },
     "taskGroups": [
       {
         "id": "task1",
         "instructions": "Task 1: Choose from the list A-H the reason each speaker gives for changing their job.",
         "options": [ { "key": "A", "text": "unfriendly colleagues" }, /* ... */ ],
         "questions": [
           { "id": "q21", "type": "matching", "prompt": "Speaker 1", "answer": "H", "points": 1 },
           { "id": "q22", "type": "matching", "prompt": "Speaker 2", "answer": "B", "points": 1 },
           { "id": "q23", "type": "matching", "prompt": "Speaker 3", "answer": "F", "points": 1 },
           { "id": "q24", "type": "matching", "prompt": "Speaker 4", "answer": "D", "points": 1 },
           { "id": "q25", "type": "matching", "prompt": "Speaker 5", "answer": "A", "points": 1 }
         ]
       },
       {
         "id": "task2",
         "instructions": "Task 2: Choose from the list A-H how each speaker feels about their new job.",
         "options": [ { "key": "A", "text": "encouraged by early results" }, /* ... */ ],
         "questions": [
           { "id": "q26", "type": "matching", "prompt": "Speaker 1", "answer": "C", "points": 1 },
           /* ... */
         ]
       }
     ]
   }
   ```

**Why:** The real CAE has 8 Reading parts and Listening Part 4 has two matching tasks over the same audio. Without these additions the schema can't represent the full exam — which contradicts "as close to the real exam as possible."

**Acceptance criteria:**
- [ ] `content/SCHEMA.md` documents both additions with examples
- [ ] Server-side scoring handles `gapped-text` (exact option key match like `matching`) and `taskGroups` (scores each sub-task independently, sum into the part's total)
- [ ] Stub content files updated to include Part 7 (gapped-text) and Listening Part 4 (two-task) as valid parts — still stubs, but rendered end-to-end
- [ ] Server pre-load validation accepts both new shapes without warnings

**Execution:** /architect (ADR-038 defining the schema additions) → manual implementation
**Estimated scope:** Medium

---

### Priority 2: Cambridge-authentic test runner rewrite
**What:** Rewrite `public/test.html`, `public/js/test.js`, and the test-related CSS in `public/css/styles.css` to match the real CAE interface.

**Visual specification (derived from `cae/examples/*.png`):**

- **Top header (~56px tall, white background, bottom border):**
  - Left: Zarmet shield (brown/orange gradient) + `Zarmet University` + `C1 Olympiada` subtitle underneath, small dark serif font
  - Center-left (padded): `Candidate ID` label + the student's ID value (small, grey label above, bold value below)
  - Right: **empty.** No wifi, no bell, no menu, no pencil. Just empty space. Per explicit client direction.
  - During listening when audio is playing: show a single small speaker icon + `Audio is playing` next to the candidate ID (authentic CAE behavior)

- **Instruction banner (~64px, full width, grey rounded rectangle with light border, 24px margin below header):**
  - `Questions N–M` in bold on the left
  - Part-specific instructions inline to the right (e.g., "For each question, choose the correct answer for each gap.")

- **Main content area (below instruction banner, flexible height):**
  - Padding 24px
  - White background
  - **Single-part-at-a-time** — only the current part is rendered, not a scrollable list of all parts
  - Rendering varies per question type (see below)
  - Bookmark icon on the right side of each question (visual-only for v1; storage deferred)

- **Bottom navigator bar (~68px tall, fixed, full-width, grey background, top border):**
  - Horizontal strip divided into 8 segments (Reading) or 4 segments (Listening)
  - Each segment shows `Part N` + either `X of Y` (when inactive) or the expanded question numbers `17 18 19 20 21 22 23 24` (when that part is the active part)
  - Active part's current question number is highlighted with a teal background + white text
  - Click a part label to jump to that part's first question
  - Click a specific question number (in the active part's expanded view) to jump to that question
  - Bottom-right corner has three buttons in a row:
    - `←` previous (grey/dark)
    - `→` next (teal, highlighted — primary action)
    - `✓` finish (teal, only visible/enabled when on the last part or when the student explicitly requests finish)

**Part-type-specific rendering:**

- **Part 1 (multiple-choice cloze, 8 gaps):** Single passage with inline numbered boxes. Each gap expands below/inline to show the 4 options as radio buttons. The passage has a clear "Studying black bears"-style heading.
- **Part 2 (open cloze, 8 gaps):** Single passage with inline text inputs for each numbered gap. Instruction says "Write one word."
- **Part 3 (word formation, 8 gaps):** Passage in the main column, a **Keyword List column on the right** showing the numbered root words (COME, FIT, ENDURE…) in capitals with their numbers (17–24). Inputs inline in the passage.
- **Part 4 (key-word transformation, 6 questions):** Each question is centered, vertically stacked: the first sentence, the KEY WORD in bold caps on its own line, then the second sentence with an inline text input for the 2–5 word transformation.
- **Part 5 (multiple-choice reading, 6 questions):** Two-column layout. Left: passage with paragraphs. Right: 6 multi-choice questions with 4-option radio buttons each.
- **Part 6 (cross-text multiple matching, 4 questions):** Two-column. Left: 4 short reviewer sections (A, B, C, D) each with its own text. Right: 4 questions, each with 4 radio buttons (Reviewer A/B/C/D).
- **Part 7 (gapped text, 6 questions):** Two-column. Left: passage with numbered `[[SLOT:qN]]` boxes. Right: paragraph bank (A–G) shown as clickable cards. Click a slot, click a paragraph → paragraph is assigned to that slot (and removed from the bank unless it was already assigned, in which case it swaps). Click a filled slot to clear it.
- **Part 8 (multiple matching, 10 questions):** Two-column. Left: the main article split into sections A–F. Right: 10 questions each with 6 radio buttons (A–F).

**Authentic `Part N  X of Y` counts** — the bottom navigator shows answered counts per part. These are counts of answered questions (not score). This matches the real Cambridge interface exactly, per the screenshot-verified interpretation in the clarification round.

**Timer:**
- Single countdown for the whole paper (90 min for CAE Reading, 40 min for CAE Listening, 65 min for Goethe Lesen, 40 min for Goethe Hören)
- Displayed top-right of the instruction banner or as a small pill in the header (authentic CAE shows it inside the top bar)
- Auto-submit when timer reaches 0

**Finish flow:**
- Click `✓` bottom-right → single confirm dialog: `Finish this test? You can't come back.` — no counts, no list
- On OK → POST submit → redirect back to the dashboard (with that module marked complete)

**Why:** Visual legitimacy was the explicit ask. The single-part-at-a-time pattern is what Cambridge actually does, and the bottom navigator is the UX piece the client said Cambridge got right. The scaffold's current "all parts scrollable on one page with sidebar nav" is quick but not authentic.

**Acceptance criteria:**
- [ ] All 8 Reading part types render correctly with stub content
- [ ] All 4 Listening parts (including Part 4 two-task) render correctly
- [ ] Bottom navigator shows `Part N  X of Y` counts, active part expanded
- [ ] Arrow navigation (←/→) moves between questions; reaching the end advances to the next part
- [ ] Clicking a part label jumps to that part's first question
- [ ] Clicking a specific question number jumps to that question
- [ ] Timer counts down and auto-submits on 0
- [ ] No `2/56` global counter, no "Secure Mode" badge, no hamburger/bell/wifi/pencil icons anywhere
- [ ] Grey instruction banner visually matches the `cae/examples/` screenshots within ~10% pixel diff (side-by-side)
- [ ] Header shows `Zarmet University` + C1 Olympiada subtitle, NOT `CAMBRIDGE English`

**Execution:** /architect (ADR-039 defining the test-runner state machine + layout) → manual implementation → /eye polish pass per part type
**Estimated scope:** Large

---

### Priority 3: Two-step dashboard flow (welcome → module-selection → test)
**What:** Split the current one-step welcome page into two steps, inheriting the Cambridge module-selection pattern.

**Pages:**

1. **`index.html` — Welcome (~unchanged structurally)**
   - Form: Full name (required), Group (optional), Language (English C1 / German C1)
   - **Skill selector removed** — picked on the dashboard instead
   - On submit: creates a new `studentId` (UUID), stores `{studentId, name, group, language}` in localStorage, navigates to `dashboard.html`
   - Rotation safety: on load, clear all `olympiada:*` localStorage keys and sessionStorage (already in place)

2. **`dashboard.html` — Module selection (NEW PAGE, inherits Cambridge pattern)**
   - Header: Zarmet shield + name + invigilator link (to a hidden invigilator control, nice-to-have)
   - Welcome section: `Welcome, {name}` + `ID: {studentId}` + `C1 Advanced — English` (or German)
   - Module grid: 2 cards side-by-side
     - `Reading & Use of English` — 90 min (English) / 65 min (German) — shows ✓ complete if already done
     - `Listening` — 40 min — shows ✓ complete if already done
   - When all modules complete: replace the grid with a completion banner ("All Sections Complete. Please remain seated.") — the 4-corner invigilator gate is the only way to return to welcome, as in `done.html`
   - Click a module card → navigate to `test.html?module=reading` (or listening)
   - Background state comes from `GET /api/student-status?studentId=...` which scans `backups/` for completed modules under this studentId

3. **`test.html` — unchanged URL, now uses query param `?module=...` instead of localStorage `olympiada:skill`**
   - After submit: redirect back to `dashboard.html` (NOT to `done.html`)
   - `done.html` is only reached after the completion banner flow or via direct auto-submit on timeout when all modules are done

4. **`done.html` — unchanged**
   - Already has the 4-corner invigilator gate
   - Rotation-safe

**New endpoint: `GET /api/student-status?studentId=:id`**
- Returns `{ studentId, completed: { reading: { done: true, filename: '...', score: null /* never leaked */ }, listening: { done: false } } }`
- Scans `backups/` folder for files containing this studentId
- No authentication (dashboard is not secret, but dashboard clears on rotation)
- Never leaks scores — `score` field is always null or absent

**Why:** The client said explicitly "Copy the module selection, because it is a very nice thing." The dashboard card grid pattern is the specific UX they're pointing at. Splitting the welcome form into two steps matches Cambridge's flow.

**Acceptance criteria:**
- [ ] Welcome page has no skill selector
- [ ] Dashboard page renders module cards with correct times
- [ ] Completed modules show a ✓ check and are visually distinct (greyed out or with a completion indicator)
- [ ] Completion banner appears only when BOTH modules are done
- [ ] After submitting a test, student returns to dashboard (not done.html)
- [ ] Student status endpoint returns per-module completion without leaking scores
- [ ] Rotation test: finishing all modules → 4-corner combo → fresh welcome → new studentId, new state
- [ ] Crash test: close browser mid-dashboard → reload → state restored from server

**Execution:** /architect (ADR-040 for the dashboard flow + endpoint) → manual implementation
**Estimated scope:** Medium

---

### Priority 4: Strict Cambridge listening mode
**What:** Replace the current permissive listening model (visible `<audio>` controls, `maxPlays: 2` counter) with the authentic Cambridge strict model.

**Behavior:**
- When a student arrives at a listening part (either the first part on load, or an advance from a previous part), a **pre-play modal** covers the entire content area:
  - Dark translucent overlay (~rgba(0,0,0,0.75))
  - Centered white card with a large headphone icon, the text "You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions. To continue, click Play.", and a teal Play button
- On click → modal dismisses, audio begins playing **automatically** via `audio.play()`, NO visible audio element controls
- During playback:
  - Top header shows a small speaker icon + `Audio is playing` label next to the candidate ID
  - The student can answer questions, but **cannot advance to the next part** until the audio element fires its `ended` event
- When audio ends:
  - The speaker icon/label disappears
  - The `→` advance button becomes enabled (with a brief visual flash to signal it's now clickable)
  - The student can also go back to review answers within the current part, but cannot replay audio
- No pause, no rewind, no seek, no replay counter. The audio element is created in code with `controls` attribute NOT set.
- Answer persistence: answers to listening questions are saved the same way as reading (every change → POST `/api/session/:id/answer`)

**Failure modes:**
- **Audio file not found (404):** server responds with a 404, client shows a modal "Audio is unavailable. Please tell your invigilator." — do NOT advance, do NOT silently continue. This is a data integrity issue.
- **Audio playback error (decode error, no codec):** same as above
- **Audio stalled >30s:** fail open — show a modal "Audio playback has stalled. Click here to continue without audio." and enable the advance button. Better to let the student finish than to deadlock them.
- **Student clicks browser refresh during audio:** the JSONL session is intact; on reload, the pre-play modal re-appears, audio replays from the start. This is a corner case: a sneaky student could refresh to get unlimited replays. Mitigation: the server tracks `playsUsed` per (sessionId, partId) and after N refreshes disables the play button. Log as integrity flag in the submission record.

**Why:** The client chose **(a) Strict Cambridge** explicitly. The real exam is this harsh and legitimacy requires matching it.

**Acceptance criteria:**
- [ ] Each listening part shows a pre-play modal before audio starts
- [ ] Audio plays with no visible controls (no play/pause button, no seek bar, no volume)
- [ ] The `→` advance button is disabled until the audio finishes (or 30s stall timeout)
- [ ] `Audio is playing` indicator shown in the header during playback
- [ ] 404 on audio → error modal, NOT silent continuation
- [ ] Refresh during audio → pre-play modal reappears + server-side replay counter increments
- [ ] Answers save live during playback (same as reading)
- [ ] Auto-submit on timer 0 works even if audio is still playing

**Execution:** manual implementation inside ADR-039's test runner (or a dedicated ADR if structural complexity warrants)
**Estimated scope:** Medium

---

### Priority 5: Zarmet-neutral chrome + visual polish sweep
**What:** Ensure every screen uses Zarmet-neutral branding and matches the Cambridge visual grammar within the constraints of the new chrome.

**Zarmet chrome:**
- Shield component: rounded square with gradient `#ea580c → #7c2d12`, white `ZU` text, 44px × 44px
- Wordmark: `Zarmet University` in Georgia bold, `C1 Olympiada` subtitle below in smaller serif italic
- Shown in: welcome page header, dashboard header, test header (left side), done page, admin page
- **Never** show `CAMBRIDGE English` anywhere

**Visual polish sweep (after Priorities 1-4 implemented):**
- Font family: match Cambridge Inspera as closely as feasible without licensing a proprietary font — candidates: Arial / Helvetica Neue / system sans-serif for UI chrome; Georgia / serif for passage text (same as the real exam's body text)
- Teal accent color: `#0d9488` or `#0e7a6c` (match the Cambridge teal in the screenshots)
- Grey instruction banner: `#f3f4f6` background, `#e5e7eb` border, 4px border-radius, 16px padding
- Dark grey body text: `#1f2937`
- Button styles: teal primary (`→`, `✓`), grey secondary (`←`), all with clear disabled states
- Bottom navigator: white background with top border, part segments separated by thin vertical lines
- Per-question bookmark icon: faded grey bookmark SVG top-right of each question area (visual-only, no storage in v1)
- NO wifi, bell, menu, or pencil icons anywhere — client called these out as noise

**Why:** Visual polish is the difference between "functional" and "impressive" — the client's word. A pixel-close Cambridge experience is what makes the Olympiada feel legitimate to students and to outside observers.

**Acceptance criteria:**
- [ ] Side-by-side screenshot comparison of Zarmet test page vs `cae/examples/` shows similar visual weight, spacing, color
- [ ] `grep -ri "cambridge" zarmet-olympiada/` returns zero matches in public-facing text (comments/logs OK)
- [ ] `grep -ri "secure mode" zarmet-olympiada/` returns zero matches
- [ ] `grep -r "2/56\|X/Y" zarmet-olympiada/public/` returns zero matches
- [ ] The Zarmet shield appears on every page header
- [ ] No decorative icons in the test header (wifi/bell/menu/pencil removed from the current scaffold if present)

**Execution:** /eye pass after Priorities 1-4 are implemented
**Estimated scope:** Small-medium (polish only)

---

### Priority 6: Dry run + stress test
**What:** Once Priorities 1-5 are in place, take the app for a full ride.

1. **Manual walkthrough** — launch the server, go through English C1 Reading end-to-end with stub content across all 8 parts, then Listening across all 4 parts including the two-task Part 4. Same for German C1. Watch for layout glitches, timer bugs, navigation dead-ends, audio failures.

2. **/eye pass** — as a student persona, walks each of the 8 Reading parts and 4 Listening parts. Any rough edges get polished.

3. **/scenario pass** — adversarial stress tests targeted at the new surface area:
   - Crash the server mid-test during each of the 8 parts → verify answers survive
   - Crash during the pre-play listening modal → verify the student can resume cleanly
   - Rotation between modules → verify studentId isolation
   - Refresh during listening audio → verify replay counter logic
   - Timer hitting 0 during listening Part 4 task 2 → verify auto-submit finalizes with all answers
   - Submit a reading test, go back to dashboard, the dashboard correctly reflects Reading as complete
   - Kill the server between two modules → dashboard recovers state on reconnect
   - All 8 Reading parts answered, click finish → single confirm → submit → dashboard shows ✓
   - Two students rotate on one machine, no data leakage between them

**Why:** The client said "Use every skill, say IP, scenario, architect, all of them at your disposal." This is where /scenario and /eye earn their keep.

**Acceptance criteria:**
- [ ] Full English C1 Reading walkthrough completes with all 8 parts rendered correctly
- [ ] Full English C1 Listening walkthrough completes with all 4 parts including two-task Part 4
- [ ] Full German C1 Reading + Listening walkthroughs (stub content) complete
- [ ] /scenario produces a journal entry with each stress case + outcome
- [ ] Any /scenario-found issues are fixed with checkpoint commits
- [ ] A final "smoke pass" after /eye + /scenario confirms everything still boots and submits

**Execution:** manual (walkthrough) → /eye (polish) → /scenario (adversarial)
**Estimated scope:** Medium

---

## Execution Order

1. **/architect session → ADR-038** (schema extension: gapped-text + taskGroups). Small. ~30 min scope.
2. **Execute ADR-038:** update `content/SCHEMA.md`, stubs, server-side scoring. Checkpoint commit.
3. **/architect session → ADR-039** (test runner state machine: single-part-at-a-time, bottom navigator, per-part rendering). Large. ~1 hour scope.
4. **Execute ADR-039:** rewrite `public/test.html`, `public/js/test.js`, test-related CSS. Heavy manual work. Multiple checkpoint commits (e.g., one per part type).
5. **/architect session → ADR-040** (dashboard flow: welcome split, dashboard page, student-status endpoint, module-based routing). Medium. ~40 min scope.
6. **Execute ADR-040:** add `dashboard.html`, `dashboard.js`, the student-status server route, update `index.html` to remove skill selector, update `test.js` to accept `?module=...`. Checkpoint commits per change.
7. **Strict listening implementation** (Priority 4) — folded into ADR-039's execution or as a small follow-up ADR-041.
8. **/eye polish pass** — visual + interaction sweep across all screens.
9. **/scenario stress pass** — adversarial tests on the new surface.
10. **Fix anything found in /eye or /scenario** — checkpoint commits.
11. **Final dry run** — manual walkthrough end-to-end, then ready for Priority 1 of the ORIGINAL intent plan (real content transcription).

---

## Risks & Dependencies

- **Part 7 drag-and-drop UX complexity.** Pure drag-and-drop on desktop is solved, but accessibility + keyboard fallback adds scope. **Mitigation:** implement click-slot-then-click-paragraph as the primary interaction, with drag-and-drop as a progressive enhancement. Matches the tablet-friendly behavior of real Cambridge Inspera.
- **Single-part-at-a-time state machine is more complex than the current scrollable render.** The test runner becomes a state machine: `{currentPartIndex, currentQuestionIndex, answers, audioState}`. More bugs possible. **Mitigation:** /architect defines the state machine explicitly; /scenario hammers it.
- **Typography fidelity without paid fonts.** The real Cambridge Inspera uses a proprietary webfont. Arial/Helvetica will be 90% there but not pixel-perfect. **Mitigation:** accept 90% and call it done. Not worth a font licensing discussion.
- **Timer behavior during listening.** The official exam has the listening clock run continuously through the audio. Does auto-submit fire during an audio part? Yes — answer is saved and submit fires regardless of playback state. **Mitigation:** explicitly tested in /scenario.
- **Replay sneakiness via refresh.** A sneaky student can refresh the page during listening to restart audio. Server-side replay counter catches it, but a determined cheater could also clear cookies / open a new tab. **Mitigation:** log integrity flag in the submission, invigilator reviews. Perfect cheating prevention is not the goal — we're protecting durability, not anti-cheat.
- **The current scaffold's test.js is about to be rewritten.** All ~300 lines will be replaced. This is fine — the scaffold was a scaffold. **No data loss risk** since the server/schema/durability layers are untouched.
- **`cae/examples/` screenshots are the ONLY visual reference.** No access to the actual Cambridge Inspera interface. **Mitigation:** side-by-side pixel comparison during /eye; client is the final arbiter of "close enough."
- **Dependency:** client approval of this plan before /architect runs.

---

## Skill Routing

| Item | Skill | Notes |
|---|---|---|
| Schema extension (gapped-text + taskGroups) | /architect (ADR-038) + manual | Structural decision, clean execution |
| Test runner state machine design | /architect (ADR-039) | Critical architectural decision — the state machine must be specified before implementation |
| Test runner implementation | manual | Straightforward once ADR-039 locks the state machine |
| Per-part rendering (all 8 Reading parts + 4 Listening parts) | manual + /eye | /eye polishes after each type is functional |
| Dashboard flow + student-status endpoint | /architect (ADR-040) + manual | Isolated scope |
| Strict listening | manual (folded into ADR-039) | Self-contained module inside test.js |
| Zarmet chrome polish | /eye | Visual consistency pass |
| Stress tests | /scenario | New surface area, targeted adversarial testing |
| Durability regression check | /scenario + /heal | Ensure ADR-035 layers still work after the rewrite |
| Final dry run | manual | Human walk-through as a student |

---

## Success Metrics

- ✅ An outside observer looking at the Zarmet Olympiada test screen **recognizes it as a Cambridge-style CAE interface** at a glance
- ✅ Zero Cambridge branding, zero external logos — fully Zarmet-branded
- ✅ All 8 CAE Reading parts + all 4 Listening parts render correctly with stub content
- ✅ Listening is strict: no controls, no rewind, no pause — matches real CAE
- ✅ Module-selection dashboard matches the Cambridge `Select a Module to Begin` pattern the client loves
- ✅ Backend durability (ADR-035) is untouched and still passes all its smoke tests
- ✅ `grep -ri` for "secure mode", "2/56", "Cambridge", "wifi icon" in `zarmet-olympiada/public/` returns zero hits
- ✅ /scenario stress pass produces no durability regressions
- ✅ Client sees the final result and uses the word "impressive" or stronger

---

## Relationship to the Original Intent Plan

This is a **frontend-only refinement** of the scaffold created by the original [intent-olympiada.md](intent-olympiada.md). Nothing in the original plan is replaced — the durability model, the isolation, the content schema's core, the three-layer backup story all stay. This plan adds:

- Schema: +2 additions (`gapped-text`, `taskGroups`)
- Frontend: major rewrite of `test.html` + `test.js` + `styles.css`, new `dashboard.html` + `dashboard.js`
- Server: +1 endpoint (`/api/student-status`), no changes to existing endpoints
- Content: stubs expand to cover all 8 CAE parts (still stubs, still placeholder)

**Priority 1 of the original intent plan (question content transcription)** is still deferred — it happens AFTER this UI rewrite, so the transcription benefits from a finished interface to test against.

**Priority 6 of the original intent plan (rip-out of Cambridge Olympiada hooks)** is still gated on a full real-student dry run — it does NOT happen as part of this plan.
