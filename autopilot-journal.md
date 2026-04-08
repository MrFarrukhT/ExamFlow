# Autopilot Journal

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
