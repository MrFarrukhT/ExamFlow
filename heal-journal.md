# Heal Journal

## Session: 2026-04-08 14:10
Domains: security, api, database, architecture, frontend
Starting state: 0 open findings in ledger

### Round 1
- [CRITICAL] SQL injection — missing parameter binding in search query → fixed — `cambridge-database-server.js`
- [CRITICAL] Stored XSS via unsanitized student_name/student_id → fixed — `cambridge-admin-dashboard.html`
- [CRITICAL] Stored XSS via unsanitized student_name/student_id → fixed — `ielts-admin-dashboard.html`
- [CRITICAL] XSS via unsanitized userAnswer/correctAnswer in results table → fixed — `assets/js/listening/listening.js`
- [CRITICAL] XSS via unsanitized note data in notes sidebar → fixed — `assets/js/cambridge/cambridge-bridge.js`

### Round 2
- [CRITICAL] XSS via unsanitized data in passage highlighting → fixed — `assets/js/core.js`
- [CRITICAL] eval() replaced with new Function() constructor → fixed — `ielts-admin-dashboard.html`
- [HIGH] POST /submissions returns success:true on error → fixed — `local-database-server.js`
- [HIGH] N+1 query pattern in mock answers insertion → fixed — `local-database-server.js`
- [MEDIUM] Unreachable DOMContentLoaded handler → fixed — `assets/js/universal-functions.js`

### Round 3
- [HIGH] POST /cambridge-submissions catch block returns success:true on error → fixed — `cambridge-database-server.js`
- [HIGH] Missing input validation on admin login credentials → fixed — `shared/database.js`
- [HIGH] Missing toggleOptionsMenu() — HTML calls undefined function → fixed — `assets/js/universal-functions.js`
- [MEDIUM] Dead code: toggleExplanation, toggleExplanationPart3, selectCell → fixed — `assets/js/core.js`
- [MEDIUM] Unvalidated mock parameter passed to parseInt → fixed — `local-database-server.js`

### Round 4
- [HIGH] Unhandled Promise Rejection in setInterval backgroundRetry → fixed — `shared/database.js`
- [MEDIUM] Weak session token generation (predictable timestamp) → fixed — `shared/database.js`
- [MEDIUM] Missing skill validation in speaking submission → fixed — `cambridge-database-server.js`
- [MEDIUM] HTTP 200 with failure response for missing answer key → fixed — `cambridge-database-server.js`
- [MEDIUM] Dead functions: showOptionsModal, toggleTimerVisibility → fixed — `assets/js/listening/listening.js`

### Deferred
- Hardcoded invigilator password — needs architecture (server-side auth)
- Same hardcoded password in Cambridge launcher — needs architecture
- Missing authentication on admin endpoints — needs auth middleware + frontend changes
- Unbounded SELECT queries — needs pagination design
- Duplicate validation logic across servers — needs shared module refactoring
- Core.js god file (1562 lines) — needs migration to split modules
- Overly permissive CORS wildcard — needs allowed origins config
- Inconsistent response format (raw arrays vs envelope) — needs frontend coordination

### Stats
Rounds: 4 | Fixed: 20 | Reverted: 0 | Deferred: 8
Ending state: 8 open findings in ledger

## Session: 2026-04-09 14:25
Domains: security, api, database, architecture, frontend
Starting state: 8 open findings (all deferred — architecture/migration blockers)

### Round 5
- [HIGH] Missing parseInt validation on 4 Cambridge PATCH/DELETE :id endpoints → fixed — `cambridge-database-server.js`
- [MEDIUM] IELTS /update-score only checks truthiness of submissionId → fixed — `local-database-server.js`
- [MEDIUM] Background retry setInterval missing .unref() (blocks graceful shutdown) → fixed — `shared/database.js`
- [MEDIUM] Dead exported function errorResponse (zero callers) → fixed — `shared/validation.js`
- [LOW] Unused validateScore/validateGrade imports → fixed — `cambridge-database-server.js`

### Deferred (carried over from previous sessions)
- Hardcoded invigilator password — needs server-side auth
- Missing auth on admin endpoints — needs middleware + frontend tokens
- Unbounded SELECT queries — needs pagination design
- Duplicate validation logic across servers — needs shared module refactor
- core.js god file (1562 lines) — needs migration
- CORS wildcard — needs allowed origins config
- Inconsistent response envelope (raw arrays) — needs frontend coordination

### Stats
Rounds: 1 | Fixed: 5 | Reverted: 0 | Deferred: 0 (8 carried over)
Ending state: 8 open findings in ledger (all carryovers, all needing manual architecture work)

## Session: 2026-04-09 14:35
Domains: security, api, architecture, frontend
Starting state: 8 open findings (all carryover deferred items)

### Round 6
- [HIGH] window.onclick = ... clobbers other handlers → fixed — `assets/js/admin-common.js`
- [HIGH] /db-test handlers leak error.message → fixed — both server files
- [HIGH] IELTS bandScore accepted without range validation → fixed — `local-database-server.js`
- [MEDIUM] Dead getFirstQuestionOfPart function → fixed — `assets/js/core.js`
- [MEDIUM] startAutoRefresh setInterval ID not stored → fixed — `assets/js/admin-common.js`

### Note
All 5 fix edits were absorbed into parallel agent checkpoint commit `758b1d8`
(scenario agent picked them up while my own heal commit `7485e27` only got an
unrelated CSS bystander). Verified all 5 changes present in HEAD before logging.

### Deferred (carried over)
- Hardcoded invigilator password — needs server-side auth
- Missing auth on admin endpoints — needs middleware + tokens
- Unbounded SELECT queries — needs pagination design
- Duplicate validation logic across servers — needs shared module
- core.js god file (1562 lines) — needs migration
- CORS wildcard — needs allowed origins config
- Inconsistent response envelope (raw arrays) — needs frontend coordination

### Stats
Rounds: 1 | Fixed: 5 | Reverted: 0 | Deferred: 0 (8 carried over)
Ending state: 8 open findings in ledger (all manual architecture work)

## Session: 2026-04-09 14:45
Domains: security, api, architecture, frontend
Starting state: 8 open findings (all carryover deferred items)

### Round 7
- [HIGH] error.message leaked in 6 Cambridge admin error handlers → fixed — `cambridge-database-server.js`
- [HIGH] POST /cambridge-answers mock parameter not validated → fixed — `cambridge-database-server.js`
- [MEDIUM] Badge poller setInterval ID not stored → fixed — `assets/js/exam-progress.js`
- [MEDIUM] Textarea scanner setInterval ID not stored → fixed — `assets/js/cambridge/disable-copy-paste.js`
- [LOW] Unused `db` variable destructured from createServer() → fixed — `cambridge-database-server.js`

### Deferred (carried over)
- Hardcoded invigilator password — needs server-side auth
- Missing auth on admin endpoints — needs middleware + tokens
- Unbounded SELECT queries — needs pagination design
- Duplicate validation logic across servers — needs shared module
- core.js god file (1562 lines) — needs migration
- CORS wildcard — needs allowed origins config
- Inconsistent response envelope (raw arrays) — needs frontend coordination
- distraction-free.js event listener leak refactor (in-progress by another agent)

### Stats
Rounds: 1 | Fixed: 5 | Reverted: 0 | Deferred: 0 (8 carried over)
Ending state: 8 open findings in ledger (all manual architecture work)
