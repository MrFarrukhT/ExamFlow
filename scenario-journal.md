# Scenario Journal — Test System v2

## Session: 2026-04-12 12:19 — Zarmed Olympiada Stress Test (Round 1)
Focus: Pre-Olympiada hardening — 3 days before event. Full adversarial sweep of zarmed-olympiada standalone app.
Trigger: Olympiada in 3 days, no prior scenario testing on this standalone app.

### Scenarios
- S1: Content Answer Leakage [Chain Attacker] → PASS [CRITICAL]
  - All 4 content modules (english-c1/reading, english-c1/listening, german-c1/reading, german-c1/listening) verified
  - stripAnswerKey() properly removes answer, points, and scoring.totalPoints
  - No residual answer-revealing fields in API response

- S2: Timer — No Server-Side Enforcement [Rusher] → **FAIL** [CRITICAL]
  - Timer was CLIENT-SIDE ONLY (localStorage). Student could set unlimited time via DevTools.
  - Server had NO deadline check on /submit — no startedAt + durationMinutes validation.
  - **Fix applied**: Server now computes deadline from startedAt + content.durationMinutes + 60s grace.
    Submissions after deadline are flagged with `overtime: true` in the submit event + response.

- S3: Double Submit Race [Multitasker] → PASS [HIGH]
  - Node.js single-threaded event loop serializes synchronous I/O — check-then-append is atomic.
  - First submit succeeds (200), second gets 404 (session moved to _completed/).

- S4: Answer After Submit [State Corruptor] → PASS [HIGH]
  - Session file moves to `_completed/` synchronously in finalizeSession().
  - Post-submit /answer returns 404 "session not found" — correct behavior.

- S5: Session Hijacking [Chain Attacker] → **FAIL** [HIGH]
  - No auth on session endpoints — anyone with sessionId could read/write/submit.
  - Attacker could: read student name + answers, overwrite answers, submit test.
  - **Fix applied**: HMAC-derived session tokens. /api/session/start returns a `token` field.
    All session endpoints now require `X-Session-Token` header. Without valid token → 403.

- S6: Admin Token = Literal Password [Insider] → **FAIL** [HIGH]
  - /api/admin/login returned the plaintext password as the auth token.
  - Anyone intercepting the login response gets permanent admin access.
  - **Fix applied**: Token is now HMAC(SESSION_SECRET, 'admin:' + password) — a hex string
    that rotates with server restarts. Plaintext password never leaves the server.

- S7: XSS via Student Name [Insider] → PARTIAL [MEDIUM]
  - HTML tags accepted in student name/group and stored in backup JSON files.
  - admin.js escape() function prevents execution on render (client-side defense).
  - **Fix applied**: Server-side HTML tag stripping on student name and group at /session/start.
    Defense-in-depth — now both server and client sanitize.

- S8: Admin Brute Force [Insider] → **FAIL** [MEDIUM]
  - 10 rapid wrong-password attempts all processed with no lockout/delay.
  - **Fix applied**: In-memory rate limiter — 5 attempts per 60s per IP, then 429 lockout.

- Bonus: Invalid QID Injection [Explorer] → **FAIL** [MEDIUM]
  - Arbitrary qid strings (FAKE_Q_999, __proto__, constructor) accepted and stored.
  - JSON.parse neutralizes prototype pollution, but junk keys waste storage.
  - **Fix applied**: QID format validation — must match `^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$`.

### Fixes
- `server.js`: Session tokens (HMAC), timer enforcement, admin token rotation, rate limiting,
  name sanitization, QID validation — all in one commit (2fc67d7).
- `test.js`: sessionFetch() helper sends X-Session-Token on all session API calls,
  token persisted in localStorage alongside sessionId.

### Verification
- 23/23 automated tests pass (E:/tmp/scenario-verify.mjs)
- All 4 FAILs fixed, 1 PARTIAL upgraded to PASS

### Pattern Analysis
- **Client-side-only enforcement is never enough for competitive exams.** Timer, session auth, and
  input validation all had client-only implementations. Server is the trust boundary.
- **Session IDs are high-entropy (96 bits) but not secret.** They appear in URLs, localStorage, and
  network logs. The session token is the secret — knowledge of the ID alone is not enough.
- **Admin auth was a single point of failure.** Password = token meant one network sniff = permanent
  admin access. HMAC rotation + rate limiting addresses both replay and brute force.

### Intelligence Update
- Proven solid: content stripping, double-submit prevention, post-submit lockout, SQL injection (parameterized), CORS
- Fixed: timer enforcement, session auth, admin token, name sanitization, rate limiting, QID validation
- For next run: Browser behavioral tests (multi-tab exam, back-button, refresh mid-listening),
  full flow walkthrough as a student (registration → dashboard → reading → listening → done),
  admin dashboard under load (many submissions), audio playback edge cases

### Stats
Tested: 9 | Passed: 4 | Failed: 5 | Fixed: 5 | Deferred: 0

---

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

---

## Session: 2026-04-09 15:15
Focus: C1-Advanced/Olympiada launch (commit 835ff0b) — verify the new level actually works end-to-end
Trigger: Major new attack surface — entire new exam level + 25+ HTML files + JS/CSS + audio + new dashboard items

### Scenarios

- S1: C1-Advanced submissions across all skills [Regression] → **CRITICAL FAIL** [CRITICAL]
  - reading, writing, listening, reading-use-of-english — ALL rejected by DB
  - Error: `cambridge_submissions_level_check` constraint violation (PG code 23514)
  - Server-side JS validation passed (autopilot updated VALID_LEVELS) but the DB CHECK constraint was never updated
  - **The entire C1-Advanced launch was DOA at the database layer** — students would see 500 errors on every submission
  - Same regression pattern as Round 8 (IELTS speaking constraint mismatch). 3rd time JS↔DB drift has shipped.
  - **Fix applied**: Added DO $$ migration block in initializeCambridgeTables() that drops the old level constraint and re-adds with C1-Advanced. Same for cambridge_answer_keys. Updated inline CREATE TABLE constraints. Updated startup banner.

- S2: C1-Advanced submissions after migration [Regression] → PASS
  - All 4 skills (reading, writing, listening, reading-use-of-english) now save successfully
  - /my-submissions returns C1-Advanced data correctly
  - Sanitized anti-cheat data flows through unchanged

- S3: Invalid level still rejected [Explorer] → PASS
  - C2-Proficiency (not in VALID_LEVELS) → 400 with clear error message including all 5 valid levels

- S4: Cross-level cheating prevention [Cheater] → PASS
  - A B2-First student request for C1-Advanced answer keys → 403 "Answer keys are only available after you have submitted this test"
  - Mock+level+name scoping (R13 fix) correctly extends to the new level

- S5: C1-Advanced time limits work [Explorer] → PASS (implicit)
  - 50min elapsed for a 90-min reading test accepted (well under hard reject of 270min)
  - Time-limit table updated correctly by autopilot

- S6: IELTS CJS sync check [Regression] → N/A
  - C1-Advanced is Cambridge-only (Olympiada uses Cambridge infrastructure). IELTS CJS server has no C1 to sync. No drift this round.

### Fixes
- `cambridge-database-server.js`:
  - Added migration block: drop old level constraint, re-add with C1-Advanced
  - Same for cambridge_answer_keys (guarded by table-exists check)
  - Updated inline CREATE TABLE constraints (lines 70 and 221)
  - Updated startup banner to show 5 levels

### Pattern Analysis
- **JS validation ↔ DB constraint drift is now a recurring failure mode.** Round 8 (IELTS speaking), Round 13 (Cambridge level enum gap), Round 18 (C1-Advanced level). Every time the autopilot adds an enum value to JS, the DB constraint stays stale. Pattern: when adding a new level/skill/category/etc., the migration must run on next startup.
- **DOA features are caught by /scenario.** Without this round, the C1-Advanced launch would have shipped to production with 100% submission failure rate. The autopilot tested its work via code review but didn't run end-to-end submission tests.
- **Migration blocks should always be paired with enum additions.** The fix pattern: when you add a value to a JS enum that the DB enforces, write a `DO $$` block in the same commit that drops and re-adds the constraint. Code review should require this pairing.

### Intelligence Update
- Proven solid: C1-Advanced level fully functional, JS+DB level enums in sync, level constraint migration runs on every startup
- Critical regression caught: entire new exam level was unusable
- 4 deferred findings remain (architectural)
- 1 systemic deferred upgraded: ESM↔CJS drift had no occurrence this round, BUT JS↔DB enum drift is now a separate, distinct recurring issue
- Coverage: 108 scenarios across 18 rounds, 41 bugs found, 36 fixed

### Stats (Round 18)
Tested: 6 | Passed: 4 | Failed: 1 (critical) | N/A: 1 | Fixed: 1 | Deferred: 0

---

## Session: 2026-04-09 15:35
Focus: Olympiada examType pipeline (commit 7705de1) — verify the new field is validated and stored correctly
Trigger: Autopilot added client-supplied examType to Cambridge submission and speaking endpoints

### Scenarios

- S1: examType whitelist bypass attempts [Insider] → MOSTLY PASS, **1 LOW BUG**
  - `<script>alert(1)</script>` → 'Cambridge' (whitelist rejected) ✓
  - `OLYMPIADA` (uppercase) → 'Cambridge' (case-sensitive) ✓
  - `null` → 'Cambridge' (default via `||`) ✓
  - `{evil:true}` → 'Cambridge' (toString → '[object Object]', whitelist rejected) ✓
  - `['Olympiada']` → **'Olympiada' STORED** (single-element array.toString() bypasses) ✗
  - no field → 'Cambridge' (default) ✓
  - `'Olympiada'` (legit) → 'Olympiada' ✓

- S2: examType type confusion [Explorer] → Confirmed bypass on array
  - Root cause: `(data.examType || 'Cambridge').toString()` accepts any value with a toString()
  - Single-element arrays of valid strings bypass the type check
  - **Severity LOW**: result is still a valid whitelist value, no XSS/SQL/DoS impact, but indicates a code-quality gap

- S3: Olympiada legit value stored [Regression] → PASS
  - 'Olympiada' string stored correctly
  - C1-Advanced + Olympiada combination works end-to-end

- S4: Default behavior (no examType) [Regression] → PASS
  - Missing field defaults to 'Cambridge'

- S5: /my-submissions does NOT expose exam_type [Insider] → PASS
  - SELECT in /my-submissions explicitly lists columns and exam_type is NOT in the list
  - Students can't read their own exam_type (admin-only signal)

- S6: Speaking endpoint examType validation [Insider] → Same bypass as S1
  - Same `(req.body.examType || 'Cambridge').toString()` pattern
  - Same fix applied to both endpoints

### Fixes
- `cambridge-database-server.js`: Replaced `(value || default).toString()` pattern with `(typeof value === 'string') ? value.slice(0, 50) : default` in both insertCambridgeSubmission and the speaking endpoint. Strict typeof check rejects arrays, objects, numbers, etc.

### Pattern Analysis
- **Same root cause as Round 17.** R17 found that loose JS comparisons (`> 0`) silently fail on type confusion. R19 finds that loose toString() coercion silently passes type confusion. Both stem from the same pattern: trusting JavaScript's type coercion to "do the right thing" with untyped client input. The fix in both cases is the same: explicit `typeof === 'string' | 'number' | 'boolean'` checks before any operations.
- **No drift this round!** server-cjs.cjs has no exam_type field (it's the IELTS server), so no sync needed. The autopilot correctly scoped the change to Cambridge only.
- **The validation was almost right.** The whitelist check, length cap, and default fallback were all in place. Only the type assumption was wrong. This is a cleaner pattern than R17 (which had no validation at all).

### Intelligence Update
- Proven solid: examType strict typeof check, whitelist enforced on string values only, defaults work, /my-submissions doesn't leak
- Removed weak pattern: array.toString() bypass — fixed
- 4 deferred findings remain (architectural)
- 2 systemic deferred (ESM↔CJS drift, JS↔DB enum drift) — neither triggered this round
- Coverage: 114 scenarios across 19 rounds, 42 bugs found, 37 fixed

### Stats (Round 19)
Tested: 6 | Passed: 5 | Failed: 1 (low) | Fixed: 1 | Deferred: 0

---

## Session: 2026-04-09 15:55
Focus: R20 autopilot commit (Olympiada admin filtering + C1 student results) — verify nothing broke + chip at deferred findings
Trigger: Commit 3293076 added client-side filter dropdowns for examType in admin dashboard and invigilator panel + extended my-results.html C1 support

### Scenarios

- S1: C1-Advanced full submission flow regression [Regression] → PASS
  - C1-Advanced reading submission with anti-cheat metadata and Olympiada examType
  - Stored correctly, R18 DB constraint fix still holds, anti-cheat schema still enforces

- S2: Cross-exam-type cheating [Cheater] → PASS + WORKFLOW NOTE
  - Submitted same student/level/skill/mock first as Cambridge, then as Olympiada
  - Second submission blocked by dedup (409): "You have already submitted this test"
  - Dedup key is `cam:student_id:level:skill:mockTest` — does NOT include exam_type
  - **Cheating prevention:** A student cannot do "warm-up" runs as Cambridge and then officially submit as Olympiada
  - **Workflow note:** Olympiada and Cambridge must use different mock_test numbers if students should be able to take both. Documented as a configuration/workflow concern, not a bug.

- S3: Olympiada/Cambridge filter integrity [Insider] → PASS (with note)
  - Admin filter is purely client-side: dashboard fetches all submissions, JS filters in-memory
  - Server returns ~5604 rows on every dashboard load — already noted as a pagination concern in R10
  - No server-side filter parameter, so no risk of filter bypass via URL manipulation

- S4: C1-Advanced /my-answer-keys round-trip [Regression] → PASS
  - Student who submitted C1-Advanced reading can request C1 answer keys → 200, empty (no keys uploaded yet)
  - Wrong level (B2-First) for same student → 403 "Answer keys are only available after you have submitted this test"
  - R13/R18 mock-scoping + level enum still working

- S5: Browser smoke test of student exam flow [Rusher] → DEFERRED
  - Skipped this round (curl tests have higher signal at this stage of coverage)
  - Could be done with playwright-cli in a later round

- S6: examType audit across endpoints [Insider] → PASS
  - Admin /cambridge-submissions: includes exam_type ✓ (needed for filter UI)
  - Student /my-submissions: does NOT include exam_type ✓ (admin-only signal)
  - Properly compartmentalized

### Fixes
None — R20 was a clean round. Autopilot's filter changes are pure client-side JS with no new attack surface.

### Pattern Analysis
- **No drift this round.** Autopilot only touched HTML/JS files served as static. Cleanest round in a while.
- **The dedup key choice has implications beyond cheating prevention.** When the dedup key omits a field that admins use to distinguish records (like exam_type), users cannot have multiple variants of the "same" test. This is a deliberate trade-off and the right call for exam integrity, but worth documenting.
- **Client-side filtering scales poorly.** The admin dashboard fetches all 5604 submissions and filters in JS. Acceptable now but will become a problem at 50K+. The deferred "submissions-list-unpaginated" finding remains.

### Intelligence Update
- Proven solid: C1-Advanced full flow, cross-exam-type dedup, exam_type compartmentalization (admin-only)
- New workflow note: Olympiada and Cambridge mock_test numbers should not collide if students should be able to take both
- All R18-R19 fixes still working (regression-tested implicitly)
- Coverage: 120 scenarios across 20 rounds, 42 bugs found, 37 fixed

### Stats (Round 20)
Tested: 6 | Passed: 5 | Note: 1 (workflow) | Deferred: 1 (browser test) | Fixed: 0

---

## Session: 2026-04-09 16:15
Focus: Audit the autopilot's "cheater r4" security fix (postMessage URL injection) — verify it actually works and look for bypasses
Trigger: Commit 4557887 added postMessage URL whitelist to all 10 Cambridge listening pages — security fix that warrants adversarial review

### Scenarios

- S1: Code review of the postMessage URL whitelist [Insider] → **CRITICAL FAIL** [CRITICAL]
  - The autopilot wrote the regex correctly in C1-Advanced/listening.html (line 222):
    `/^\.\/(?:Listening )?Part \d+\.html$/`
  - But pasted a BROKEN version into all 10 other listening files (A1, A2, A2-MOCK-2, A2-MOCK-3, B1, B1-MOCK-2, B1-MOCK-3, B2, B2-MOCK-2, B2-MOCK-3):
    `/^./(Listening )?Part d+.html$/`
  - Missing escapes everywhere: `\.` → `.`, `\/` → `/`, `\d+` → `d+`
  - **JavaScript SyntaxError**: Node refuses to parse it at all. The first `/^./` is interpreted as a complete regex literal, then the rest causes a syntax error.
  - **Browser impact**: The entire `<script>` block fails to execute. ALL JavaScript on the listening page is dead — not just navigation. Timer, answer saving, audio control, postMessage handler — everything in that script tag.
  - **Severity: CRITICAL**. 10 listening pages were broken in production for the duration of this commit.

- S2: Verify the broken regex actually fails [Confirmation] → CONFIRMED via Node REPL
  - `node -e "...broken regex..."` → `SyntaxError: Expected ':', got 'd'`
  - C1-Advanced regex parses cleanly
  - The bug is real and affects all 10 files

- S3: Filename pattern audit [Discovery] → Found ANOTHER bug in the autopilot's intent
  - A1, A2, B1, B2 use `Listening-Part-N.html` (with hyphens)
  - C1-Advanced uses `Listening Part N.html` (with spaces)
  - The autopilot's "correct" regex in C1-Advanced only handles the space format
  - Even if the syntax error were fixed in the other 10 files, the regex would only match `./Listening Part N.html` — NOT `./Listening-Part-N.html`
  - So the whitelist would have rejected ALL real navigation URLs anyway

### Fix
- **All 10 listening files**: Replaced the broken regex with a robust version that handles BOTH naming conventions:
  ```js
  return /^\.\/(?:Listening[- ])?Part[- ]\d+\.html$/.test(url);
  ```
  Matches:
  - `./Part 1.html` (reading parts, all levels)
  - `./Part 10.html` (multi-digit)
  - `./Listening-Part-1.html` (A1-B2 listening)
  - `./Listening Part 1.html` (C1 listening)
  - Rejects: `javascript:`, `data:`, `http://`, `../etc/passwd`, `./evil.html`

### Pattern Analysis
- **Bulk copy-paste spreads bugs.** The autopilot wrote one correct file (C1-Advanced) and one broken version, then bulk-pasted the broken version into 10 files. A single syntax error became 10 broken pages.
- **Security fixes are themselves attack surface.** The autopilot's well-intentioned hardening introduced a severe regression — broken JS on every listening page. Any code change is a potential bug, including security fixes. /scenario should always re-test the area a security fix touches.
- **Regex literals need character-by-character review.** Forgetting backslash escapes silently changes semantics. `\.` → `.` (any char) and `\d` → `d` (literal d) are both valid JS syntactically, but produce wrong-but-runnable regexes. In this case the autopilot's mistakes happened to break the regex literal parsing entirely (because of the unescaped `/`), so the JS engine caught it via SyntaxError. If the autopilot had used a different separator pattern, the regex would have parsed but never matched anything — silent failure.
- **The autopilot wrote one correct file FIRST**, suggesting the bug came from a transformation step (escape stripping during paste). This is a tooling-level bug — Edit/Write may strip backslash escapes from strings, OR the autopilot's prompt-driven editing didn't preserve them. Worth investigating in the autopilot agent's workflow.

### Intelligence Update
- Proven solid: postMessage URL whitelist now works correctly across all 11 Cambridge listening pages, robust regex handles both filename conventions
- Critical regression caught: 10 listening pages had broken JS for the duration of commit 4557887
- New weak pattern logged: bulk copy-paste of code (especially regex/string-escaped content) needs per-file syntax verification
- Coverage: 123 scenarios across 21 rounds, 43 bugs found, 38 fixed

### Stats (Round 21)
Tested: 3 | Passed: 0 | Failed: 1 (critical, 10 files) | Confirmed: 1 | Discovery: 1 | Fixed: 1 (covers all 10 files) | Deferred: 0

---

## Session: 2026-04-09 16:30
Focus: Audit the autopilot's "cheater r5" Olympiada level lock (commit 26c62da) — verify enforcement, look for bypasses
Trigger: New server-side validation rule rejecting Olympiada with non-C1 levels — high-value attack target

### Scenarios

- S1: Olympiada + B2-First [Cheater] → PASS (correctly rejected)
  - 400 with clear message "Olympiada exam is locked to C1-Advanced"
  - Server log shows the violation warning

- S2: Olympiada + C1-Advanced [Regression] → PASS
  - Legit case accepted, stored with exam_type=Olympiada and level=C1-Advanced

- S3: Cambridge + C1-Advanced [Regression] → PASS
  - Cambridge students can still take C1 (regular practice)

- S4: examType=['Olympiada'] + B2-First [Chain Attacker] → PASS (not a bypass)
  - Strict equality `=== 'Olympiada'` rejects array → level lock check skipped
  - Sanitizer's strict typeof check defaults array to 'Cambridge'
  - Result: stored as exam_type=Cambridge, level=B2-First — legitimate Cambridge submission, not Olympiada
  - The cheater cannot get exam_type=Olympiada via array bypass

- S5: examType='OLYMPIADA' + B2-First [Cheater] → PASS (not a bypass)
  - Same as S4: case-sensitive whitelist defaults to 'Cambridge'
  - Stored as Cambridge, no Olympiada classification gained

- S6: Speaking endpoint variant [Cheater] → PASS
  - /submit-speaking has the same level lock check, correctly rejects Olympiada + non-C1
  - Code review confirmed both submission endpoints use the same `=== 'Olympiada' && level !== 'C1-Advanced'` pattern

- S7: Admin score update — can it change exam_type? [Insider] → PASS
  - Code review of `/cambridge-submissions/:id/score` and `/cambridge-submissions/:id/evaluate`
  - Both UPDATE statements only touch score, grade, and evaluation columns
  - exam_type cannot be retroactively modified via admin endpoints

- Exhaustive verification: Olympiada + every level [Stress test] → PASS
  - A1-Movers + Olympiada → rejected
  - A2-Key + Olympiada → rejected
  - B1-Preliminary + Olympiada → rejected
  - B2-First + Olympiada → rejected
  - C1-Advanced + Olympiada → accepted
  - All 5 levels behave as designed

### Fixes
None — the level lock is correctly implemented across both submission endpoints. R22 was a clean round.

### Pattern Analysis
- **Defense-in-depth pays off.** The level lock check could have been bypassed via type confusion (R19 found this pattern in examType handling), but the autopilot's separate sanitizer in insertCambridgeSubmission also uses strict typeof. The two-layer defense means a single check failure doesn't cascade.
- **Strict equality + strict typeof = consistent semantics.** The R19 fix to use `typeof === 'string'` in the sanitizer pays dividends here: any non-string examType gets defaulted before it can be stored, even if upstream checks miss it.
- **No drift this round.** Olympiada is Cambridge-only — IELTS doesn't have exam_type, no CJS sync needed. The autopilot scoped the change correctly.

### Intelligence Update
- Proven solid: Olympiada level lock (both submission and speaking endpoints), no bypass via array/case/whitespace, defense-in-depth via sanitizer fallback
- All 4 deferred architectural findings still stand
- 2 systemic patterns (ESM↔CJS drift, JS↔DB enum drift) — neither triggered this round
- Coverage: 130 scenarios across 22 rounds, 43 bugs found, 38 fixed

### Stats (Round 22)
Tested: 7 + exhaustive | Passed: 7 | Failed: 0 | Fixed: 0 | Deferred: 0

---

## Session: 2026-04-09 16:50
Focus: Verify autopilot's IELTS r3 commit (writing anti-cheat parity + Olympiada robustness)
Trigger: Commit 236e286 added antiCheat collection to IELTS writing-handler.js + extended Cambridge family routing

### Scenarios

- S1: IELTS writing now stores anti_cheat_data [Regression] → PASS
  - Submitted IELTS writing with antiCheat: {tabSwitches:2, fullscreenExits:1, distractionFreeEnabled:true}
  - All three values stored correctly via R16/R17 sanitization pipeline
  - Anti-cheat parity achieved — IELTS writing now matches reading/listening behavior

- S2: IELTS writing sanitization regression [Cheater] → BUG (data quality, not security)
  - Submitted bypass payloads: tabSwitches='<script>', fullscreenExits=[1,2,3], customNote='<img src=x onerror=alert(1)>', durationFlag:false
  - Schema-typed counters dropped (string and array) ✓
  - durationFlag stripped (server-managed key) ✓
  - **`customNote` stored as empty string `""`** — XSS payload stripped to nothing, but the empty key was preserved as data clutter
  - **Fix applied**: sanitizeAntiCheat clean() now drops strings that are empty or whitespace-only after stripHtmlTags+trim. Synced to both shared/validation.js and server-cjs.cjs.

- S3: Olympiada examType in IELTS path [Chain Attacker] → PASS
  - IELTS server doesn't have exam_type column — the field is silently ignored
  - No data corruption, submission goes into test_submissions normally
  - Cross-server confusion not exploitable

- S4: IELTS writing endpoint with strange skill values [Explorer] → PASS
  - 'READING' (case mismatch) → 400 with valid options listed
  - null → 400
  - 'reading writing' (multi-word) → 400
  - VALID_IELTS_SKILLS enforcement still working

- S5: Stress — 30 concurrent submissions [Power User] → PASS
  - 5 of 30 stored, 25 rate-limited
  - Rate limiter working correctly under stress (10/min/IP cumulative across all my round 23 tests)
  - No server crashes, no data corruption

- S6: Untested admin endpoints audit [Insider] → PASS
  - Mapped Cambridge endpoint surface — found `/cambridge-student-results` (CRUD), `/cambridge-answers` (DELETE by level/skill/mock)
  - All require admin auth, all parameterized
  - DELETE /cambridge-answers is single-key delete (level+skill+mock), not bulk — limited blast radius

### Fixes
- `shared/validation.js`: clean() string branch now drops empty/whitespace-after-stripping values
- `server-cjs.cjs`: same fix synced

### Verification
- '<img src=x>' → null (was '')
- '   ' (whitespace) → null (was '   ')
- 'tab switch detected' → preserved
- 'a<b>c' → 'ac' (partial sanitization preserved)

### Pattern Analysis
- **Pure client-side commits still warrant testing.** R23's autopilot commit was 100% client-side JS (no server changes). The bug I caught wasn't introduced by the client change — it was pre-existing in the R16 sanitizer, exposed by the new code path that exercises it more aggressively. Always test the data flow end-to-end after any new code path is added.
- **Defense-in-depth caught data clutter.** R16/R17 schema enforcement correctly handled the malicious payloads (drop the type-confused fields). The empty-string survival was a separate cleanup concern that the schema-based path doesn't touch (custom fields use generic clean()).
- **No drift this round.** R20-R23 all clean of ESM↔CJS drift. 6-round streak.

### Intelligence Update
- Proven solid: IELTS writing anti-cheat parity, sanitizeAntiCheat now drops empty strings, IELTS skill enum still strict, rate limiter holds under stress, admin endpoint surface mapped
- Coverage: 137 scenarios across 23 rounds, 44 bugs found, 39 fixed

### Stats (Round 23)
Tested: 6 | Passed: 5 | Bug: 1 (data quality) | Fixed: 1 | Deferred: 0

---

## Session: 2026-04-09 17:10
Focus: Audit autopilot's cheater r6 commit (IELTS server-side score recomputation) — most security-critical anti-cheat fix to date
Trigger: Commit e01f9ba added a server-side score recompute path to local-database-server.js that overrides client-supplied scores for reading/listening

### Scenarios

- S1: bandScoreFromRaw missing function [Code Review] → **CRITICAL SILENT BUG**
  - The autopilot's recompute calls `if (typeof bandScoreFromRaw === 'function')` defensively
  - But bandScoreFromRaw is **never defined** anywhere in the codebase
  - Result: bandScore is never recomputed even when raw score is — cheater can match the correct raw score and still tamper bandScore freely
  - The defensive check silently swallows the missing function

- S2/S3: server-cjs.cjs has zero score recompute [Drift] → **CRITICAL — 5th drift gap**
  - The autopilot's "fix" only landed in ESM source. server-cjs.cjs (the actually-running IELTS server) still trusts client scores entirely.
  - Verified: submitted reading with `score: 40, bandScore: '9.0'` and 1 wrong answer → stored as 40/'9.0'
  - **Production was fully exploitable** despite the autopilot believing the issue was fixed
  - This is the **most security-critical drift gap caught so far** — directly enables 100% score cheating

- S4: No-answer-key fallback [Explorer] → PASS
  - Mock numbers without DB-stored answer keys fall through to clamping path
  - Client score clamped to 0-40 (Round 24's CJS sync also adds bandScore clamping which the ESM version was missing)
  - Graceful degradation: protection only fires when admin has uploaded keys

- S5: Anti-cheat scoreTamper flag [Insider] → PASS
  - When tampering is detected: `anti_cheat_data: {scoreTamper: true, clientScore: 40, serverScore: 1}`
  - Admin dashboard's renderAntiCheatBadge would not flag this currently (scoreTamper isn't in its checks) — minor follow-up for the autopilot

- S6: Type confusion in answers [State Corruptor] → PASS (after fix)
  - Cheater submits `answers: ['FALSE','TRUE','FALSE']` (array instead of object)
  - The CJS sync added a strict object check: `(typeof === 'object' && !Array.isArray)` → coerces to `{}` → score = 0
  - Array-as-answers can't be used to bypass the recompute

### Fixes
- `local-database-server.js`: Defined `IELTS_BAND_MAPPING` + `bandScoreFromRaw()` (the function the autopilot referenced but never created). Maps raw score 4-40 to band string per IELTS scale.
- `server-cjs.cjs`: Synced the entire score recompute block from ESM. Added bandScoreFromRaw helper. Added strict object check on answers (defends type confusion). Made the no-answer-key fallback also clamp bandScore (was only clamping raw score in ESM).

### Verification (all on the running CJS server)
- Cheater sends `score=40, 1 wrong answer` → stored as `score=1, band='1.0'` with `scoreTamper:true`, `clientScore:40`, `serverScore:1`
- Cheater sends correct `score=1, bandScore='9.0'` → stored as `score=1, band='1.0'` (bandScore correctly recomputed)
- Cheater sends `answers: [arr,arr,arr]` → coerced to `{}`, score=0
- Mock without answer keys → score clamped, no tampering detection (graceful degrade)

### Pattern Analysis
- **Drift returned with a vengeance.** R20-R23 had no drift; R24 has the most security-critical drift yet. The pattern is unsolved at the architect level — every autopilot commit that touches server logic must be re-tested.
- **"Fixed" by autopilot ≠ fixed in production.** The autopilot's journal entry probably claims cheater r6 as complete. Without /scenario verifying end-to-end on the running server, the protection would have shipped without effect. **The autopilot's "complete" status is unreliable for security work** — must always be verified.
- **Defensive `typeof === 'function'` checks can hide missing-function bugs.** The autopilot's caution swallowed the bandScoreFromRaw bug silently. A loud failure (`bandScoreFromRaw is not defined`) would have caught it during development. Pattern: don't use defensive feature-detection for code you control — it should always be present.
- **Type-confusion defense matters even when the schema exists.** The ESM source had `(typeof === 'object' && submissionData.answers) || {}` which evaluates `true` for arrays (Array.isArray returns true but typeof is 'object'). A cheater submitting `answers: ['FALSE',...]` would have answers be the array, then `studentAnswers[qKey]` would index by string '1' which gives undefined. So scoring would silently produce 0. The CJS sync explicitly rejects arrays.

### Intelligence Update
- Proven solid: IELTS score recompute (CJS), bandScoreFromRaw helper defined, anti-cheat scoreTamper flag stored, type-confused answers safely defaulted
- Critical regression caught: 5th drift gap, most security-critical to date
- New pattern logged: defensive feature-detection can hide missing-function bugs
- Coverage: 144 scenarios across 24 rounds, 46 bugs found, 41 fixed

### Stats (Round 24)
Tested: 6 | Passed: 4 | Failed: 2 (1 critical, 1 silent bug) | Fixed: 2 (combined into 1 patch) | Deferred: 0

---

## Session: 2026-04-09 17:30
Focus: R25 — attack the autopilot's R24 IELTS score recompute follow-ups. Specifically the writing/speaking branch (which "clamps" client bandScore instead of forcing null), the absence of a min-time guard, and the deferred scoreTamper-not-surfaced finding.
Trigger: R24 clean-up — three deferred concerns from the prior round, all touching the score-recompute path that was just synced to CJS.

### Scenarios

- S1: IELTS writing bandScore=9 with two-character answers [Cheater] → **BUG (HIGH)**
  - Cheater POSTs `skill=writing, bandScore=9` with `answers={task1:"x",task2:"y"}` → server stored band_score="9"
  - But the IELTS admin dashboard has a `writingBandScore` input (line 727) — writing is supposed to be admin-graded
  - The R24 sync added an `else` branch that "clamps" client bandScore to 0–9; this is the wrong policy. Should be force-null, identical to how Cambridge forces score=null.

- S2: IELTS speaking bandScore=9 with empty audio [Cheater] → **BUG (HIGH)**
  - Same pattern as S1. Speaking is also rubric-graded and the client bandScore should never be trusted.

- S3: IELTS writing bandScore=8.7 (invalid IELTS band) [Explorer] → **BUG (MEDIUM)**
  - 8.7 is not a valid IELTS band (must be .0 or .5). Server stored "8.7" verbatim.
  - Same root cause as S1/S2: the clamp branch passes any number in [0, 9] without enforcing IELTS band granularity. The fix (force-null) makes the precision question moot.

- S4: Reading recompute correctness — score=40 with 5 garbage answers [Cheater] → **PASS**
  - Server detected tampering, recomputed score=0, stored band_score="0.0" (bandScoreFromRaw correctly maps 0 → "0.0")
  - Server log: "🚨 SCORE TAMPERING DETECTED: Student R25S4 sent score=40, server computed 0"
  - R24's bandScoreFromRaw helper works as designed for the lowest-boundary case.

- S5: Reading exam in 500 milliseconds [State Corruptor] → **BUG (HIGH)**
  - Cheater POSTs `startTime=...10:00:00.000Z, endTime=...10:00:00.500Z` for a 60-min reading test → accepted, stored
  - The duration check only rejects `elapsedMin <= 0` and `> limit*3`. There is no minimum-time guard.
  - A 60-min reading test cannot be completed in half a second by any human; the only way to produce this is a forged DevTools POST. The score recompute would still catch the score-cheating, but the impossibly-fast submission itself is a clear cheating signal that the system was silently swallowing.

- S6: scoreTamper flag visibility in admin dashboard [Verification of R24 deferred] → **BUG (MEDIUM)**
  - `assets/js/admin-common.js` `hasAntiCheatViolations` checks durationFlag, tabSwitches, fullscreenExits, etc. — but NOT `scoreTamper`. R24 stored the flag but the badge never lit up for it. Confirms the deferred finding.

### Fixes

**Fix A — Force null on writing/speaking bandScore (both servers):**
- `server-cjs.cjs`: replaced the "clamp 0-9" else-branch with a force-null + tampering log + scoreTamper flag (with `clientBandScore` payload)
- `local-database-server.js`: same change synced. Now ESM and CJS both reject any client-supplied bandScore for writing/speaking.

**Fix B — Minimum-time guard (all three submission paths):**
- Added `MIN_ELAPSED_SEC = 30` rejection right after the existing `elapsedMin <= 0` check
- Synced to `server-cjs.cjs`, `local-database-server.js`, and `cambridge-database-server.js`
- 30 seconds is conservative — even reading a single mock question takes 1+ second; 40 questions × 1s minimum = 40s. The threshold is set below "any plausible legit submission" but above "physically impossible".

**Fix C — Surface scoreTamper in admin badge:**
- `assets/js/admin-common.js`:
  - `hasAntiCheatViolations`: added `if (ac.scoreTamper) return true;`
  - `renderAntiCheatBadge`: added `'Score tampered'` reason
  - `renderAntiCheatDetail`: added a critical row showing `client=X, server=Y` (or `client band=Z` for writing/speaking band tampering)
- Both IELTS and Cambridge admin dashboards inherit this since they share `admin-common.js`.

### Verification (post-fix, against fresh server restart)

- S1v3 writing bandScore=9 → stored as `band_score: null` ✓
- S2v3 speaking bandScore=9 → stored as `band_score: null` ✓
- S3v3 writing bandScore=8.7 → stored as `band_score: null` ✓
- S5v3 500ms reading → 400 "Submission rejected: test duration is below the minimum allowed." ✓
- R1 legit reading (1 hour, 2 answers) → accepted, server recomputed score=0 ✓ (regression OK)
- R2 legit writing with no bandScore → accepted, band_score=null ✓
- R3 legit Cambridge B2-First reading → accepted ✓
- R4 Cambridge 1-second test → 400 min-time ✓
- Server log shows three new "🚨 BAND TAMPERING DETECTED" warnings (one each for S1v3/S2v3/S3v3) and one "🚨 SUBMISSION REJECTED ... took only 0.5s" for S5v3. All anti-cheat metadata stored as scoreTamper flags via R16/R17 sanitization pipeline.

### Pattern Analysis

- **R24's "clamp" was the wrong policy.** The autopilot's score recompute correctly handled the auto-gradable skills (reading/listening) but applied a defensive clamp to writing/speaking — without recognizing that those are admin-graded. The clamp passed input through a 0–9 range filter when the right action was to drop the input entirely. **Lesson: when the system has a separate admin-grading workflow for a field, the field must be force-null on student submissions.** This is the same principle Cambridge already follows for `score`/`grade`.

- **Min-time gaps come from "we only check the upper bound" thinking.** Both IELTS and Cambridge had `elapsedMin > limit*3` but no `elapsedMin < minimum`. Time-based cheats are usually about taking too long — but a *forged* submission can also be impossibly *fast*. Bidirectional bounds are cheap and catch a class of attacks the upper bound misses.

- **Drift count update: R24 found 5 ESM↔CJS drift gaps; R25 found another instance of identical-bug-on-both-sides** — the writing/speaking clamp was the same in both `local-database-server.js` and `server-cjs.cjs`. Drift creates one set of bugs; *parallel* code creates another (the same bug propagates correctly to both files but the bug is present everywhere). The architect's deferred recommendation to deprecate one server is the only durable fix for both classes.

- **Admin-side observability lag.** R24 added the scoreTamper data to the database but the admin badge never showed it. R25 closed the loop. **Lesson: every new flag stored server-side needs a paired admin-dashboard surface, or admins won't see it.** Future flag-introducing PRs should grep for `hasAntiCheatViolations`/`renderAntiCheatBadge` and update them as part of the same change.

### Intelligence Update

- Proven solid: writing/speaking bandScore force-null on both IELTS servers, IELTS+Cambridge minimum-time guard (30s), scoreTamper flag visible in admin dashboard, bandScoreFromRaw correctness at boundary (raw=0 → "0.0")
- New weak pattern logged: parallel code (not just drift) — identical bugs can propagate correctly to both servers, hiding because "the code matches"
- Closed deferred finding: scoreTamper-not-surfaced (R24)
- Coverage: 150 scenarios across 25 rounds, 49 bugs found, 44 fixed

### Stats (Round 25)
Tested: 6 | Passed: 1 | Failed: 5 (3 HIGH, 2 MEDIUM) | Fixed: 5 (all in one patch — 3 fixes covering 6 files) | Deferred: 0

---

## Session: 2026-04-09 17:50
Focus: R26 — hunt parallel-code drift between sibling endpoints. R25's "parallel code" pattern logged warned that identical bugs propagate everywhere; this round audited the *non-identical* sibling paths (e.g., `/submit-speaking` vs `/cambridge-submissions`) which the autopilot's recent fixes only updated on one side.
Trigger: Updated cursor weak-pattern list flagged "parallel-code-bugs-propagate-identically-to-both-servers" — but the harder version is *partial* drift, where one sibling has the protection and the other doesn't.

### Scenarios

- S1: Cambridge `/submit-speaking` with 1-second duration / missing timestamps / endTime-before-startTime [Cheater] → **BUG (HIGH) — three failures in one endpoint**
  - S1a: `startTime=...10:00:00.000Z, endTime=...10:00:01.000Z` → 200 OK, stored ❌
  - S1b: omit startTime/endTime entirely → 200 OK, stored as NULL ❌
  - S1c: endTime before startTime → 200 OK, stored as a "negative" duration ❌
  - Root cause: `/submit-speaking` accepts `startTime, endTime` from req.body and inserts them straight into `cambridge_submissions` (line 728-730) with no parsing, NaN check, range check, or min-time guard. Sibling endpoint `/cambridge-submissions` has all of these. R25's min-time fix was applied to the regular submission endpoint but didn't touch the speaking endpoint.

- S2: bandScoreFromRaw across full range — submit reading with score=4, 15, 30, 40, 41 [Explorer] → **PASS**
  - All five tampering attempts correctly recomputed to 0 (since the answer payload doesn't match the stored answer keys). band_score consistently mapped to "0.0".
  - Note: this doesn't actually exercise bandScoreFromRaw across non-zero outputs — the recompute always lands on 0 unless the cheater knows the real answer keys. Code review of `IELTS_BAND_MAPPING` (R25) covers the rest.

- S3: Min-time boundary at exactly 30s, 29.9s, 30.001s [Explorer] → **PASS**
  - exactly 30000ms → accepted (boundary is `< MIN_ELAPSED_SEC`, strict less-than)
  - 29900ms → "Submission rejected: test duration is below the minimum allowed."
  - 30001ms → accepted
  - The R25 boundary is correct; off-by-one not present. (Tested on Cambridge to avoid IELTS rate-limit cooldown after S2 burned the per-IP quota.)

- S4: Admin `/update-score` with bandScore = `'<script>alert(1)</script>'`, `100`, `8.7` [Insider] → **BUG (MEDIUM) — CJS-only**
  - All three tampered values were accepted by `server-cjs.cjs` (the running IELTS server) and would have been written verbatim to `band_score`.
  - `local-database-server.js` (ESM) already validates: `bandNum < 0 || bandNum > 9 || (bandNum * 2) % 1 !== 0`. CJS was missing the entire validation block.
  - Classic R24-style ESM↔CJS drift, just on the admin path instead of the student path. Bringing the count to **6 occurrences**.
  - Severity MEDIUM because admin auth is required and admin-side XSS is mitigated by escapeHtml downstream — but data quality and the open question of "what else differs between ESM/CJS admin paths" makes this worth fixing immediately.

### Fixes

**Fix A — Cambridge `/submit-speaking` duration validation block:**
- Inserted the same require-timestamps + NaN check + reverse-time + min-time(30s) + over-time(speakLimit*3) guards that `/cambridge-submissions` already has, right before the dedup lock acquisition
- Uses `CAMBRIDGE_TIME_LIMITS[level][skill]` with a 30-min default for the speaking limit
- Logs both rejection cases with student ID and elapsed time (consistent with the regular endpoint's warnings)

**Fix B — Admin `/update-score` bandScore validation in CJS:**
- Synced the existing ESM validation block into `server-cjs.cjs`
- Same logic: `bandNum < 0 || bandNum > 9 || (bandNum * 2) % 1 !== 0` rejects with a clear message
- Drift count update: 6 occurrences (R20–R26 now); the architect's recommendation to deprecate one server is overdue.

### Verification (post-fix, after fresh server restart)

- S1av2 1-second speaking → 400 "duration is below the minimum allowed" ✓
- S1bv2 missing timestamps → 400 "startTime and endTime are required" ✓
- S1cv2 reverse time → 400 "endTime must be after startTime" ✓
- R26R1 1-minute speaking → 200, stored ✓ (regression)
- S4a `<script>` → 400 "Band score must be between 0.0 and 9.0 in 0.5 increments" ✓
- S4b 100 → 400 same message ✓
- S4c 8.7 → 400 same message ✓
- S4 regression 7.5 → 200, stored as "7.5" ✓

### Pattern Analysis

- **Partial drift is harder to find than full drift.** R24 found drift where the protection existed on one server (ESM) and not the other (CJS) for the *same* endpoint. R26 found a different shape: the protection exists on one *endpoint* (`/cambridge-submissions`) and not the *sibling endpoint* (`/submit-speaking`) on the same server. Sibling endpoints share a logical purpose but each has its own copy of validation; updating one is not the same as updating both. This drift category needs its own grep target: any time a fix touches `app.post(...submission...)`, also check for `submit-speaking`, `submit-writing`, `submit-reading` siblings.

- **Drift count is now 6.** R20–R26 found ESM↔CJS or sibling-endpoint drift in every single round bar one (R22). This is no longer "occasional" — it's the dominant bug source. The architectural fix (deprecate one server, deduplicate sibling routes through a shared handler) needs to land or scenario rounds will keep mining this single seam forever.

- **Admin endpoints need parallel scrutiny.** R20-R25 attacked student-side endpoints because that's where unauthenticated abuse lives. R26 found that the admin path has the same drift problem — meaning a compromised admin token (or a malicious admin) gets weaker protection on CJS than ESM. The /update-score gap was MEDIUM only because the admin dashboard escapes the rendered value, but next time the gap could be in a path that has no downstream sanitization.

### Intelligence Update

- Proven solid: Cambridge `/submit-speaking` duration validation (full block, parity with `/cambridge-submissions`), admin `/update-score` bandScore validation in CJS, min-time boundary correctness at 30s mark, bandScoreFromRaw recompute landing on 0 across tampered scores
- New weak pattern logged: sibling-endpoint partial drift (one of `/submit-speaking`, `/cambridge-submissions`, `/submissions` has a guard the others lack)
- Drift count: 6 occurrences (was 5 after R24)
- Coverage: 154 scenarios across 26 rounds, 51 bugs found, 46 fixed

### Stats (Round 26)
Tested: 4 | Passed: 2 | Failed: 2 (1 HIGH, 1 MEDIUM) | Fixed: 2 | Deferred: 0

---

## Session: 2026-04-09 18:10
Focus: R27 — extend the sibling-endpoint partial-drift hunt to Cambridge admin endpoints (`/cambridge-submissions/:id/score`, `/cambridge-submissions/:id/evaluate`, PATCH/POST `/cambridge-student-results`). Also probe `validateScore`'s upper bound, since R26 found CJS missing the bandScore validator entirely and the score validator's 0-200 range looked suspiciously lenient.
Trigger: R26 weak-pattern entry "sibling-endpoint partial drift" called out admin paths as the next obvious target.

### Scenarios

- S1: PATCH `/cambridge-student-results/:id` with 50KB `student_name` [Insider] → **PARTIAL → fixed (LOW)**
  - PG schema (`varchar(200)`) catches it and raises a 500 with the raw error `"value too long for type character varying(200)"` — leaks the column type back to the client.
  - The application has no length cap (POST endpoint at line 1156 does — sibling drift).
  - Severity LOW because the data isn't actually corrupted (PG enforces) but the schema leak is poor hygiene and the 500 status is misleading.

- S2: PATCH `/cambridge-submissions/:id/evaluate` with 100KB `evaluatorName` [Insider] → **PARTIAL → fixed (LOW)**
  - Same shape: `varchar(200)` rejects, error message leaks schema. `evaluation_notes` is `TEXT` which would have no PG-side cap at all if I'd tried a 100MB payload.

- S3: PATCH `/cambridge-submissions/:id/score` with `{score: 200}` on a B2-First reading-use-of-english submission [Insider] → **BUG → fixed (MEDIUM)**
  - Accepted. Stored as 200. Real Cambridge raw max for B2-First reading-use-of-english is ≈ 75. Admin can grade fraudulent passes with non-physical scores.
  - Root cause: `validateScore()` in `shared/validation.js` allows 0-200. The 200 cap doesn't reflect any real exam max for either Cambridge or IELTS — it's an unconstrained upper bound that the autopilot picked at some point.
  - `score=-50` correctly rejected, `score=201` correctly rejected — only the 0-200 window was the gap.

- S4: `stripHtmlTags` against `&lt;script&gt;…&lt;/script&gt;` and `<scr<script>ipt>` [Polyglot] → **PASS (defense-in-depth)**
  - Entity-encoded payload stored as the literal text `&lt;script&gt;…` — when rendered through `escapeHtml` on the dashboard it shows as `&amp;lt;script&amp;gt;…` which is harmless.
  - Nested `<scr<script>ipt>` was reduced to `ipt>alert(1)` (the non-greedy regex ate `<scr<script>` greedily through the first `>`). The residual is plain text, no remaining tags. Renders safely.
  - Stored XSS would only happen if a downstream renderer skipped escapeHtml — which the existing dashboard code doesn't. No fix needed.

### Fixes

**Fix A — Lower `validateScore` upper bound from 200 → 100:**
- `shared/validation.js`: changed `parsed > 200` → `parsed > 100`. Real Cambridge raw maxes top out at ≈ 90 (C1-Advanced); IELTS is 0-40. 100 is a safety net, not a per-skill cap. Comment explains the R27 trigger.
- `server-cjs.cjs`: synced the same change to the CJS-private copy of `validateScore` (line 84). Both code paths now reject anything > 100.
- Cambridge and IELTS-ESM both import from `shared/validation.js` and are auto-fixed.
- The endpoint still SHOULD enforce a per-level/skill cap on top of this; that's a deeper fix deferred for the architect (would need a `CAMBRIDGE_MAX_RAW_SCORES` table mapped to actual exam papers).

**Fix B — Explicit length validation in PATCH endpoints:**
- `cambridge-database-server.js` PATCH `/cambridge-student-results/:id`: added `student_id`/`student_name`/`cefr_level` length caps (200/200/50) right after `stripHtmlTags`. Returns clean 400 with named-field error before reaching the DB.
- `cambridge-database-server.js` PATCH `/cambridge-submissions/:id/evaluate`: added `evaluatorName` (200) and `evaluationNotes` (5000) caps right after `stripHtmlTags`. The 5000 on notes is a defensive cap because the underlying column is `TEXT` (no PG limit) — payloads bigger than that are abuse.
- These match the validations the POST endpoints already have, eliminating the partial drift.

### Verification (post-fix, after fresh server restart)

- S1v2 50KB student_name → 400 "Student name must be at most 200 characters" (no schema leak) ✓
- S2v2 100KB evaluator_name → 400 "evaluatorName must be at most 200 characters" ✓
- S3v2 score=200 → 400 "Score must be between 0 and 100" ✓
- S3 boundary score=99 → accepted ✓
- S3 boundary score=101 → rejected ✓
- S3 regression score=75 (legit B2-First reading max) → accepted ✓

### Pattern Analysis

- **Sibling-endpoint partial drift now confirmed across THREE pairs:** R26 found `/submit-speaking` vs `/cambridge-submissions`; R27 found PATCH `/cambridge-student-results/:id` vs POST `/cambridge-student-results` and PATCH `/cambridge-submissions/:id/evaluate` vs POST `/cambridge-submissions`. The autopilot adds POST validation more carefully than PATCH validation (probably because POST is "create new" and feels riskier, while PATCH is "modify existing" and feels safer). **This is a generalizable lesson: every POST validation should be replicated on the matching PATCH/PUT.**

- **Database schema as last line of defense saved us, but leaked itself doing so.** The `varchar(200)` caps on `student_name` and `evaluator_name` blocked the 50KB/100KB attacks, but the PG error went straight to the client as a 500 with the raw error message. Two lessons: (1) DB constraints are great defense-in-depth but should never be the only check, and (2) the `try/catch` blocks in admin endpoints should sanitize PG errors before returning them — translating "value too long for type character varying(200)" into "field exceeds maximum length" without revealing the DB column type. R27 closes this for the two endpoints I touched, but a global fix (catch-and-sanitize PG errors at the express error handler) would be better.

- **`validateScore`'s 0-200 upper bound was vestigial.** Looking at git blame, it's been 0-200 since the file was extracted into shared/. Neither IELTS (0-40) nor Cambridge (0-90 max) ever needed 200. The number 200 was a "round upper bound" that nobody validated against actual exam paper maxes. **Lesson: validation ranges that aren't tied to a real-world constraint will eventually be wrong by an order of magnitude.** The 100 cap is still loose but at least within an order of magnitude of reality.

### Intelligence Update

- Proven solid: PATCH `/cambridge-student-results/:id` length caps, PATCH `/cambridge-submissions/:id/evaluate` length caps, `validateScore` upper bound lowered to 100, stripHtmlTags safe against entity-encoded and nested tag payloads when rendered with escapeHtml downstream
- New weak pattern logged: PATCH endpoints lag behind POST endpoint validations (third instance of sibling-endpoint partial drift)
- New weak pattern logged: PG error messages leak column types when caught by generic try/catch blocks
- Drift count update: 8 occurrences (R20-R27); R27 alone added 2 new sibling-drift instances
- Coverage: 158 scenarios across 27 rounds, 54 bugs found, 49 fixed

### Stats (Round 27)
Tested: 4 | Passed: 1 | Failed: 3 (1 MEDIUM, 2 LOW) | Fixed: 3 | Deferred: 0

---

## Session: 2026-04-09 18:30
Focus: R28 — extend the R27 sibling-drift hunt one ring outward. R27 fixed two PATCH/POST drift instances; R28 looked at the *unauthenticated* student-facing endpoints (which heal r7 didn't touch) and at the POST/DELETE pair on `/cambridge-answers`. Also probed the IELTS `/mock-answers` POST/DELETE pair since the architectural pattern repeats across both servers.
Trigger: heal r7's commit (`03485b0`) stripped error.message from 5 admin endpoints but skipped POST `/cambridge-submissions` and POST `/submit-speaking` — and IELTS server-cjs.cjs has the same leak in 8 places.

### Scenarios

- S1: IELTS POST `/submissions` with `mockNumber: 2147483648` [Insider/Anyone] → **BUG (HIGH)**
  - Hits the int4 overflow boundary on the `mock_number` column. Server returned `{"success":false,"message":"Failed to save submission","error":"value \"2147483648\" is out of range for type integer"}`.
  - **Unauthenticated** information disclosure. Anyone can fingerprint the database (Postgres), the column type (int4), and the exact integer overflow boundary. Same gap exists on local-database-server.js (ESM, the development copy).

- S2: Cambridge POST `/cambridge-submissions` and POST `/submit-speaking` with 300-char `mockTest` [Insider/Anyone] → **BUG (HIGH × 2)**
  - Both endpoints returned `{"success":false,"message":"Failed to save…","error":"value too long for type character varying(10)"}`.
  - **Unauthenticated** information disclosure of the `mock_test` column type (`varchar(10)`).
  - heal r7 fixed admin endpoints but missed both student-facing POST handlers.

- S3: heal r7's mock validation in POST `/cambridge-answers` [Verification] → **PASS**
  - mock=0 → 400 "Mock must be a positive integer between 1 and 100"
  - mock=101 → 400 same
  - mock='abc' → 400 same
  - mock=50 → 200 saved
  - heal r7's added check works correctly across the boundary.

- S4: DELETE `/cambridge-answers` mock validation parity vs POST [Insider] → **BUG (LOW)**
  - mock='abc' / -1 / 999 → all silently returned "Answer key not found" (200-shaped 400).
  - DELETE had **no validation at all** — no level/skill enum check, no mock range check. Sibling drift with POST.
  - Severity LOW because admin auth gates abuse, but inconsistency lets attackers probe the keyspace without rate-limiting penalties and the lack of an enum check means weird payloads reach the DB query untouched.

- S5: IELTS POST/DELETE `/mock-answers` mock parameter parity [Insider] → **BUG (LOW)**
  - POST mock=999 → 200 stored (no upper bound)
  - DELETE mock=99999 → 200 "Deleted 0" (no upper bound)
  - POST mock=0 → 400 but with the wrong error message "Mock number, skill, and answers are required" (because `0` is falsy in the `if (!mock)` check).
  - **Three different validation policies** across the four mock-answers endpoints (Cambridge POST: 1-100, Cambridge DELETE: none, IELTS POST: ≥1 no upper, IELTS DELETE: ≥1 no upper). Severity LOW; logged for the architect to dedupe.

### Fixes

**Fix A — Strip `error.message` from 3 student-facing endpoint error handlers:**
- `server-cjs.cjs` line 753: removed `error: error.message` from POST `/submissions` 500-path. Added comment explaining R28 trigger.
- `local-database-server.js` line 336: same change to ESM IELTS server (parity fix to prevent ESM↔CJS drift recurring).
- `cambridge-database-server.js` line 622: removed from POST `/cambridge-submissions` 500-path.
- `cambridge-database-server.js` line 783: removed from POST `/submit-speaking` 500-path.
- All four endpoints now return generic `Failed to save…` 500s. The full error is still logged server-side via `console.error` for ops debugging.

**Fix B — DELETE `/cambridge-answers` mock + level/skill validation parity:**
- `cambridge-database-server.js` line 1447: added `VALID_LEVELS.includes(level)` check (parity with POST)
- Added `VALID_SKILLS.includes(skill)` check (parity with POST)
- Added the same `1-100 positive integer` mock validation that heal r7 added to POST in r7
- Returns 400 with named-field errors on rejection. Now POST and DELETE behave identically for input validation.

### Verification (post-fix, fresh server restart)

- S1v2 IELTS POST mockNumber=2147483648 → `{"success":false,"message":"Failed to save submission"}` ✓ (no error.message)
- S2v2 Cambridge POST 300-char mockTest → `{"success":false,"message":"Failed to save Cambridge submission"}` ✓
- S2cv2 /submit-speaking 300-char mockTest → `{"success":false,"message":"Failed to save speaking test"}` ✓
- R28R1 legit IELTS submission → 200 stored ✓ (regression)
- S4v2 DELETE mock='abc' → 400 "Mock must be a positive integer between 1 and 100" ✓
- S4v2 DELETE mock=999 → 400 same ✓
- S4v2 DELETE mock=-1 → 400 same ✓
- S4v2 DELETE mock=50 → 200 deleted ✓
- S4v2 DELETE level='NotALevel' → 400 "Invalid level…" ✓ (also gained the level enum check)

### Pattern Analysis

- **The "concentric drift" pattern: each round of fixes leaves a ring of unfixed siblings.**
  R20-R24 fixed ESM↔CJS drift on the same endpoint.
  R25 fixed POST/POST drift between sibling submission endpoints.
  R26 fixed POST/POST drift on /submit-speaking vs /cambridge-submissions.
  R27 fixed POST/PATCH drift on student-results and evaluate.
  R28 fixed unauthenticated POST/admin-PATCH drift on error.message disclosure AND POST/DELETE drift on /cambridge-answers.
  Each round, the fix moves from one ring of code to the next: same-endpoint, then sibling endpoints, then auth-tier siblings, then verb siblings. The architect's "deprecate one server / dedupe sibling routes" recommendation would collapse all of these rings at once.

- **Unauthenticated 500s are higher-value disclosure than admin 500s.**
  heal r7 correctly identified error.message as a leak and stripped it from admin endpoints. But admin endpoints are gated by auth — only an attacker with admin credentials can trigger them. The student-facing POST endpoints are reachable by anyone with the URL. Stripping admin first and unauthenticated second is exactly backwards: the public surface has the higher exposure. **Lesson: when fixing information disclosure, fix the unauthenticated paths FIRST.**

- **`error.message` count is finite, fixable in one pass.**
  R28 found 16 remaining `error: error.message` instances across the three server files (8 in server-cjs.cjs, 8 in local-database-server.js, 7 in cambridge-database-server.js after heal r7's 5 fixes). I fixed 4 of the most exposed. The remaining 12 are all admin-gated. **For-next-run: do the bulk strip in one pass — this is a finite list, easier to do all at once than to keep finding them by triggering 500s one at a time.**

### Intelligence Update

- Proven solid: error.message no longer leaked from POST /submissions (CJS+ESM), POST /cambridge-submissions, POST /submit-speaking; DELETE /cambridge-answers parity with POST (level/skill enum + mock 1-100)
- New weak pattern logged: concentric drift — each fix round leaves a sibling ring unfixed; the rings repeat (same-endpoint → sibling endpoints → auth-tier siblings → verb siblings)
- New weak pattern logged: information disclosure fixes prioritize admin paths but should prioritize unauthenticated paths
- Drift count update: 10 occurrences (R20-R28); R28 alone added 4 new instances
- Coverage: 163 scenarios across 28 rounds, 58 bugs found, 53 fixed
- Untested area logged: bulk error.message strip across the remaining 12 admin-gated handlers

### Stats (Round 28)
Tested: 5 | Passed: 1 | Failed: 4 (3 HIGH, 1 LOW; S5 documented but not fixed) | Fixed: 4 (Fix A: 4 endpoints across 3 files; Fix B: 1 endpoint) | Deferred: 1 (IELTS mock-answers upper bound — hygiene)

---

## Session: 2026-04-09 18:50
Focus: R29 — execute the bulk error.message strip that R28 left as a "for-next-run" task. heal r8 (`dee207b`) ran in parallel and stripped 7 ESM IELTS handlers but never touched server-cjs.cjs (the running production server). The bulk fix is now small enough to do in one pass.
Trigger: R28 cursor entry "12-admin-error-message-handlers-still-leak-after-r28-bulk-strip-needed" + heal r8's ESM-only commit revealing yet another ESM↔CJS drift instance.

### Scenarios

- S1: Verify CJS still leaks despite heal r8 [Verification] → **BUG (HIGH) — 11th drift instance**
  - POST `/update-score` with `submissionId="abc"` returned `{"success":false,"message":"Failed to update score","error":"invalid input syntax for type integer: \"abc\""}`
  - The error reveals: Postgres, the `submissionId` -> integer column type, the exact PG error format
  - heal r8's commit modified ONLY `local-database-server.js` (ESM IELTS, dev copy). The running server is `server-cjs.cjs` (CJS bundle) — heal's "fix" was invisible to production.
  - Drift count: 11 occurrences. The autopilot/heal pattern keeps fixing ESM and forgetting CJS, even when /scenario already documented this exact gap (R24 was the most critical instance).

- S2: heal r8's skill validation on POST `/mock-answers` (CJS) [Verification] → **PASS**
  - `skill="NotARealSkill"` → 400 "Invalid skill. Must be one of: reading, writing, listening, speaking"
  - `skill="reading"` → 200 saved
  - The validation IS in CJS too (line 991), independently from heal r8's ESM-only commit. So this drift is partial: the skill validator landed in both, but the error.message strip didn't.

### Fixes

**Fix A — Bulk strip `server-cjs.cjs` (7 handlers in one pass):**
- Line 535: GET `/test` (DB connection probe)
- Line 879: GET `/submissions` (admin list)
- Line 899: DELETE `/submissions/:id` (admin delete)
- Line 936: POST `/update-score` (admin grade)
- Line 974: GET `/mock-answers` (admin read keys)
- Line 1041: POST `/mock-answers` (admin write keys)
- Line 1061: DELETE `/mock-answers` (admin delete keys)
- All 7 now return generic 500 messages. `console.error` still logs the full error server-side for ops.

**Fix B — Bulk strip `cambridge-database-server.js` (5 handlers in one pass):**
- Line 838: GET `/cambridge-submissions` (admin list)
- Line 988: DELETE `/cambridge-submissions/:id` (admin delete)
- Line 1035: GET `/cambridge-answers` (admin read keys)
- Line 1160: GET `/cambridge-student-results` (admin list results)
- Line 1262: POST `/cambridge-student-results` (admin add result)
- All 5 now return generic 500 messages.

**Drift gap closed:** heal r8 fixed 7 ESM handlers; R29 fixed the corresponding 7 CJS handlers (plus the /test endpoint). ESM and CJS are now in parity for error.message disclosure across all admin paths.

### Verification (post-fix, fresh server restart)

- V1 IELTS POST `/update-score` submissionId="abc" → `{"success":false,"message":"Failed to update score"}` ✓ (was leaking integer syntax error)
- V2 IELTS GET `/submissions` → 200 list (regression OK)
- V3 IELTS DELETE `/submissions/2147483648` → `{"success":false,"message":"Failed to delete submission"}` ✓
- V4 Cambridge PATCH `/cambridge-submissions/abc/score` → 400 "Invalid submission ID" (caught at app layer before reaching DB)
- V5 Cambridge POST `/cambridge-student-results` reading_raw=2147483648 → 400 "must be between 0 and 300" (caught at app layer)
- S2 CJS POST `/mock-answers` skill validation → invalid rejected, valid accepted ✓
- Final grep: `error: error.message` matches in server-cjs.cjs = 0, in cambridge-database-server.js = 0, in local-database-server.js = 0

### Pattern Analysis

- **The heal/scenario sync gap is one-directional.** Heal sees /scenario's journal entries (or independently finds the same bugs) but applies fixes to ESM only because that's where the "source of truth" feels like it lives. /scenario then needs to round-trip the fix to CJS. **A simpler workflow: heal should grep for the pattern after fixing it in one file, not just fix the file it stumbled into.** R29 demonstrates the value of bulk mode: finding 12 instances, fixing 12 instances, verifying 12 instances — all in one round, no future round needs to revisit.

- **Bulk fixes pay for themselves immediately.** R28 fixed 4 of 16 leaks, leaving 12 for "next run". R29 spent the same time budget fixing all 12 plus verifying. **Lesson: when /scenario finds a finite, enumerable list of identical bugs, prefer the bulk pass over the incremental approach.** Incremental looks safer (smaller diffs, easier review) but multiplies the round count and wastes triage cycles.

- **Drift count is now 11 occurrences.** R29 didn't add a NEW pattern — it closed an instance of the existing ESM↔CJS drift pattern. The architectural fix (deduplicate) is the only durable solution; every heal/autopilot round risks adding instance #12.

### Intelligence Update

- Proven solid: ALL admin error.message handlers stripped across both servers (12 endpoints fixed in R29 + 4 in R28 = 16 total since the audit started)
- New weak pattern logged: heal/autopilot fixes ESM-only when the bug exists in both servers (one-directional sync gap)
- Drift count update: 11 occurrences (R29 closed one instance, didn't add new)
- Coverage: 165 scenarios across 29 rounds, 60 bugs found, 55 fixed
- For-next-run: now that error.message is fully stripped, the next high-value target is concurrent submissions / race conditions on the dedup lock release path (BH-1, BH-7, BH-12 from the reference library — none have been browser-tested under load)

### Stats (Round 29)
Tested: 2 | Passed: 1 | Failed: 1 (HIGH, 12 endpoints) | Fixed: 12 (bulk pass: 7 in CJS + 5 in Cambridge) | Deferred: 0

---

## Session: 2026-04-09 19:10
Focus: R30 — verify heal r9's new GET-endpoint validations (Cambridge admin) AND hunt the surrounding gaps that heal r9 didn't touch. Heal r9 added level/skill/mock validation to 3 GET endpoints; R30 attacked the remaining unvalidated parameters and the IELTS parity copies.
Trigger: heal r9 (`4424c5d`) added validation to GET `/cambridge-submissions`, `/cambridge-student-results`, `/cambridge-answers`. /scenario must always re-test areas heal touches AND look for what heal missed.

### Scenarios

- S1: heal r9 GET `/cambridge-submissions` validation [Verification] → **PASS (after fresh restart)**
  - **Initial test FAILED**: invalid level/skill/mock_test all returned `200 []` instead of 400. The validation code IS in the file at line 811 — the running process had STALE code.
  - The Cambridge process I inherited had been auto-restarted by some intermediate agent (eye/heal/playwright-cli) BEFORE heal r9's commit landed but AFTER my R29 restart. PIDs 11344/29220 were not the ones I started in R29.
  - After R30's fresh restart with the latest source, heal r9's validation works correctly: invalid level → 400, invalid skill → 400, invalid mock_test → 400, legit query → 200 with rows.

- S2: GET `/cambridge-student-results` `search` parameter LIKE wildcard escape [Polyglot] → **BUG (LOW)**
  - `?search=%25` (URL-encoded `%`) returned 17 rows (all student-results in DB)
  - `?search=_30A` matched "R30A" (the `_` is a single-char wildcard)
  - `?search=R30A` correctly matched 1 row
  - The user-supplied `search` value is concatenated into the LIKE pattern as `%search%` without escaping `%` or `_`. PG ILIKE treats both as wildcards, letting an attacker bypass the intended substring match.
  - SQL injection is not possible (parameterized binding) — this is a LIKE-pattern injection, lower severity. But the inconsistent search semantics are surprising and let an admin-token holder exfiltrate the entire table with `search=%`.

- S3: heal r9 GET `/cambridge-answers` validation [Verification] → **PASS**
  - `level=NotALevel` → 400
  - `skill=NotASkill` → 400
  - `mock=999` → 400 "must be between 1 and 100"

- S4: IELTS CJS GET/DELETE `/mock-answers` parity vs heal r8 ESM-only fix [Insider] → **BUG (LOW, drift)**
  - heal r8 (`dee207b`) added `VALID_IELTS_SKILLS.includes(skill)` to GET and DELETE `/mock-answers` in `local-database-server.js` (ESM)
  - **CJS `server-cjs.cjs` was not synced** — GET and DELETE both still allowed any string for `skill`, resulting in DB queries with arbitrary skill values that just return 0 rows (parameterized so SQL injection safe, but inconsistent and noisy).
  - Same heal-fixes-ESM-only pattern logged in R29. Drift count: 12 occurrences.

### Fixes

**Fix A — Sync `VALID_IELTS_SKILLS` check to CJS GET and DELETE `/mock-answers`:**
- `server-cjs.cjs` line 955: added the check after the mockNum validation, mirrors the ESM version that heal r8 added.
- `server-cjs.cjs` line 1059: same change for DELETE handler.
- POST already had the check (line 991, from earlier work). Now all three CJS handlers (GET/POST/DELETE) enforce the enum.

**Fix B — Escape LIKE wildcards in `/cambridge-student-results` search:**
- `cambridge-database-server.js` line 1174: replaced raw `search` interpolation with an escape pass:
  ```js
  const escapedSearch = String(search).replace(/[\\%_]/g, '\\$&');
  ILIKE $... ESCAPE '\\'
  ```
- The escape regex matches `\`, `%`, `_` and prefixes them with `\` so PG treats them literally. The `ESCAPE '\\'` clause tells PG which char is the escape.
- search='%' now matches literal `%` substrings (none exist → 0 rows). search='_30A' now matches literal `_30A` (none exist → 0 rows). search='R30A' still matches literally (1 row).

### Verification (post-fix, fresh server restart)

- S1v2 GET `/cambridge-submissions?level=NotALevel` → 400 (works once running code is fresh) ✓
- S2v2 search='%' → 0 rows ✓ (was 17)
- S2v2 search='_30A' → 0 rows ✓ (was 1)
- S2v2 search='R30A' → 1 row ✓ (regression — literal match still works)
- S2v2 empty search → 17 rows ✓ (regression — no filter still returns all)
- S3v2 GET `/cambridge-answers` invalid level/skill/mock → 400 ✓
- S4v2 IELTS GET `/mock-answers?skill=NotASkill` → 400 "Invalid skill…" ✓
- S4v2 IELTS DELETE `/mock-answers?skill=invalidskill` → 400 ✓
- S4v2 IELTS GET `/mock-answers?skill=reading` → 200 with answers ✓ (regression)

### Pattern Analysis

- **Stale-process trap**: When concurrent agents commit fixes between /scenario rounds, the running server may not reflect the latest source. R30 hit this on S1: heal r9's validation was in the file but the running process had been restarted by another agent BEFORE heal r9's commit landed. **Lesson: every /scenario round should restart the server before testing fixes from prior rounds.** Faster than debugging "why isn't the new code running".

- **The drift list keeps growing because the autopilot edits files without grepping for siblings.** R29's "heal fixes ESM-only" pattern repeated in R30 (heal r8 GET `/mock-answers` skill check landed in ESM only). This is a workflow gap, not a code gap. The architectural fix is to deduplicate the servers; the workflow fix is for heal/autopilot to grep for `validateScore`/`VALID_IELTS_SKILLS`/`stripHtmlTags` after touching either file.

- **LIKE-pattern injection is its own bug class.** Parameterized queries protect against SQL injection but don't escape LIKE wildcards. Every endpoint that uses `LIKE/ILIKE $1` with user input as part of the pattern needs to escape `%`, `_`, and `\`. R30 fixed one instance; the codebase should be grepped for `LIKE` to find others.

### Intelligence Update

- Proven solid: heal r9 GET endpoint validations (cambridge-submissions, cambridge-student-results, cambridge-answers), IELTS CJS GET/DELETE mock-answers skill enum (R30 fix), Cambridge student-results search no longer leaks via LIKE wildcards
- New weak pattern logged: stale running process traps (when concurrent agent commits land between /scenario rounds, restart before testing)
- New weak pattern logged: LIKE-pattern injection — parameterized queries don't escape `%`/`_` so user input as LIKE pattern lets wildcards through
- Drift count update: 12 occurrences (R30 closed instance #12 — IELTS CJS GET/DELETE mock-answers skill enum)
- Coverage: 169 scenarios across 30 rounds, 63 bugs found, 58 fixed

### Stats (Round 30)
Tested: 4 | Passed: 2 (after restart) | Failed: 2 (LOW × 2) | Fixed: 2 | Deferred: 0

---

## Session: 2026-04-09 19:30
Focus: R31 — pick up the R30 "for-next-run" target (concurrent submissions / race conditions on dedup lock) and the lingering question of WHO ELSE has unbounded timestamp acceptance. Restarted servers at the start of the round per R30's stale-process lesson.
Trigger: R30 cursor flagged dedup races as untested. heal r10 + concurrent eye commits brought no new server-side surface, so the focus stays on behavioral edges that prior rounds didn't reach.

### Scenarios

- S1: Grep for other LIKE clauses needing escape after R30 [Pattern hunt] → **PASS (only one in codebase, already fixed)**
  - Searched all `*.{js,cjs}` files for `ILIKE|LIKE \$`. Only result was the one I escaped in R30. No additional LIKE-pattern injection sites exist.
  - Logged as "no further LIKE-injection surface" — clears the pattern from the audit list.

- S2: 20 concurrent identical IELTS POST `/submissions` to test dedup lock + rate limiter under burst [Multitasker] → **PASS**
  - 1 → 200 OK (legitimate first row)
  - 9 → 409 Conflict (dedup lock + DB dupCheck working correctly under contention)
  - 10 → 429 Rate Limited (rate limiter capping at 10/min)
  - The in-memory `submissionLocks` Set correctly serializes the dedup check + add as a single synchronous block. Awaits between body validation and the lock acquisition don't break the invariant because the `has`-then-`add` pair runs atomically in Node's event loop.
  - **Belief confirmed**: the autopilot's dedup lock pattern is correct under burst.

- S3: Skipped (rate limiter under burst was implicitly tested in S2 — passed)

- S4: Cambridge POST `/cambridge-submissions` with `startTime`/`endTime` in year 2050, 1970, 9999 [State Corruptor] → **BUG (MEDIUM)**
  - Year 2050: ACCEPTED, stored. The submission appears as taken in 24 years.
  - Year 1970: ACCEPTED, stored. Backdated by 56 years.
  - Year 9999: ACCEPTED, stored. Even more absurd.
  - Same start/end (elapsedMin = 0): correctly rejected
  - "Infinity" string: correctly rejected (NaN check works)
  - Existing duration validation enforces `elapsedMin > 30s` and `<= limit*3` but NEVER bounds the absolute timestamp range. A cheater can backdate to claim "I took the test before the answer keys leaked" or forward-date to game first-to-complete metrics.
  - Same gap exists across all 4 submission paths (IELTS server-cjs.cjs, IELTS local-database-server.js ESM, Cambridge cambridge-submissions, Cambridge submit-speaking).

### Fixes

**Fix — Absolute timestamp window (5min future skew, 24h backdate window) on all 4 submission paths:**
```js
const nowMs = Date.now();
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_BACKDATE_MS = 24 * 60 * 60 * 1000;
if (end.getTime() > nowMs + MAX_FUTURE_SKEW_MS) {
    return res.status(400).json({ success: false, message: 'Submission rejected: endTime is in the future.' });
}
if (end.getTime() < nowMs - MAX_BACKDATE_MS) {
    return res.status(400).json({ success: false, message: 'Submission rejected: endTime is too far in the past.' });
}
```
- `server-cjs.cjs` POST `/submissions` (line 642)
- `local-database-server.js` POST `/submissions` (ESM parity)
- `cambridge-database-server.js` POST `/cambridge-submissions`
- `cambridge-database-server.js` POST `/submit-speaking` (sibling parity)
- 5min forward skew tolerates client/server clock drift; 24h backdate window allows for delayed submission delivery (network outage, browser-tab left open). All four paths log the rejection with student ID for auditing.

### Verification (post-fix, fresh server restart)

- V1 Cambridge POST 2050 → 400 "endTime is in the future" ✓
- V2 Cambridge POST 1970 → 400 "endTime is too far in the past" ✓
- V3 Cambridge POST year 9999 → 400 "endTime is in the future" ✓
- V4 Cambridge POST current-time-minus-30min → 200 saved ✓ (regression)
- V5 Cambridge `/submit-speaking` year 2050 → 400 "endTime is in the future" ✓
- V6 IELTS POST 1970 → 400 ✓
- V7 IELTS POST 2050 → 400 ✓

### Pattern Analysis

- **Bidirectional time bounds, like bidirectional value bounds, are easy to forget.** R26 found the *minimum*-time gap (only `<= 0` and `> limit*3` were checked). R31 found the *absolute*-time gap (no clock-bounded check at all). The pattern: every numeric or temporal field needs both lower AND upper bounds, AND in the temporal case, an absolute window relative to "now". Two checks are not enough; three is the minimum (lower bound, upper bound, anchor to current time).

- **Concurrency tests are cheap once you have the harness.** S2's 20-request burst took ~2 seconds and verified TWO important invariants (dedup lock and rate limiter) at once. The Node http module makes this trivial — no need to spawn a browser. **Lesson: when a behavioral concern can be tested with parallel curl, do it; don't reach for a browser agent unless the bug requires actual UI state.**

- **/scenario keeps catching what concurrent agents miss.** heal r10's commit was pure cleanup (a11y, dead code, interval refs) — no new validation. eye's commits were UI-only. Yet this round still found a new MEDIUM-severity bug in the timestamp validation that's been live since the system was built. **The cron-driven /scenario loop is genuinely additive: even on rounds where no new code lands, deeper attack scenarios surface dormant bugs.**

### Intelligence Update

- Proven solid: dedup lock + rate limiter correct under 20-request burst, all 4 submission paths now enforce absolute timestamp window (5min future skew + 24h backdate)
- New weak pattern logged: bidirectional bounds — temporal fields need lower-bound, upper-bound, AND absolute-window anchored to current time
- Drift count update: 12 occurrences (R31 added a 4-path fix synchronously, no new drift instance introduced — matched siblings on the same patch)
- Coverage: 173 scenarios across 31 rounds, 64 bugs found, 59 fixed

### Stats (Round 31)
Tested: 4 (S1 pattern hunt, S2 concurrency, S3 skipped, S4 timestamp window) | Passed: 2 | Failed: 1 (MEDIUM, 4 paths) | Fixed: 1 (synchronously across 4 paths) | Deferred: 0
