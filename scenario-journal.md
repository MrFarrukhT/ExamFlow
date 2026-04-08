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
