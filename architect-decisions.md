# Architecture Decisions

## Session: 2026-04-11 — Zarmet Olympiada Scaffold

**Context:** Client approved a full rebuild of the Zarmet University Olympiada as a standalone app. Current state: hacked onto the Cambridge system (hidden C1-Advanced level, `html.olympiada` CSS overrides, `Launch Zarmet Olympiada.bat` pointing at port 3003, ~7 branches in `cambridge-database-server.js`, theme hooks across `launcher.html` and `index.html`, filter dropdown in `cambridge-admin-dashboard.html`). Client wants: a tiny standalone app under `zarmet-olympiada/`, English C1 + German C1, Reading + Listening only, crash-safe durability across student rotation. Full intent in `docs/intent-olympiada.md`.

**Scope of this session:** Five ADRs that lock the scaffold. Transcribing question content from `cae/` and `Nemis tili/` into the schema, and the rip-out of existing Cambridge Olympiada hooks, are deliberately NOT in this session — both are gated on the scaffold being in place and dry-run validated first.

---

### ADR-033: Zarmet Olympiada — Isolation & Directory Layout
**Status:** Decided
**Impact:** High | **Effort:** 15 min (scaffold only) | **Risk:** Low

**Context:**
The existing Olympiada is wedged into the Cambridge system because the original goal was "reuse everything." In practice it made both systems worse: Cambridge carries ~60 lines of conditional Olympiada logic, the Olympiada inherits Cambridge's heavyweight CSS and multi-level complexity, and the `Launch Zarmet Olympiada.bat` launcher depends on `cambridge-database-server.js` running. The client has explicitly said the Olympiada "isn't a serious thing" — serious platform, non-serious feature, wrong coupling.

**Decision:**
A new top-level folder `zarmet-olympiada/` contains the entire app:

```
zarmet-olympiada/
├── server.js              # One Express file, port 3004
├── package.json           # Own deps (express only — pg optional)
├── README.md              # Operator instructions + defaults
├── .gitignore             # sessions/, backups/, *.log
├── public/
│   ├── index.html         # Welcome / name entry
│   ├── test.html          # The test itself
│   ├── done.html          # Thank you screen
│   ├── admin.html         # Results viewer (password-gated)
│   ├── css/styles.css     # One stylesheet, no Cambridge reuse
│   └── js/
│       ├── app.js         # Welcome page logic
│       ├── test.js        # Test runner
│       └── admin.js       # Results viewer logic
├── content/
│   ├── SCHEMA.md          # Question bank schema reference
│   ├── english-c1/
│   │   ├── reading.json   # (stub — filled in Priority 1)
│   │   ├── listening.json # (stub)
│   │   └── audio/         # (populated in Priority 1)
│   └── german-c1/
│       ├── reading.json
│       ├── listening.json
│       └── audio/
├── sessions/              # JSONL live state per in-progress session (gitignored)
└── backups/               # Final JSON per completed submission (gitignored)
```

No file under `zarmet-olympiada/` imports from `assets/js/`, `shared/`, or any Cambridge/IELTS file. The ONLY exception: `shared/database.js` may be imported by `server.js` ONLY for the optional Postgres mirror — and only if `DATABASE_URL` is set in env. The app must run end-to-end with no Postgres and no network.

Port 3004 (confirmed unused — grep returned no matches across all .js files).

Launcher: `zarmet-olympiada/Launch Zarmet Olympiada.bat` (new path, new logic). The existing top-level `Launch Zarmet Olympiada.bat` stays in place for now — swap happens in the deferred rip-out.

**Consequences:**

Positive:
- Cambridge codebase cleans up by ~60 lines once rip-out executes (deferred)
- Zero risk of Olympiada changes breaking Cambridge
- New developer can read the entire Olympiada app in one sitting
- Can be packaged, copied, deployed independently

Negative:
- Some very small amount of code duplication (express boot, basic HTML patterns) — acceptable for the isolation gain
- Two launcher .bat files exist simultaneously during the dry-run window — managed by deferring rip-out

**Migration Path:**
1. Create folder structure with placeholder files
2. Add root-level `.gitignore` entries for `zarmet-olympiada/sessions/` and `zarmet-olympiada/backups/`
3. Commit scaffold (empty but structurally correct)

**Files Affected:**
- NEW: `zarmet-olympiada/` (entire tree)
- NEW: `zarmet-olympiada/package.json` — own deps
- MODIFIED: `.gitignore` — add Olympiada runtime dirs

**Alternatives Considered:**
- Keep it under Cambridge with better abstractions — rejected: the coupling is the problem, not the abstractions
- Make it a top-level file set (no subfolder) — rejected: pollutes root, complicates the eventual rip-out
- Merge it INTO `shared/` as a "third exam" — rejected: explicit client direction was "separate thing"

---

### ADR-034: Unified C1 Question Bank JSON Schema
**Status:** Decided
**Impact:** High | **Effort:** 30 min | **Risk:** Low

**Context:**
The client chose "transcribe source material into structured JSON" (Option A) over reusing Cambridge's file-per-mock HTML approach. For a two-language, two-skill app, one generic schema beats two specialized ones. The same renderer must handle:
- CAE Reading+Use-of-English (one 90-min combined paper with 8 parts, 6 distinct question types)
- CAE Listening (4 parts, mostly MCQ + sentence completion)
- Goethe C1 Lesen (~4 parts, matching + MCQ)
- Goethe C1 Hören (3 parts, MCQ + T/F + speaker-matching, mixed replay rules)

Researching the real exam content, the union of question types is: multiple-choice (single answer, 2–10 options), open-cloze (fill-in exact word), word-formation (transform a given word), key-word-transformation (rewrite sentence), gapped-text (slot paragraph into passage), matching (assign A-N to question), true-false, sentence-completion. Eight types, manageable.

**Decision:**

One JSON file per (language × skill). Schema:

```json
{
  "id": "english-c1-reading",
  "language": "en",
  "languageLabel": "English",
  "level": "C1",
  "skill": "reading",
  "title": "Cambridge C1 Advanced — Reading and Use of English",
  "durationMinutes": 90,
  "instructions": "Read the instructions for each part carefully...",
  "parts": [
    {
      "id": "part1",
      "title": "Part 1 — Multiple-choice cloze",
      "instructions": "For questions 1-8, read the text...",
      "passage": {
        "type": "text",
        "content": "The passage text with [[GAP:q1]] inline markers..."
      },
      "audio": null,
      "questions": [
        {
          "id": "q1",
          "type": "multiple-choice",
          "prompt": "Question 1",
          "options": [
            { "key": "A", "text": "considerable" },
            { "key": "B", "text": "substantial" },
            { "key": "C", "text": "extensive" },
            { "key": "D", "text": "generous" }
          ],
          "answer": "B",
          "points": 1
        }
      ]
    },
    {
      "id": "part-listening-3",
      "title": "Part 3 — Multiple matching",
      "audio": {
        "src": "audio/part3.mp3",
        "maxPlays": 2,
        "note": "You will hear each extract twice."
      },
      "questions": [ ... ]
    }
  ],
  "scoring": {
    "mode": "per-question-points",
    "totalPoints": 80
  }
}
```

**Question type registry** (all optional fields default to sensible values):

| type | answer format | notes |
|---|---|---|
| `multiple-choice` | `"A"` (string, single option key) | `options` = array of `{key, text}` |
| `multiple-choice-multi` | `["A", "C"]` (array of keys) | When 2+ answers accepted |
| `gap-fill` | `"exactly"` or `["cat", "Cat"]` | Case-insensitive match against array |
| `open-cloze` | same as gap-fill | Alias for readability |
| `word-formation` | `"UNKNOWN"` | Given a root word, transform it |
| `key-word-transformation` | `{ "required": ["not", "enough"], "maxWords": 6 }` | Must contain required words, ≤ max |
| `matching` | `"C"` (option key) | `options` shared at the part level or per question |
| `true-false` | `"true"` \| `"false"` \| `"not-given"` | |
| `sentence-completion` | `["word1", "word2"]` | Up to N words from the listening |

**Server-side answer stripping** (non-negotiable): When the server reads a content file to serve to the client, it walks the JSON and removes `answer`, `points`, and `scoring.totalPoints` fields. The client receives a sanitized version; the full version stays on the server for scoring at submit. This is enforced in `server.js` via a `stripAnswerKey()` function.

**Stable question IDs** (`q1`, `q2`, …) are required — live-save persistence relies on them.

**Consequences:**

Positive:
- One renderer handles both languages
- Adding a new exam (B2 First, Goethe B1) is just a new JSON file, no code
- Content is plain JSON — version controllable, diffable, AI-transcribable from the source .docx/.pdf
- Answer stripping guarantees no leakage via network inspection

Negative:
- Authors must learn the schema — mitigated by `content/SCHEMA.md` reference doc with worked examples
- The `[[GAP:q1]] ` inline marker in passages is a custom convention — must be rendered carefully in the client

**Migration Path:**
1. Write `content/SCHEMA.md` with one worked example per question type
2. Create stub `english-c1/reading.json`, `english-c1/listening.json`, `german-c1/reading.json`, `german-c1/listening.json` — each valid JSON with 1 stub part so the server can load them
3. Priority 1 (separate, manual phase) fills in the real content

**Files Affected:**
- NEW: `zarmet-olympiada/content/SCHEMA.md`
- NEW: `zarmet-olympiada/content/english-c1/reading.json` (stub)
- NEW: `zarmet-olympiada/content/english-c1/listening.json` (stub)
- NEW: `zarmet-olympiada/content/german-c1/reading.json` (stub)
- NEW: `zarmet-olympiada/content/german-c1/listening.json` (stub)

**Alternatives Considered:**
- Use JSON Schema (draft-07) for formal validation — rejected: overkill for 4 files, manual review is enough; revisit if we ever hit 20+ files
- HTML-per-mock like Cambridge — rejected: explicitly the pattern the client said was "too complicated"
- Markdown with YAML frontmatter — rejected: harder to diff, harder to embed answer arrays

---

### ADR-035: Server Architecture — Single File, Triple-Layer Durability (No SQLite)
**Status:** Decided
**Impact:** High | **Effort:** 1.5 hours | **Risk:** Medium

**Context:**
Client requirement: "nothing should be lost, ever." Three failure modes to defend against: (1) power cut mid-test, (2) server process crash, (3) human error (wrong student name, misclick).

Originally considered `better-sqlite3` + JSON backup + Postgres mirror. After weighing: SQLite adds a native dep that can fail on Windows install, and its only benefit over pure-JSON is fast admin queries — which don't matter at 50-student scale. **Decision: drop SQLite entirely.** Two layers, not three, but both are filesystem-native and crash-proof.

**Decision:**

**Layer 1: Append-only JSONL per session** (primary, live writes)

Every answer change sends a small POST to `/api/session/:id/answer`. Server appends one line to `sessions/{sessionId}.jsonl`:

```
{"t":"2026-04-11T14:23:01.123Z","ev":"start","student":"John Doe","lang":"english-c1","skill":"reading"}
{"t":"2026-04-11T14:23:45.910Z","ev":"answer","qid":"q1","value":"B"}
{"t":"2026-04-11T14:24:12.456Z","ev":"answer","qid":"q2","value":"in"}
{"t":"2026-04-11T14:24:40.001Z","ev":"answer","qid":"q1","value":"C"}  // change of mind
{"t":"2026-04-11T14:55:00.000Z","ev":"submit"}
```

Append-only means no partial-write corruption: the OS either wrote the line fully or didn't. If the server crashes mid-write, the worst case is one missing answer update — everything prior is on disk. On reload, the server reads the JSONL and computes the current answer state by taking the **latest value per `qid`**.

Why JSONL not JSON-array: writing a JSON array requires seeking + rewriting the whole file on every change. JSONL is strict `fs.appendFileSync` with no parse/rewrite.

**Layer 2: Atomic final JSON per completed submission** (secondary, on submit)

When a student submits, the server:
1. Reads the final answer state from the JSONL
2. Scores against the answer key (server-side only)
3. Writes `backups/{YYYY-MM-DD}_{sanitizedName}_{lang}_{skill}_{sessionId}.json` via write-temp-then-rename:
   ```js
   fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2));
   fs.renameSync(tmpPath, finalPath);  // atomic on Windows + POSIX
   ```
4. Only moves `sessions/{sessionId}.jsonl` to `sessions/_completed/` after the rename succeeds

**Layer 3: Best-effort Postgres mirror** (tertiary, offsite belt)

If `process.env.OLYMPIADA_DATABASE_URL` is set, after the final JSON is written the server POSTs the record to a `zarmet_olympiada_submissions` table via `shared/database.js`. **Failure is logged and ignored** — never blocks the student-facing response, never causes a visible error. The JSON backup is canonical.

**Crash recovery protocol:**

On startup, the server scans `sessions/` for any `.jsonl` files. For each:
- If the file ends with a `submit` event but has no corresponding `backups/` entry → treat as incomplete submit, finalize it now (the crash happened between write-JSONL and write-backup)
- Otherwise → leave it in place; if the student reloads the page with the same session cookie/id, they resume where they left off

**Admin viewer reads directly from `backups/`:**
- No DB query
- Folder scan + JSON.parse each file
- Sufficient for up to ~1000 submissions (<100ms on modern SSD)

**No correct answers ever leave the server:**
- Content routes (`GET /api/content/:lang/:skill`) run every response through `stripAnswerKey()`
- Scoring happens only in the submit handler

**Consequences:**

Positive:
- Zero native dependencies (only `express`, already a project dep)
- Crash-proof by construction: filesystem append is the primitive
- JSON files are inspectable with any text editor — debug-friendly
- Can be copied/backed up with a file copy
- Postgres mirror is optional and never a failure surface

Negative:
- Admin viewer has to parse N JSON files on each load — fine at 50 students, would be slow at 10,000 (not our problem)
- `sessions/` folder can accumulate junk if students abandon half-finished tests — addressed by a housekeeping script that moves `sessions/*.jsonl` older than 48 hours to `sessions/_abandoned/`

**Migration Path:**
1. Write `zarmet-olympiada/server.js` with all routes, durability layers, answer stripping, score calculation
2. Write `zarmet-olympiada/package.json` (type: module, deps: express, optional pg)
3. Syntax check: `node --check zarmet-olympiada/server.js`
4. Smoke test: start server, curl `/api/health`, curl `/api/content/english-c1/reading` and verify answers are stripped

**Files Affected:**
- NEW: `zarmet-olympiada/server.js`
- NEW: `zarmet-olympiada/package.json`

**Alternatives Considered:**
- better-sqlite3 for primary storage — rejected: native dep risk, no benefit over JSON at our scale
- Stream all answers to Postgres live — rejected: network outage = data loss, violates "nothing lost"
- Full event sourcing (only JSONL, compute everything on read) — rejected: admin viewer would have to replay every session on each load; final JSON backup is the right optimization

---

### ADR-036: Frontend — Three Pages, Rotation-Safe, No Framework, No Cambridge Reuse
**Status:** Decided
**Impact:** High | **Effort:** 2 hours | **Risk:** Medium

**Context:**
Client direction: "super simple UI, no unanswered counter, no post-submit score". Current Cambridge frontend is powerful but opinionated — timer overlays, option menus, distraction-free mode, modal managers, context menus, mobile touch handlers, Inspera bridges. None of that is needed here, and reusing any of it creates coupling we just decided to avoid.

**Decision:**

Three pages, plus admin. Five JS files total. One CSS file. No build step, no bundler, no framework.

**`public/index.html` — Welcome page**
- Zarmet shield + title
- Form: Full name (required), group (optional), language dropdown (English C1 / German C1)
- One big "Start" button
- On load, JS clears `localStorage` keys prefixed `olympiada:` and `sessionStorage` completely — this is the rotation safety boundary
- No prior-student data visible

**`public/test.html` — The test runner**
- Skill-aware: the server tells it to do Reading first, then Listening (same URL, different query param — or: skill served by part index)
- Actually: **reading and listening are two separate test sessions.** Easier flow: after welcome → reading test → welcome-like "Reading done, ready for Listening?" → listening test → done. This avoids stuffing two different skills into one session cookie.
- Renders parts sequentially. Each part shows:
  - Passage (if reading) or audio player (if listening)
  - Questions for that part
  - "Next" / "Previous" part buttons
- Timer in the top-right: plain, grey, no color changes, no alarms
- Question navigator: numbered buttons 1..N, clicked = scroll into view. **No "unanswered" counter. No "3 of 80 answered" label.**
- Audio player: one `<audio>` element per part, `maxPlays` counted by JS and disabled after limit (defaults to 2 per CAE/Goethe convention)
- Every answer change calls `POST /api/session/:id/answer` with `{qid, value}` → server appends to JSONL. Also writes to `localStorage` as a second line of defence in case of network hiccup
- On "Finish test": one confirmation dialog with the text "Finish this test? You can't come back." — that's it. **No list of unanswered questions.** Submits, redirects to `done.html`.

**`public/done.html` — Thank you screen**
- "Your test has been submitted. Please wait for your invigilator."
- No score, no stats, no breakdown
- Per ADR-037 default: an invigilator key combo (hidden 4-corner click sequence) returns to welcome, NOT auto-redirect. Accidental restart is worse than a 30-second delay.

**`public/admin.html` — Results viewer**
- Password-gated (server-checked, password in env var `OLYMPIADA_ADMIN_PASSWORD`, not hardcoded in HTML)
- Table of submissions: date, student name, language, skill, score, finish time
- Click row → detail view with every question, their answer, the correct answer, per-question points
- Buttons: Export CSV, Export JSON
- Reads from `GET /api/admin/submissions` which scans `backups/`

**CSS discipline:**
- One file: `public/css/styles.css`
- No reset libraries, no Tailwind
- CSS variables for the two colors needed (primary, accent), everything else inherits
- Zarmet palette: warm browns/oranges (to match the current `html.olympiada` theme the client chose — `#7c2d12`, `#431407`, `#fed7aa`)
- Target: under 300 lines total

**JS discipline:**
- `app.js`, `test.js`, `admin.js` — one file per page, no module system (script tags)
- No dependency on `assets/js/core.js`, `assets/js/timer.js`, `assets/js/session-manager.js`, etc.
- Timer is ~30 lines of vanilla `setInterval`
- Each JS file must be under 400 lines

**Consequences:**

Positive:
- Entire frontend is understandable in 15 minutes
- Nothing to break when Cambridge evolves
- Rotation-safe by construction (clear on welcome load)
- No "unanswered" counter means one less piece to build and zero way to accidentally show it

Negative:
- No mobile touch support — acceptable, this runs on desktop lab machines
- No fancy highlighting / notes — out of scope, not requested
- Admin viewer is unstyled compared to Cambridge dashboards — fine, it's for the operator not for students

**Migration Path:**
1. Write the 4 HTML files as static skeletons that can load and render the stub content
2. Write `styles.css` with base typography and the Zarmet palette
3. Write `app.js` (welcome), `test.js` (test runner), `admin.js` (results viewer)
4. Manually load `http://localhost:3004/` and confirm welcome → test (stub) → done works end-to-end

**Files Affected:**
- NEW: `zarmet-olympiada/public/index.html`
- NEW: `zarmet-olympiada/public/test.html`
- NEW: `zarmet-olympiada/public/done.html`
- NEW: `zarmet-olympiada/public/admin.html`
- NEW: `zarmet-olympiada/public/css/styles.css`
- NEW: `zarmet-olympiada/public/js/app.js`
- NEW: `zarmet-olympiada/public/js/test.js`
- NEW: `zarmet-olympiada/public/js/admin.js`

**Alternatives Considered:**
- Single-page app with client-side router — rejected: adds complexity, no benefit at 3 pages
- Reuse `assets/js/core.js` + strip the unwanted parts — rejected: core.js is 1,432 lines of closure-coupled code; ripping out half would create more bugs than writing fresh
- Use the existing `ExamTimer` class — rejected: overlay mode + localStorage prefix config is more than we need; 30 lines of setInterval is simpler

---

### ADR-037: Defaults for Open Questions (Done-Screen + Student Roster)
**Status:** Decided
**Impact:** Low | **Effort:** 10 min | **Risk:** Low

**Context:**
The intent plan left two questions open, noted as "not blockers — architect will default." These are:
1. Done screen: auto-rotate back to welcome after N seconds, OR invigilator-gated?
2. Student names: pre-loaded roster, OR typed at welcome?

Client's explicit framing is "nothing should be lost" and "students may rotate." Those two constraints point to specific defaults.

**Decision:**

**Done-screen: invigilator-gated.** No auto-rotate. The done screen shows "Your test has been submitted. Please wait for your invigilator." and stays there. To return to welcome, the invigilator clicks the four corners of the screen in sequence (top-left → top-right → bottom-right → bottom-left) within 3 seconds. Hidden, no visible UI, no keyboard.

**Why:** Auto-rotate is a footgun. A student accidentally clicking "Start" on a test they just finished is a disaster the client explicitly said they want to avoid ("nothing should be lost"). The 4-corner combo is standard invigilator-kiosk practice, invisible to students, instant for trained staff.

**Student names: typed at welcome (for v1).** Every student types their full name and group into the welcome form. No pre-loaded roster file. The welcome form validates: non-empty, 2+ characters, basic pattern (letters + spaces + hyphens + dots + apostrophes — no numbers or symbols).

**Why:** Pre-loaded rosters require a pre-exam workflow (invigilator uploads a file, picks from a dropdown). That's a whole extra feature that can wait for v2. Typed names are fine for a 50-student event where every submission also captures wall-clock time and is backup-stamped.

**v2 placeholder:** Add a stub `roster.json` in the scaffold with a comment showing the future format, so when the client asks for pre-load later, the path is obvious.

**Consequences:**

Positive:
- Two open questions resolved without blocking on more client input
- Defaults documented in `README.md` so the client can see the rationale and override before execution
- Rip-out safety: done-screen gating means one student can't accidentally nuke the next session

Negative:
- The 4-corner combo requires invigilator training (one-time, ~10 seconds)
- Typed names mean a typo in "Ivan" vs "İvan" will show up as two entries — acceptable, the admin viewer can be searched/merged

**Migration Path:**
1. Document both defaults in `zarmet-olympiada/README.md` under an "Operator Notes" section
2. Implement the 4-corner gate in `public/js/app.js` (done.html page initialization)
3. Add the `roster.json` stub with commented future format

**Files Affected:**
- NEW: `zarmet-olympiada/README.md`
- NEW: `zarmet-olympiada/content/roster.json` (empty stub with schema comment)

**Alternatives Considered:**
- Auto-rotate after 60 seconds — rejected: too risky for "nothing lost"
- Keyboard shortcut (Ctrl+Shift+R) — rejected: students may press it by accident
- Password on done-screen — rejected: invigilators mistype passwords under exam pressure

---

## Session: 2026-04-08 (Round 7)

### ADR-029: Sync server-cjs.cjs with ESM Server Security
**Status:** Executed
**Impact:** High | **Effort:** 1 hour | **Risk:** Medium
**Summary:** Rewrote the CJS packaged server (730→739 lines) to match the ESM development server. Added: rate limiting, admin auth (requireAdmin), input validation (validateStudentInfo, validateScore, stripHtmlTags), submission deduplication, duration validation, path security (blocks .git/.env/shared etc.), body size limit (50MB), DELETE /submissions/:id, /admin, /admin-login, /verify-invigilator routes. Removed stale Cambridge endpoints that used wrong DB schema. Preserved CJS-specific license management, pkg support, and error logging.
**Result:** Executed in commits 6e0c8b2 + cf99b89.

### ADR-030: Extract Cambridge Scoring Conversion Module
**Status:** Executed
**Impact:** Medium | **Effort:** 20 min | **Risk:** Low
**Summary:** Extracted scoring conversion tables, grade boundaries, and helper functions (convertRawToScale, calculateOverallScale, getCefrLevel, isPassed) from inline JS in cambridge-student-results.html into `assets/js/cambridge/scoring-tables.js` (118 lines). Exposed as `window.CambridgeScoring` namespace. HTML file: 1,456→1,333 lines.
**Result:** Executed in commit 5550e1e.

### ADR-031: Extract Mobile Touch Features from core.js
**Status:** Executed
**Impact:** Low-Medium | **Effort:** 15 min | **Risk:** Low
**Summary:** Extracted `initializeMobileFeatures()` (130 lines of touch event handlers) from core.js into standalone `assets/js/mobile-touch.js` (123 lines). Self-initializing module with zero dependencies on core.js closure state. 10 IELTS reading.html files updated with new script tag. core.js: 1,562→1,432 lines.
**Result:** Executed in commit 8421d63.

### ADR-032: Assess cambridge-bridge.js Decomposition
**Status:** Deferred
**Impact:** Medium | **Effort:** Hours | **Risk:** Medium
**Summary:** CambridgeBridge (1,433 lines) is a single-class Inspera/CEQ adapter with 8 setup methods. All methods are tightly coupled to the same Inspera DOM structure. Splitting into smaller files would create more imports without reducing complexity. Decomposition would be warranted when Inspera content structure changes or when a second content adapter is needed.
**Result:** Deferred — single-purpose adapter, decomposition premature.

---

## Session: 2026-04-08 (Round 6)

### ADR-026: Remove Dead Cambridge JS Files
**Status:** Executed
**Impact:** Low | **Effort:** 5 min | **Risk:** None
**Summary:** Deleted 4 orphaned files in `assets/js/cambridge/` (534 lines total): `a2-key-shared.js` (207), `a2-key-wrapper.js` (165), `a2-key-combined.js` (145), `a2-key-manifest.js` (17). No HTML file or JS module referenced them.
**Result:** Executed in commit 7f1a3f6.

### ADR-027: Rename Cross-Level Cambridge Modules
**Status:** Executed
**Impact:** Medium | **Effort:** 30 min | **Risk:** Low
**Summary:** Renamed `a2-key-answer-sync.js` → `cambridge-answer-sync.js` and `a2-key-part-scroll.js` → `cambridge-part-scroll.js`. These modules are used by A2-Key, B1-Preliminary, AND B2-First — the "a2-key-" prefix was misleading. Updated 69 HTML files, guard variable, and code comments.
**Result:** Executed in commit 18d6c07.

### ADR-028: Flag server-cjs.cjs as Stale Deployment Artifact
**Status:** Deferred
**Impact:** High | **Effort:** Days | **Risk:** Medium
**Summary:** `server-cjs.cjs` (730 lines) is the CJS packaged server for `pkg` binary distribution. It has NOT been updated through 25+ ADRs of changes — doesn't use shared modules (database.js, server-bootstrap.js, validation.js, auth.js), lacks rate limiting, submission deduplication, and recent endpoint changes. Contains license management not present in ESM servers. Needs either full sync or deprecation in favor of running ESM directly.
**Result:** Deferred — requires assessment of pkg tooling compatibility with ESM shared modules.

---

## Session: 2026-04-08 (Round 5)

### ADR-021: Extract Shared Admin JavaScript Library
**Status:** Executed (pre-existing)
**Impact:** High | **Effort:** 2-3 hours | **Risk:** Medium
**Summary:** Created `assets/js/admin-common.js` (665 lines) with `AdminDashboard` class containing all shared admin functions: login, pagination, filtering, date-grouped views, modal management, CSV export, answer management scaffolding. Both dashboards now import the shared class and only contain exam-specific overrides (IELTS: 840 lines, Cambridge: 874 lines — down from 1,587 and 1,752).
**Result:** Executed. ~1,300 lines of duplicated inline JS eliminated.

### ADR-022: Unify Answer Managers
**Status:** Executed
**Impact:** Medium | **Effort:** 30 min | **Risk:** Low
**Summary:** Merged `answer-manager.js` (280 lines) and `cambridge-answer-manager.js` (472 lines) into a single unified `AnswerManager` class (370 lines) that auto-detects exam type from localStorage. Backward-compatible `window.cambridgeAnswerManager` alias preserved. 153 Cambridge HTML files updated to load unified module.
**Result:** Executed. Old cambridge-answer-manager.js deleted. 382 lines saved.

### ADR-023: Integrate Shared Validation & Clean Dead Server Code
**Status:** Executed
**Impact:** Low-Medium | **Effort:** 15 min | **Risk:** Low
**Summary:** Wired up `validateStudentInfo()` in 3 submission endpoints across both servers (was extracted in ADR-020 but never called). Replaced IELTS local `stripHtml()` with shared `stripHtmlTags`. Removed redundant Cambridge `GET /health` endpoint. Updated admin dashboards to use `/test` for connection checks.
**Result:** Executed. ~35 lines of inline validation removed, shared module fully utilized.

### ADR-024: Remove Orphaned Files
**Status:** Executed
**Impact:** Low | **Effort:** 5 min | **Risk:** None
**Summary:** Deleted 3 unreferenced files: `Cambridge/index.html` (redirect stub), `Cambridge/launcher-cambridge.html` (redirect stub), `assets/js/database-direct.js` (unused DatabaseConnector class).
**Result:** Executed. 112 lines of dead code removed.

### ADR-025: Extract Shared Answer Key Route Factory
**Status:** Rejected (schema mismatch)
**Impact:** Medium | **Effort:** 1 hour | **Risk:** Low
**Summary:** Originally proposed extracting a shared factory for GET/POST/DELETE answer key endpoints. After deep inspection, IELTS uses row-per-question storage (`mock_answers` table with individual rows) while Cambridge uses JSONB blob storage (`cambridge_answer_keys` table with single row). The fundamentally different schemas make a shared factory counterproductive.
**Result:** Rejected — forced abstraction over incompatible storage models would reduce clarity without meaningful code savings.

---

## Session: 2026-04-08 (Round 4)

### ADR-016: Unify Launcher Pages
**Status:** Executed
**Impact:** Low | **Effort:** 30 min | **Risk:** Low
**Summary:** Merged IELTS and Cambridge launchers into single `launcher.html` with exam-type detection via `?exam=cambridge` URL param. `Cambridge/launcher-cambridge.html` is now a redirect stub. Cambridge gains live status check.
**Result:** Executed in commit d013ba4. 236 lines removed.

### ADR-017: Fix IELTS Admin Route + Rename Dashboard Files
**Status:** Executed
**Impact:** Medium | **Effort:** 15 min | **Risk:** Low
**Summary:** Added missing `/admin` route to IELTS server (was orphaned). Renamed `dashboard.html` → `student-dashboard.html` and `enhanced-admin-dashboard.html` → `ielts-admin-dashboard.html`. Updated all references (6 JS files, 2 HTML files, 1 bat file).
**Result:** Executed in commit a7ef868.

### ADR-018: Remove Legacy Cambridge Score Endpoint
**Status:** Executed
**Impact:** Low | **Effort:** 5 min | **Risk:** None
**Summary:** Deleted dead `POST /cambridge-update-score` endpoint (~47 lines). No frontend code called it. `PATCH /cambridge-submissions/:id/score` is the canonical endpoint.
**Result:** Executed in commit ca3f735. 53 lines removed.

### ADR-019: Unify Timer into Shared Module
**Status:** Executed
**Impact:** Medium | **Effort:** 1 hour | **Risk:** Medium
**Summary:** Created unified `ExamTimer` class in `assets/js/timer.js` merging TestTimer (139 lines) and CambridgeTimer (616 lines). Supports overlay mode (Cambridge) and embedded mode (IELTS) with configurable localStorage prefix. Both old classes kept as backward-compatible wrappers. 43 Cambridge HTML files updated.
**Result:** Executed in commit 8e76e04. 661 lines removed, old cambridge-timer.js deleted.

### ADR-020: Extract Shared Validation to Server Module
**Status:** Executed
**Impact:** Medium | **Effort:** 30 min | **Risk:** Low
**Summary:** Created `shared/validation.js` with validateScore, validateGrade, validateScoreAndGrade, validateStudentInfo, stripHtmlTags, errorResponse. Cambridge server imports from shared (~60 lines removed). IELTS `/update-score` now validates score input.
**Result:** Executed. ~60 lines of inline validation removed from Cambridge server.

---

## Session: 2026-04-08 (Round 3)

### ADR-011: Complete Cambridge Admin Tab Navigation
**Status:** Executed
**Impact:** Medium | **Effort:** 15 min | **Risk:** Low
**Summary:** Added unified tab nav bar to cambridge-student-results.html and cambridge-speaking-evaluations.html. Fixed bug where tabs in cambridge-admin-dashboard.html were never shown (display:none not removed after login). All 3 Cambridge admin pages now have consistent navigation.
**Result:** Executed in commit cf9e4e9.

### ADR-012: Extract Shared Server Bootstrap Module
**Status:** Executed
**Impact:** Medium | **Effort:** 30 min | **Risk:** Low
**Summary:** Both servers now use createServer() from shared/server-bootstrap.js (91 lines). Eliminates duplicated Express setup, middleware, static serving, admin login, and shutdown handlers. IELTS: 512→360 lines. Cambridge: 944→735 lines.
**Result:** Executed in commit f86cd03.

### ADR-013: Unify Student Login Pages
**Status:** Executed
**Impact:** Medium | **Effort:** 45 min | **Risk:** Medium
**Summary:** Merged IELTS and Cambridge login into single root index.html that detects exam type via ?exam=cambridge URL param or localStorage. Cambridge/index.html is now a redirect stub. Added body.cambridge CSS class scoping to entry.css.
**Result:** Executed in commit 3e2f6ef.

### ADR-014: Extract Options Menu & Modal Manager (revised target)
**Status:** Executed
**Impact:** High | **Effort:** 1 hour | **Risk:** Medium
**Summary:** Extracted ModalManager (80 lines) and OptionsMenu (224 lines) from universal-functions.js (not core.js as originally proposed — options/modals were in the wrong file). universal-functions.js: 443→144 lines (67% reduction). IELTSUniversalFunctions delegates to both via composition. 160 HTML files updated with new script tags. All inline onclick handlers preserved.
**Result:** Executed in commit 272ab3d.

### ADR-015: Extract Shared Admin Styles to External Stylesheet
**Status:** Executed
**Impact:** Medium | **Effort:** 1 hour | **Risk:** Low
**Summary:** All 4 admin dashboards now use shared assets/css/admin-common.css (865 lines) instead of inline CSS. cambridge-admin-dashboard: 2,553→1,747 lines. enhanced-admin-dashboard: 2,343→1,582 lines. ~1,600 lines of duplicated CSS removed.
**Result:** Executed in commit bddbb72.

---

## Session: 2026-04-08 (Round 2)

### ADR-006: Retire Legacy Admin Panel (Port 3000)
**Status:** Executed
**Impact:** Medium | **Effort:** 15 min | **Risk:** Low
**Summary:** Deleted the entire `admin/` directory (~2,444 lines, 15 files). All active admin dashboards use ports 3002/3003 directly; nothing references port 3000. Git tag `admin-panel-archive` preserves the code.
**Result:** Executed in commit 32fdb64.

### ADR-007: Consolidate Cambridge Admin Navigation
**Status:** Executed (revised approach)
**Impact:** High | **Effort:** 30 min | **Risk:** Low
**Summary:** Added unified tab navigation bar (Submissions | Student Results | Speaking Evaluations) across all three Cambridge admin pages instead of merging into one monolithic file. Removed redundant back-buttons and standalone navigation buttons.
**Result:** Executed in commit 0cc9c1f. Pages feel like one dashboard while remaining separate files for maintainability (~5,070 lines across 3 files would have created a 4K-line monster if merged).

### ADR-008: Unify Invigilator Pages
**Status:** Executed
**Impact:** Medium | **Effort:** 1 hour | **Risk:** Low
**Summary:** Merged `invigilator.html` (481 lines) and `Cambridge/cambridge-invigilator.html` (560 lines) into a single unified page (419 lines). Detects exam type from localStorage and adapts UI. Cambridge features (auto-refresh, level display, mock-lock detection) now benefit IELTS too.
**Result:** Executed in commit 161ae15. 3 Cambridge pages updated to point to unified invigilator.

### ADR-009: Decompose core.js Into Focused Modules
**Status:** Executed (partial — Timer + ContextMenu)
**Impact:** High | **Effort:** 2 hours | **Risk:** Medium
**Summary:** Extracted Timer (138 lines) and ContextMenu (227 lines) from core.js (1,906 → 1,614 lines). Both are standalone classes (`TestTimer`, `ContextMenuManager`) loadable by any test page. Navigation and answer evaluation remain in core.js due to tight closure coupling.
**Result:** Executed in commit f7ea097. 12 HTML files updated to load new modules.

### ADR-010: Template IELTS Mock Test HTML Files
**Status:** Deferred
**Impact:** High | **Effort:** 1-2 weeks (revised from 1-2 days) | **Risk:** High
**Summary:** Converting 30 mock HTML files to a template + JSON data system requires building a question-type renderer (True/False, matching, drag-drop, clickable cells, summary completion, etc.). Each mock uses different question type combinations. The existing `templates/` directory contains only a 117-line skeleton, not a working engine.
**Result:** Deferred — needs a dedicated multi-session effort with per-mock verification. Should not be done in a single batch.

---

## Session: 2026-04-08 (Round 1)

### ADR-001: Remove Dead Cambridge Endpoints from IELTS Server
**Status:** Executed
**Impact:** Medium | **Effort:** 15 min | **Risk:** Low
**Summary:** Removed `/api/cambridge-submissions` endpoints from `local-database-server.js` — frontend exclusively uses port 3003.
**Result:** Executed — removed ~75 lines of dead code.

### ADR-002: Remove Orphaned Backup File
**Status:** Executed
**Impact:** Low | **Effort:** 1 min | **Risk:** None
**Summary:** Deleted `cambridge-admin-dashboard-backup.html` — truncated copy with no references.
**Result:** Executed — 1 file deleted.

### ADR-003: Extract Shared Database Infrastructure Module
**Status:** Executed
**Impact:** High | **Effort:** 1 hour | **Risk:** Medium
**Summary:** Created `shared/database.js` with connection management, retry queue, and admin login. Both servers refactored to use it.
**Result:** Executed — ~150 lines of duplication eliminated. Both servers verified with `node --check`.

### ADR-004: Fix `__dirname` Reference in Cambridge Server
**Status:** Executed
**Impact:** Medium | **Effort:** 5 min | **Risk:** Low
**Summary:** Cambridge server used `__dirname` without defining it (ESM bug). Added `path` and `fileURLToPath` imports.
**Result:** Executed — `/admin` route now works correctly.

### ADR-005: Assess Legacy Admin Panel (Port 3000) Retirement
**Status:** Superseded by ADR-006
**Impact:** Medium | **Effort:** Varies | **Risk:** Medium
**Summary:** Originally deferred pending deployment context. ADR-006 executed the retirement with full evidence.
**Result:** Superseded — see ADR-006.
