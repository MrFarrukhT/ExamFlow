# Scenario Journal — Test System v2

## Session: 2026-04-08 03:33
Focus: First adaptive sweep — baseline all attack surfaces
Trigger: Initial run, no prior intelligence

### Scenarios

- S1a: IELTS Score Tampering [State Corruptor] -> PASS [HIGH]
  - Negative, NaN, Infinity, empty all rejected by DB CHECK constraint `test_submissions_score_check`
  - Database-level protection is solid

- S1b: Cambridge Score Tampering [State Corruptor] -> **FAIL** [CRITICAL]
  - Accepted: score=-999, score=99999999, grade="HACKED", grade="A+++++++++"
  - No server-side validation; no DB CHECK constraint on cambridge_submissions.score
  - **Fix applied**: Added score range validation (0-200) and grade sanitization

- S1c: Cambridge XSS in Evaluator Fields [Insider] -> **FAIL** [CRITICAL]
  - `<script>alert(1)</script>` stored as evaluator_name via PATCH /evaluate
  - SQL string "DROP TABLE..." stored as evaluation_notes
  - **Fix applied**: HTML tag stripping on evaluator_name and evaluation_notes

- S2: IDOR on Score/Delete Endpoints [Chain Attacker] -> PASS [HIGH]
  - Non-existent IDs return proper 404
  - SQL in URL params rejected ("invalid input syntax for type integer")
  - Parameterized queries prevent SQL injection throughout

- S3: Admin Login Brute Force [Insider] -> **FAIL** [HIGH]
  - 5 rapid wrong-password attempts — no lockout, no delay, no rate limit
  - Admin token format: `admin-session-{Date.now()}` — sequential, predictable
  - **Deferred**: Needs rate-limiting middleware (express-rate-limit or custom)

- S4: Double Submission Race [Multitasker] -> **FAIL** [HIGH]
  - 3 parallel identical submissions all accepted (IELTS: IDs 11746-11748, Cambridge: 137523-137525)
  - No uniqueness constraint, no client idempotency key
  - **Deferred**: Needs architectural decision (DB unique constraint vs idempotency tokens)

- S5: Malformed Submission Bodies [Explorer] -> **FAIL** [MEDIUM]
  - Empty body, null values, wrong types all "queued for retry" with success:true response
  - Prototype pollution vector `__proto__` field accepted (Express JSON parser neutralizes by default)
  - **Fix applied**: Added required field validation before queue/save

- S6: Data Edge Cases [Polyglot] -> **PARTIAL** [MEDIUM]
  - PASS: Cyrillic, emoji, O'zbek apostrophe all stored correctly
  - FAIL: Empty string and whitespace-only studentId/studentName accepted
  - **Fix applied**: Trim + empty check on studentId and studentName

- S7: Search Parameter Injection [Explorer] -> **PARTIAL** [MEDIUM]
  - SQL wildcards (%, _) return all records via ILIKE — expected behavior, low risk
  - Null byte (%00) causes 500 error: "invalid byte sequence for encoding UTF8: 0x00"
  - **Fix applied**: Strip null bytes from search input

- S8: Admin Endpoints Without Auth [Insider] -> NOTED [—]
  - All admin pages and data endpoints return 200 without any token/session
  - By design per audit rules: "No authentication on student test pages — by design, controlled by invigilator"

### Fixes
- `cambridge-database-server.js`: Score validation (0-200 range), grade sanitization, XSS stripping on evaluator fields, required field validation on submissions, null byte stripping in search, empty name rejection
- `local-database-server.js`: Required field validation on submissions

### Pattern Analysis
- **Cambridge server lacks all the safety nets that IELTS has via DB constraints.** The IELTS `test_submissions` table has CHECK constraints; Cambridge `cambridge_submissions` does not. Server-side validation is the only defense.
- **"Queued for retry" pattern masks validation failures.** When saveWithRetry fails, the catch block says "success: true, queued" — this is misleading for truly invalid data that will never succeed.
- **No rate limiting anywhere.** Express has no rate-limit middleware configured.

### Intelligence Update
- Proven solid: SQL injection (parameterized everywhere), IDOR (proper 404s), unicode/i18n handling
- New weak pattern: Cambridge server has no input validation — every endpoint needs checking
- For next run: Focus on browser-based behavioral testing (exam flow, timer manipulation, multi-tab), admin dashboard XSS rendering (stored XSS from evaluator_name), speaking audio upload abuse

### Stats
Tested: 8 | Passed: 3 | Failed: 5 | Partial: 2 | Fixed: 4 | Deferred: 3

---

## Session: 2026-04-08 03:46
Focus: Untested areas — data manipulation, file exposure, prompt injection
Trigger: Round 1 cursor listed 12 untested areas; no new code changes to test

### Scenarios

- S1: Mock Answers Manipulation [State Corruptor] -> **FAIL** [HIGH]
  - IELTS: POST/DELETE `/mock-answers` overwrites and deletes answer keys without auth
  - Cambridge: POST/DELETE `/cambridge-answers` same behavior
  - Anyone on the network can tamper with auto-grading answer keys
  - **Deferred**: No auth is by design, but impact is severe (grade manipulation)

- S2: Cambridge Answer Keys XSS Injection [Explorer] -> **FAIL** [HIGH]
  - `<script>alert(1)</script>` stored in answer values via POST `/cambridge-answers`
  - 1000-key answers object accepted (storage abuse potential)
  - Invalid level blocked by DB CHECK constraint — PASS
  - **Fix applied**: HTML tag stripping on answer values, 200-entry limit, level/skill validation

- S3: Speaking Audio Upload Abuse [Power User] -> **FAIL** [MEDIUM]
  - Missing audio data accepted (empty speaking submission)
  - audioSize=999999 accepted (lied about actual size)
  - `<script>alert(1)</script>` stored as audio_mime_type
  - Negative duration (-999) stored
  - **Fix applied**: mimeType regex validation, duration/audioSize range checks, level validation

- S4: Concurrent Score Updates [Multitasker] -> PASS [MEDIUM]
  - 3 parallel PATCHes on same submission: last-write-wins, no corruption
  - Expected behavior with single-threaded Node.js + PostgreSQL serialization

- S5: File Path Traversal via Static Serve [Insider] -> **CRITICAL FAIL** [CRITICAL]
  - `express.static('./')` exposed: server source code (.js), shared/database.js, package.json, .git/config, .claude/, keygen.js
  - .env was blocked (express dotfile handling), but .git/ and .claude/ dirs were served
  - Path traversal (../) properly blocked by Express
  - **Fix applied**: Blocklist middleware in server-bootstrap.js before express.static

- S6: AI Score Prompt Injection [Chain Attacker] -> INCONCLUSIVE [HIGH]
  - All requests returned 429 (OpenAI quota exceeded)
  - Empty task correctly returns 400 — validation PASS
  - **Deferred**: Need working API key to test prompt injection in student answers

### Fixes
- `shared/server-bootstrap.js`: Blocklist middleware blocks .git/, .claude/, shared/, node_modules/, server .js files, package.json, .scenario-cursor.json
- `cambridge-database-server.js`: Answer key XSS sanitization, 200-entry limit, level/skill enum validation, speaking mimeType regex, duration/audioSize range checks

### Pattern Analysis
- **Static file serving is a systemic risk.** `express.static('./')` is convenient but serves everything. The blocklist approach works but is fragile — new sensitive files must be added manually.
- **Cambridge server remains the softer target.** Round 1 found score validation gaps; Round 2 found answer key and speaking upload gaps. The IELTS server has less attack surface because it has fewer endpoints.
- **"No auth" compounds every other vulnerability.** Without authentication, any network-accessible client can exploit every finding. This is by design but means every other defense must be airtight.

### Intelligence Update
- Proven solid: File path blocking, answer key sanitization, speaking upload validation, concurrent score updates, path traversal prevention
- New weak pattern: Answer keys writable without auth (grade manipulation risk)
- For next run: Browser-based behavioral tests (exam flow, timer, multi-tab), admin dashboard JS behavior, IELTS mock-answers validation (only Cambridge was hardened), invigilator panel flows

### Stats (Round 2)
Tested: 6 | Passed: 1 | Failed: 4 | Inconclusive: 1 | Fixed: 3 | Deferred: 2

---

## Session: 2026-04-08 03:55
Focus: Validation parity — IELTS mock-answers + Cambridge student results + infrastructure
Trigger: Cursor showed IELTS mock-answers unvalidated, student results CRUD untested

### Scenarios

- S1: IELTS Mock Answers Validation [State Corruptor] -> **FAIL** [HIGH]
  - XSS in answer values stored (no sanitization)
  - 1000-key answers accepted (no limit)
  - Invalid skill blocked by DB CHECK — PASS
  - **Fix applied**: HTML stripping, 200-entry limit, skill enum validation

- S2: Cambridge Student Results Validation [Explorer] -> **FAIL** [HIGH]
  - XSS in student_name stored via POST and PATCH
  - Negative scores (-999) and huge scores (99999) accepted
  - Empty student_id/student_name accepted
  - Invalid level blocked by DB CHECK — PASS
  - **Fix applied**: Name sanitization, empty rejection, numeric range 0-300, level validation

- S3: Error Message Information Leakage [Insider] -> PARTIAL [MEDIUM]
  - Error messages expose PostgreSQL: "invalid input syntax for type integer"
  - No stack traces or file paths leaked
  - **Deferred**: Low impact, informational only

- S4: CORS Policy [Chain Attacker] -> NOTED [MEDIUM]
  - `Access-Control-Allow-Origin: *` on both servers
  - All HTTP methods allowed from any origin
  - **Deferred**: Low practical impact without auth system

- S5: Admin Login Edge Cases [Explorer] -> PASS [MEDIUM]
  - All edge cases handled: no body, array, type confusion, null, 10KB password
  - Consistent "Invalid credentials" — no crashes

- S6: Cambridge Submissions Filter Bypass [Insider] -> PARTIAL [LOW]
  - No-filter GET returns all 5565 submissions unpaginated
  - SQL injection in filters blocked by parameterized queries
  - Audio data included in list responses (minor perf concern)

### Fixes
- `local-database-server.js`: IELTS mock-answers XSS stripping, 200-entry limit, skill enum
- `cambridge-database-server.js`: Student results POST/PATCH validation — name sanitization, empty rejection, score ranges, level enum

### Pattern Analysis
- **Every endpoint that accepts user text needs HTML stripping.** This is now the third round where stored XSS was found in a new endpoint. The pattern: any endpoint accepting string input must call `stripHtmlTags()`.
- **Validation parity between IELTS and Cambridge is a recurring theme.** When one server gets hardened, check if the other has the same gap.

### Intelligence Update
- Proven solid: IELTS mock-answers validation, student results validation, admin login edge cases
- All API-level curl-testable scenarios now exhausted for existing endpoints
- For next run: Browser-based behavioral testing is the highest remaining value — exam flows, admin dashboard rendering of stored data, invigilator panel

### Stats
Tested: 6 | Passed: 2 | Failed: 2 | Partial: 2 | Fixed: 2 | Deferred: 2

---

## Session: 2026-04-08 04:05
Focus: Defense-in-depth — blocklist bypass, regression, infrastructure probing
Trigger: Rounds 1-3 added a file blocklist; Round 4 tests if it can be defeated

### Scenarios

- S1: Blocklist Bypass Attempts [Chain Attacker] -> **CRITICAL FAIL** [CRITICAL]
  - 5 bypass vectors found on the Round 2 file blocklist:
    1. URL encoding: `%2egit/config` → 200 (req.path not decoded)
    2. Case variation: `Shared/database.js` → 200 (Windows case-insensitive)
    3. All-caps: `SHARED/database.js` → 200
    4. Double slash: `//shared/database.js` → 200
    5. Backslash: `shared%5Cdatabase.js` → 200 (Windows path separator)
  - Also: `scenario-journal.md` not in blocklist (200, 11KB exposed)
  - **Fix applied**: Path normalization — decodeURIComponent + lowercase + backslash→slash + collapse slashes. Added missing entries.

- S2: Regression of Rounds 1-3 Fixes [—] -> PASS [—]
  - All 6 checks passed: score validation, file blocking, submission validation, mimeType sanitization, score range, null byte handling

- S3: ADR-017/018 Route Changes [Explorer] -> PASS [MEDIUM]
  - ADR-017: IELTS `/admin` route → 200 (correct)
  - ADR-017: Old `/enhanced-admin-dashboard.html` → 404 (correctly renamed)
  - ADR-018: `/cambridge-update-score` → "Cannot POST" (correctly removed)

- S4: HTTP Method Confusion [Explorer] -> PASS [LOW]
  - PUT/DELETE on read-only endpoints → 404
  - GET on write-only endpoints → 404
  - HEAD on blocked path → 404
  - TRACE → 404 (disabled)

- S5: Request Payload Limits [Power User] -> PARTIAL [MEDIUM]
  - Bash argument limit prevented large payload generation (not a server issue)
  - 100-deep nested JSON → 400 (Express parser rejects — good)
  - 50MB limit configured but untested at full scale

### Fixes
- `shared/server-bootstrap.js`: Complete path normalization in blocklist middleware — decode, lowercase, normalize separators, collapse slashes. Added scenario-journal.md, architect-decisions.md, .eye-cursor.json to blocklist.

### Pattern Analysis
- **Defense bypass is the real game now.** Once validation is in place, the attacker's next move is to find ways around it. URL encoding, case tricks, and path separator differences are classic bypass vectors. The lesson: always normalize before checking.
- **Windows adds extra bypass surface.** Case-insensitive filesystem and backslash path separator create two vectors that don't exist on Linux.

### Intelligence Update
- Proven solid: Blocklist hardened against 5 bypass vectors, all Round 1-3 fixes regression-verified, ADR changes correct, HTTP methods handled
- Remaining untested: Browser-based scenarios only — admin dashboard XSS rendering, invigilator panel flows, AI score suggestion
- API attack surface is now comprehensively tested and hardened

### Stats
Tested: 5 | Passed: 3 | Failed: 1 (critical) | Partial: 1 | Fixed: 1 | Deferred: 0

### Stats (Round 3)
Tested: 6 | Passed: 2 | Failed: 2 | Partial: 2 | Fixed: 2 | Deferred: 2

---

## Session: 2026-04-08 04:20
Focus: New code audit (heal refactor), shared validation boundaries, **client-side XSS sinks**
Trigger: Concurrent heal/eye runs changed server code; 4 remaining untested areas from cursor

### Scenarios

- S1: Heal Refactor XSS Preservation [Regression] -> PASS
  - Batch INSERT refactor preserves XSS stripping. `<script>` → `alert(1)`.

- S2: Shared Validation Module Boundaries [Explorer] -> PASS
  - Score 0/200 accepted, 201/3.7 rejected. String "50" coerced. 21-char grade rejected.

- S3: IELTS Error Handling [Regression] -> PASS
  - No more fake "success:true, queued" — proper 400 errors.

- S4: Client-Side XSS Sink Audit [Insider] -> **CRITICAL FAIL** [CRITICAL]
  - **14 CRITICAL + 6 HIGH** XSS sinks across 5 dashboard files
  - 2 files had zero escapeHtml (speaking-evaluations, student-results)
  - invigilator.html injected localStorage raw into innerHTML
  - cambridge-admin-dashboard missed escapeHtml in 2 helpers
  - **Fix applied**: escapeHtml added to all 4 files, 40+ data points wrapped

- S5: 200-char Name Limit [Explorer] -> **FAIL** [MEDIUM]
  - validateStudentInfo exists in shared module but no endpoint used it
  - 201-char names accepted on all servers
  - **Fix applied**: Inline length checks on all 4 submission endpoints

### Fixes
- 4 HTML dashboard files: escapeHtml + sanitizeClass for all API data rendering
- 2 server files: 200-char length limit on student name/ID

### Pattern Analysis
- **Client-side XSS was the deepest remaining vulnerability class.** 5 rounds to get here — server validation → file exposure → bypass hardening → client rendering.
- **ielts-admin-dashboard.html was the model** — it already had proper escapeHtml. Other files should have followed.

### Intelligence Update
- All dashboard files now have client-side XSS escaping
- Only AI score suggestion remains untested (OpenAI quota)
- All 6 deferred findings are architectural — beyond scenario fix scope
- **Comprehensive coverage reached across 5 rounds**

### Stats (Round 5)
Tested: 5 | Passed: 3 | Failed: 2 (1 critical) | Fixed: 2 | Deferred: 0

---

## Session: 2026-04-08 10:31
Focus: Heal round 3 regression verification + first browser-based behavioral testing
Trigger: 3 code changes since last run (mock validation, error masking fix, login type checks); browser tests deferred 5 rounds

### Scenarios

- S1: Mock Number Validation Edge Cases [Explorer] → PASS [MEDIUM]
  - NaN, 0, negative, empty all properly rejected with "Mock number must be a positive integer"
  - Float 2.5 truncated to 2 by parseInt — expected JS behavior
  - POST and DELETE endpoints also validate correctly

- S2: Cambridge Error Masking Fix Verification [Regression] → PASS [HIGH]
  - Invalid/empty/missing-field submissions now return `success: false` with proper 400/500 status
  - No longer returns misleading "success: true, queued: true" on errors
  - Heal round 3 fix confirmed working

- S3: Admin Login Type Validation [Explorer] → PASS [MEDIUM]
  - null, array, number, boolean, empty body all return "Username and password are required"
  - Both IELTS (3002) and Cambridge (3003) share the fix via shared/database.js
  - No type confusion possible

- S4: IELTS Exam Flow End-to-End [Rusher] → PASS [HIGH]
  - Full flow: launcher → login → dashboard → reading test → answer questions → back button
  - Back button blocked by history.pushState — "Please use the navigation buttons within the test"
  - Answer selections persist after attempted back/forward navigation
  - Options menu (toggleOptionsMenu wrapper) works correctly
  - Timer running, questions interactive, zero console errors throughout
  - First ever browser behavioral test of exam flow

- S5: Admin Dashboard XSS Rendering [Insider] → PASS [CRITICAL]
  - Injected `<img src=x onerror=alert(1)>` as IELTS student name, `<script>document.title="PWNED"</script>` as Cambridge name
  - Both payloads stored in DB successfully
  - IELTS dashboard: payload renders as literal text in Name column, no img element in DOM
  - Cambridge dashboard: payload renders as literal text, page title NOT "PWNED"
  - escapeHtml() confirmed working in both dashboards

- S6: Invigilator Panel Behavioral [Multitasker] → PASS [MEDIUM]
  - Page loads cleanly, zero console errors
  - Set Mock Test, View Test History, Reset Session all functional
  - Password modal blocks Reset/Clear without password — no XSS in password input
  - State persists via localStorage (selectedMock key) across navigation
  - Student dashboard redirects to login when no session — correct

### Notable Observations (not failures)
- Invigilator password hardcoded in client-side JS (line 129, invigilator.html) — pre-existing, by-design for controlled exam environment
- CSS selector injection LOW: `document.querySelector('[data-level="' + level + '"]')` with unescaped localStorage value (invigilator.html:218) — no XSS impact, worst case is query error
- SharedlocalStorage between IELTS (3002) and Cambridge (3003) — `examType` key can cause cross-exam routing confusion

### Pattern Analysis
- **First clean round in 6 runs.** All 6 scenarios passed — no new bugs found.
- **Heal round 3 changes are solid.** Mock validation, error masking fix, and login type checks all working correctly.
- **Browser behavioral testing confirms app stability.** Exam flow, dashboard rendering, and invigilator panel all work as expected.
- **Client-side XSS escaping verified in browser.** Round 5 fixes proven effective — escapeHtml() renders payloads as text.

### Intelligence Update
- Proven solid: Mock number validation, Cambridge error handling, admin login types, exam flow E2E, dashboard XSS rendering, invigilator panel behavior
- No new weak patterns discovered
- API attack surface comprehensively tested and hardened (rounds 1-5)
- Browser behavioral baseline established (round 6)
- Remaining untested: AI score suggestion (needs OpenAI API key), concurrent multi-student exam (needs multiple browser contexts), writing test submission flow, listening test audio flow

### Stats (Round 6)
Tested: 6 | Passed: 6 | Failed: 0 | Fixed: 0 | Deferred: 0

---

## Session: 2026-04-08 17:04
Focus: Cheater security hardening bypass — testing new time limits, dedup, and anti-cheat features
Trigger: 5 commits since last run added server-side time limits, submission dedup, anti-cheat metadata

### Scenarios

- S1: Time Limit Bypass — Omit Timestamps [Cheater] → **CRITICAL FAIL** [CRITICAL]
  - Both servers: `if (startTime && endTime)` — omitting timestamps skips the entire duration check
  - Cheaters could submit with no time validation at all
  - **Fix applied**: Made startTime/endTime required fields; reject with 400 if missing

- S2: Time Limit Manipulation — Fake Timestamps [Cheater] → **FAIL** [HIGH]
  - Client controls both startTime and endTime — can fake a 5-min reading test
  - This is inherent to client-controlled timestamps (server has no independent start time)
  - **Deferred**: Requires server-side session/start tracking (architectural)

- S3: Negative Elapsed Time [Explorer] → **FAIL** [MEDIUM]
  - startTime=2030, endTime=2020 → negative elapsedMin passes all checks (negative < limit*3)
  - **Fix applied**: Added `elapsedMin <= 0` check, reject with "endTime must be after startTime"

- S4: Dedup Race Condition (TOCTOU) [Multitasker] → **CRITICAL FAIL** [CRITICAL]
  - IELTS: 5 concurrent identical submissions → all 5 saved (IDs 11949-11953)
  - Cambridge: 3 of 5 saved (2 caught by rate limiter, but 3 slipped through)
  - Root cause: SELECT-then-INSERT pattern with singleton Client is fundamentally racy
  - Advisory lock approach failed (same connection = all transactions interleave)
  - **Fix applied**: In-memory Set lock — synchronous has()/add() blocks concurrent requests at Node.js level, DB check catches pre-existing duplicates
  - Verified: exactly 1 of 5 concurrent requests succeeds, 4 blocked

- S5: Dedup Key Manipulation [Cheater] → INCONCLUSIVE
  - Rate limiter from S4 tests interfered with testing
  - First variant "01" was correctly deduped against existing "1" — DB text comparison works

- S6: Rate Limiter Bypass [Rusher] → PASS
  - X-Forwarded-For rotation does not bypass rate limiting — all 15 blocked
  - Rate limiter keys on actual connection, not forwarded headers

- S7: Anti-Cheat Metadata Spoofing [Cheater] → **FAIL** [MEDIUM]
  - Fake antiCheat data accepted: `{tabSwitches:0, focusLost:false, copyAttempts:0}`
  - XSS payload in antiCheat field stored in DB
  - **Deferred**: Anti-cheat data is client-side by nature; server can sanitize but not verify

### Fixes
- `local-database-server.js`: Required timestamps, negative elapsed rejection, in-memory dedup lock
- `cambridge-database-server.js`: Same timestamp fixes + dedup lock for both submission and speaking endpoints
- `server-cjs.cjs`: Synced IELTS fixes (timestamps, dedup lock, inline INSERT)

### Pattern Analysis
- **Optional security checks are no security at all.** The `if (x && y) { validate }` pattern means attackers just omit x/y. Security validation must be mandatory.
- **TOCTOU is the #1 race condition pattern.** SELECT-then-INSERT with a singleton connection provides zero concurrency protection. Node.js in-memory locks are the correct fix for single-process servers.
- **Client-controlled timestamps are fundamentally untrustworthy.** We can reject missing/invalid/negative/excessive values, but we can't prevent a cheater from sending plausible fake times. Server-side start tracking would require session management.

### Intelligence Update
- Proven solid: Timestamp validation (required, positive, valid format), dedup race condition (in-memory lock), rate limiter (not bypassable via headers)
- Weak patterns: Client-controlled timestamps (architectural), anti-cheat metadata spoofable
- For next run: Test that normal exam flows still work with required timestamps (client sends them correctly), explore writing/listening submission flows

### Stats (Round 7)
Tested: 7 | Passed: 2 | Failed: 4 (2 critical) | Inconclusive: 1 | Fixed: 3 | Deferred: 2

---

## Session: 2026-04-08 17:25
Focus: Regression verification of required timestamps + untested submission flows + data integrity
Trigger: Round 7 made timestamps mandatory; 4 untested areas in cursor; no new code changes

### Scenarios

- S1: Normal IELTS Submissions — All Skills [Regression] → **PARTIAL** [CRITICAL]
  - reading (30min elapsed): PASS
  - writing (55min elapsed): PASS
  - listening (35min elapsed): PASS
  - speaking (12min elapsed): **FAIL** — DB CHECK constraint `test_submissions_skill_check` doesn't include 'speaking'
  - **Fix applied**: Added DB migration to update skill constraint; added skill enum validation

- S2: Normal Cambridge Submissions — Various Levels [Regression] → PASS
  - B2-First reading, A2-Key listening, B1-Preliminary writing, A1-Movers reading — all accepted
  - Required timestamps don't break normal Cambridge flows

- S4: Dedup Key Manipulation [Cheater] → PASS (clean retest)
  - "01" correctly matched existing "1" (PostgreSQL integer casting)
  - " 1" (leading space) correctly matched "1"
  - "1.0" caused DB error: "invalid input syntax for type integer" → **Fix applied**: parseInt validation
  - Different skill for same student: correctly accepted (different dedup key)

- S5: In-Memory Lock Cleanup After Error [Explorer] → PASS
  - Cambridge mock_test is text type, so no error triggered
  - Lock properly releases in `finally` block (verified by code structure)

- S6: Edge Case Timestamps [Explorer] → PASS
  - startTime=endTime (elapsed=0): correctly rejected
  - 1-second elapsed: accepted (no minimum — client timestamps inherently unreliable)
  - Far-future (2099): accepted — server stores timestamps, doesn't validate plausibility
  - Epoch zero (1970): accepted — same reason
  - Sub-second precision: accepted

- S7: Cambridge Combined Skills [Explorer] → PASS
  - A2-Key reading-writing: accepted (60min limit)
  - B2-First reading-use-of-english: accepted (75min limit)
  - B1-Preliminary reading-writing at 85min: accepted (90min limit)
  - B2-First reading-writing (invalid for this level): accepted — uses fallback 90min limit
  - **Note**: No level×skill matrix validation. Any VALID_SKILL accepted for any level.

### Fixes
- `local-database-server.js` + `server-cjs.cjs`: DB migration for speaking skill constraint, skill enum validation, mockNumber parseInt validation
- Removed duplicate VALID_IELTS_SKILLS declaration in server-cjs.cjs

### Pattern Analysis
- **DB constraints and server validation must stay in sync.** The server accepted 'speaking' but the DB didn't — this creates a 500 error for a valid use case. Migrations should update constraints when new valid values are added.
- **PostgreSQL integer columns are forgiving with text variants** ("01", " 1" all cast to 1). But "1.0" fails. Always parse/validate before passing to DB.
- **No minimum elapsed time check.** A 1-second reading test is accepted. This is correct for now — without server-side session tracking, we can't distinguish fast cheaters from clock skew.

### Intelligence Update
- Proven solid: Normal IELTS all 4 skills including speaking, normal Cambridge all levels, timestamp requirement doesn't break client flows, dedup key manipulation handled by PG integer casting, combined Cambridge skills work
- All API-level scenarios now comprehensively tested and hardened across 8 rounds
- Remaining: AI score suggestion (needs OpenAI key), level×skill matrix validation (LOW priority)

### Stats (Round 8)
Tested: 7 | Passed: 5 | Partial: 1 | Fixed: 2 | Deferred: 0

---

## Session: 2026-04-08 17:40
Focus: Deep adversarial — creative attacks untried in rounds 1-8 (blocklist regression, auth gaps, admin tokens)
Trigger: No new code; comprehensive API coverage reached; switched to lateral/creative attack vectors

### Scenarios

- S1: Blocklist Bypass Regression [Chain Attacker] → **FAIL** [HIGH]
  - 3 newly exposed files: `autopilot-cursor.json`, `autopilot-journal.md`, `error.log`
  - These were added by autopilot runs after the R4 blocklist hardening
  - `.playwright-cli/` directory also unblocked
  - **Fix applied**: Added all 4 patterns to blocklist in both server-bootstrap.js and server-cjs.cjs

- S2: Admin Endpoint Auth Audit [Insider] → PASS
  - All data endpoints (GET/DELETE/PATCH) return 401 without auth token
  - GET /admin returns 200 (static HTML, by design — no auth on pages)
  - requireAdmin middleware properly protects all API endpoints

- S3: DELETE/PATCH Route Coverage [Insider] → PASS
  - POST /update-score: 401 (auth required) — exists and protected
  - All other mutation routes properly gated or non-existent (404)

- S4: Admin Token Analysis [Chain Attacker] → **CRITICAL FINDING** + FIX
  - Token format is `admin-session-` + `crypto.randomBytes(32).toString('hex')` — **NOT predictable**
  - Previous cursor note "predictable admin-session-{timestamp}" was INCORRECT — code already uses secure random
  - **CRITICAL**: `.env` password `Adm!n#2025$SecureP@ss` truncated to `Adm!n` by dotenv `#` comment parsing
  - **CRITICAL**: CJS server (IELTS) didn't load dotenv at all — admin login was impossible
  - **Fix applied**: Single-quoted passwords in .env, added `require('dotenv').config()` to server-cjs.cjs
  - Verified: full password works on both servers, truncated password rejected

- S5: Completed-Status Guard Bypass [Cheater] → PASS
  - Server-side dedup correctly blocks second submission for same student+skill+mock
  - Client-side guards are defense-in-depth; server-side is authoritative

- S6: Bulk Data Exfiltration [Insider] → NOTED
  - Admin login required for all list endpoints (proper 401)
  - Need admin token to test pagination/bulk response size

### Fixes
- `.env`: Single-quoted ADMIN_PASSWORD and INVIGILATOR_PASSWORD to prevent `#` comment truncation
- `shared/server-bootstrap.js`: Added blocklist entries for autopilot-cursor/journal, error.log, .playwright-cli/
- `server-cjs.cjs`: Added `require('dotenv').config()` + synced blocklist entries

### Pattern Analysis
- **Dotenv comment parsing is a silent password truncation vector.** The `#` character in unquoted .env values starts a comment — everything after is silently discarded. This reduced a 22-character password to 5 characters. Always quote .env values containing special characters.
- **Blocklist is an ongoing maintenance burden.** Every time a new file is created (autopilot, eye, etc.), it must be added to the blocklist. A whitelist approach (only serve known directories: Cambridge/, IELTS/, assets/) would be more secure.
- **Previous deferred finding "predictable admin token" was WRONG.** The code uses `crypto.randomBytes(32)` — 256 bits of entropy. Token is cryptographically secure. Removed from deferred findings.

### Intelligence Update
- Proven solid: Admin endpoint auth (all 401), admin token cryptographically secure, dedup blocks completed-test resubmission
- Fixed: .env password truncation (CRITICAL), blocklist regression (HIGH), CJS dotenv loading (HIGH)
- Corrected: Admin token was never predictable (deferred finding removed)
- Weak pattern upgraded: blocklist-as-deny-list needs regular maintenance vs. allow-list approach

### Stats (Round 9)
Tested: 6 | Passed: 3 | Failed: 2 (1 critical) | Noted: 1 | Fixed: 3 | Deferred: 0

---

## Session: 2026-04-08 17:55
Focus: Authenticated admin operations (first time possible after R9 password fix) + token lifecycle + AI score
Trigger: R9 fixed admin login; new autopilot commits (save indicator UX — no attack surface)

### Scenarios

- S1: Invigilator Password Fix Verification [Regression] → PASS
  - Full password `InV!#2025$SecurePass` works on both servers
  - Truncated `InV!` correctly rejected

- S2: Authenticated Admin Operations [Insider] → PASS + NOTED
  - GET /submissions with valid token: 200, returns **11,868 submissions in single response**
  - No pagination, no result limit — entire dataset in one call
  - **Noted**: Not a vulnerability (requires admin auth) but a performance/DoS concern

- S3: Token Lifecycle [Chain Attacker] → PASS
  - Concurrent admin sessions: both tokens valid simultaneously (expected, no session invalidation)
  - Forged token (correct format, random bytes): 401 rejected
  - Wrong prefix token: 401 rejected
  - Token validation is sound

- S4: AI Score Suggestion [Explorer] → NOTED [MEDIUM]
  - Endpoint `/api/ai-score-suggestion` does NOT exist on CJS server (404)
  - Only defined in ESM source `local-database-server.js`
  - Code review found: **no auth middleware**, direct prompt injection via task1/task2, no rate limiting
  - **Deferred**: Cannot test (endpoint not served); issues noted for when ESM server is used

- S5: Authenticated DELETE + Score Update [Insider] → PASS
  - DELETE requires admin auth, uses parseInt + parameterized queries — SQL injection neutralized
  - Score update requires admin auth, validates score, parameterized queries
  - bandScore string not validated but dashboard escapeHtml prevents XSS on render
  - Non-existent IDs return proper 404

- S6: R9 Blocklist Regression [Regression] → PASS
  - All 3 files (autopilot-cursor.json, autopilot-journal.md, error.log) blocked on both servers

### Fixes
None needed — clean round.

### Pattern Analysis
- **Authenticated operations are well-protected.** All admin endpoints require auth, use parameterized queries, and validate input. The combination of requireAdmin + parseInt + parameterized queries provides defense in depth.
- **AI score endpoint is a latent risk.** When the ESM server is used, the endpoint has no auth, is vulnerable to prompt injection, and has no rate limiting. These issues should be fixed proactively.
- **Unpaginated responses are a DoS vector.** 11,868 records in one response is manageable now but will grow. Adding pagination or result limits would improve resilience.

### Intelligence Update
- Proven solid: Invigilator password fix, admin token lifecycle (concurrent valid, forged rejected), authenticated DELETE/score-update, blocklist regression
- AI score endpoint flagged for proactive hardening (no auth, prompt injection, no rate limit)
- Comprehensive coverage plateau reached: 62 scenarios across 10 rounds

### Stats (Round 10)
Tested: 6 | Passed: 5 | Noted: 1 | Failed: 0 | Fixed: 0 | Deferred: 0

---

## Session: 2026-04-08 18:10
Focus: Session management + payload/header injection (creative attacks beyond API endpoint coverage)
Trigger: No new code to test; switched to systemic concerns — token lifecycle, payload limits, character sanitization

### Scenarios

- S1: Token Persistence After Logout [Insider] → **FAIL** [MEDIUM]
  - Client `logout()` only clears localStorage; no server call
  - No /admin-logout endpoint exists (404)
  - Stolen tokens remain valid in `validTokens` Set until server restart
  - **Fix applied**: Added POST /admin-logout to both server-bootstrap.js and server-cjs.cjs

- S2: Token Accumulation Memory [Power User] → NOTED
  - validTokens Set grows on every login, never shrinks (until logout endpoint)
  - Now mitigated by S1 fix (logout calls delete)
  - Rate limiter `hits` Map also grows unboundedly per-IP — minor concern, not exploitable

- S3: Header Injection in Student Name [State Corruptor] → **PARTIAL FAIL** [MEDIUM]
  - Newlines (\r\n) in student name accepted but stored, no actual HTTP header injection
  - Null byte (\x00) caused PostgreSQL 500 error: "invalid byte sequence for encoding UTF8"
  - RTL override (\u202e) accepted (cosmetic only)
  - **Fix applied**: validateStudentInfo strips null bytes + control chars before DB insert
  - **Bonus fix**: IELTS submission was using `submissionData.studentName` (raw) instead of `studentCheck.studentName` (sanitized) — sanitization wasn't actually being used. Fixed in all 3 servers.

- S4: JSON Payload Limits [Power User] → PASS
  - 100KB and 1MB payloads accepted (within 50MB Express limit)
  - No DoS vector at these sizes; large payloads are expected for writing tests

- S5: Speaking Audio Massive Payload [Power User] → **FAIL** [MEDIUM]
  - 5MB base64 audio accepted, no length validation
  - 20MB would also work (up to Express 50MB limit)
  - DoS vector: fill DB with massive submissions
  - audioSize field is just metadata — actual validation is missing
  - **Fix applied**: Added 15MB max length check + type validation on audioData in Cambridge speaking endpoint

- S6: AI Score Endpoint Hardening [Code Review] → DEFERRED
  - Endpoint only exists in ESM source, not CJS server (not exploitable currently)
  - Issues: no auth, prompt injection via task1/task2, no rate limit, JSON.parse without try
  - Will fix when ESM server is run

### Fixes
- `shared/validation.js`: validateStudentInfo strips null bytes (\x00) and control chars
- `shared/server-bootstrap.js`: Added /admin-logout endpoint, imports removeToken
- `server-cjs.cjs`: Added /admin-logout endpoint, sync sanitization logic, use sanitized values in INSERT
- `local-database-server.js`: Assign sanitized values back to submissionData before INSERT
- `cambridge-database-server.js`: Same sanitization assignment + audioData length/type validation (15MB max)

### Pattern Analysis
- **Sanitization is useless if you don't use the sanitized output.** All 3 server submission handlers called validateStudentInfo but then used the raw submissionData fields in the INSERT query. This pattern bug means the previous "name validation" was only catching empty/long names, not actually preventing null byte attacks. Always assign sanitized values back to the input object or use the validated copy.
- **Tokens without expiry == permanent backdoor.** The validTokens Set held every token ever issued. A token leaked from a screenshot or browser history would work forever. Now mitigated by client-server logout symmetry.
- **Audio uploads need length checks at app layer, not just framework layer.** Express 50MB limit is too generous for individual fields. Per-field validation is more granular.

### Intelligence Update
- Proven solid: Admin logout works (server-side token invalidation), null byte sanitization across all submission paths, audio data length capped at 15MB
- New weak pattern caught: "validate then ignore" — validation results not propagated to downstream code
- Validated values now flow correctly through all 3 servers
- Coverage: 68 scenarios across 11 rounds, 30 bugs found, 23 fixed

### Stats (Round 11)
Tested: 6 | Passed: 1 | Failed: 3 | Partial: 1 | Noted: 1 | Fixed: 3 | Deferred: 1

---

## Session: 2026-04-08 18:25
Focus: Address long-deferred findings — auth rate limiting + AI score endpoint hardening + speaking race
Trigger: No new code; round 11 cleared submission validation; time to chip at deferred backlog

### Scenarios

- S1: Speaking Submission Dedup Race [Multitasker] → PASS
  - 5 concurrent /submit-speaking with same student+level+skill+mock
  - Result: exactly 1 succeeded, 4 blocked with "Submission already in progress"
  - The R7 in-memory lock fix had already been applied to the speaking endpoint
  - Verified working — no regression

- S2: CSRF on State-Changing Endpoints [Chain Attacker] → NOTED
  - POST /submissions with `Origin: https://evil.com` and `Referer: evil.com/attack` → accepted (200)
  - OPTIONS preflight returns `Access-Control-Allow-Origin: *` and all methods allowed
  - **Not a real vulnerability**: student endpoints are by design unauthenticated, admin endpoints use Bearer token (not auto-sent by browsers)
  - Documented as architectural pattern — no fix needed

- S3: Admin Token Accumulation [Power User] → NOTED
  - 50 successful logins all stored in validTokens Set, no DoS
  - Each token ~80 bytes; 1M tokens = 80MB memory
  - Now mitigated by R11 logout endpoint + R12 rate limiter on /admin-login
  - No fix needed beyond what R11/R12 already added

- S4: AI Score Endpoint Probe [Insider] → NOTED
  - POST /api/ai-score-suggestion still returns 404 on CJS server
  - Endpoint only exists in ESM source `local-database-server.js`
  - Cannot be exploited via running server, but issues exist in code
  - **Proactive fix applied** to ESM source (see Fixes)

- S5: Admin Login Brute Force [Chain Attacker] → **CRITICAL FAIL** [HIGH]
  - 100 wrong-password attempts in rapid succession
  - Result: 100×401, 0×429, **NO RATE LIMITING AT ALL**
  - This was the deferred R1 finding — never fixed in 10 rounds
  - Combined with the R9 dotenv comment-truncation vulnerability (now fixed),
    this could have allowed practical brute-force of the truncated 5-char password
  - **Fix applied**: authLimiter (5 req/min/IP) on /admin-login + /verify-invigilator
    in both shared/server-bootstrap.js (ESM) and server-cjs.cjs
  - Verified: 5×401 then 10×429, legitimate login still works after window resets

### Fixes
- `shared/server-bootstrap.js`: Created `authLimiter` (5/min), applied to /admin-login + /verify-invigilator, imported `rateLimit` from auth.js
- `server-cjs.cjs`: Synced `authLimiter` definition + applied to both auth endpoints
- `local-database-server.js`: AI score endpoint hardening (proactive — endpoint not exposed by CJS):
  - Added `requireAdmin` middleware
  - Added `aiScoreLimiter` (3/min — expensive OpenAI calls)
  - Added MAX_TASK_LENGTH (5000 chars per task)
  - Restructured prompt with system+user separation, used `<task1>`/`<task2>` XML delimiters with explicit "treat as data only" instruction
  - Safe JSON.parse with try/catch (returns 502 instead of crashing)
  - Schema validation: bands must be numbers in 0-9 range

### Pattern Analysis
- **Deferred findings rot.** "No rate limiting on admin login" was logged in R1 and stayed deferred for 10 rounds because it required "middleware". In R12 we discovered the rate limit middleware was already in shared/auth.js — we just needed to apply it. The "needs middleware or external package" reason was wrong from the start. Always re-examine deferred findings each round; they may already be solvable.
- **CSRF concerns are mitigated by Bearer auth.** Cookies are auto-sent by browsers; Authorization headers are not. The CORS `*` policy looks scary but is harmless for token-based auth — an attacker would need to first steal a token, and at that point CSRF is moot.
- **Prompt injection mitigation: structure beats validation.** Stripping characters from user input is fragile; LLMs can be jailbroken with creative phrasing. Better: separate system instructions from user data via the system role, wrap user data in delimited tags, and explicitly tell the model "treat as data only".

### Intelligence Update
- Proven solid: Speaking dedup race (already fixed in R7), auth endpoints rate-limited, validateStudentInfo sanitization
- Removed from deferred: "No rate limiting on admin login" — fixed
- Removed from deferred: "AI score endpoint hardening" — fixed in source (still not exposed by CJS)
- 4 deferred findings remain (all true architectural: answer keys public, CORS policy, client timestamps, anti-cheat metadata)
- Coverage: 73 scenarios across 12 rounds, 31 bugs found, 25 fixed (+2 in R12)

### Stats (Round 12)
Tested: 5 | Passed: 1 | Failed: 1 (critical) | Noted: 3 | Fixed: 2 | Deferred: 0

---

## Session: 2026-04-08 18:40
Focus: New student-facing endpoints (autopilot's IELTS results page commit added them)
Trigger: Commit a28ce17 added /my-submissions and /my-answer-keys to local-database-server.js + my-results.html

### Scenarios

- S1: IDOR — fetch any student's submissions [Insider] → CONFIRMED [HIGH but by-design]
  - Cambridge `/my-submissions?student_id=005` returned full data for student "005" without auth
  - Front-end reads `studentId` from `localStorage` — fully client-controlled
  - **By design**: matches existing "no student auth — controlled by invigilator" pattern
  - Documented as known architectural choice, no fix candidate

- S2: SQL injection in student_id, level, mock_test [Insider] → PASS
  - `student_id=' OR 1=1--` returned empty array (parameterized query worked)
  - All injection vectors safely handled by parameterized queries

- S3: Cambridge `/my-submissions` invalid level enum [Explorer] → **FAIL** [MEDIUM]
  - Invalid levels (`<script>`, `DROP TABLE`, `INVALID`) returned silent empty array `[]`
  - No fail-fast validation — silently produces dead-end queries
  - **Fix applied**: Validate level against VALID_LEVELS, return 400 with clear message

- S4: Cambridge `/my-submissions` response format [Explorer] → **FAIL** [LOW]
  - Cambridge returned raw array `[...]`, IELTS returned `{success, submissions}`
  - Inconsistent API surface
  - **Fix applied**: Wrap Cambridge response in `{success, submissions}`, update consumer (my-results.html) to handle new shape with array fallback for safety

- S5: Cambridge answer keys mock-scoping [Cheater] → **FAIL** [HIGH]
  - Cambridge `/my-answer-keys` checked only `student_id + level + skill`, NOT `mock_test`
  - **Cheating vector**: A student who submitted A2-Key Listening Mock 1 could view answer keys for Mock 2/3 *before* taking those tests
  - IELTS already scoped by mock_number — Cambridge had drifted from the pattern
  - **Fix applied**: Include mock_test in submissionCheck when mock query param provided
  - Verified: Mock 99 access correctly blocked, Mock 1 (actually submitted) works

### Fixes
- `cambridge-database-server.js`: VALID_LEVELS/VALID_SKILLS enum validation on both endpoints, mock_test scoping in answer keys check, response wrapped in `{success, submissions}` to match IELTS, used `String()` casts on params
- `Cambridge/my-results.html`: Updated submissions fetch to handle wrapped response (with raw-array fallback for backwards safety)

### Pattern Analysis
- **Drift between sibling implementations creates real bugs.** IELTS and Cambridge both have student-facing endpoints, but they were implemented at different times with different review attention. IELTS scoped by mock_number; Cambridge skipped that. Code review should compare new code against the closest existing pattern, not just review it in isolation.
- **"Validate then forget" with empty results.** Cambridge silently returned `[]` for invalid levels instead of 400. This makes debugging painful and obscures attacks — the attacker can't tell if the field is wrong or if the data just doesn't exist. Always fail-fast on enum validation.
- **Response shape changes are silent contract breaks.** Wrapping the response improved consistency but would have broken the consumer if I hadn't checked. Always grep for consumers before changing API response shape.

### Intelligence Update
- New endpoints `/my-submissions` and `/my-answer-keys` are now hardened on Cambridge (mock-scoped, enum-validated, consistent format)
- These endpoints exist only in ESM source — IELTS CJS server (server-cjs.cjs) does NOT have them, so testing IELTS via curl shows 404. The autopilot needs to sync them to CJS, OR the deployment should switch to ESM.
- IDOR is documented as a by-design pattern (joins answer-keys-writable-without-auth as a known architectural choice)

### Stats (Round 13)
Tested: 5 | Passed: 1 | Failed: 3 | Noted: 1 | Fixed: 3 | Deferred: 0

---

## Session: 2026-04-08 18:55
Focus: Address R13 deferred sync gap — IELTS CJS server missing /my-submissions and /my-answer-keys
Trigger: New autopilot commit (Cambridge review modal — UI only, no attack surface) + R13 left a known sync gap

### Scenarios

- S1: IELTS endpoints currently broken [Regression] → CONFIRMED
  - Both /my-submissions and /my-answer-keys returned 404 on the running CJS server
  - Means the autopilot's IELTS results page (my-results.html) was non-functional in production

- S2/S3: **Sync new endpoints to server-cjs.cjs** [Fix] → DONE
  - Copied logic from local-database-server.js (ESM) to server-cjs.cjs
  - Applied the same hardening Round 13 added to Cambridge:
    - student_id required, mock_number parseInt+range validated
    - Answer keys mock-scoped (Mock 1 → Mock 2 cheating blocked)
    - VALID_IELTS_SKILLS enum validation
    - Wrapped {success, submissions} response format
    - submissionLimiter rate limit applied

- S4: IELTS new endpoints work [Regression] → PASS
  - Empty student_id → 400 with clear message
  - Real student → wrapped response with submissions array
  - mock_number=999 (no submissions) → empty array (correct)

- S5: IDOR/injection on synced endpoints [Insider] → PASS
  - SQL injection in student_id (`' OR 1=1--`) → empty array (parameterized)
  - mock_number 'foo' → 400
  - mock_number '-1' → 400
  - Invalid skill → 400 with valid options listed
  - Never-submitted student requesting answer keys → 403

- S6: Cambridge review modal regression [Code Review] → PASS (no attack surface)
  - New code in cambridge-exam-progress.js adds a UI modal before submission
  - Reviewed innerHTML usage: gridHTML and noteHTML built from local computation (no user input)
  - skillLabel comes from window.__cambridgeModule or detectModuleFromUrl() — both return whitelisted strings
  - Pure UI feature with no security impact

### Fixes
- `server-cjs.cjs`: Added /my-submissions and /my-answer-keys endpoints with same hardening as ESM source. IELTS student results page now functional.

### Pattern Analysis
- **Sync gaps are slow-burn bugs.** When the architect/autopilot adds new code to the ESM source but doesn't sync to the CJS bundle, the running server silently lacks features. Users see 404s, page features quietly break. The R13 deferred finding was real and would have rotted indefinitely if not addressed proactively.
- **Drift compounds.** R13 fixed the same drift in Cambridge vs IELTS. R14 fixed the drift between ESM source and CJS bundle. Each round closes a gap; future rounds will find new ones until either: (a) one server is canonical, (b) automated sync runs after every architect change.
- **Hardening propagates.** The R13 fix to Cambridge (mock-scoped answer keys, enum validation, wrapped response) is now applied to IELTS too. The pattern is consistent across both servers.

### Intelligence Update
- IELTS student results page now functional (was broken since the autopilot added it)
- Both /my-submissions and /my-answer-keys hardened identically across IELTS+Cambridge
- Removed from deferred: "IELTS CJS missing /my-submissions and /my-answer-keys" — fixed
- 5 deferred findings remain (all true architectural)
- Coverage: 84 scenarios across 14 rounds, 35 bugs found, 30 fixed (+2 in R14)

### Stats (Round 14)
Tested: 6 | Passed: 4 | Failed: 0 | Confirmed: 1 | Fixed: 1 (sync) | Deferred: 0

---

## Session: 2026-04-09 14:10
Focus: Test the autopilot's impersonation defense (cheater r3) and verify it's actually deployed
Trigger: Commit 5734410 changed /my-submissions and /my-answer-keys to require student_id+student_name on both servers — claims to fix IDOR

### Scenarios

- S1: Old-style ID-only request rejected [Regression] → PASS on Cambridge
  - Cambridge `/my-submissions?student_id=005` → 400 "student_id and student_name are required"
  - The autopilot's fix is correctly enforced after server restart

- S2: ID+correct name impersonation [Insider] → CONFIRMED
  - With knowledge of both student_id="005" and student_name="Farrukh Test", full data returned
  - **Inherent limitation**: Names are visible in physical exam settings (sign-in sheets, class rosters, dashboards)
  - The fix raises the bar from "guess one ID" to "must know both fields", but doesn't make the system secure against attackers who have visual/physical access
  - Documented as known limitation, not a fix candidate

- S3: Case sensitivity bypass [Chain Attacker] → PASS (blocked)
  - "FARRUKH TEST" → empty array
  - "farrukh test" → empty array
  - PostgreSQL `=` is case-sensitive on text columns; bypass blocked

- S4: Whitespace bypass [Chain Attacker] → PASS (blocked)
  - "Farrukh  Test" (double space) → empty array
  - "Farrukh Test " (trailing space) → empty array
  - Stored names are trimmed; query input is matched exactly

- S5: Enumeration via response shape [Chain Attacker] → PASS
  - "Wrong name for real ID" → `{success: true, submissions: []}`
  - "Real student with no submissions" → `{success: true, submissions: []}`
  - Identical responses — no information leak about which is which

- S6: IELTS CJS server sync status [Regression] → **CRITICAL FAIL**
  - **The autopilot's fix landed in ESM source but NOT in server-cjs.cjs**
  - IELTS CJS server `/my-submissions?student_id=S9-GUARD` (no name) STILL returned full data
  - Same ESM↔CJS drift gap as Round 14 — third occurrence
  - **Fix applied**: Synced impersonation defense to server-cjs.cjs (both endpoints)
  - Verified: Old-style → 400, ID+correct name → data, ID+wrong name → empty array

### Fixes
- `server-cjs.cjs`: Synced impersonation defense from ESM source — both /my-submissions and /my-answer-keys now require student_id+student_name, with identityCheck pre-query that returns same shape on no-match (no enumeration leak)

### Pattern Analysis
- **Drift is now systemic.** Three rounds in a row found the same pattern: autopilot edits ESM source, doesn't sync server-cjs.cjs. This isn't a one-off — it's a recurring failure mode in the development workflow. Either: (a) automate the sync via post-commit hook, (b) make CJS auto-generated from ESM, or (c) deprecate one server. The architect should address this.
- **Names are not secrets.** The autopilot's impersonation fix raises the bar but is not a true authentication boundary. In a classroom setting, names + IDs are public information (sign-in sheets, displayed on screens, class rosters). True authentication would require a per-student secret (password, code, QR token) — but that's an architectural change beyond scenario scope.
- **Enumeration safety via uniform responses.** The fix correctly returns identical response shapes for "no name match" and "no submissions yet", preventing attackers from confirming ID validity through response distinction. This is a small but important detail the autopilot got right.

### Intelligence Update
- Proven solid: Cambridge impersonation fix (case-sensitive, whitespace-strict, no enum leak), IELTS CJS now synced with same defense, identityCheck pre-query pattern works correctly
- New systemic issue: ESM↔CJS drift recurs every time autopilot adds/changes endpoints. Now logged as a top weak pattern.
- Remaining defer: Names+IDs are public info — true student auth would need passwords or QR tokens (architectural)
- Coverage: 90 scenarios across 15 rounds, 36 bugs found, 31 fixed

### Stats (Round 15)
Tested: 6 | Passed: 4 | Failed: 1 (critical drift) | Confirmed: 1 (limit) | Fixed: 1 | Deferred: 0

---

## Session: 2026-04-09 14:35
Focus: Test the autopilot's anti-cheat r3 commit (anti_cheat_data JSONB column with no validation)
Trigger: Commit 5597ecc added a new JSONB column accepting arbitrary client-supplied antiCheat metadata across both servers

### Scenarios

- S1: XSS payload in antiCheat field [State Corruptor] → **FAIL** [HIGH]
  - `<script>alert(1)</script>`, `<img src=x>`, `<svg/onload>` accepted unsanitized
  - **Fix applied**: stripHtmlTags via new sanitizeAntiCheat() helper

- S2: Massive antiCheat object DoS [Power User] → **FAIL** [MEDIUM]
  - 10MB anti-cheat payload accepted, stored as 10MB JSONB
  - DB bloat vector — fill database with junk metadata
  - **Fix applied**: 4KB total cap, 500-char per-string cap, 50 max keys, depth 4

- S3: Prototype pollution via __proto__ [Chain Attacker] → PASS
  - Express JSON parser strips __proto__ keys by default
  - Submission accepted but pollution neutralized — health check confirms server still works

- S4: anti_cheat_data exposure via /my-submissions [Insider] → MIXED
  - Cambridge `/my-submissions` SELECT does NOT include anti_cheat_data — students can't see their own flags ✓
  - **IELTS ESM source DID expose it** (inconsistency with Cambridge) — bug introduced by autopilot
  - **Fix applied**: Removed anti_cheat_data from IELTS ESM /my-submissions SELECT

- S5: Server durationFlag override by client [Cheater] → **FAIL** [MEDIUM]
  - Client could include `antiCheat.durationFlag: false` for a normal-duration test
  - Server's merge logic only overwrites if its own check is `true`, leaving client's false untouched
  - More importantly: client could ADD false `cheatScore: 'CLEAN'` style fields
  - **Fix applied**: sanitizeAntiCheat() removes `durationFlag` from client input via serverManagedKeys blacklist; server adds its own afterward. Client cannot forge server-managed fields.

- S6: IELTS CJS server drift — anti-cheat missing entirely [Regression] → **FAIL** [HIGH]
  - **4th drift gap in a row.** server-cjs.cjs had:
    - No anti_cheat_data column migration → IELTS DB had no column at all
    - INSERT didn't include the column → silent data loss
    - No sanitizeAntiCheat helper
  - Cambridge had it (ran migration on startup), IELTS CJS did not
  - **Fix applied**: Synced full anti-cheat handling to server-cjs.cjs (migration + helper + INSERT)

### Fixes
- `shared/validation.js`: New `sanitizeAntiCheat(input, serverManagedKeys)` helper. Strips HTML, caps size/depth, removes server-managed keys
- `local-database-server.js`: insertIeltsSubmission uses sanitizeAntiCheat with `['durationFlag']` blacklist; /my-submissions SELECT no longer exposes anti_cheat_data
- `cambridge-database-server.js`: insertCambridgeSubmission + speaking endpoint both use sanitizeAntiCheat
- `server-cjs.cjs`: Full sync — column migration on startup, sanitizeAntiCheat helper inlined, /submissions INSERT includes anti_cheat_data with sanitization

### Pattern Analysis
- **JSONB columns are convenient but easy to abuse.** Adding a JSONB field for "metadata" without validation is a foot-gun. Any client can dump arbitrary data — XSS payloads, gigabytes of junk, prototype pollution attempts. Always sanitize before storing.
- **"Server-managed" claims need enforcement, not assumption.** The autopilot's code said "client-side data + server-side flags (durationFlag etc.)" but the merge order let the client's value pass through when the server's check was negative. The fix uses an explicit blacklist of server-managed keys that get stripped from client input first.
- **4th drift gap = systemic process failure.** Every time the autopilot adds a feature, it edits ESM source. Every time the running CJS server gets stale. R13 → Cambridge↔IELTS drift. R14 → ESM endpoints missing from CJS. R15 → ESM defense missing from CJS. R16 → ESM column+sanitization missing from CJS. The drift is now logged as a critical weak pattern that the architect should solve at the workflow level.

### Intelligence Update
- Proven solid: anti-cheat sanitization (XSS, DoS, prototype pollution, server-key forging all blocked), IELTS CJS now syncs anti-cheat, student endpoints don't leak anti_cheat_data
- 4th drift gap caught and fixed; still no automation
- Coverage: 96 scenarios across 16 rounds, 39 bugs found, 34 fixed

### Stats (Round 16)
Tested: 6 | Passed: 1 | Failed: 4 | Mixed: 1 | Fixed: 4 | Deferred: 0

---

## Session: 2026-04-09 14:55
Focus: Test the autopilot's admin scoring r3 commit (anti-cheat visibility on dashboards) — look for bypass via type confusion in violation logic
Trigger: Commit 23fdf11 added renderAntiCheatBadge/Detail to admin-common.js and updated both admin dashboards to display violation flags

### Scenarios

- S1: Type confusion in violation fields [State Corruptor] → **FAIL** [MEDIUM]
  - Submitted antiCheat with weird types: tabSwitches='Infinity', windowBlurs=-1, fullscreenExits=[1,2,3], copyAttempts={nested:5}, distractionFreeEnabled='maybe'
  - Sanitizer's generic path accepted all of them (string=truncated, number=kept, array=recursed, object=recursed)
  - Dashboard violation check `(ac.tabSwitches || 0) > 0`:
    - `[1,2,3] > 0` → false (NaN comparison) — array bypasses badge
    - `{nested:5} > 0` → false (NaN) — object bypasses badge
    - `-1 > 0` → false — negative bypasses badge
    - `'maybe' === false` → false (strict equality) — string bypasses fullscreen check
  - **Cheater wins**: submit a violation as the wrong type and the badge silently fails to render
  - **Fix applied**: schema-driven coercion in sanitizeAntiCheat — known fields must match strict type (counter=non-neg integer, boolean=real bool, date=parseable). Bypass payloads dropped, legitimate values preserved, unknown fields fall through to generic clean.

- S2: Sanitization-resistant XSS payloads [Insider] → PASS (stored, but not exploitable in dashboard)
  - `javascript:alert(1)`, `onclick=alert(1)`, `data:text/html,...`, `expression(...)` all stored after stripHtmlTags
  - None are dangerous in current dashboard rendering — only used in `title="..."` attributes which escape entities
  - Would be dangerous if any future admin page renders these as href/src/CSS

- S3: distractionFreeEnabled type bypass [Cheater] → Fixed by S1's schema enforcement
  - Same root cause: dashboard uses `=== false`, client could send anything else to bypass
  - Schema now requires real boolean

- S4: Dashboard violation logic verification [Code Review] → CONFIRMED
  - Manually traced JS coercion behavior — `'Infinity' > 0` is true (Infinity is finite-ish for comparison), but `[1,2,3] > 0`, `{nested:5} > 0`, `-1 > 0` all false
  - Confirmed via node REPL — dashboard logic does have the bypass

- S5: Stress nested antiCheat [Power User] → PASS
  - Sanitizer caps depth at 4, key count at 50, total at 4KB
  - Heavy nesting truncated correctly

- S6: Admin dashboard rendering review [Code Review] → PASS
  - renderAntiCheatBadge: uses escapeHtml on title, hardcoded text content
  - renderAntiCheatDetail: escapes label and value via esc(), hardcoded class names
  - No unsafe innerHTML paths found in the new code
  - Existing onclick handlers use `onclick="openAnswerComparison('${esc(s.id)}')"` — escapeHtml does escape `'` to `&#39;` which decodes to `'` in attribute context, then to JS string literal — would be exploitable IF s.id were user-controlled, but it's the auto-increment integer ID. Safe.

### Fixes
- `shared/validation.js`: Added ANTI_CHEAT_SCHEMA + coerceSchemaValue() for type enforcement on known fields. Refactored sanitizeAntiCheat to use schema-first then generic fallback.
- `server-cjs.cjs`: Synced the schema and refactored sanitizer logic.

### Pattern Analysis
- **Loose JS comparison + strict type-confusion = bypass.** When client-supplied data flows into comparisons like `value > 0`, JS coerces non-numeric values to NaN and the comparison silently returns false. The fix is server-side type enforcement at the boundary, BEFORE the data reaches client-side checks.
- **Schema enforcement is more robust than generic sanitization.** Generic sanitization (depth cap, length cap, HTML strip) handles unknown attackers. Schema enforcement on known fields handles attacks against known logic. Both layers needed.
- **5 rounds of dashboard rendering review have all passed.** The escapeHtml usage is consistent in admin-common.js. The autopilot's UI work has been security-conscious. The remaining bugs have all been at the data layer (server-side), not the rendering layer.
- **No drift this round!** The autopilot's commit only touched HTML/CSS/JS files served as static — no server-side changes that would need CJS sync. First clean drift status in 5 rounds.

### Intelligence Update
- Proven solid: Anti-cheat type enforcement (counter/boolean/date), schema-driven coercion, dashboard escapeHtml usage consistent, no drift this round
- Attack surface: Known anti-cheat fields are now strictly typed; unknown fields still allowed for forward compat
- 4 deferred findings remain (architectural — answer keys, CSS, timestamps, names+IDs)
- 1 systemic deferred: ESM↔CJS drift (not triggered this round, still unsolved)
- Coverage: 102 scenarios across 17 rounds, 40 bugs found, 35 fixed

### Stats (Round 17)
Tested: 6 | Passed: 4 | Failed: 1 | Confirmed: 1 | Fixed: 1 | Deferred: 0
