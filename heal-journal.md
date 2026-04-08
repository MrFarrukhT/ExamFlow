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

### Deferred
- Hardcoded invigilator password — needs architecture (server-side auth)
- Same hardcoded password in Cambridge launcher — needs architecture

### Stats
Rounds: 3 | Fixed: 15 | Reverted: 0 | Deferred: 2
Ending state: 2 open findings in ledger
