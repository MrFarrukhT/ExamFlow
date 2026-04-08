# Architecture Decisions

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
