# Zarmet University — C1 Olympiada

Standalone test app for English C1 Advanced and German C1 (Goethe) —
Reading and Listening only. Separate from Cambridge and IELTS.

Architecture decisions: `architect-decisions.md` → **ADR-033 … ADR-037**
Full intent: `docs/intent-olympiada.md`

---

## Quick start

```bash
cd zarmet-olympiada
npm install          # installs express (and optionally pg)
node server.js       # starts on port 3004
```

Open `http://localhost:3004/` for the student view, or
`http://localhost:3004/admin.html` for the results viewer.

Or just double-click `Launch Zarmet Olympiada.bat` (Windows — starts
the server and opens Chrome/Edge in kiosk mode).

---

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `OLYMPIADA_PORT` | `3004` | Server port |
| `OLYMPIADA_ADMIN_PASSWORD` | `zarmet-admin` | Admin viewer password — **change in production** |
| `OLYMPIADA_DATABASE_URL` | (unset) | Optional Postgres mirror connection string. If unset, mirror is disabled and all durability stays local (JSONL + JSON backups) |

---

## Directory map

```
zarmet-olympiada/
├── server.js            # one Express file, ~550 lines
├── package.json
├── README.md            # this file
├── Launch Zarmet Olympiada.bat   # Windows launcher
├── public/              # static frontend
│   ├── index.html       # welcome / student entry
│   ├── test.html        # test runner
│   ├── done.html        # thank you screen
│   ├── admin.html       # password-gated results viewer
│   ├── css/styles.css
│   └── js/{app,test,admin}.js
├── content/             # question banks (JSON) — edit these to change questions
│   ├── SCHEMA.md        # authoritative schema reference
│   ├── english-c1/{reading,listening}.json
│   ├── english-c1/audio/
│   ├── german-c1/{reading,listening}.json
│   ├── german-c1/audio/
│   └── roster.json      # v2 placeholder (unused in v1)
├── sessions/            # live JSONL per in-progress session (gitignored)
└── backups/             # final JSON per submitted test (gitignored)
```

---

## Durability model (ADR-035)

Two (optionally three) independent layers — **nothing is ever lost** short
of the machine's disk dying:

1. **Live JSONL per session.** Every answer change appends a line to
   `sessions/{sessionId}.jsonl`. Append-only = crash-safe. Worst case
   after a hard crash: one answer update missing.

2. **Atomic final JSON backup.** On submit, the server writes a
   complete record (student, answers, scores, timestamps) to
   `backups/{date}_{name}_{lang}_{skill}_{sid}.json` using
   write-temp-then-rename. This is the canonical record.

3. **(Optional) Postgres mirror.** If `OLYMPIADA_DATABASE_URL` is set,
   each completed submission is also inserted into the
   `zarmet_olympiada_submissions` table. Failures are logged but never
   block the student-facing response — the JSON backup is the source
   of truth.

**Crash recovery** runs on every startup: any JSONL with a submit event
but no corresponding backup file gets finalized immediately.

**Question types:** The scoring engine supports multiple-choice,
multi-select, gap-fill / open-cloze, word-formation,
key-word-transformation, matching, true/false, and sentence-completion.
See `content/SCHEMA.md` for the full reference.

---

## Operator notes (defaults from ADR-037)

### Done-screen: invigilator-gated, not auto-rotate

After a student submits, they land on `done.html` which shows a thank-you
message and **stays there**. The only way to return to the welcome page is
the **invigilator 4-corner sequence**:

> Tap the corners of the screen in order — **top-left → top-right →
> bottom-right → bottom-left** — within 3 seconds.

Corners are 80px squares. No visible UI. Invisible to students.

**Why:** auto-rotate after N seconds is a footgun. A student clicking
"Start" on a test they just finished = data mixup. The 4-corner gate is
instant for trained staff and impossible to hit by accident.

### Student names: typed at welcome

v1: every student types their full name and group at the welcome screen.
No pre-loaded roster. Names validated: 2+ characters, letters + spaces
+ hyphens + dots + apostrophes allowed.

**Why:** pre-loading a roster would require a whole extra workflow
(invigilator uploads roster, student picks from dropdown). That can
wait for v2. A 50-student event is fine with typed names — every
submission is also timestamped and hash-suffixed, so duplicate names
are easy to disambiguate in the admin viewer.

v2 placeholder: `content/roster.json` shows the format for future
pre-loaded rosters.

### Changing the admin password

Set `OLYMPIADA_ADMIN_PASSWORD` in the environment before starting the
server. Do not hardcode it in any HTML/JS file — the server reads the
env var at startup and only exposes it via the login endpoint.

### Rotation between students

`index.html` and `done.html` both clear `localStorage` keys prefixed
`olympiada:` on load. The server-side session is identified by a
random 96-bit session ID, so even if two students somehow overlap,
their sessions can never collide.

---

## Content transcription workflow (Priority 1 of the intent plan)

The `content/*/reading.json` and `content/*/listening.json` files in this
scaffold are **stubs** — valid JSON with one placeholder question each,
just enough to boot the server.

Real content comes from:
- `../cae/Advanced reading practice.docx` (English C1 Reading + Use of English)
- `../cae/CAE Practice test listening.docx` + `CAE Practice test.mp3` (English C1 Listening)
- `../Nemis tili/Reading.pdf` + `answers.docx` (German C1 Lesen)
- `../Nemis tili/Listening.pdf` + `Listening Part 1-4.m4a` + `answers.docx` (German C1 Hören)

Transcription is a manual phase: read each source file, produce JSON
conforming to `content/SCHEMA.md`, copy audio files to
`content/{lang}/audio/`, boot the server, verify on the test page.

---

## What this app deliberately does NOT do

- No writing section, no speaking section
- No "X unanswered" counter — ever
- No score displayed to the student (post-submit or otherwise)
- No auto-rotate after submission
- No roster pre-loading (v1)
- No Cambridge/IELTS code reuse (fresh CSS/JS)
- No build step, no bundler, no framework
- No mobile / responsive design beyond "works on lab desktops"
- No authentication beyond the admin password — the invigilator is the
  real access control layer

---

## Relationship to the Cambridge system

The existing Cambridge-based Olympiada (hidden C1-Advanced level,
`html.olympiada` CSS overrides, `examType: 'Olympiada'` branches in
`cambridge-database-server.js`, the top-level `Launch Zarmet
Olympiada.bat`) is **still in place**. It is deliberately NOT removed
by this scaffold.

The rip-out is deferred until this standalone app is proven on a real
dry run (Priority 5 of the intent plan). After that, ADR-038+ will
remove every Cambridge-side Olympiada reference and the old launcher.
