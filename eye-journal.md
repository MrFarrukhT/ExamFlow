# Eye Journal

## Session: 2026-04-09 (round 39) — JavaScript Module Architecture
Persona: Developer reviewing code organization
System: Both — assets/js/ (34 JS files, ~14,400 lines total)
Pages explored: All 34 JS files inventoried by size, global declarations, font-family usage, event listener counts, setInterval/clearInterval pairs, escapeHTML duplicates
Starting state: The JS codebase used plain `<script>` includes with no module system (by design — no build step). Most files used file-scoped variables safely, but some functions were defined identically in multiple files.

### Round 1 — Polish: remove triplicate escapeHTML

**Findings (5 total):**
- [T4] **escapeHTML() defined in 3 separate files.** session-manager.js:4, universal-functions.js:2, and core.js:4 all define identical `escapeHTML(str)` functions. admin-common.js also has `AdminDashboard.escapeHtml()` (different name, same logic). Whichever file loads last overwrites the previous definition in the global scope — harmless since they're identical, but a maintenance trap (edit one, forget the others).
- [T4] **core.js indentation drift.** Lines 55-109 (dynamic answer loading system) are at column 0 but are syntactically inside the DOMContentLoaded callback. The bad indentation makes the code look global-scoped when it isn't. Style-only issue, not a runtime bug.
- [T3] **timer.js defines 3 different timer classes.** `ExamTimer` (line 21), `TestTimer` (line 625), `CambridgeTimer` (line 650) in one 672-line file. Naming is confusing — which timer is for which page? No clear deprecation comments.
- [T0] **No JS module system.** All 34 files are plain `<script>` includes. No ES modules, no bundler, no import/export. By design (no build step), but means every function is global and load order matters.
- [T0] **Event listener cleanup is absent on most modules.** session-manager.js (4 adds, 0 removes), distraction-free.js (12 adds, 0 removes), listening.js (35 adds, 0 removes). Technically fine for a page-per-test architecture where navigation unloads the page, but would cause leaks in an SPA.

**Action:** POLISH 1 fix — remove duplicate escapeHTML from session-manager.js.

**Files touched:**
1. **assets/js/session-manager.js** — removed the local `escapeHTML()` function (lines 4-7). Added a comment noting it's provided by `universal-functions.js` which is loaded before this file on every test page that uses it. The one usage at line 88 (`escapeHTML(studentId)`) now relies on the universal-functions.js copy. Verified with `grep -rl "session-manager.js"` → all pages also include `universal-functions.js`.

### Module Inventory (for future rounds)
| File | Lines | Scope | Globals |
|------|-------|-------|---------|
| core.js | 1434 | DOMContentLoaded callback | `window.coreJSLoaded` |
| listening.js | 2066 | DOMContentLoaded callback | `window.examProgress` |
| cambridge-bridge.js | 1433 | DOMContentLoaded callback | bridge functions |
| admin-common.js | 1058 | class `AdminDashboard` | `window.escapeHtml` |
| timer.js | 672 | 3 classes | ExamTimer, TestTimer, CambridgeTimer |
| writing-handler.js | 663 | class `WritingHandler` | `window.writingHandler` |
| session-manager.js | 564 | file-scoped functions | `initializeSession`, `saveTestToDatabase`, etc. |
| answer-manager.js | 541 | class `AnswerManager` | `window.answerManager` |
| distraction-free.js | 527 | class `DistractionFreeMode` | `distractionFreeMode`, `enterFullscreenMode` |
| universal-functions.js | ~110 | class + globals | `escapeHTML`, `IELTSUniversalFunctions`, `toggleOptionsMenu` |

### Deferred
- **Consolidate escapeHTML further.** core.js's copy is DOMContentLoaded-scoped and safe. Could add `window.escapeHTML = escapeHTML;` at the top of universal-functions.js to make it explicitly the canonical global version.
- **Fix core.js indentation.** The answer-loading section (lines 55-109) needs 8 spaces of indentation to match the surrounding callback. Cosmetic but reduces confusion.
- **Document timer.js class responsibilities.** Which timer class is current? Which are legacy? Add deprecation comments or split into separate files.
- **Consider a shared utilities file.** A `assets/js/utils.js` that exports `escapeHTML`, `_safeParseJSON`, and other repeated helpers. Would require touching the `<script>` include order on every page.

### Session Stats (round 39)
Pages explored: 34 JS files inventoried
Findings: 5 (2× T4, 1× T3, 2× T0)
Polishes landed: 1 (duplicate escapeHTML removal)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Files touched: 1 (assets/js/session-manager.js)
