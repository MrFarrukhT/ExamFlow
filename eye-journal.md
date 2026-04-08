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

---

## Session: 2026-04-08 (fresh cycle)
Persona: Student arriving to take an exam
System: Both (IELTS + Cambridge launchers)
Pages explored: launcher.html, Cambridge/launcher-cambridge.html
Starting state: Both launchers functional and polished from previous cycle, but identical visually with hardcoded status

### Round 1
**Explored:** 2 pages (IELTS launcher + Cambridge launcher), 7 findings
**Action:** POLISH 4 fixes + ELEVATE 2 enhancements + REBUILD 1 architecture change

- [T4] launcher.html — Fixed copyright "© 2025" → "© 2026"
  Mode: polish
  Files: launcher.html

- [T4] launcher.html — Cleaned up modal JS: removed inline style overrides (display, alignItems, justifyContent), now uses CSS class toggling only
  Mode: polish
  Files: launcher.html

- [T4] launcher.html — Added Escape key handler to close invigilator modal
  Mode: polish
  Files: launcher.html

- [T4] launcher.html — Harmonized Cambridge version 1.0.0 → 2.0.0
  Mode: polish
  Files: launcher.html

- [T3→T0] launcher.html — Added live status check: pings /test endpoint on load, shows "Connecting..." (amber) → "Ready" (green) or "Offline" (red) instead of hardcoded "Ready"
  Mode: elevate
  Quality layer: 4-Polished → 5-Delightful (trustworthy indicator)
  Files: launcher.html, assets/css/launcher.css

- [T0] launcher.html — Cambridge visual differentiation: teal/emerald gradient + accent colors when accessed with ?exam=cambridge, clearly distinct from IELTS purple/blue
  Mode: elevate
  Quality layer: 5-Delightful → 6-Innovative (instant system recognition)
  Files: launcher.html

- [T5] Cambridge/launcher-cambridge.html — Unified launcher architecture: Cambridge launcher now redirects to launcher.html?exam=cambridge, eliminating code duplication
  Mode: rebuild
  Quality layer: 5-Delightful → 6-Innovative (single source of truth)
  Files: Cambridge/launcher-cambridge.html

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 6-Innovative | Live status, Cambridge identity, unified architecture |
| Cambridge/launcher-cambridge.html | 6-Innovative | Redirect to unified launcher |

### Round 2
**Explored:** 1 page (index.html — IELTS Student Login), 6 findings
**Action:** POLISH 4 fixes + ELEVATE 1 enhancement

- [T4] index.html — Title "Welcome to Candidate login!" → "Welcome, Candidate" (professional tone)
  Mode: polish
  Files: index.html

- [T4] index.html — Modal JS: removed inline style overrides, CSS class toggling only
  Mode: polish
  Files: index.html

- [T0] index.html — Added Escape key handler to close invigilator modal
  Mode: polish
  Files: index.html

- [T4] entry.css — Cambridge colors aligned from blue (#0066cc) to teal (#0d9488) matching launcher identity
  Mode: polish
  Quality layer: 5-Delightful → 5-Delightful (consistency)
  Files: assets/css/entry.css

- [T0] entry.css — Left panel gradient overlay: smooth photo-to-white transition
  Mode: elevate
  Quality layer: 5-Delightful → 6-Innovative
  Files: assets/css/entry.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 6-Innovative | Live status, Cambridge identity, unified architecture |
| index.html | 6-Innovative | Professional copy, teal consistency, gradient overlay |

### Round 3
**Explored:** 1 page (MOCKs/MOCK 1/reading.html — IELTS Reading Test), 5 findings
**Action:** POLISH 2 fixes + ELEVATE 1 enhancement (CSS-only, benefits all 10 mocks)

- [T3] reading.css — Passage line-height 1.4 → 1.65 for comfortable sustained academic reading
  Mode: polish
  Quality layer: 4-Polished → 5-Delightful
  Files: assets/css/reading.css

- [T4] reading.css — Bottom nav bar: added subtle top box-shadow for visual separation
  Mode: polish
  Files: assets/css/reading.css

- [T4] reading.css — Part header: redesigned as blue badge pill with left accent border
  Mode: elevate
  Quality layer: 4-Polished → 5-Delightful
  Files: assets/css/reading.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 6-Innovative | Live status, Cambridge identity, unified architecture |
| index.html | 6-Innovative | Professional copy, teal consistency, gradient overlay |
| MOCKs/*/reading.html | 5-Delightful | Comfortable line-height, badge headers, nav shadow |

### Round 4
**Explored:** 1 page (MOCKs/MOCK 1/writing.html — IELTS Writing Test), 4 findings
**Action:** POLISH 3 CSS-only changes (benefits all 10 mocks, consistency with reading)

- [T4] writing.css — Bottom nav: replaced border-top with box-shadow (matches reading pattern)
  Mode: polish
  Files: assets/css/writing.css

- [T4] writing.css — Task header: blue left accent border + lighter background (matches reading part-header)
  Mode: polish
  Files: assets/css/writing.css

- [T4] writing.css — Word count: tabular-nums for stable digit widths during typing
  Mode: polish
  Files: assets/css/writing.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 6-Innovative | Live status, Cambridge identity, unified architecture |
| index.html | 6-Innovative | Professional copy, teal consistency, gradient overlay |
| MOCKs/*/reading.html | 5-Delightful | Comfortable line-height, badge headers, nav shadow |
| MOCKs/*/writing.html | 5-Delightful | Consistent nav shadow, task accent, stable word count |

### Round 5
**Explored:** 1 page (MOCKs/MOCK 1/listening.html — IELTS Listening Test), 4 findings
**Action:** FIX 1 bug + POLISH 1 CSS change

- [T1] listening.js — Fixed TypeError: null reference on dark-mode-text and text-size-text elements
  Mode: fix (bug)
  Quality layer: 1-Functional → 3-Efficient
  Files: assets/js/listening/listening.js

- [T4] listening.css — Bottom nav: added box-shadow for consistency with reading/writing
  Mode: polish
  Files: assets/css/listening.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 6-Innovative | Live status, Cambridge identity, unified architecture |
| index.html | 6-Innovative | Professional copy, teal consistency, gradient overlay |
| MOCKs/*/reading.html | 5-Delightful | Comfortable line-height, badge headers, nav shadow |
| MOCKs/*/writing.html | 5-Delightful | Consistent nav shadow, task accent, stable word count |
| MOCKs/*/listening.html | 5-Delightful | JS error fixed, consistent nav shadow |

### Round 6
**Explored:** 1 page (ielts-admin-dashboard.html), 3 findings
**Action:** POLISH 2 changes

- [T4] ielts-admin-dashboard.html — Title "Enhanced Admin Dashboard" → "IELTS Admin Dashboard"
  Mode: polish
  Files: ielts-admin-dashboard.html

- [T4] ielts-admin-dashboard.html — Header gradient: dark charcoal → purple matching page background
  Mode: polish
  Files: ielts-admin-dashboard.html

### Round 7
**Explored:** 1 page (invigilator.html), 3 findings
**Action:** POLISH 1 CSS change (brand consistency)

- [T4] invigilator.css — IELTS theme: green → purple/blue matching brand identity. Cambridge theme: blue → teal matching new identity.
  Mode: polish
  Files: assets/css/invigilator.css

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| launcher.html | 6-Innovative | Live status, Cambridge identity, unified architecture |
| index.html | 6-Innovative | Professional copy, teal consistency, gradient overlay |
| MOCKs/*/reading.html | 5-Delightful | Comfortable line-height, badge headers, nav shadow |
| MOCKs/*/writing.html | 5-Delightful | Consistent nav shadow, task accent, stable word count |
| MOCKs/*/listening.html | 5-Delightful | JS error fixed, consistent nav shadow |
| ielts-admin-dashboard.html | 4-Polished | Clean title, matching gradient |
| invigilator.html | 5-Delightful | Consistent brand colors across themes |

### Round 8 (prompts #8-#9 — Cambridge Launcher & Login)
**Explored:** 2 pages (Cambridge launcher + Cambridge login), 0 new findings
**Action:** Verified — both already covered by unified architecture from rounds 1-2
- Cambridge launcher → redirect to launcher.html?exam=cambridge (teal theme, live status) ✓
- Cambridge login → redirect to index.html?exam=cambridge (teal colors, gradient overlay) ✓

### Session Stats
Pages explored: 10
Rounds: 8
Polishes landed: 17
Rebuilds landed: 1
Elevations landed: 4
Reverted: 0
Fixes landed: 1
Changes shipped: 19
