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

### Deferred
- eval() with dynamic script content — needs careful refactoring (ielts-admin-dashboard.html)
- XSS in passage highlighting — needs escapeHTML in core.js
- Hardcoded invigilator password — needs architecture (server-side auth)
- Same hardcoded password in Cambridge launcher — needs architecture
- POST /submissions returns success on error — needs behavior review
- N+1 query in mock answers insertion — needs batch insert refactor
- Unreachable DOMContentLoaded handler — dead code in universal-functions.js

### Stats
Rounds: 1 | Fixed: 5 | Reverted: 0 | Deferred: 7
Ending state: 7 open findings in ledger
