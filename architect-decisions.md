# Architecture Decisions

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
