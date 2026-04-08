# Eye Journal

## Session: 2026-04-08
Persona: Student arriving to take an IELTS exam
System: Both (IELTS + Cambridge launchers share same CSS)
Pages explored: launcher.html, Cambridge/launcher-cambridge.html
Starting state: Functional but utilitarian — invisible footer button, no animations, inline modal styles

### Round 1
**Explored:** 2 pages (IELTS launcher + Cambridge launcher for consistency), 8 findings total
**Action:** POLISH 5 fixes + ELEVATE 3 enhancements on both launchers

- [T4] launcher.html — Fixed invisible "Admin Access" button (white text on white bg) → visible "Invigilator Access" with proper contrast
  Mode: polish
  Quality layer: 2-Clear → 4-Polished
  Files: launcher.html, Cambridge/launcher-cambridge.html, assets/css/launcher.css

- [T3] launcher.html — Fixed naming inconsistency (button said "Admin Access", modal said "Invigilator Access")
  Mode: polish
  Quality layer: 2-Clear → 3-Efficient
  Files: launcher.html, Cambridge/launcher-cambridge.html

- [T4] launcher.html — Moved all inline modal styles to launcher.css, added focus state, backdrop blur, slide-up animation
  Mode: polish + elevate
  Quality layer: 3-Efficient → 5-Delightful
  Files: launcher.html, Cambridge/launcher-cambridge.html, assets/css/launcher.css

- [T4] launcher.html — Updated stale build date (September/October 2025 → April 2026)
  Mode: polish
  Files: launcher.html, Cambridge/launcher-cambridge.html

- [T0] launcher.html — Added staggered feature list entrance animations (0.9s-1.35s delay)
  Mode: elevate
  Quality layer: 4-Polished → 5-Delightful
  Files: assets/css/launcher.css

- [T0] launcher.html — Added launch button glow pulse, loading state ("Launching..."), and spin animation
  Mode: elevate
  Quality layer: 3-Efficient → 5-Delightful
  Files: launcher.html, Cambridge/launcher-cambridge.html, assets/css/launcher.css

- [T0] launcher.html — Added "Press Enter to launch" keyboard hint below button
  Mode: elevate
  Quality layer: 3-Efficient → 4-Polished
  Files: launcher.html, Cambridge/launcher-cambridge.html, assets/css/launcher.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 5-Delightful | Animations, glow, loading state, clean modal |
| Cambridge/launcher-cambridge.html | 5-Delightful | Same improvements applied |

### Round 2
**Explored:** 1 page (index.html — IELTS Student Login), 9 findings
**Action:** POLISH 5 fixes + ELEVATE 4 enhancements

- [T3] index.html — Renamed "Go to Admin Login" → "Go to Invigilator Login" for consistency
  Mode: polish
  Files: index.html

- [T3] index.html — Replaced alert() validation with inline errors + shake animation
  Mode: polish
  Quality layer: 2-Clear → 4-Polished
  Files: index.html, assets/css/entry.css

- [T4] index.html — Moved inline modal styles to CSS classes (matching launcher pattern)
  Mode: polish
  Files: index.html, assets/css/entry.css

- [T4] index.html — Added floating labels (label floats above input on focus/fill)
  Mode: polish
  Quality layer: 3-Efficient → 4-Polished
  Files: index.html, assets/css/entry.css

- [T4] index.html — Inline error styles moved to .form-error CSS class
  Mode: polish
  Files: index.html, assets/css/entry.css

- [T3] index.html — Added IELTS exam badge in header (matching Cambridge's badge pattern)
  Mode: elevate
  Files: index.html, assets/css/entry.css

- [T0] index.html — Added "IELTS Academic Assessment" subtitle below heading
  Mode: elevate
  Files: index.html, assets/css/entry.css

- [T0] index.html — Staggered form entrance animations (title, fields, button)
  Mode: elevate
  Quality layer: 3-Efficient → 5-Delightful
  Files: assets/css/entry.css

- [T0] index.html — Login button loading state ("Logging in...")
  Mode: elevate
  Files: index.html, assets/css/entry.css

### Round 3
**Explored:** 1 page (MOCKs/MOCK 1/reading.html — IELTS Reading Test), 7 findings
**Action:** POLISH 4 fixes + ELEVATE 2 enhancements (CSS + minimal JS, benefits all 10 mocks)

- [T4] reading.css — Reduced scrollbar width from 100px to 14px with rounded thumb
  Mode: polish
  Files: assets/css/reading.css

- [T4] reading.css + core.js — Timer warning states (amber at 10min, red at 5min, pulse at 1min)
  Mode: polish + elevate
  Files: assets/css/reading.css, assets/js/core.js

- [T4] reading.css — Improved .answered question button visibility (grey → blue tint)
  Mode: polish
  Files: assets/css/reading.css

- [T3] reading.css — Added focus glow on answer inputs
  Mode: polish
  Files: assets/css/reading.css

- [T0] reading.css — Fade-in transition when switching Parts 1/2/3
  Mode: elevate
  Files: assets/css/reading.css

- Dark mode support added for all new styles

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 5-Delightful | Animations, glow, loading state, clean modal |
| Cambridge/launcher-cambridge.html | 5-Delightful | Same improvements applied |
| index.html | 5-Delightful | Floating labels, inline validation, entrance animations |
| MOCKs/*/reading.html | 4-Polished | Timer warnings, better nav, smooth transitions |

### Round 4
**Explored:** 1 page (MOCKs/MOCK 1/writing.html — IELTS Writing Test), 7 findings
**Action:** POLISH 4 fixes + ELEVATE 2 enhancements (CSS + JS, benefits all 10 mocks)

- [T4] writing-handler.js — Timer now uses CSS classes (warning/critical/urgent) instead of inline style.color
  Mode: polish
  Files: assets/js/writing/writing-handler.js, assets/css/writing.css

- [T3] writing-handler.js — Replaced alert() time-up with inline "Time's up!" notification
  Mode: polish
  Files: assets/js/writing/writing-handler.js

- [T4] writing.css — Fixed hidden scrollbars on both panels (was scrollbar-width: none)
  Mode: polish
  Files: assets/css/writing.css

- [T3] writing.css — Textarea fills available viewport height (calc), smoother focus transition
  Mode: polish
  Files: assets/css/writing.css

- [T0] writing.css — Fade-in animation when switching between Task 1 and Task 2
  Mode: elevate
  Files: assets/css/writing.css

- [T0] writing.css — Timer pulse animation at 1 minute remaining
  Mode: elevate
  Files: assets/css/writing.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 5-Delightful | Animations, glow, loading state, clean modal |
| Cambridge/launcher-cambridge.html | 5-Delightful | Same improvements applied |
| index.html | 5-Delightful | Floating labels, inline validation, entrance animations |
| MOCKs/*/reading.html | 4-Polished | Timer warnings, better nav, smooth transitions |
| MOCKs/*/writing.html | 4-Polished | Timer CSS classes, visible scrollbars, task fade |

### Round 5
**Explored:** 1 page (MOCKs/MOCK 1/listening.html — IELTS Listening Test), 5 findings
**Action:** POLISH 4 CSS-only changes (benefits all 10 mocks, consistency with reading/writing)

- [T4] listening.css — Timer warning CSS states (warning/critical/urgent + pulse animation)
  Mode: polish
  Files: assets/css/listening.css

- [T4] listening.css — Improved .answered button visibility (grey → blue)
  Mode: polish
  Files: assets/css/listening.css

- [T0] listening.css — Fade-in animation on part switch
  Mode: polish
  Files: assets/css/listening.css

- Dark mode support for timer warnings + answered state
  Files: assets/css/listening.css

### Round 6
**Explored:** 1 page (dashboard.html — IELTS Student Dashboard), 5 findings
**Action:** FIX 1 critical bug + POLISH 2 fixes + ELEVATE 1 enhancement

- [T1] dashboard.css — CRITICAL: Added missing :root CSS variable definitions
  Mode: fix (bug)
  Quality layer: 1-Functional → 3-Efficient
  Files: assets/css/dashboard.css

- [T4] dashboard.html — Renamed "Admin" → "Invigilator" in header link
  Mode: polish
  Files: dashboard.html

- [T4] dashboard.html — Moved inline modal styles to CSS classes
  Mode: polish
  Files: dashboard.html, assets/css/dashboard.css

- [T0] dashboard.css — Staggered entrance animation on module cards
  Mode: elevate
  Files: assets/css/dashboard.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 5-Delightful | Complete |
| Cambridge/launcher-cambridge.html | 5-Delightful | Complete |
| index.html | 5-Delightful | Complete |
| MOCKs/*/reading.html | 4-Polished | Timer + nav + transitions |
| MOCKs/*/writing.html | 4-Polished | Timer + scrollbars + task fade |
| MOCKs/*/listening.html | 4-Polished | Timer + nav + part fade |
| dashboard.html | 4-Polished | CSS vars fixed, card animations |

### Deferred
- Cambridge/index.html — Same login improvements needed
- All tests — FontAwesome CDN causes slow load; consider local copy
- Listening — Inline styles on answer inputs need CSS class migration

### Session Stats
Pages explored: 7
Rounds: 6
Polishes landed: 25
Rebuilds landed: 0
Elevations landed: 12
Reverted: 0
Changes shipped: 37
