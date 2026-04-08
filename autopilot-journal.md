# Autopilot Journal

## Session: 2026-04-08 12:30
Persona: Cambridge A1 Movers student round 2 + cross-level security sweep
System: Cambridge (all levels)

### Phase 1: Journey Map
- Full A1 Movers journey audited: Dashboard → R&W (6 parts) → Listening (5 parts) → Speaking → Results
- CRITICAL gap found: Part 6.html had NO deliver button — students could answer 35 questions but never submit
- Missing completed-status guards in reading-writing.html (A1-Movers and A2-Key)
- XSS via unsanitized error.message in speaking.html across ALL levels (A1, A2, B1 — B2 was fixed in prior session)
- No double-submit protection on speaking submit across ALL levels

### Phase 2: Creation
- Built: Deliver button + submit handler in A1 Movers Part 6.html
  - Checkmark button in footer nav (matches A2-Key Part 7 pattern)
  - Submit handler: consolidates answers → submits to DB → marks completed → redirects to dashboard
  - Includes double-submit protection (committed as part of 834658f checkpoint)

### Phase 3: Structure
- Skipped — structure sound

### Phase 4: Heal (cross-level security sweep)
1. **A1 Movers reading-writing.html** — completed-status guard + autosave logging. Committed as 050d0af
2. **A1 Movers speaking.html** — XSS fix (mic check + submission error) + double-submit. Committed as 050d0af
3. **A2-Key speaking.html (3 mocks)** — XSS fix + double-submit. Committed as 050d0af
4. **B1-Preliminary speaking.html (3 mocks)** — XSS fix + double-submit. Committed as 050d0af
5. **A2-Key reading-writing.html (3 mocks)** — completed-status guard + autosave logging. Committed as 845d6a4

### Phase 5: Experience
- Skipped — no server running

### Phase 6: Scenario
- Verified by code review: all fixes structurally correct
- Deliver button CSS class (footer__deliverButton___3FM07) confirmed available in player.css

### Session Stats
Total commits: 2 (050d0af, 845d6a4) + 1 pre-existing checkpoint
Total files changed: 14 (1 A1 Part 6, 1 A1 reading-writing, 1 A1 speaking, 3 A2 speaking, 3 B1 speaking, 3 A2 reading-writing, 2 A2 reading-writing)
Persona journey coverage: Full A1 Movers R&W submission flow + cross-level speaking security + cross-level completed guards
Critical fix: A1 Movers students can now submit reading-writing tests

---

## Session: 2026-04-08 12:00
Persona: Cambridge B2 First student (full journey audit — answer keys, integrity, security)
System: Cambridge

### Phase 1: Journey Map
- Full journey mapped: Login → Dashboard → B2-First selection → Reading (75min, Parts 1-6) → Writing (80min, Parts 7-8) → Listening (40min, Parts 1-4) → Speaking (14min, 4 parts) → Dashboard completion → View Results
- Gaps identified: 6
- Key finding: All 3 listening-answers.json files mislabeled as "A2 Key Listening" with wrong structure (5 parts, 26 Qs vs actual 4 parts, 25 Qs)
- Key finding: No reading answer key JSON files existed for any mock
- Key finding: Orphaned reading-writing.html files in all 3 B2-First mock folders (only valid for A1/A2 combined tests)
- Key finding: reading.html and writing.html missing completed-status guards (students could re-enter finished tests)
- Key finding: XSS via unsanitized error.message in speaking.html innerHTML
- Key finding: No double-submit protection on speaking.html submit button

### Phase 2: Creation
- Created: reading-answers.json templates for all 3 mocks (6 parts, 32 Qs each)
- Structure matches actual B2 First Reading & Use of English paper
- Answers marked as "?" — admin must fill in via admin dashboard

### Phase 3: Structure
- Removed orphaned reading-writing.html from B2-First, B2-First-MOCK-2, B2-First-MOCK-3
- These were A1/A2 combined-module wrappers, never linked from dashboard for B1/B2 levels

### Phase 4: Heal (5 fixes across 9 files)
1. **Listening answer key structure** — Fixed from A2 Key format (5 parts, 26 Qs) to correct B2 First format (4 parts, 25 Qs) with proper labels. All 3 mocks. Committed as 250cde3
2. **Completed-status guard** — reading.html and writing.html now redirect to dashboard if module already completed, matching B1-Preliminary and listening.html pattern. All 3 mocks. Committed as 6b76b25
3. **XSS in speaking.html** — Sanitized error.message before innerHTML injection (mic check + submission error handlers). All 3 mocks. Committed as 6b76b25
4. **Double-submit protection** — Submit button in speaking.html now disabled after click + shows "Submitting..." text. All 3 mocks. Committed as 6b76b25
5. **Silent error swallowing** — Autosave catch blocks in reading.html and writing.html now log warnings instead of silently failing. All 3 mocks. Committed as 6b76b25

### Phase 5: Experience
- Skipped — no server running for Playwright walk-through. Code-level audit only.

### Phase 6: Scenario
- Verified by code review: all fixes confirmed correct structurally
- Audio file reference (B1 label in B2 folder) noted but left as-is — file exists and works, only naming is wrong

### Session Stats
Total commits: 3 (250cde3, ee7efe0, 6b76b25)
Total files changed: 18 (6 answer JSON files, 3 removed reading-writing.html, 6 reading/writing wrappers, 3 speaking.html)
Persona journey coverage: Answer keys (all 3 mocks) → Test integrity (completed guards) → Security (XSS, double-submit) → Dead code cleanup
Remaining: Audio files named "B1" in B2 folders (cosmetic — files work correctly)

---

## Session: 2026-04-08 22:00
Persona: Cambridge Test Taker (all levels — A1, A2, B1, B2)
System: Cambridge (http://localhost:3003)

### Phase 1: Journey Map
- Walked complete student flow: launcher → login → dashboard → level selection → test modules → results
- Tested all 4 levels (A1-Movers, A2-Key, B1-Preliminary, B2-First)
- Verified all 10 mock test folders have complete file coverage

### What's Broken (Fixes Applied)
1. **CRITICAL: Root redirect broken** — `express.static('./')` served `index.html` at `/` before `app.get('/')` redirect fired. Students visiting `http://localhost:3003/` saw IELTS login instead of Cambridge launcher. **Fix:** Added `staticOptions: { index: false }` to both Cambridge and IELTS server configs via `server-bootstrap.js`.
2. **HIGH: Student ID validation mismatch** — `index.html` click handler regex allowed only 1-4 digits (`{1,4}`) but input field allowed 1-10. Students with 5+ digit IDs couldn't log in. **Fix:** Changed regex to `{1,10}`.
3. **HIGH: Session-verify redirect to non-existent file** — When session expired inside test pages, redirect went to `../../index.html` (= `Cambridge/index.html`, doesn't exist). **Fix:** Changed to absolute `/index.html?exam=cambridge`.
4. **HIGH: Results page answer key mismatch** — A1/A2 `my-results.html` used raw `rwSub.answers` without stripping `reading-writing_` prefix, causing all answers to show as wrong. Also affected listening answers. **Fix:** Added `extractAnswers()` call for both `reading-writing` and `listening` in A1/A2 block.

### Phase 2: Creation
- No new pages needed — all test flows are complete

### Phase 3: Structure
- Skipped — structure sound for Cambridge student journey

### Phase 4: Heal
- Fixed 4 issues (see above)
- Server bootstrap enhanced with `staticOptions` parameter

### Phase 5: Experience
- Playwright-verified full student journey across all 4 levels
- Screenshots: launcher page, A2-Key test, B1 reading, results page — all render correctly
- Welcome guide properly shown on first visit, dismissed correctly

### Phase 6: Scenario
- Verified 403s on answer keys for unsubmitted modules are handled gracefully (`.catch()`)
- Confirmed all module buttons work for each level variant

### Session Stats
Total fixes: 4 (1 critical, 3 high)
Files changed: 5 (server-bootstrap.js, cambridge-database-server.js, local-database-server.js, index.html, session-verify.js, my-results.html)
Persona journey coverage: 100% (all 4 Cambridge levels, all skills, results page)

---

## Session: 2026-04-09 07:30
Persona: Cheater + Cambridge B2 First student (full rotation — remaining personas)
System: Both (IELTS + Cambridge)

### Phase 1: Journey Map — Cheater
- Comprehensive security audit across 10 attack surfaces
- Found CRITICAL vulnerabilities: unauthenticated answer key access, submission data leakage, no dedup, client-only timers, multi-tab exploits

### Phase 2: Creation — Cheater
- No new pages created (security hardening, not feature creation)

### Phase 3: Structure
- Skipped — structure sound

### Phase 4: Heal — Cheater (5 fixes)
1. **Answer key data leakage** — `/my-answer-keys` now requires `student_id` and verifies submission exists before revealing keys. Rate limited. Committed as b7ed239
2. **Submission enumeration** — `/my-submissions` now rate limited. Committed as b7ed239
3. **Submission deduplication** — Both servers reject duplicate submissions for same student+skill+mock. Cambridge speaking also protected. IELTS dedup on student+skill+mock_number. Returns 409 Conflict. Committed as d35f58b
4. **Anti-cheat metadata in submissions** — `collectTestData()` (IELTS) and `submitTestToDatabase()` (Cambridge) now include tab switch count and multi-tab detection. Both servers log violations. Committed as 67af77b
5. **Server-side time enforcement** — Submissions exceeding 3x time limit hard-rejected (400). 2x flagged but accepted. Both servers. Committed as f6a3dff

### Phase 5: Experience — Cheater
- **Distraction-free hardening** — BroadcastChannel multi-tab detection with blocking overlay, sessionStorage-based tab switch tracking (tamper-resistant), `getAntiCheatData()` method for submission metadata. Committed as 447b4c6
- Note: Linter repeatedly reverts `init()` calls for `monitorTabVisibility()` and `detectMultipleTabs()` — requires investigation of linter config

### Phase 6: Scenario — Cheater
- Attack surface audit covers: timer manipulation, answer tampering, submission replay, URL exploits, score tampering, tab/window, DevTools, data leakage, speaking faking, fullscreen bypass
- Fixes validated by code review (server not running for curl testing)

### Phase 1: Journey Map — Cambridge B2 First Student
- Gaps identified: 3 critical
- Key finding: Reading timer was 45min instead of 75min (B2 First has combined Reading & Use of English)
- Key finding: Writing timer was 45min instead of 80min
- Key finding: ALL 36 B2 part files had wrong `data-mock` attributes (B1-Preliminary or A2-Key instead of B2-First)

### Phase 4: Heal — B2 First (2 fixes)
1. **Timer durations** — Reading 45→75min, Writing 45→80min across all 3 B2 mocks (6 files). Committed as 8e101e5
2. **data-mock attributes** — Fixed `data-mock` and `data-test-version` from B1-Preliminary/A2-Key to B2-First in 36 part files across all 3 mocks. Committed as 8e101e5

### Session Stats
Total commits: 8 (b7ed239, d35f58b, 447b4c6, 67af77b, f6a3dff, bfb46ad, 8e101e5, + checkpoint 9cada9e)
Total files changed: ~55
Persona journey coverage: Full cheater attack surface + B2 First timer/data-mock fixes
Remaining: B2 answer key creation (no reading/writing answer JSON files exist for B2)

---

## Session: 2026-04-09 06:00
Persona: IELTS student — full exam day (launcher → login → all skills → submit)
System: IELTS

### Phase 1: Journey Map
- Complete journey mapped: Launcher → Login → Dashboard → Listening/Reading/Writing → Submit → Dashboard (completion)
- Prior autopilot sessions had already built: progress indicator (exam-progress.js), review modal, writing mock key fix, dashboard badge fix, welcome guide, save indicator, time warnings, module hints
- New gaps identified: 3

### Phase 2: Creation
- Skipped — prior sessions already built all identified creation targets

### Phase 3: Structure
- Skipped — structure sound for IELTS student flow

### Phase 4: Heal
- Fixed: 2 findings
  - **Listening submission alerts** — removed redundant `alert()` calls (review modal already confirms), made dashboard redirect examType-aware, removed error.message exposure to students
  - **JSON parse error stack leak** — added error handling middleware in `shared/server-bootstrap.js` for malformed JSON bodies. Raw Express stack traces no longer leak to clients.

### Phase 5: Experience (Playwright walk-through)
- Walked: Launcher → Login → Dashboard → Reading → Writing
- All pages look professional and polished
- **CRITICAL BUG FOUND AND FIXED**: Progress indicator showed "0/40" even after answering questions. Root cause: accessibility sr-only spans (`<span class="sr-only">Question 1</span>`) made `parseInt(btn.textContent)` return NaN in `updateAnsweredNav()`. Fixed to parse question number from `onclick` attribute instead. Verified fix via Playwright: badge correctly shows "3/40" after answering 3 questions.

### Phase 6: Scenario (Stress Test)
- Tested: 8 scenarios
  1. Missing studentId → correctly returns 400 "Student ID and name are required"
  2. Missing skill → correctly returns 400 "Skill is required"
  3. Empty body → correctly returns 400
  4. XSS in studentId → rejected by server validation
  5. Valid submission → correctly saved (ID returned)
  6. Duplicate submission → accepted (by design)
  7. SQL injection in studentId → safe (parameterized queries)
  8. Invalid JSON body → FOUND & FIXED: was leaking raw stack traces, now returns clean 400

### Session Stats
Total commits: ~3 (listening cleanup, progress indicator fix, JSON error handler)
Total files changed: 3 (core.js, listening.js, server-bootstrap.js)
Persona journey coverage: Full exam day — launcher through all 3 modules to completion

---

## Session: 2026-04-09 05:30
Persona: Cheater — trying to exploit every weakness
System: Both (IELTS + Cambridge)

### Phase 1: Journey Map
- Full attack surface mapped across both IELTS (port 3002) and Cambridge (port 3003) servers
- 12+ critical/high vulnerabilities identified
- Key findings: ALL admin endpoints had ZERO auth, answer keys openly accessible, invigilator password in page source, timer purely client-side, anti-cheat trivially bypassed

### Phase 2: Creation
- Built: `shared/auth.js` — `requireAdmin` middleware, `rateLimit` middleware, token management
- Built: `/verify-invigilator` server-side endpoint in `shared/server-bootstrap.js`

### Phase 4: Heal (Security Hardening)
- Applied `requireAdmin` to 18 endpoints across both servers (answer keys, scores, results, submissions listing)
- Admin login now registers tokens server-side for validation
- `_authFetch()` helper on `AdminDashboard` class + all 4 admin pages updated with auth headers
- Rate limiting (10 req/min) on student submission endpoints
- Invigilator password removed from 5 client-side files, replaced with server-side API verification
- Server-side duration validation (flags submissions exceeding 2x allowed time)

### Phase 5: Experience (Anti-Cheat)
- Tab visibility + window blur detection (counts switches, stores in localStorage)
- Additional keyboard blocking (Ctrl+Shift+C, Ctrl+P, Ctrl+S)
- Copy/paste prevention on non-writing inputs
- Visual warning banner on tab switch return

### Phase 6: Scenario (Verified)
- 10 attack vectors tested, all blocked:
  - 6 sensitive endpoints → 401 without auth
  - Student submissions still work (rate limited)
  - Sensitive server files → 404

### Session Stats
Total commits: 5 (cd57c59, 489735e, 56ed0f9, 82b2a0e + checkpoint)
Total files changed: ~15
Persona journey coverage: Full attack surface — API auth, password exposure, timer manipulation, anti-cheat, rate limiting

---

## Session: 2026-04-09 05:00
Persona: Staff rotation round 2 (Invigilator + Admin Scoring + Admin Management — deeper pass)
System: Both (IELTS + Cambridge)

### Phase 1: Journey Map
- Round 1 covered: Room Activity creation, cross-navigation, scoring progress stats
- Round 2 gaps identified: 6 high-impact workflow improvements
  - Admin scoring has no queue navigation (must manually find each unscored submission)
  - Invigilator Room Activity has no search/filter (unusable with 20+ students)
  - No way to delete test/junk submissions
  - Type coercion bugs in ID comparisons across all admin dashboards
  - Missing HTML escaping on submission IDs in IELTS onclick handlers
  - Invigilator Room Activity broken by new requireAdmin middleware (no auth header sent)

### Phase 2: Creation
- Built: 3 new features
  - **Scoring Queue Navigation** — "Start Scoring" button + prev/next unscored modal navigation + auto-advance after saving. Queue counter shows "3 of 17 unscored" in modal header. Both IELTS and Cambridge dashboards. Committed as 559147c
  - **Room Activity Search/Filter** — search by name/ID, filter by skill (Reading/Writing/Listening/Speaking/R&W), filter by status (Scored/Pending). Stats update to filtered results. Committed as c75d506
  - **Submission Delete** — DELETE endpoints on both servers (with requireAdmin), delete buttons in table rows, confirmation prompt, response.ok validation. Committed as 76c641d

### Phase 3: Structure
- Skipped — structure sound. AdminDashboard base class pattern continues to work well.

### Phase 4: Heal
- Fixed: 3 findings
  - **Type coercion bugs** — `s.id == submissionId` (loose equality) replaced with `String(s.id) === String(submissionId)` across admin-common.js, IELTS dashboard, Cambridge dashboard. Committed as efd4741
  - **Missing HTML escaping** — all IELTS `${submission.id}` in onclick handlers now use `${esc(submission.id)}` for consistency with Cambridge. Committed as efd4741
  - **Missing response.ok check** — AI suggestion fetch now validates response before parsing JSON. Committed as efd4741

### Phase 5: Experience
- Improvements: 2
  - **Keyboard shortcuts** — Arrow Left/Right to navigate prev/next unscored in modal, Escape to close modal. Tooltip hints on nav buttons. Committed as bae9751
  - **Cambridge skill filter** — added "Reading & Writing" option to invigilator Room Activity skill dropdown. Committed as bae9751

### Phase 6: Scenario (Stress Test)
- Tested: 6 scenarios
  1. **DELETE without auth** — correctly returns 401 "Authentication required" (IELTS)
  2. **DELETE with invalid token** — correctly returns 401 "Invalid or expired token"
  3. **DELETE non-existent submission** — correctly returns 404 (with valid auth)
  4. **Cambridge DELETE route** — not available in running server (needs restart) — code verified correct
  5. **Score update without auth** — correctly returns 401 on both servers
  6. **Invigilator Room Activity without auth token** — FOUND & FIXED: fetch now sends admin token from localStorage, shows clear auth error with link to admin dashboard if no token. Committed as 03a63cd
- Hardened: deleteSubmission response handling for non-JSON error responses. Committed as d3793cd

### Session Stats
Total commits: 7 (559147c, c75d506, 76c641d, efd4741, bae9751, 03a63cd, d3793cd)
Total files changed: 6 (admin-common.js, admin-common.css, ielts-admin-dashboard.html, cambridge-admin-dashboard.html, invigilator.html, local-database-server.js, cambridge-database-server.js)
Persona journey coverage: Admin scoring (full queue workflow), Invigilator (search + auth), Admin management (delete + security)

---

## Session: 2026-04-09 04:30
Persona: Cambridge A2 Key student — reading, writing, listening, speaking + submitting and checking answers
System: Cambridge

### Phase 1: Journey Map
- Full journey mapped: Login → Dashboard → Level Select → Module Cards → R&W (7 parts) → Listening (5 parts + audio) → Speaking (mic check + record + submit) → Dashboard completion → View Results
- Prior sessions had already fixed most critical bugs (examType case mismatch, cambridge- prefix, window.top redirect)
- This session verified fixes and found new issues through end-to-end testing

### Phase 2: Creation
- No new pages needed — A2 Key student flow is complete end-to-end

### Phase 3: Structure
- Skipped — structure sound for A2 Key student flow

### Phase 4: Heal
- Fixed: 2 findings
  - **Student ID max length too restrictive** — login form limited student IDs to 4 digits (maxlength, pattern, JS validation). Real IDs can be 5-10 digits. Increased to 10 across HTML attributes and JS. Committed as d5e36b5
  - **Answer keys endpoint column mismatch** — `/my-answer-keys` endpoint queried `mock` column but table uses `mock_test`, and ordered by `created_at` but table uses `updated_at`. Both caused 500 errors when students tried to check answers. Fixed both. Committed as 3887949 + amended into 82b2a0e

### Phase 5: Experience (Playwright walk-through)
- Verified login → dashboard → A2 Key selection → welcome guide → module cards
- Tested Reading & Writing: Part 1 questions render, radio selection works, answer counts update in footer (1 of 6), navigation to Part 7 works, writing textarea with word counter
- Submission flow: confirm dialog → database submission → success alert → completion status
- Dashboard shows "Completed ✓" after R&W submission
- "View My Submitted Answers" link appears and my-results.html exists
- Timer countdown (59:59) runs correctly with time warnings

### Phase 6: Scenario (Stress Test)
- Tested: 5 scenarios
  1. **Empty answer submission** — Accepted (by design: timed-out students may have no answers)
  2. **Missing required fields** — Correctly rejected
  3. **Duplicate submission** — Accepted (latest wins, acceptable behavior)
  4. **SQL injection in student name** — Safe: stored as literal string, parameterized queries protect
  5. **Answer keys endpoint** — FOUND & FIXED: two column name bugs causing 500 errors

### Session Stats
Total commits: 2 (d5e36b5, 3887949)
Total files changed: 2 (index.html, cambridge-database-server.js)
Persona journey coverage: Login (ID validation) → Dashboard → R&W (all 7 parts + submit) → Answer checking (endpoint fixes)

---

## Session: 2026-04-09 02:30
Persona: Cambridge B1 Preliminary student — round 2 (submission hardening + answer checking)
System: Cambridge

### Phase 1: Journey Map
- Prior session already fixed localStorage keys, data-mock attrs, completed guards, and student results page
- This session focused on: submission integrity, security hardening, UX polish

### Phase 2: Creation
- No new pages/features — prior session already built my-results.html and student-facing endpoints

### Phase 3: Structure
- Skipped — structure sound

### Phase 4: Heal
- Fixed: 3 findings
  - **Rate limiting** — added `submissionLimiter` (10 req/min) to `/cambridge-submissions` and `/submit-speaking`. Prevents abuse from rapid-fire submissions. Committed as 86dfc3d
  - **Admin auth on sensitive endpoints** — added `requireAdmin` middleware to 8 Cambridge endpoints (GET/POST submissions, answers, results, score, evaluate). Students can no longer access all submissions or admin-only data. Committed as 86dfc3d
  - **Auth token in admin fetch** — added `_authFetch()` helper to `AdminDashboard` class, sends Bearer token with API requests to support new auth middleware. Committed as 8f3f127

### Phase 5: Experience
- Pages improved: 2
  - **Cambridge dashboard** — completed module cards now show time taken (e.g., "Completed (32 min)") instead of just "Completed ✓". Committed as cde2260
  - **Invigilator panel** — added room activity search/filter bar (search by name/ID, filter by skill, filter by scored/pending status). Committed as 86dfc3d

### Phase 6: Scenario (Stress Test)
- Tested: 7 scenarios
  1. **Double-click submission** — FOUND & FIXED: deliver buttons had no double-click protection. Added `data-submitting` guard + disabled state to Part 6, Part 8, Listening Part 4 across all 3 mocks. Committed as 3fab795
  2. **Empty answer submission** — Accepted: empty {} passes server validation. Design decision: students may time out with no answers, submission still valid
  3. **Timer expiry during submission** — Safe: timer shows modal but does NOT auto-submit. Student retains control
  4. **Tab close during submission** — Timer saves timer state via beforeunload, but answers are already persisted in localStorage via periodic autosave
  5. **Server error fallback** — Correct: localStorage key `cambridge_submissions_database` is consistent
  6. **My-results with no submissions** — Graceful: shows empty state, no crash
  7. **Multiple module race** — Low risk: skill detection is timestamp-based, modules submit from separate pages

### Session Stats
Total commits: 4 (86dfc3d, 8f3f127, cde2260, 3fab795)
Total files changed: ~18 (11 Part/Listening files, dashboard-cambridge.html, admin-common.js, cambridge-database-server.js, invigilator.html, student-dashboard.html)
Persona journey coverage: Submission (all 4 modules) → Dashboard return → Answer checking → Security hardening

---

## Session: 2026-04-09 01:00
Persona: Cambridge B1 Preliminary student (intermediate exam + submitting and checking answers)
System: Cambridge

### Phase 1: Journey Map
- Gaps identified: 6
- Key finding: Reading/Writing wrappers initialized wrong localStorage key (`readingAnswers` instead of `cambridge-readingAnswers`)
- Key finding: Writing Part 7/8 had `data-mock="A2-Key"` instead of `B1-Preliminary`
- Key finding: Reading/Writing wrappers had no completed-status guard (could re-enter finished tests)
- Key finding: my-results.html only supported combined reading-writing (A1/A2), not separate reading+writing (B1/B2)
- Key finding: All data-fetching endpoints required admin auth, blocking student results page

### Phase 2: Creation
- Built: 2 student-facing API endpoints
  - `/my-submissions` — returns student's own submissions without admin auth (no audio_data)
  - `/my-answer-keys` — returns answer keys for a level/skill without admin auth
  - Committed within cambridge-database-server.js

### Phase 3: Structure
- Skipped — structure sound for B1 student flow

### Phase 4: Heal
- Fixed: 5 findings across all B1 mocks (MOCK 1, 2, 3)
  - **localStorage key mismatch** — `readingAnswers`/`writingAnswers` → `cambridge-readingAnswers`/`cambridge-writingAnswers` in reading.html/writing.html wrappers. Also fixed in B2-First mocks. Committed as 18b6734
  - **Wrong data-mock attribute** — Part 7/8 had `data-mock="A2-Key"`, fixed to `B1-Preliminary` across all 3 mocks. Committed as 269b70c
  - **Missing completed-status guard** — reading.html/writing.html wrappers now redirect to dashboard if module already completed, matching listening.html behavior. Committed as adf1182

### Phase 5: Experience
- Pages improved: 1 (deep rewrite)
  - **my-results.html** — full B1/B2 support: separate Reading, Writing, Listening sections; uses new student-facing `/my-submissions` and `/my-answer-keys` endpoints; level-aware summary (4 modules instead of 3); correct localStorage fallback keys. Committed as aa4b031

### Phase 6: Scenario
- Deferred (endpoint-level testing requires running server — structural correctness verified via code review)

### Session Stats
Total commits: 4 (18b6734, 269b70c, adf1182, aa4b031)
Total files changed: ~20 (reading.html x6, writing.html x6, Part 7.html x3, Part 8.html x3, cambridge-database-server.js, my-results.html)
Persona journey coverage: Login → Dashboard → Reading (submit) → Writing (submit) → Listening (submit) → Speaking (submit) → Dashboard (completion) → View Results (answer checking)
---

## Session: 2026-04-08 23:40
Persona: Cambridge A1 Movers student (young learner — take test, submit, check answers)
System: Cambridge

### Phase 1: Journey Map
- Gaps identified: 4
- Key finding: No student-facing results page — students submit answers but can never see them again
- Key finding: No answer checking — answer keys exist in DB but students can't compare against them
- Key finding: Dashboard completion banner has no link to review submitted work
- Key finding: Server GET endpoint lacked student_id filter (only level/skill filters existed)

### Phase 2: Creation
- Built: 2 new features
  - **Student answer review page** (`Cambridge/my-results.html`) — fetches student's submissions from server, compares answers against answer keys with correct/incorrect marking, shows scores and speaking evaluation feedback. Falls back to localStorage if server is down. Committed as 3982873
  - **Dashboard integration** — "View My Answers & Results" button in completion banner + "View My Submitted Answers" link shown when any module is completed (before all done). Committed as 3982873
  - **Server enhancement** — added `student_id` and `mock_test` query filters to `GET /cambridge-submissions`. Excludes `audio_data` from student queries for fast responses. Committed as 3982873

### Phase 3: Structure
- Skipped — structure sound for A1 Movers student flow. Dashboard → Test → Dashboard → Results is clear.

### Phase 4: Heal
- Fixed: 2 critical findings
  - **localStorage key mismatch (data loss)** — `answer-manager.js` was reading from `cambridge_submissions_database` but writing to `test_submissions_database`, causing all local fallback submissions to be lost. Fixed to use consistent key. Committed as 4cceec9
  - **Promise.all error handling** — `my-results.html` would crash entirely if any one of three parallel fetches failed. Wrapped each with `.catch()` fallback. Also hardened `fetchJSON()` to catch JSON parse errors. Committed as 4cceec9

### Phase 5: Experience
- Pages improved: 1 (deep polish on results page)
  - **Answer key normalization** — student submissions use prefixed keys (`reading-writing_q1`, `listening_L2`) but answer keys use plain keys (`q1`, `L2`). Added `normalizeAnswerKey()` to strip prefixes. Committed as 1c273c2
  - **Alternative answer formats** — enhanced `isCorrect()` to handle slash-separated (`Mary/mary`), pipe-separated (`cat|Cat`), and array alternatives. Committed as 1c273c2
  - **Array display** — added `formatAnswer()` to properly render array/pipe correct answers as "option1 / option2". Committed as 1c273c2

### Phase 6: Scenario
- Tested: 6 scenarios, all passed
  1. student_id filter returns correct submissions (2 for student 1036)
  2. mock_test filter works (1561 mock-1 submissions)
  3. Non-existent student returns empty array
  4. SQL injection attempt returns 0 results (parameterized queries protect)
  5. audio_data excluded from student queries (confirmed field list)
  6. Answer matching handles all formats (exact, case-insensitive, slash/pipe/array, trimming)

### Session Stats
Total commits: 4 (3982873, 4cceec9, 1c273c2, + checkpoint d85b1ca)
Total files changed: 4 (Cambridge/my-results.html, Cambridge/dashboard-cambridge.html, cambridge-database-server.js, assets/js/answer-manager.js)
Persona journey coverage: Dashboard (completed state) → View Results → Answer review with auto-checking → Score display → Speaking evaluation status
---

## Session: 2026-04-08 22:30
Persona: Nervous first-timer (never seen the platform before)
System: Both (IELTS + Cambridge)

### Phase 1: Journey Map
- Gaps identified: 8
- Key finding: Silent auto-save — students had zero feedback that their answers were being preserved
- Key finding: No welcome/orientation — first-timers dropped straight into module selection with no context
- Key finding: Timer color changes only — no explicit time warnings a student would notice
- Key finding: Module cards gave duration but zero description of what's inside
- Key finding: Progress counter and review modal already existed (exam-progress.js) — well wired

### Phase 2: Creation
- Built: 3 new features
  - **Auto-save indicator** — subtle green "Answers saved" toast at bottom-left, shows every 30s during periodic save, throttled to avoid spam. Uses `role="status"` + `aria-live="polite"` for screen readers. Committed as f905363
  - **Time warning toasts** — 3 tiers: "10 minutes remaining" (blue), "5 minutes remaining" (orange), "1 minute remaining!" (red). Each shows once, centered top, 4-second display. Uses `role="alert"`. Committed as 071db7f
  - **Welcome guide overlay** — one-time orientation modal on both dashboards (IELTS + Cambridge). Explains modules, auto-save, timer warnings, submission flow, and reassures about data safety. Shows once per student via localStorage key. Committed as 530c1e4

### Phase 3: Structure
- Skipped — structure sound for first-timer flows. Dashboard → Test → Dashboard loop is clear and logical.

### Phase 4: Heal
- Fixed: 3 accessibility findings
  - Added `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-required`, `aria-describedby`, `role="alert"` to invigilator password modals on both dashboards
  - Added `aria-label="Innovative Centre logo"` and `role="img"` to launcher SVG
  - Converted launcher feature list from `<div>` to semantic `<ul>/<li>` with `aria-hidden="true"` on decorative SVGs
  - Committed as e3e3be3

### Phase 5: Experience
- Pages improved: 4 (via module description hints)
  - **IELTS dashboard** — added `.module-hint` text to each card: "4 parts, 40 questions..." / "3 passages, 40 questions..." / "2 tasks. Task 1: describe a chart..."
  - **Cambridge dashboard** — added context-appropriate hints for all module types across A1/A2 and B1/B2 layouts: "Audio cannot be paused" for listening, "You'll test your microphone first" for speaking
  - Committed as edb2435

### Phase 6: Scenario
- Skipped (first-timer is not an adversarial persona — stress testing covered by cheater persona)

### Session Stats
Total commits: 7 (including checkpoint and hook-triggered)
Total files changed: ~10 (session-manager.js, timer.js, welcome-guide.js, student-dashboard.html, dashboard-cambridge.html, dashboard.css, cambridge-dashboard.css, launcher.html, launcher.css)
Persona journey coverage: Launcher → Login → Dashboard → Test (all modules) → Submit → Return
---

## Session: 2026-04-08 21:00
Persona: Staff rotation (Invigilator → Admin Scoring → Admin Management)
System: Both (IELTS + Cambridge)

### Phase 1: Journey Map
- Gaps identified: 12+ across invigilator and admin personas
- Key finding: Invigilator panel was localStorage-only (single machine), no way to monitor multiple students from one screen
- Key finding: No cross-navigation between invigilator and admin views
- Key finding: Admin dashboards had no scoring progress indicator

### Phase 2: Creation
- Built: 1 major feature — Room Activity view for invigilator
  - Server-backed multi-student monitoring (fetches from /submissions or /cambridge-submissions)
  - Stats cards: Students, Submissions, Scored, Pending
  - Grouped by student with skill badges and score status
  - Auto-refreshes every 30 seconds
  - Committed as a7cbae7

### Phase 3: Structure
- Skipped — structure sound for staff flows. Invigilator panel is self-contained, admin dashboards share AdminDashboard base class properly.

### Phase 4: Heal
- Fixed: 2 findings
  - Removed duplicate answer-manager.js script import (was loaded twice)
  - Part of a7cbae7

### Phase 5: Experience
- Pages improved: 5
  - **Invigilator panel** — reordered sections (Room Activity first), added Admin Dashboard nav button, upgraded IELTS session info with progress bar + per-module status icons (ad09bda)
  - **IELTS admin dashboard** — added Invigilator Panel link in header, added Scoring Progress % stat card (68a5a04)
  - **Cambridge admin dashboard** — added Invigilator Panel link in tab bar, added Scoring Progress % stat card (68a5a04)
  - **Cambridge speaking evaluations** — added Invigilator Panel link in tab bar (68a5a04)
  - **Cambridge student results** — added Invigilator Panel link in tab bar (68a5a04)

### Phase 6: Scenario
- Tested: 2 edge cases found and fixed
  - Timezone date filtering: was using UTC (submissions near midnight could be filtered out), fixed to use local timezone (e8624e0)
  - Score=0 detection: IELTS score of 0/40 was treated as "unscored", fixed to only check null/undefined (e8624e0)

### Session Stats
Total commits: 4 (staff-specific, within larger rotation session)
Total files changed: 5 (invigilator.html, ielts-admin-dashboard.html, cambridge-admin-dashboard.html, cambridge-speaking-evaluations.html, cambridge-student-results.html)
Persona journey coverage: Invigilator (core monitoring + data management), Admin scoring (stats + navigation), Admin management (cross-nav)
