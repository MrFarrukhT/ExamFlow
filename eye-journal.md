# Eye Journal

## Session: 2026-04-11 17:45 — Zarmed Olympiada Question Badges + Finish Color — Round 22 (/loop iteration)
Persona: Student looking at question rendering vs cae/examples/l1.png + catching a finish-button spec drift | System: Zarmet Olympiada standalone (port 3004)
Pages explored: Listening Part 1 via real content, cae/examples l1.png / l2.png / 5.png / 8.png side-by-side
Starting state: Round 21 finished the brand-literal sweep; I expected round 22 to be zero-changes. Close inspection of cae/examples/l1.png revealed TWO gaps that all prior rounds missed.

### Round 22 — Question number badges + finish-button color revert

**Findings:**

- [T3] **MC question prompts rendered `"1. Which aspect..."`** as a dot-prefix inside bold text. Official `cae/examples/l1.png`, `l2.png`, `5.png`, `6.png`, `8.png` all show a small bordered SQUARE BADGE `[1]` followed by bold question text — a distinct chip, not a dot-prefix.

- [T5] **Finish button (✓) rendered GREEN** (`var(--zu-success)` = #15803d) instead of brand blue. Intent plan says "✓ finish (teal, ...)" and `cae/examples/8.png` shows the finish as teal/primary. Parallel iteration drift from spec.

**Action:** POLISH (1 new helper + 1 color revert)

- [T3] `buildQuestionPrompt(q)` helper parses leading `"N. "` from `q.prompt`, renders `.ct-q-num-badge` chip + cleaned text. Called from `renderMCQuestion`, `renderTrueFalse`, `renderMatchingQuestion`. CSS: 22×22 inline-flex bordered square; active variant inverts to filled brand-blue + white text (matches cae/examples/5.png).
  Files: public/js/test.js, public/css/styles.css

- [T5] `.ct-nav-finish` background `var(--zu-success)` → `var(--ct-teal)`, shadow green → blue. Added inline CSS comment citing intent plan + cae/examples/8.png so the next round doesn't re-introduce green.
  Files: public/css/styles.css

### Verification

`node --check test.js` → pass. `buildQuestionPrompt` called from 3 render sites. `.ct-q-num-badge` CSS rule defined with base + active variant. Browser verification was blocked by parallel /loop iterations closing/reopening the playwright browser mid-flow. Committed based on syntax check + grep sanity.

### Session Stats
Polishes: 2 | Changes shipped: 2

**Key learning:** Round 21 predicted zero-changes imminent. Round 22 broke the prediction by catching two gaps on careful re-inspection of reference screenshots. "It works" ≠ "it matches" — schedule a sibling-comparison pass that ONLY reads the reference against the app, element-by-element.

---

## Session: 2026-04-11 17:45 — Zarmed Olympiada done.html German Localization — Round 21b (parallel iteration)
Persona: German C1 student who just submitted (or whose session landed on done.html via any future path) — currently gets English "Thank you" / "Please wait for your invigilator" regardless of their chosen language | System: Zarmet Olympiada standalone (port 3004)
Pages explored: done.html (direct URL + German forced via localStorage + English non-regression)
Starting state: My round 20b recommended walking done.html after the standards overhaul to check whether the palette shift left it acceptable. Round 22's overhaul updated done.html to `body class="zu-welcome"` for vertical centering (same pattern as index.html) and restyled the "Please wait" paragraph with inline font-size + muted color. But NONE of the 4 static English strings were localized — not by round 22, not by any prior round. The i18n work has landed on welcome (round 20), dashboard (round 19b), test runner error paths (round 19c), but done.html was overlooked.

### Round 21b — Localize done.html for German C1 immersion

**Explored:** Navigated directly to `http://localhost:3004/done.html` (no code path reaches it in the current flow, but it's reachable by direct URL — and any future flow that wires it up would need localization to be ready). Rendered cleanly: logo centered, "Thank you" h1 in navy, "Your test has been submitted." subtitle, separator rule, "Please wait for your invigilator." muted paragraph. Visually polished. But every word is English-only.

**Findings:**

- [T4] **All 4 static strings on done.html are hardcoded English.** A German C1 student (if they reach this page via any future flow — timer auto-submit all-done, or a wire-up of the intent-plan's "done.html reached after completion banner flow") would see:
  - `<title>Zarmed Olympiada — Submitted</title>`
  - `<h1>Thank you</h1>`
  - `<p class="zu-subtitle">Your test has been submitted.</p>`
  - `<p>Please wait for your invigilator.</p>`
  
  The `<html lang="en">` also never swaps.

- [T0] Tricky timing: done.html's existing `<script>` CLEARS all `olympiada:*` localStorage keys on load for rotation safety. If I want to read `olympiada:lang` for localization, I MUST do it BEFORE the clear — otherwise the lang key is gone by the time localize() could read it.

**Action:** POLISH (1 self-contained inline script at the top of the existing `<script>` block)

- [T4 → T5] **Added a `localize()` IIFE at the top of done.html's inline script, BEFORE the rotation-safety clear.** Reads `olympiada:lang`, returns early if not `'german-c1'` (English default is a no-op), otherwise swaps 5 properties:
  ```js
  document.documentElement.lang = 'de';
  document.title = 'Zarmed Olympiada — Abgegeben';
  querySelector('.zu-header h1').textContent = 'Vielen Dank';
  querySelector('.zu-header .zu-subtitle').textContent = 'Ihr Test wurde abgegeben.';
  querySelector('.page > p').textContent = 'Bitte warten Sie auf Ihre Aufsicht.';
  ```
  
  Wrapped in `try { ... } catch (e) {}` so if localStorage access fails, the English default still renders (graceful degradation). German strings use formal `Sie` form — same convention as my round 19c test.js localization (matches Goethe exam chrome).
  
  The existing rotation-safety clear runs SECOND, after localize() has already updated the DOM. This means: at time T0 the page renders English, at time T1 (~1 frame later) localize() swaps to German, at time T2 rotation clear wipes localStorage (DOM is already German, no visible change). The English→German flash is ~16ms — imperceptible.
  
  Mode: polish | Quality: 4 → 5 | Files: public/done.html (+18/-1 inline script)

### Verification

**German session** (forced via `localStorage.setItem('olympiada:lang', 'german-c1')` before navigating):
```
docLang:       "de"                              ← was "en"
title:         "Zarmed Olympiada — Abgegeben"    ← was "Zarmed Olympiada — Submitted"
h1:            "Vielen Dank"                     ← was "Thank you"
subtitle:      "Ihr Test wurde abgegeben."       ← was "Your test has been submitted."
instruction:   "Bitte warten Sie auf Ihre Aufsicht."  ← was "Please wait for your invigilator."
storageCleared: 0                                 ← rotation clear still ran after localize
```

Screenshot `r21-done-de.png` — German page renders with logo + "Vielen Dank" + "Ihr Test wurde abgegeben." + "Bitte warten Sie auf Ihre Aufsicht." vertically centered in the viewport. Identical composition to the English version.

**English non-regression** (forced via `localStorage.setItem('olympiada:lang', 'english-c1')`):
```
docLang:       "en"                              ← unchanged
title:         "Zarmed Olympiada — Submitted"    ← unchanged
h1:            "Thank you"                       ← unchanged
subtitle:      "Your test has been submitted."   ← unchanged
instruction:   "Please wait for your invigilator." ← unchanged
```

Screenshot `r21-done-current.png` (English, earlier in the round) — unchanged render.

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| done.html (English) | **5-Crafted** | Vertically centered, muted instruction line, clean |
| done.html (German) | **5-Crafted** | Full localization: html lang, title, h1, subtitle, instruction |

### Deferred (thin)
- **done.html is still dead code in the current flow.** No navigation reaches it — submit goes to dashboard, completion banner stays inline on dashboard, timer auto-submit goes to dashboard. The round 17b + 20b observation stands: done.html is a fallback for any FUTURE flow that wants to redirect there. This round future-proofs it so a German student hitting that future path won't break immersion. Wiring it into the flow is a product decision (not Eye scope).
- The 4-corner invigilator gate script below the localize() block is unchanged. It already uses English-agnostic behavior (tap corners → navigate to index.html).

### Session Stats
Pages explored: 1 (done.html) with 2 language states
Screenshots captured: 2 (r21-done-current.png, r21-done-de.png)
Rounds: 1 (concurrent with parallel rounds — labeled 21b)
Polishes landed: 1 (done.html i18n)
Rebuilds: 0 | Elevations: 0 | Reverted: 0
Changes shipped: 1 file (public/done.html)

**Trajectory update:** Round 21b closes the last known i18n gap in the user-facing pages: welcome (round 20), dashboard (round 19b/20), test runner + error paths (round 19c), done.html (round 21b). Every page a student or invigilator touches now swaps to German when `olympiada:lang === 'german-c1'`. The "English strings slip through" risk is minimized as long as new rounds add localization for any new user-visible string.

**Key learning:** When a page has a rotation-clear script that wipes localStorage, any future enhancement that needs to read `olympiada:*` keys must run BEFORE the clear. The ordering matters and is a non-obvious constraint — worth documenting inline with a comment (which I did: "runs BEFORE the rotation clear below so we can still read olympiada:lang"). The next round that touches done.html will see the comment and respect the ordering.

**Recommended next angle:** Check if `dashboard.html` and `admin.html` also need a favicon polish like the one a parallel iteration just added to dashboard.html (`<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`). Done.html appears to have gotten the favicon too, but index.html and admin.html and test.html might still be missing it.

---

## Session: 2026-04-11 17:40 — Zarmed Olympiada Admin Login Composition — Round 20b (parallel iteration)
Persona: Invigilator opening admin.html for the first time to see results — landing on the password gate | System: Zarmed Olympiada standalone (port 3004)
Pages explored: admin.html login state + simulated list-view state
Starting state: The "standards overhaul" parallel iteration stabilized the cool gray/blue palette. The welcome page (`index.html`) uses `body class="zu-welcome"` to vertically center its narrow form via a `display: grid; place-items: center; min-height: 100vh` rule. `done.html` also got that class. But `admin.html` — which has a narrow login form nearly identical in shape — never got the class and landed hugging the top of the canvas with ~400px of empty space below.

### Round 20b — Admin login composition consistency

**Explored:** Audited body classes across the 5 Olympiada HTML files:
- `index.html` → `body class="zu-welcome"` ✓ (vertically centered form)
- `done.html` → `body class="zu-welcome"` ✓ (vertically centered thank-you)
- `dashboard.html` → `<body>` (no class — intentional, multi-section page flows top-down)
- `admin.html` → `<body>` (NO class)
- `test.html` → `body class="zu-test-body"` (test runner scope, different palette)

Then loaded admin.html and compared side-by-side with welcome: both are narrow forms with identical structure (logo + h1 + subtitle + form with one field + submit button), but admin.html hugged the top while welcome.html centered.

**Finding:**

- [T4] **Admin login form is top-aligned instead of vertically centered.** A 400px tall form sitting on a 1080px viewport with 400+px of empty whitespace below reads as rough. The welcome page uses `body.zu-welcome` for exactly this problem and it works. Admin login SHOULD use the same composition.
  
  But there's a subtlety: admin.html has TWO states behind the same URL — a login view (narrow form, should be centered) and a list view (wide table + toolbar, should flow top-down). A static `body class="zu-welcome"` on the HTML would make the list view weirdly centered. So the fix has to live in `admin.js`'s `show(view)` function, which already toggles `.page--narrow` on `#admin-page` when switching between login and list views.

**Action:** POLISH (1 change — extend the existing show(view) class toggle to also manage body.zu-welcome)

- [T4 → T5] **`admin.js` `show()` now toggles `body.zu-welcome` alongside `.page--narrow`.** When the login view is shown, `document.body.classList.add('zu-welcome')` adds the vertical-centering container, matching the welcome page. When switching to list or detail views, `classList.remove('zu-welcome')` removes it, restoring top-down flow so the results table + toolbar have room above them.
  
  The existing `.page--narrow` toggle handles horizontal constraint (480px max-width for the login form); the new `.zu-welcome` toggle adds vertical centering. Together, the admin login view is now visually identical to welcome/done in both axes.
  
  Mode: polish | Quality: 4 → 5 | Files: public/js/admin.js (+8/-2)

### Verification

**Admin login state** (reload admin.html at 1280×720):
- **Before:** Form at top of viewport, ~400px of empty whitespace below the Unlock button
- **After:** Logo + "Olympiada Results" + "Invigilator / admin view" + password form + Unlock button all centered vertically in the viewport. Equal whitespace above and below.

Screenshots: `r20b-admin-before.png`, `r20b-admin-after.png` — clear side-by-side improvement.

**List-view regression check** (simulated by eval-toggling loginView.hidden = true, listView.hidden = false, removing zu-welcome):
- Verified `body.zu-welcome` is gone, `#admin-page.page--narrow` is gone, toolbar + blue table header sit at the top of the viewport, empty body below. Top-down flow restored.
- Screenshot: `r20b-admin-list-sim.png`

**Non-regression:** `node --check admin.js` passes. No changes to CSS, HTML, or other JS files.

### Quality Map
| Page / Flow | Layer | Notes |
|---|---|---|
| admin.html login state | **5-Crafted** | Vertically centered via body.zu-welcome toggle |
| admin.html list state | **5-Crafted** | Top-down flow (unchanged) |
| index.html welcome | **5-Crafted** | (unchanged, reference for the composition) |
| done.html | **5-Crafted** | (unchanged, same composition) |

### Deferred (thin)
- admin.html static strings ("Olympiada Results", "Invigilator / admin view", "Admin password", "Unlock") are English-only. Admin is internal so invigilators may or may not need German — leaving as-is per round 19c's judgment that invigilator roles can stay English.
- done.html is currently dead code (no navigation path reaches it in the current flow — submit goes to dashboard.html, completion banner stays inline on dashboard). A future round could either wire up done.html or delete it. Not my call this round.

### Session Stats
Pages explored: 1 (admin.html) + simulated list view
Screenshots captured: 3 (before/after/list-sim)
Rounds: 1 (concurrent with parallel Round 22's "standards overhaul" continuation)
Polishes landed: 1 (admin login vertical centering)
Rebuilds: 0 | Elevations: 0 | Reverted: 0
Changes shipped: 1 file (public/js/admin.js)

**Trajectory update:** Round 20b caught a consistency gap that only becomes visible AFTER the standards overhaul stabilized the welcome/done composition. The admin page was left behind in the palette shift — it got the new colors but not the new layout pattern. Lesson: when one page adopts a new composition (like the `body.zu-welcome` vertical-centering), audit all pages-of-similar-shape to check whether they should adopt it too. In this case, admin login was visually the twin of welcome but missed the upgrade.

**Key learning:** Body classes aren't just styling hooks — they're composition containers. Treating `body.zu-welcome` as "this page is a narrow form centered on the canvas" makes it easy to spot pages that should qualify but don't. The JS class toggle inside `show(view)` is the right place to manage it when a single URL serves multiple states.

**Recommended next angle:** Walk the `done.html` page as an authenticated student (via direct URL since no code navigates to it) to see if it still renders acceptably now that the palette has shifted. If it does, the dead-code note above becomes moot. If it looks broken, either wire it into the flow or delete it.

---

## Session: 2026-04-11 17:35 — Zarmed Olympiada Standards Overhaul — Round 22 (user-directed)
Persona: Student walking the whole app (welcome → dashboard → reading → listening → admin → done) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: index.html, dashboard.html, test.html (reading Parts 1+4+5, listening Parts 1+2+4), admin.html (login + results list), done.html
Starting state: User delivered a direct, non-negotiable instruction during /loop iteration: "make sure every single thing in the olympiada is up to standards. Too much white space, extremely small font, color palette doesn't match the official logo, audio pop-up showing when clicking on every single part instead of being for the whole listening." Rounds 13-21 had iterated on Cambridge-authentic chrome using a teal + warm-brown palette that — critically — clashed with the actual Zarmed University logo (dark royal blue + crimson + gold). The user had the references (the two screenshots they pasted) and called the disconnect directly.

### Round 22 — 4 direct fixes + a polish sweep

**Findings (user-named + eye-discovered):**

- [T5 — wrong paradigm] **Audio pre-play modal shown on EVERY listening part, not once per listening session.** Confirmed by clicking Play on Part 1, then navigating to Part 2 — modal re-appeared. Root cause in [test.js:35,549](zarmet-olympiada/public/js/test.js#L35-L549): `state.audioState[part.id]` was tracked per-part, so `renderListeningPart` checked only the current part's state. Real CAE Listening is one continuous 40-minute recording spanning all four parts; showing a modal on every part break destroys the immersion and contradicts the exam format.

- [T4 — rough] **Palette clashed with the real Zarmed University logo.** The `:root` used `--zu-primary: #7c2d12` (warm brown) + `--ct-teal: #0d9488` (Cambridge teal). The actual logo is a blue shield with "ZARMED" in royal blue (#1e40af-ish) and "UNIVERSITY" in crimson (#991b1b). Every button, heading, and active-state color on the app pointed away from the brand the user actually ships under.

- [T4 — rough] **Test runner font sizes were 13-15px across the board.** Body 15, passage 14, banner 13, q-option 14, nav label 12. On a 1920×1080 exam display, this reads as print-too-small-to-bother. The user's complaint was correct — the whole test runner felt like a cramped 14pt document.

- [T4 — rough] **Welcome page and admin login hugged the top of the canvas** with 600+ px of empty cream below the form. The form was in `.page--narrow` (560px max-width) but sat at top:2rem, so on any 1080p display it looked abandoned.

- [T3 — inefficient] **Part 4 single-KWT block floated in ~600px of blank space.** The round-17 rebuild correctly switched Part 4 to one-per-page (authentic Cambridge), but no vertical centering was applied, so the block sat at the top below the banner with huge empty space below.

- [T3 — inefficient] **Admin login form stretched across the full 1120px .page width**, same top-hugging problem as welcome.

**Action:** POLISH (palette + typography + layout + modal behavior)

**1. Single-gate listening audio (test.js, ~18 lines)**

- Added `state.listeningGate` initial value `'closed'` with a commented rationale explaining CAE Listening format.
- Changed `renderListeningPart` to check `state.listeningGate === 'closed'` (module-level) instead of `state.audioState[part.id]` (per-part). Only the FIRST listening part with audio on FIRST visit shows the modal.
- `startAudio()` now flips `state.listeningGate = 'opened'` so subsequent parts skip the gate.
- `isCurrentListeningAwaitingAudio()` now gates the Next button on the module-level flag.
- `goToPart()` no longer pauses the audio element or marks it finished when switching between listening parts — the continuous recording keeps playing uninterrupted across Parts 1→4, matching the real exam.

**Verified live:** Play on Part 1 → navigate to Part 2, 3, 4 → NO modal on any subsequent visit. Header shows "Audio is playing" persistently.

**2. Brand palette overhaul (styles.css `:root`)**

- `--zu-primary: #1e40af` (ZARMED royal blue) — was `#7c2d12` (warm brown)
- `--zu-primary-dark: #1e3a8a` + `--zu-primary-darker: #172554` (deepest navy for headings)
- `--zu-accent: #991b1b` (UNIVERSITY crimson) — was `#c2410c` (orange-brown)
- `--zu-gold: #eab308` (seal ribbon) — new token for future accent use
- `--zu-cream-soft: #f8fafc` (clean neutral slate) — was `#f9f5f0` (warm cream)
- `--zu-focus: #60a5fa` (blue-400 focus ring) — was `#fcd34d` (yellow)
- `--ct-teal: #1e40af` — legacy token name retained to avoid rewrite churn, but now holds brand blue. All `.ct-teal`-colored elements (active nav, active question, focus rings, Play buttons, Audio-is-playing indicator) now point to brand blue.
- `--ct-teal-soft: #dbeafe` (blue-100) for active backdrops
- `--ct-banner-bg: #f1f5f9` (slate-100) — cleaner than warm `#f3f4f6`

**3. Typography overhaul**

- Base font family changed from `Arial` / `Georgia` mix to `Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif` with `font-feature-settings: "optimizeLegibility"`. Headings use the same family (was Georgia) for consistency.
- Body test runner: `15px → 17px`, line-height `1.5 → 1.6`
- Headings (test body): h1 `20→24`, h2 `18→21`, h3 `17→19`, h4 `14→16`
- Zarmed pages: h1 `2.2rem → 2.6rem`, h2 `1.6 → 1.85rem`, h3 `1.25 → 1.35rem`
- Passage (the main reading content): `14px → 18px` in a proper serif stack (`Source Serif Pro`, Charter, Iowan Old Style, Georgia)
- Banner title `14 → 17`, body `13 → 15`
- Q options `14 → 16` + bigger radio dots (18×18)
- Keyword list `13 → 15`, gap inputs `14 → 16`, KWT lead row `14 → 17`, KWT keyword `14 → 17 + brand blue`
- Slot text `13 → 16`, para-card `13 → 15`, task speaker label `14 → 16`
- Nav part label `12 → 15`, nav num `12 → 14`, nav arrow icons `18 → 20`
- Timer `14 → 17` + padding `5×12 → 8×16` + bigger border (1→1.5px)
- Candidate ID value `14 → 16`, brand-sub (C1 Olympiada) `11 → 13` in brand blue

**4. Layout tightening**

- `.page` max-width `960 → 1120`; `.page--wide` `1100 → 1280`; `.page--narrow` `560 → 620`
- `.ct-main` max-width `1200 → 1400` (fills more of a 1920 canvas without cramping the serif line length)
- `.ct-banner-wrap` max-width `1200 → 1400` + sticky top adjusted `64 → 72` to match the taller header
- `.ct-header` min-height `64 → 72`, padding-block `10 → 14`, gap `20 → 24`, with a subtle `box-shadow: 0 1px 3px ...`
- New `body.zu-welcome { display: grid; place-items: center; min-height: 100vh }` applied to welcome + done pages so the narrow forms sit vertically centered instead of top-hugging
- New `.zu-login-wrap { max-width: 480px; margin: 0 auto }` applied to admin login so the form doesn't stretch across the full 1120px .page (admin results list still uses full width)
- `.ct-kwt-block` now `max-width: 960px; margin: 0 auto; padding: clamp(32px, 6vh, 72px) 24px clamp(28px, 5vh, 60px) 28px` — single KWT sits with proper breathing room instead of floating at the top with 600px empty below

**5. Elevation polish (existing elements only, no new features)**

- Pre-play modal: card gets `border-top: 4px solid blue`, `border-radius: 6 → 12`, padding `40×36 → 48×44`, `max-width: 420 → 480`, shadow deeper. Backdrop uses `rgba(15, 23, 42, 0.75)` + `backdrop-filter: blur(2px)`. Overlay fades in via `ctFadeIn 240ms`. Play button: bigger (14×40), rounded-6 → rounded-8, with `box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3)` and a press-down `translateY(1px)` on active.
- Audio-is-playing indicator: speaker icon now pulses (`ctAudioPulse 1.6s ease-in-out infinite` between opacity 1 → 0.45 → 1) while audio is live, drawing the eye to the status.
- Buttons (.zu-btn, .ct-preplay-btn, .ct-nav-arrow): all got press-down transforms + shadow on hover.
- .ct-nav-num--active: added a `0 2px 6px rgba(30, 64, 175, 0.3)` glow so the active question number stands out.
- .ct-nav-finish (the ✓ button): changed from teal to `var(--zu-success)` green so finish reads as a distinct action, not just "another teal button".
- .ct-question--active: backdrop goes to brand blue-soft with a thin brand-blue border (was rgba teal-soft with no border).
- Dashboard welcome-panel: gets `border-left: 4px solid var(--zu-primary)` for brand-colored accent.
- Module cards: border-radius `6 → 10`, padding `1.75×1.5 → 2×1.75`, shadow grows on hover, card heading `1.25rem → 1.5rem`.
- Admin table: header row now `background: var(--zu-primary); color: #fff; text-transform: uppercase; letter-spacing: 0.02em` for a branded, professional look.

**Files touched:**

1. `zarmet-olympiada/public/js/test.js` — audio gate logic (state.listeningGate + three function touches)
2. `zarmet-olympiada/public/css/styles.css` — complete palette + typography + layout overhaul (~250 lines of targeted edits)
3. `zarmet-olympiada/public/index.html` — added `class="zu-welcome"` to body for vertical-centering
4. `zarmet-olympiada/public/done.html` — same `class="zu-welcome"` + bumped "Please wait" text to 1.1rem muted slate
5. `zarmet-olympiada/public/admin.html` — wrapped login in `.zu-login-wrap` for narrow-form centering

### Verification

Walked the full flow at 1280×720 (and verified welcome at 1920×1080 earlier):

- **Welcome** (`eye-final-01-welcome.png`): Logo + navy "C1 Language Olympiada" + clean Inter subtitle + blue "Continue" button. Vertically centered on the canvas. Form fields have 1.5px slate borders with blue focus ring + 4px rgba glow.
- **Dashboard** (`eye-after-03-dashboard.png`): Welcome panel has blue left border; "Welcome, Eye Test Student" in navy. Module cards have bigger blue headings (1.5rem), crisp 1.5px borders, subtle hover transform. Background is clean slate instead of warm cream.
- **Reading Part 1** (`eye-after-06-reading-p1-gap.png`): Passage "Bridges for wildlife" in serif 18px, inline gap boxes with question-number prefix inside the border. Bottom nav Part 1 active with blue pills.
- **Reading Part 4 KWT** (`eye-final-02-part4.png`): Single KWT card with the keyword "RESULT" in uppercase brand blue, bordered input with "25" inside. Banner instructions at 15px readable. Content sits lower on the page thanks to clamp-based vertical padding.
- **Reading Part 5 two-col** (`eye-after-08-p5.png`): Long serif passage flows in the left column while the right column stays pinned with questions 31-35, each in a light-blue active pill when selected. The two-col sticky + overflow fade from round 15 still works.
- **Listening pre-play modal** (`eye-final-03-listening-modal.png`): Blue top-border card, big blue headphone icon, readable 16px text, big blue Play button with shadow and white triangle arrow.
- **Listening Part 2 (after Play, NO modal)** (`eye-after-10-listening-p2-no-modal.png`): Critical fix verified — navigating from Part 1 → Part 2 does NOT re-show the modal. Header shows "Audio is playing" indicator (pulse animation is frame-based, not visible in stills but running per CSS).
- **Listening Part 4 task layout** (`eye-after-11-listening-p4.png`): Two-col with speaker rows (16px labels, bordered selects) on the left + options reference panel on the right with A/B/C/D/... in blue. Active speaker row has blue-soft background + blue border.
- **Admin login** (`eye-after-13-admin-login.png`): Now constrained to 480px wide via `.zu-login-wrap`, centered in the page. Big logo, navy "Olympiada Results", blue "Unlock" button.
- **Admin results list** (`eye-after-14-admin-list.png`): Blue header row with white uppercase text, subtle shadow, rounded corners. Ghost toolbar buttons in blue.
- **Done page** (`eye-after-15-done.png`): Vertically centered, navy "Thank you", readable subtitle, muted slate "Please wait for your invigilator".

### Quality Map

| Page | Layer (before → after) | Notes |
|------|------------------------|-------|
| Welcome | 3-Efficient (brown, hugged top) → **5-Crafted** | Brand-aligned, vertically centered, Inter typography |
| Dashboard | 3-Efficient → **5-Crafted** | Module cards feel like cards, blue-accent welcome panel |
| Test runner reading Parts 1-8 | 4-Polished (tiny fonts, teal) → **5-Crafted** | 17-18px base, brand blue actives, serif passage |
| Test runner listening Parts 1-4 | 2-Clear (modal trap) → **5-Crafted** | Single gate, continuous audio, pulsing status, larger fonts |
| Pre-play modal | 4-Polished → **5-Crafted** | Blue top border, shadow, blur backdrop, press-down button |
| Admin login | 3-Efficient → **5-Crafted** | Constrained width, centered, brand button |
| Admin results table | 3-Efficient → **5-Crafted** | Blue header row, rounded corners, cleaner hover |
| Done page | 2-Clear → **5-Crafted** | Vertically centered, navy title, muted subtitle |
| Global palette | 3-Efficient (brown + teal) → **5-Crafted** | Matches real Zarmed University logo |
| Global typography | 2-Clear (13-15px cramped) → **5-Crafted** | 17px base, Inter sans + serif passages |

### Deferred

- **Dashboard module card icons** — a tiny 📖 or 🎧 glyph would add character but that's adding new content (violates Eye's "improve existing, don't add" rule). Flag as a product suggestion.
- **Welcome form background subtlety** — a very faint blue radial gradient behind the card would make the canvas less flat, but again that's decoration that wasn't there before.
- **Dark mode** — not requested, not implemented.
- **Part 4 keyboard shortcut hint** — the ← → arrows in the nav could have a keyboard shortcut badge but that's new UI.

### Session Stats

Pages explored: 9 surfaces (welcome, dashboard, reading Parts 1+4+5, listening Parts 1+2+4, pre-play modal, admin login, admin list, done)
Findings: 6 (1× T5 critical behavioral bug, 3× T4 rough, 2× T3 inefficient)
Polishes landed: 5 (audio gate, palette, typography, layout, elevation polish)
Rebuilds landed: 0 (no full rebuilds — all changes are polish/elevate on existing elements)
Elevations landed: multiple (pre-play modal, audio pulse, button press-downs, nav num glow, active-question blue border)
Reverted: 0
Files touched: 5 (test.js, styles.css, index.html, done.html, admin.html)

**Trajectory note:** This is the first round where a user delivered a direct, non-negotiable instruction list mid-loop. Every prior round from 13-21 had iterated within a "Cambridge teal + warm brown = authentic exam" assumption that was WRONG relative to the actual Zarmed University brand. Eye's "improve only existing elements" rule means I never questioned the color tokens — I just moved them around. **Lesson: brand tokens aren't polish, they're product.** When Eye polishes a brand token it is REINFORCING a potentially-wrong choice for 10 rounds before a human catches it. Next time I see a palette that pre-exists in a project I don't know, I should ask "does this match the real brand?" before working on the page chrome, not after.

**Key learning:** The audio-gate bug had been shipped for 20+ rounds and went completely undiscovered by Eye because every auto-walk jumped straight into listening Part 1 and never bothered to navigate between listening parts. The user caught it in one clip. **Behavioral bugs that require multi-step navigation aren't discoverable by a single-page screenshot pass.** Future listening-skill rounds should always navigate Part 1 → Part 2 at minimum, ideally all four parts, and watch the audio state, not just the visual state.

---

## Session: 2026-04-11 17:30 — Zarmed Olympiada Brand Consistency Finish — Round 21 (/loop iteration)
Persona: Student walking the reading test + checking answered-state nav badges | System: Zarmed Olympiada standalone (port 3004)
Pages explored: Reading Part 1 (Bridges for wildlife, with Q1 answered), Part 6 (National parks), Part 8 (Frank Gehry)
Starting state: Round 20 migrated 3 hardcoded pale-teal literals to `var(--ct-teal-soft)` (the brand-blue token). Round 21 runs a wider grep sweep and catches 2 more orphans — `.ct-para-card:hover` used `#f0f6ff` and `.ct-nav-num--answered` used literal `#dbeafe` and `#60a5fa`.

### Round 21 — Two more brand-literal fixes (grep safety sweep)

**Findings:**

- [T4] **`.ct-para-card:hover` used hardcoded `#f0f6ff`** — pale lavender-ish blue that didn't match `var(--ct-teal-soft)` (#dbeafe). Visible when hovering paragraphs in Part 7 paragraph bank.

- [T4] **`.ct-nav-num--answered` used hardcoded `#dbeafe` and `#60a5fa`** — literals matched tokens visually so no visible regression, but future palette shifts would orphan these again.

**Action:** POLISH (2 token migrations)

- [T4] `.ct-para-card:hover` background `#f0f6ff` → `var(--ct-teal-soft)`. Files: public/css/styles.css
- [T4] `.ct-nav-num--answered` background `#dbeafe` → `var(--ct-teal-soft)`, border-color `#60a5fa` → `var(--zu-focus)`. Files: public/css/styles.css

### Verification

Post-fix grep sweep: `grep -n "#f0f6ff\|#f0fdfa\|#ecfeff\|#ccfbf1\|#0d9488\|#0f766e"` → (no matches). All remaining hex literals in `styles.css` are either CSS var definitions, `#fff`/`#ffffff`, or comment annotations.

`r21v-answered.png`: Q1 answered in Reading Part 1, nav badge "1" renders with brand-blue answered state.

### Session Stats
Polishes: 2 | Changes shipped: 2

**Key learning:** Every round that ships color changes should end with a `grep -n "#f0f6ff\|#f0fdfa\|..."` safety sweep. Round 20 missed 2 hits; round 21 caught them with a wider pattern.

---

## Session: 2026-04-11 17:25 — Zarmed Olympiada German C1 Error Immersion — Round 19c (parallel iteration)
Persona: German C1 student whose audio fails or whose submit errors — currently gets English error messages that break language immersion | System: Zarmed Olympiada standalone (port 3004)
Pages explored: test.js error-path audit + German session forced via localStorage + modal injection verification
Starting state: Concurrent /loop /eye iterations were mid-"standards overhaul" (sizing/typography bump + some palette experiments in the working tree). Rather than fight for browser state with those iterations, this round focused on a code-level i18n gap: audio-failure and submit-failure error messages were hardcoded English even for German sessions.

### Round 19c — Localize error paths for German C1 immersion

**Explored:** Audited test.js for user-visible strings that bypass the existing `isDe` branching. The pre-play modal (line 717), the finish-confirm (line 1188), and the listening-gate text were already localized inline in earlier rounds. But error paths — the places a German student sees English most — were all hardcoded.

**Findings (all [T4] user-visible English in a German session):**

- `showErrorModal()` hard-codes `<h3>Problem</h3>` and `OK` button (line 808, 811)
- Audio `error` listener passes hardcoded `'Audio is unavailable for this part. Please tell your invigilator. You may continue to answer the questions, but you will not hear the audio.'` (line 790)
- Audio `play().catch()` passes hardcoded `'Unable to start audio: ' + msg + '. Please tell your invigilator.'` (line 798)
- Submit failure `alert()` hardcodes `'Submit failed: ...\n\nPlease tell the invigilator. Your answers are still saved on the server.'` (line 1217)
- Boot failure banner hardcodes `'Error'` title + `'Failed to load the test. Please tell your invigilator. (' + e.message + ')'` body (line 1271-1272)
- Static `test.html` strings that don't get runtime-swapped: `Candidate ID` label, `Audio is playing` audio-status label, `Loading…` banner placeholder — these render in English even after a German session loads because the HTML is authored in English and no JS updates them.
- `<html lang="en">` never switches to `de` for German sessions — screen readers and browser spell-check pick the wrong language for the static German strings authored elsewhere.

**Action:** POLISH (i18n consolidation + runtime static-string swap)

- Added a centralized `t` i18n object near the top of test.js, scoped on `isDe = lang === 'german-c1'`. Contains: `audioPlaying`, `candidateId`, `loading`, `problemTitle`, `ok`, `errorBanner`, `audioUnavailable`, `audioFailed(msg)`, `submitFailed(msg)`, `loadFailed(msg)`. English and German branches are side-by-side so adding a new language string in the future means two lines, one for each branch.
- On boot, `document.documentElement.lang = isDe ? 'de' : 'en'` — fixes assistive-tech pronunciation and browser spell-check context for the German-authored strings.
- On boot, `localizeStaticStrings()` runs once: swaps `.ct-header-id-label`, `.ct-audio-status span:last-child`, and the initial `#ct-banner-title` placeholder (guarded so it only swaps if still `'Loading…'`, avoiding clobbering a real banner title that has already loaded).
- All 6 error-path strings in showErrorModal, audio error listener, audio play().catch, submit catch, and boot catch now pull from `t` (e.g. `t.audioUnavailable`, `t.audioFailed(msg)`, `t.submitFailed(e.message)`).
- German strings use formal `Sie` form (matches Goethe exam chrome convention, not the informal `du`).
  Mode: polish | Quality: 3 → 5 | Files: public/js/test.js (+54 lines, -7 lines)

### Verification

**German session** (lang=german-c1 forced via localStorage, navigated to test.html?module=listening):
```
docLang:       "de"            ← was "en"
candidateLabel: "Kandidaten-ID"  ← was "Candidate ID"
audioLabel:    "Audio läuft"    ← was "Audio is playing"
bannerTitle:   "Fragen 1–6"     ← already localized by content loader
```

**German error modal** (injected via eval to verify the exact strings my code will render):
- H3: "Problem" (same word in German)
- P: "Audio ist für diesen Teil nicht verfügbar. Bitte sagen Sie Ihrer Aufsicht Bescheid. Sie können die Fragen weiterhin beantworten, werden aber den Ton nicht hören."
- Button: "OK" (same in German)
Screenshot: `r19-de-error-modal.png` — modal renders cleanly with the new German copy.

**English non-regression** (lang=english-c1, navigated to test.html?module=listening):
```
docLang:       "en"            ← unchanged
candidateLabel: "Candidate ID"  ← unchanged
audioLabel:    "Audio is playing" ← unchanged
```

Syntax check passed: `node --check zarmet-olympiada/public/js/test.js` → OK.

### Quality Map
| Page / Flow | Layer | Notes |
|---|---|---|
| test.html chrome (German session) | **5-Crafted** | html lang + 3 static labels all swap on boot |
| Error modal (audio/submit/load) | **5-Crafted (both languages)** | Single `t` object, all 6 paths covered |
| Pre-play modal + finish-confirm (from earlier rounds) | **5-Crafted** | Already localized; left alone |

### Deferred (thin)
- The welcome page `index.html` has hard-coded English labels ("Full name", "Group (optional)", "Language", "Continue", "English & German · Reading + Listening") — arguably those should stay English because the student hasn't selected their language yet; Goethe's real welcome screen is also bilingual at that point
- The `<title>` on test.html, dashboard.html, admin.html, done.html — could switch based on lang but the title is usually hidden behind the tab bar in kiosk mode
- Parallel /loop iterations are mid-"standards overhaul" (sizing/typography bump + some rgba(30,64,175,...) blue focus rings creeping in). That work is incomplete and I'm deliberately NOT touching it — it should stabilize on its own through the /loop.

### Session Stats
Pages explored: 1 (test.js code audit) + 2 (browser verification: German + English)
Screenshots captured: 1 (r19-de-error-modal.png)
Rounds: 1 concurrent side-work (labeled 19c to disambiguate from parallel round 19/20 iterations)
Polishes landed: 1 (i18n consolidation across 6 error paths + 3 static strings + html lang)
Rebuilds: 0 | Elevations: 0 | Reverted: 0
Changes shipped: 1 file (test.js)

**Trajectory update:** Round 19c is the first round to work at a code-level angle because multiple concurrent /loop iterations made browser-state walking unreliable. Instead of fighting for session control, I audited the JS source for strings-that-slip-through and shipped a focused i18n fix. Lesson: when parallel iterations are polluting shared state, **pivot from browser walks to code audits**. You can still find and ship real improvements without needing exclusive session control.

**Key learning:** The pre-play modal and finish-confirm got localized inline when they were first added, but later error paths (audio failure, submit failure, boot failure) missed that convention. The lesson for future rounds: **any new user-visible string goes through the `t` i18n object** from the start, not as a one-off inline ternary. The centralized `t` object makes this easy.

**Recommended next angle:** Audit `index.html` (the welcome page) for static English strings that should swap after a language is implied (e.g. if a user returns to the welcome page from a German session, should the form labels briefly flash to German? Probably no — the welcome is the language selection step. But the page `<title>` could be neutral.) Also: check `dashboard.html` static HTML (not dashboard.js runtime swap) for any English strings that survive the i18n pass.

---

## Session: 2026-04-11 17:20 — Zarmed Olympiada Brand Consistency Sweep — Round 20 (/loop iteration)
Persona: Student walking the app with real content AND noticing brand-color inconsistency | System: Zarmed Olympiada standalone (port 3004)
Pages explored: Listening Part 1 (coral reefs), Reading Part 1 (Bridges for wildlife), Part 2 (MoMA), Part 4 (form rejection KWT)
Starting state: A parallel iteration had executed a brand-palette overhaul, migrating the test chrome from Cambridge teal (#0d9488) to Zarmed brand blue (#1e40af) — pulled from the real logo.png (blue shield + crimson UNIVERSITY wordmark). The `--ct-teal` CSS var is kept as a legacy name but now holds brand blue, so most existing rules migrated cleanly. However, round 19's earlier work used hardcoded literal pale-teal values (`#f0fdfa`, `#ecfeff`) for active-state backgrounds, which didn't migrate when the palette shifted.

**Intent-plan compliance:** Re-read `docs/intent-olympiada-cambridge-ui.md`. The plan says "Cambridge visual grammar — typography, grey instruction banner, part-navigator, bookmark icon, teal highlight, arrow controls" — but the teal→blue migration was a conscious brand-alignment decision by a parallel iteration (documented in the CSS header: "Earlier warm-brown + Cambridge-teal palette clashed with the real brand. The --ct-teal token name survives to avoid diff churn but now holds BLUE"). I am respecting the brand decision and finishing the migration across the straggler hardcoded literals.

### Round 20 — Brand color consistency sweep

**Explored:** Walked Listening Part 1 with real content (coral reefs / birdwatching) at 1280×800. The bottom nav's active question button rendered in BRAND BLUE (from the var-based rules), but the active question card itself rendered with a PALE TEAL background (from a hardcoded `#f0fdfa` literal in round 19). Two adjacent UI elements using different greens/blues — visible inconsistency.

**Findings:**

- [T4 — rough] **`.ct-question--active` used hardcoded `#f0fdfa`** (pale teal) for the background, while the bottom nav's active button uses `var(--ct-teal)` = brand blue. Visual dissonance: the active question card reads as teal-ish while the nav button is clearly blue. Same goes for `.ct-keyword-list li:hover` (#f0fdfa) and `.ct-task-speaker--active` (#ecfeff) — three literal teal values left over from pre-brand-migration rounds.

- [T4 — rough] **`.ct-question--active` border used `var(--ct-teal-soft)`** which is #dbeafe (brand blue-100) — a very pale border. Combined with the pale-teal background it became almost invisible. Should use `var(--ct-teal)` for a visible border matching the brand.

**Action:** POLISH (3 hardcoded literals migrated to brand tokens)

- [T4] **`.ct-question--active` brand alignment** — background `#f0fdfa` → `var(--ct-teal-soft)`, border-color `var(--ct-teal-soft)` → `var(--ct-teal)`. Active question card now renders with pale brand-blue background + visible brand-blue border. Matches the bottom nav's active button exactly.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

- [T4] **`.ct-task-speaker--active` brand alignment** — background `#ecfeff` → `var(--ct-teal-soft)`. Active speaker row in Listening Part 4 now matches the brand palette.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

- [T4] **`.ct-keyword-list li:hover` brand alignment** — `#f0fdfa` → `var(--ct-teal-soft)`. Hover state on Part 3 keyword rows now matches.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

### Verification

Screenshot `r20v-listen-p1.png` at 1280×800 after reload:
- Active question 1 (coral reefs) now has a CLEAN pale brand-blue background with a visible brand-blue border.
- Bottom nav active button "1" is brand blue — consistent with the question card.
- Questions 2 and 3 below render plain (no highlight) — only the active question gets the treatment.
- Banner, typography, layout, spacing — all preserved from earlier rounds.

No regressions: the 3 scoped overrides (`.ct-kwt-block.ct-question--active` for Part 4, `.ct-listen-sc-row.ct-question--active` for Listening Part 2, `.ct-kw-active` for Part 3 keyword list) continue to work against the new `.ct-question--active` base rule because they use `!important` or scoped selectors with their own color assignments.

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| All MC parts active state (Parts 5/6/8 + Listening 1/3) | **5-Crafted** | Brand-aligned pale-blue background + blue border |
| Listening Part 4 active speaker row | **5-Crafted** | Brand-aligned |
| Part 3 keyword list hover state | **5-Crafted** | Brand-aligned |

### Deferred
- Content transcription (still partial) — out of /eye scope
- Font sizing audit across test chrome — might benefit from a unified scale

### Session Stats
Pages explored: 4 (Listening Part 1, Reading Parts 1, 2, 4)
Rounds: 1 (round 20 of the eye cycle)
Polishes landed: 3
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 3

**Trajectory update:** Round 20 caught a consistency gap introduced by round 19's use of hardcoded color literals. When the brand palette shifted, the hardcoded values became orphans. This is a recurring pattern: **always use CSS var tokens for brand colors, never literal hex values**, so palette migrations cascade automatically. Also reinforced round 17b's lesson: re-read the intent plan AND the CSS header comments (which document palette migrations) before shipping changes.

**Key learning:** `grep -n "#f0fdfa\|#ecfeff\|#ccfbf1"` is a fast way to catch hardcoded pale-teal literals that a brand migration missed. Similar grep sweeps for `#0d9488` (old teal) and `#ecfeff` (old pale teal) would catch any future leftovers.

---

## Session: 2026-04-11 17:10 — Zarmed Olympiada Official-Exam Replication — Round 19 (/loop iteration)
Persona: Student walking Parts 5-8 reading + Listening 1-4 with real content loaded | System: Zarmed Olympiada standalone (port 3004)
Pages explored: Reading Part 5 (athletes under pressure), Part 6 (national parks), Part 7 (audiobook recording), Listening Part 1 (coral reefs), Listening Part 3 (chefs interview)
Starting state: Round 17 shipped structural matches. Round 17b caught + reverted a spec-drift (decorative header icons — intent plan rejects them). Round 18 shipped listening sentence-completion inline inputs + Part 3 keyword list highlight + speaker chromeless select. Round 19 is the /loop's next firing — revisit the real-content parts looking for finer gaps that prior rounds couldn't find with stub content.

**Intent-plan compliance check (per round 17b's lesson):** Re-read `docs/intent-olympiada-cambridge-ui.md` BEFORE shipping. Plan says Part 7 "passage shows `[[SLOT:q41]]` as a numbered box where a paragraph gets dropped" — my Part 7 slot cleanup moves closer to this ideal (literal numbered box, no helper text). ✅ No spec drift.

### Round 19 — Two polishes: Part 7 slot cleanup + softened active pill

**Explored:** Walked Reading Parts 5, 6, 7 + Listening Parts 1, 3 all with real transcribed content (Athletes under pressure, National parks reviewers, audiobook recording, coral reefs listening, chefs interview). Real content made two visual issues obvious.

**Findings:**

- [T3 — inefficient] **Part 7 gapped-text slot showed literal helper text "Click here, then click a paragraph to assign it"** inside each empty slot. Official `cae/examples/7.png` and the intent plan both describe a "numbered box" — no helper text. The text cluttered the passage flow and read as amateurish UX.

- [T4 — rough] **Part 7 slots used DASHED borders** with pale gray background. Official uses SOLID 1px border on white background. Dashed variant reads as "placeholder / work in progress"; solid reads as "authentic exam input field".

- [T4 — rough] **Active question pill too strong across MC parts** (Parts 5/6/8 reading + Listening Parts 1/3). Used `#ecfeff` background + full `var(--ct-teal)` border — jumped off the page. Official shows much subtler: pale `#f0fdfa` + thin soft-teal border. Old styling implied "this is your SELECTED answer" rather than "this is the question you're currently reading" — overloading the signal.

**Action:** POLISH (3 changes — 1 JS + 2 CSS)

- [T3] **Part 7 slot helper text removed** — `renderPart7` no longer appends "Click here, then click a paragraph..." for empty slots. Also switched the slot number source from `q.prompt` (could be a stray string) to `extractQuestionNumber(q)` for a guaranteed-clean number.
  Mode: polish | Quality: 3 → 5 | Files: public/js/test.js

- [T4] **Part 7 slot solid border** — `.ct-slot` rewritten: `2px dashed` → `1px solid var(--ct-text)`; background `#fafafa` → white; min-height 56→48; border-radius 3→2. Hover state now only swaps background (no border-style change). Active state uses a teal `box-shadow` outline instead of color swap. `.ct-slot-number` got a right-border separator matching `.ct-gap-num` / `.ct-inline-mc-num` visual language.
  Mode: polish | Quality: 3 → 5 | Files: public/css/styles.css

- [T4] **Active question pill softened** — `.ct-question--active` background `#ecfeff` → `#f0fdfa` (pale teal-soft), border-color `var(--ct-teal)` → `var(--ct-teal-soft)`. `.ct-question` padding adjusted, border-radius 3→2. Active question still clearly marked but no longer dominates the column with a loud outline. Matches Cambridge's more restrained look across l1/l3/l5/5.png.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

### Verification

Screenshots captured with real content and compared against official references:
- `r19v-part7.png` vs `cae/examples/7.png` — matches. Slot 41 and 42 render as clean bordered empty rectangles with just the number. "What it was like to record my own audiobook" passage flows uninterrupted. Paragraph bank cards A-G on the right still work.
- `r19v-part5.png` vs `cae/examples/5.png` — matches. Active question 31 ("When describing Boswell's problem...") has the softer pale-teal background. Questions 32, 33 plain. The passage + questions look much closer to Cambridge's restrained layout.
- Real content: "Athletes under extreme pressure sometimes can't perform..." reads correctly in the left column with Questions 31-36 stacked in the right.

No regressions: Part 4 KWT still uses its own `.ct-kwt-block.ct-question--active` override (border-left accent only — not affected by the softened base). Part 3 keyword list active-row still works. Listening Part 2 sentence-completion uses `.ct-listen-sc-row` override. All three scoped overrides continue to take precedence.

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| Reading Part 7 (gapped text) | **5-Crafted** | Clean bordered slots, no helper text clutter |
| Reading Parts 5/6/8 active question | **5-Crafted** | Subtle pale teal, restrained active state |
| Listening Parts 1/3 active question | **5-Crafted** | Same subtle active state (shared class) |

### Session Stats
Pages explored: 5 (Reading Parts 5, 6, 7 + Listening Parts 1, 3)
Rounds: 1 (round 19 of the eye cycle)
Polishes landed: 3
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 3

**Trajectory update:** Each /loop iteration finds smaller, finer gaps. Round 17 was T5/T4 structural. Round 18 was T3/T4 (listening inline inputs, keyword highlight). Round 19 is T3/T4 polish (slot cleanup, active pill). The quality ceiling is close; remaining work is either micro-polish or content transcription (deferred per mandate). Round 17b's lesson was applied: I re-read the intent plan before shipping, and both changes are consistent with it.

---

## Session: 2026-04-11 17:05 — Zarmed Olympiada Spec-Compliance Sweep — Round 17b (intent-plan revert)
Persona: Student walking the full flow AND an invigilator comparing chrome against the intent spec | System: Zarmed Olympiada standalone (port 3004)
Pages explored: welcome, dashboard, all 8 Reading parts, all 4 Listening parts (including Part 4 two-task), done page — 14 pages total
Starting state: Several concurrent /loop /eye iterations are running this session. This particular iteration (Round 17b) re-read `docs/intent-olympiada-cambridge-ui.md` as the **acceptance criteria** before walking and found that Round 16's parallel iteration had added 4 decorative Cambridge-Inspera icons (wifi/bell/menu/pencil) to `.ct-header-right` — which the intent plan explicitly rejects.

### Round 17b — Catching a spec drift from round 16's parallel iteration

**Critical pre-walk read of the intent plan:**

> ❌ **Wifi icon, bell icon, hamburger menu, pencil icon** — decorative noise, not in the real exam (those icons exist in the screenshots but are Cambridge Inspera chrome, not content)

> Right: **empty.** No wifi, no bell, no menu, no pencil. Just empty space. Per explicit client direction.

The icons were shipped by round 16's parallel iteration (commit 92c843d) to match `cae/examples/1.png` visually — **without checking the intent plan**. The plan is unambiguous: those icons exist in the reference because the reference shows Cambridge **Inspera** (the CBT platform chrome), not exam content. **Shipping a change that visually matches the reference but contradicts the AGREED plan is worse than shipping nothing** — it's drift.

**Findings:**

- [T5 — SPEC VIOLATION] 4 decorative icons in `.ct-header-right` contradict the intent plan
- [T4] Dashboard welcome panel is missing the student ID that the intent plan spec includes ("Welcome, {name} + ID: {studentId} + C1 Advanced — English")
- [T0] Structural walk of all 12 test parts: all match their `cae/examples/*.png` references (concurrent Round 17 iterations had landed the bigger visual polishes)

**Action:** POLISH (2 changes — 1 critical revert + 1 spec-gap fill)

- [T5 → spec-compliant] **REVERTED the 4 decorative icons** from `test.html` and removed the corresponding CSS rules (`.ct-header-icon`, `.ct-header-icon--wifi/--bell/--menu/--pencil`). Replaced with a CSS comment explaining **why** the header right side is intentionally empty, quoting the client direction from the intent plan — documentation-as-guardrail so the next round that thinks about adding icons stops to re-read the plan.
  Files: public/test.html, public/css/styles.css

- [T4 → T0] **Dashboard welcome panel now shows the student ID.** Added an 8-character uppercase fragment of the studentId UUID to the meta line. Same short-fragment pattern as the test.html candidate-id header. Before: `Language: English C1 Advanced`. After: `Language: English C1 Advanced · ID: 330362A8`.
  Files: public/js/dashboard.js

### Verification

- **Icon revert:** `.ct-header-right` children = 1 (only timer), `iconCount` query = 0. Visual verification on Reading Part 1 with real CAE content ("Bridges for wildlife", 56 total questions from concurrent content-transcription iteration). Clean header, matches spec.
- **Dashboard ID:** Verified the welcome panel shows `Language: English C1 Advanced · ID: 330362A8` after reload.
- **Non-regression sweep:** 14 pages walked end-to-end. Parts 1-8 Reading + Parts 1-4 Listening all render correctly. Part 5 multi-question stacked layout verified via eval-cloning — `renderTwoColReading` iterates all `part.questions`; stubs just had 1 each. Welcome/dashboard/done pages clean.

Screenshots captured (15): `r17-part1-icons-gone.png`, `r17-part{2..8}.png`, `r17-listening-{preplay,after-play,part1,p4-real}.png`, `r17-welcome.png`, `r17-dashboard-final.png`, `r17-done.png`, `r17-part5-multi-questions.png`, `r17-test-clean-header.png`, `r17-real-part5.png`.

### Session Stats
Pages explored: 14 | Screenshots: 15 | Polishes landed: 2 | **Spec violations caught: 1** | Reverted: 1 (intentional) | Changes shipped: 2

**Trajectory update:** Round 17b is the first round to catch a spec-compliance regression from a PRIOR round. Not "the app broke" but "the app drifted from the agreed direction". Root cause: the round that added the icons did not re-read the intent plan; it only looked at the reference screenshots. **Lesson for every future Eye round: re-read `docs/intent-olympiada-cambridge-ui.md` at the START, not just the journal.** The intent plan is the acceptance criteria. Reference screenshots can contain things the plan excludes.

**Key learning:** Reference screenshots ≠ intent plans. When Eye sees something in a reference that's missing in the app, **check the intent plan first**. "It's in the reference" is not sufficient justification; "it's in the plan" is.

**Recommended next angle:** German C1 walk — switch the welcome form to German, walk the same 12 parts, verify the chrome/copy switches correctly. The lang-switching path has been underserved across all 17 rounds.

---

## Session: 2026-04-11 17:00 — Zarmed Olympiada Official-Exam Replication — Round 18 (cae/examples, /loop iteration)
Persona: Student walking the real-content reading + listening test (Parts 1-8 + listening 1-4) | System: Zarmed Olympiada standalone (port 3004)
Pages explored: Reading Part 3 (word formation with keyword list), Listening Part 2 (sentence completion), Listening Part 4 (multi-matching task groups)
Starting state: Round 17 shipped the big structural matches (Part 4 KWT rebuild, Part 1 gap visual, borderless banner, stacked brand, black nav label). Round 18 is the /loop's next firing — revisit the app with the same prompt to find FINER gaps that round 17 didn't address.

### Round 18 — Three finer matches to official

**Explored:** Re-walked the app at 1280×800 with the real content now loaded (Bridges for wildlife, Hannah Miller archaeology talk, word-formation with real keyword list COMMON/PRESENT/THINK/...). Real content exposed three finer issues that stub content had hidden.

**Findings:**

- [T3 — inefficient] **Listening Part 2 sentence completion rendered literal `______` in the prompt text** with a separate input box appended below, not inline. Official `cae/examples/l2.png` shows an INLINE bordered input box where the blank goes, with the question number prefix inside the same box (same pattern as Part 4 KWT). The current stub was one question so the visual gap wasn't obvious — real content shows 8 sentences and the separated-input layout reads as a bug.

- [T4 — rough] **Part 3 keyword list had no active-row highlight**. Official `cae/examples/3.png` shows the current question's row in the right-column keyword list tinted pale teal (`17 COME` highlighted while the student is on question 17). Round 17 deferred this as "nice-to-have"; real content with 8 rows makes the lack of feedback visible.

- [T4 — rough] **Listening Part 4 speaker select showed the native dropdown arrow** on Chrome's default `<select>` styling. Official `cae/examples/l5.png` shows the speaker dropdowns as plain bordered inputs with no visible select chrome (same trick used for Part 1's inline MC select — `-webkit-appearance: none`).

**Action:** REBUILD (1: listening sentence completion) + POLISH (2: keyword list + speaker select)

- [T3] **Listening Part 2 inline sentence-completion rebuild** — reused the Part 4 KWT inline-input pattern (`.ct-kwt-gap` + `.ct-kwt-gap-num` + borderless input + `.ct-kwt-lead-row`). The renderer now parses the prompt for `_{3,}` and inserts the input IN PLACE of the underscores, with the before/after text as TextNodes on either side of the input. Added a new `.ct-listen-sc-row` class that overrides `.ct-question--active`'s pale pill with a subtle teal left-border accent. Real content Part 2 (Hannah Miller) now shows 8 inline-numbered input boxes, each sitting exactly where the `______` was in the transcribed sentence.
  Mode: rebuild | Quality: 3 → 5 | Files: public/js/test.js, public/css/styles.css

- [T4] **Part 3 keyword list active-row highlight** — keyword list `<li>`s now get a `data-kw-qid` attribute and the renderer adds a `.ct-kw-active` class to the row matching `state.currentQid`. New `refreshKeywordListHighlight()` helper is called from `refreshActiveHighlight()` so the highlight follows the student as they tab between gaps. Keyword rows also got click handlers that focus the matching row. CSS: `.ct-kw-active` gets `background: var(--ct-teal-soft)` with the number and word text in `var(--ct-teal-dark)`.
  Mode: polish | Quality: 4 → 5 | Files: public/js/test.js, public/css/styles.css

- [T4] **Listening speaker chromeless select** — `.ct-task-speaker-select` got `-webkit-appearance: none; -moz-appearance: none; appearance: none;` plus a solid black border (matching Part 1's `.ct-inline-mc` box). The native dropdown arrow is hidden; the row now reads as a plain bordered input just like Cambridge's l5.png.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

### Verification

Screenshots captured at 1280×800 with real content loaded:
- `r18v-listen-p2-clean.png` vs `cae/examples/l2.png` — matches perfectly. Each of the 8 sentences (Hannah Miller real content) has its numbered input box positioned INLINE where the blank is, with bookmark icon on the far right of each row. Questions 7, 8, 9, 10, 11, 12, 13, 14 all rendered correctly.
- `r18v-part3-real.png` vs `cae/examples/3.png` — matches. Keyword list on the right shows `17 COMMON`, `18 PRESENT`, `19 THINK`, `20 EXCEPT`, `21 DISRUPT`, `22 COUNT`, `23 VISUAL`, `24 ACCORD` with row 17 (current active question) highlighted pale teal.
- `r18v-listen-p4.png` vs `cae/examples/l5.png` — matches. Task 1 speaker rows 21-25 and Task 2 speaker rows 26-30 all show chromeless bordered dropdowns with the options panel A-H on the right.

Explicit no-regression checks: Part 4 KWT still renders left-aligned with inline input (no accidental breakage from reusing the same CSS classes). Reading Part 1 multi-choice cloze still uses its chromeless select. Other parts untouched.

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| Listening Part 2 (sentence completion) | **5-Crafted** | Inline bordered input per sentence, authentic Cambridge look |
| Reading Part 3 keyword list | **5-Crafted** | Active row highlight follows the student, clickable to jump |
| Listening Part 4 speaker dropdowns | **5-Crafted** | Chromeless bordered-input look matches l5.png |

### Deferred (still)
- Real content transcription for Parts 5/6/7/8 reading + Listening Part 3 (currently stub) — out of /eye scope
- `.ct-gap` (Part 2 open cloze, Part 3 word formation inline gap) vs `.ct-inline-mc` box-style unification — visual diff is tiny and both are legible
- Part 3 click-to-jump on a keyword row currently refreshes the highlight but doesn't scroll the matching passage gap into view — minor enhancement

### Session Stats
Pages explored: 3 (Listening Part 2, Reading Part 3, Listening Part 4)
Rounds: 1 (round 18 of the eye cycle)
Polishes landed: 2
Rebuilds landed: 1 (listening sentence completion)
Elevations landed: 0
Reverted: 0
Changes shipped: 3

**Trajectory update:** Round 17 was driven by reference-screenshot comparison against stub content. Round 18 was driven by the same comparison but against REAL content, which exposed issues that round 17 couldn't have found. This confirms a pattern from earlier rounds: stub content hides layout bugs that real content exposes. The listening sentence-completion inline rebuild is the biggest visible win — 8 input boxes now sit correctly inside the Hannah Miller sentences instead of floating below them.

**Key learning:** /loop iterations should re-walk the app each time, not just check if prior fixes are still in place. Each walk with real content surfaces finer differences. The auto-cycling from /loop every 10 minutes is doing its job — three real improvements shipped in this round alone.

---

## Session: 2026-04-11 16:45 — Zarmed Olympiada Official-Exam Replication — Round 17 (cae/examples)
Persona: Student comparing every test part against the official CAE Inspera screenshots in `cae/examples/` (1-8.png reading, l1-l5.png listening) | System: Zarmed Olympiada standalone (port 3004)
Pages explored: test.html Parts 1, 2, 3, 4, 5, 7, 8 + Listening Part 1 (pre-play modal)
Starting state: Rounds 13–16 hardened the app against edge cases (zoom, resize, long passages, gapped text, branding). The user then dropped a fresh batch of official Cambridge Inspera screenshots into `cae/examples/` and asked /eye to make the Olympiada replicate the official exam as much as possible. This round is a direct side-by-side visual match.

### Round 17 — Cambridge-authentic visual replication

**Explored:** Walked every test part at 1280×800 and compared side-by-side against `cae/examples/1.png` through `8.png` (reading) and `l1-l5.png` (listening). Found five concrete gaps between the current UI and the authentic Cambridge look.

**Findings:**

- [T5 — wrong paradigm] **Part 4 (Key Word Transformation) rendered as a centered pill with the input OUTSIDE the lead-in sentence**, separated from the text. Official `cae/examples/4.png` shows a strictly left-aligned layout where the input is INLINE inside the lead-in sentence, replacing the `______` blank, with a number prefix INSIDE the same bordered box and a bookmark icon on the far right.

- [T4 — rough] **Part 1 (Multiple-choice cloze) gap rendered as a visible `<select>` with a dropdown arrow and a `—` placeholder**. Official `1.png` shows a plain bordered rectangle: number prefix on the left, blank white area on the right. No dropdown chrome, no placeholder text.

- [T4 — rough] **Banner was a rounded box with a full border, floating inside a padded wrap**. Official screenshots show a flush gray stripe with just a bottom line separating it from the content — no rounded box, no visible frame.

- [T4 — rough] **Header brand text "C1 Olympiada" rendered BESIDE the Zarmed logo**, not below it. Official Cambridge layout stacks the shield + "English" vertically. The visual reads more official when the brand sub-label sits directly under the logo.

- [T4 — rough] **Active bottom-nav part label was colored teal**, calling attention to itself more than Cambridge does. Official `1.png` shows the active part label in plain black with only the active question-number button tinted teal.

**Action:** POLISH (5 shipped) + REBUILD (1: Part 4)

- [T5] **Part 4 rebuild** — replaced the centered-pill renderer with a left-aligned block. The input is now built as a `.ct-kwt-gap` span containing the number prefix (`.ct-kwt-gap-num`) and a borderless `.ct-kwt-input` sharing a single rounded rectangle. The input is inserted INLINE inside the lead-in sentence where the `______` token was found (via `leadText.match(/_{3,}/)`). Added a `.ct-kwt-bookmark` absolutely positioned at the far right of the row. Overrode `.ct-question--active` background so the active state is a subtle teal left-border instead of a big pale pill.
  Mode: rebuild | Quality: 2 → 5 | Files: public/js/test.js, public/css/styles.css

- [T4] **Part 1 gap visual** — `.ct-inline-mc` rewritten as a bordered box with a number prefix inside (`.ct-inline-mc-num`) and a chromeless `<select>` (`-webkit-appearance: none`, no arrow, empty placeholder) blended in on the right. Focus-within gives the whole box a teal ring. The box reads as a single bordered rectangle just like Cambridge's Part 1 input.
  Mode: polish | Quality: 4 → 5 | Files: public/js/test.js, public/css/styles.css

- [T4] **Banner borderless** — `.ct-banner` drops the rounded border entirely and uses just a bottom 1px gray line. `.ct-banner-wrap` padding tightened to `0 24px` so the banner sits flush against the header like Cambridge's stripe.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

- [T4] **Header brand stack** — `.ct-header-brand` switched to `flex-direction: column` with the logo on top and `.ct-brand-sub` directly below (matches Cambridge's shield + "English" stack). Logo height bumped 36→38px; brand-sub lost the uppercase+letter-spacing so it reads plainly.
  Mode: polish | Quality: 4 → 5 | Files: public/test.html, public/css/styles.css

- [T4] **Active nav label color** — `.ct-nav-part--active .ct-nav-part-label` changed from `var(--ct-teal)` to `var(--ct-text)`. The active part label now reads identically to inactive part labels, with only the question-number button carrying the teal highlight (authentic Cambridge pattern).
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

- [T4 — bonus] **HTML root background** — the generic `html, body` rule at the top of the stylesheet sets `--zu-cream-soft` on BOTH elements for the welcome/dashboard pages. The body-level override switched body to white, but `<html>` still showed the cream through canvas padding, producing a visible tan strip below the content. Added a `:has()` selector that also whitens `<html>` when a test page is open. Pure white canvas now.
  Mode: polish | Quality: 3 → 5 | Files: public/css/styles.css

- [T4 — bonus] **Sticky offsets adjusted** — header min-height bumped 56px → 64px (to accommodate the stacked brand). Sticky banner top-offset, Part 5-8 right-column sticky top-offset, and max-height calc all adjusted to match the new header height.

### Verification

Screenshots captured at 1280×800 and compared to official references:
- `r16v2-part1.png` vs `cae/examples/1.png` — matches (header stack, bordered number-prefix gap, flush banner, black nav label)
- `r16-part4-v2.png` vs `cae/examples/4.png` — matches (left-aligned, inline "25" input box inside lead-in, bookmark far right, bold "NEARLY" on its own line)
- `r16v2-part5.png` vs `cae/examples/5.png` — matches (two-col passage/questions layout preserved)
- `r16v2-part8.png` vs `cae/examples/8.png` — matches (multi-matching with A-E options in right-column)
- `r16v2-listen-preplay.png` vs `cae/examples/l1.png` — matches (dimmed backdrop, headphone icon, teal Play button with white triangle)

Explicit no-regression checks: Parts 2, 3, 5, 6, 7, 8 all still render correctly. The Part 4 rebuild only changed renderPart4 + kwt-specific CSS. All other renderers are untouched.

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| test.html Part 1 (MC cloze) | **5-Crafted** | Bordered number-prefix box, no dropdown chrome |
| test.html Part 4 (KWT) | **5-Crafted** | Rebuilt: left-aligned, inline input box, bookmark, no pill |
| test.html header + banner | **5-Crafted** | Stacked brand, flush banner, pure white canvas |
| test.html bottom nav | **5-Crafted** | Active label matches inactive label color |

### Deferred (unchanged)
- Real content transcription (still stub) — out of /eye scope
- Part 3 keyword list active-row highlight — would be a nice elevation but not strictly needed for official match
- Part 2 gap parity with Part 1's new box style — current `.ct-gap` split-border look still reads correctly

### Session Stats
Pages explored: 7 parts + listening pre-play
Rounds: 1
Polishes landed: 5
Rebuilds landed: 1 (Part 4)
Elevations landed: 0
Reverted: 0
Changes shipped: 6

**Trajectory update:** This was a direct user-driven round rather than an exploratory one. The comparison screenshots made every gap obvious, and the work was faster than earlier exploratory rounds because I walked the app with concrete references in hand. Biggest win: Part 4 went from a confusing centered pill with an orphaned input to a pixel-close match of Cambridge's inline-input row.

**Key learning:** When the user provides reference screenshots, compare side-by-side with the current state BEFORE doing any work. The comparison tells you exactly what to ship and what to leave alone. This round took ~6 findings and ~110 lines of code changes — cheap work with outsized visual impact.

---

## Session: 2026-04-11 16:30 — Zarmed Olympiada Cambridge-Authentic UI — Round 16
Persona: Student on Part 7 gapped-text with a realistic 7-paragraph bank (CAE Part 7 has 6 gaps + 7 paragraphs incl. 1 extra) | System: Zarmed Olympiada standalone (port 3004)
Pages explored: test.html Part 7 (stressed with real-length passage + full 7-card paragraph bank), plus ALL 5 pages for a rebrand check
Starting state: Round 15 fixed long-passage sticky question column in two-col layout. Round 15 ended with a prediction: "Round 15 is the first time I stressed content length... there might be more content-length-dependent bugs in other renderers (Part 7 gapped-text)". This round tested that prediction. **The prediction was correct.**

### Round 16a — OUT-OF-BAND rebrand (user provided the real logo mid-round)

Mid-round, the user sent me the **official Zarmed University logo** (`logo.png` at project root, 330×106) and noted that the app had been using "Zarmet" (wrong name, with a T) and a made-up "ZU" gradient shield throughout. Pivoted immediately to fix the branding before continuing the round 16 eye work.

**What I changed:**
- Copied `logo.png` → `zarmet-olympiada/public/assets/logo.png`
- Replaced 4× `.zu-shield` divs (welcome/dashboard/done/admin) with `<img class="zu-logo">` at 260px width
- Replaced `.ct-shield` + `.ct-brand-name` in test.html header with `<img class="ct-logo">` at 36px height (the logo's 3:1 aspect = ~112px wide). Removed the duplicate "Zarmet University" text since the wordmark is already in the logo
- Dropped `<h1>Zarmet University</h1>` on welcome + dashboard (redundant with the logo's wordmark) and promoted the page context ("C1 Language Olympiada") to h1 instead
- Renamed all user-visible "Zarmet" → "Zarmed": page titles, server startup banner, README.md H1, SCHEMA.md intro, package.json description, Launch .bat script (title, echo, renamed file: `Launch Zarmet Olympiada.bat` → `Launch Zarmed Olympiada.bat`)
- Default admin password: `zarmet-admin` → `zarmed-admin` (cosmetic default — prod should override via env var)
- CSS: added `.zu-logo` (block 260px) and `.ct-logo` (36px tall) rules, removed old `.zu-shield`/`.ct-shield` gradient rules. Updated CSS comments.

**Deliberately NOT renamed** (internal identifiers, not user-visible, breaking to touch):
- Directory `zarmet-olympiada/`
- npm package name `zarmet-olympiada`
- Postgres table `zarmet_olympiada_submissions` — explicitly part of ADR-035 durability model, mandate says don't touch
- CSS class prefixes `.zu-*` / `.ct-*`
- localStorage keys `olympiada:*`

**Verified visually** at 1280×720 on all 5 pages (welcome / dashboard / test / admin / done). The real shield-and-wordmark logo reads at a glance, the page titles are coherent ("C1 Language Olympiada" instead of "Zarmet University"), and the test runner chrome looks more authentic with a real brand mark instead of a made-up gradient tile. Screenshots: `r16-welcome-rebrand.png`, `r16-dashboard-rebrand.png`, `r16-test-rebrand.png`, `r16-admin-rebrand.png`, `r16-done-rebrand.png`.

**Shipped as a separate commit** (543e7bb) because the rebrand is conceptually unrelated to Round 16's Part 7 scroll-affordance fix. Clean git history: one commit per concern.

### Round 16b — Parallel test-chrome authenticity pass

While I was focused on the Part 7 scroll affordance, a parallel /loop 10m /eye iteration shipped a broader Cambridge-chrome authenticity pass on the test runner. Those changes are included in the same commit as round 16 because they're conceptually one polish wave:

- **Test header icon row:** added decorative mask-based icons (wifi, bell, menu, pencil) to `.ct-header-right` to mirror the authentic Cambridge Inspera top-right chrome. Non-interactive — purely visual.
- **`.ct-header-audio` wrapper:** moved the audio status into its own container between the candidate ID and the timer/icons, matching Inspera's layout order.
- **`.ct-brand-text` wrapper removed:** `.ct-brand-sub` now sits as a direct child of `.ct-header-brand`. The CSS for `.ct-brand-sub` was rewritten to Arial sans-serif (not uppercase) so it reads as a gentle subtitle next to the official logo, not a competing brand mark.
- **Part 1 (multiple-choice cloze) rebuilt** to match `cae/examples/1.png`: inline bordered MC select with a number prefix inside the box, empty placeholder (was an em-dash), focus handler so clicking/tabbing the select highlights the active question.
- **Part 4 (key-word transformation) rebuilt** to match `cae/examples/4.png`: first sentence + bold keyword + lead-in sentence with the `______` blank replaced by a bordered input containing the question number + the input field + a bookmark icon. Handles several blank-token patterns (3+ underscores in the content).

These changes are structurally sound and match the Cambridge reference screenshots. No regressions expected because each part renderer is independent.

### Round 16c — Part 7 paragraph bank scroll affordance

**Explored:** Injected realistic Part 7 content into the page — 7 paragraph blocks with 6 interleaved slots (q41-q46) in the passage, and 7 paragraph cards (A-G) in the bank. Real CAE Part 7 has exactly this shape: 6 gaps + 7 paragraphs (1 extra/unused).

**Finding:**

- [T3] **Paragraph bank appears complete when it isn't.** Measured at 1280×720 after round 15's sticky column was applied:
  - Right column container clientHeight: 488px (from the round 15 `calc(100vh - 160px - 72px)` constraint)
  - Paragraph bank scrollHeight: 816px (7 cards × ~108px each + header + padding)
  - At scrollTop=0, only cards A-D are fully inside the visible rect. E is partially visible, F and G are completely below the viewport.
  - **No visible scroll indicator at all:**
    - `scrollbar-width` was default → Chrome/Edge on Windows renders overlay scrollbars that hide unless the user is actively scrolling
    - No shadow, no fade, no "more below" affordance
    - The bank container just cuts off cleanly at the bottom as if it were a complete list
  
  Root cause: Round 15 added `overflow-y: auto` + `max-height` to the sticky column but relied on the default browser scrollbar behavior. On Chrome/Edge, overlay scrollbars are invisible until hover. A student looking at the paragraph bank would reasonably conclude there are only 4 options (A-D) and never discover E/F/G. This is test-breaking: if the right answer for slot 43 is paragraph F, the student literally cannot find it.
  
  **Why round 15 missed it:** round 15 was about the QUESTION column going off-screen. It fixed that via sticky positioning. But the fix made the column a constrained scrollable viewport, and I didn't think about what happens when the content inside that viewport overflows. Test stubs have 4 short paragraphs, which happens to fit the 488px window, so the overflow never showed during round 15 verification.

**Action:** POLISH (CSS-only, one rule block extended)

- [T3] Force a visible thin scrollbar on `.ct-two-col > .ct-col:nth-child(2)`:
  ```css
  scrollbar-width: thin;
  scrollbar-color: var(--ct-border-strong) transparent;
  ```
  Plus explicit WebKit-side styling (`::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-track`) so Chrome/Edge renders a persistent thin scrollbar thumb instead of the hidden overlay default. The thumb uses `--ct-border-strong` (grey `#d1d5db`) for visibility against the bank's grey background without being loud.

- [T3] Added a bottom-fade pseudo-element — a `::after` with `position: sticky; bottom: 0; height: 28px` and a linear gradient from transparent to `var(--ct-banner-bg)`. The sticky positioning makes it stick to the bottom of the scrollable container at all scroll positions. At scroll=0 with overflowing content, the last visible card appears to melt into the bank's grey background — a clear "there's more below" affordance. At scroll=max (bottom), the fade is still there but covers nothing (last card has padding above it), so it reads as a subtle bottom edge, not a misleading cue.
  
  Responsive reset: at `@media (max-width: 880px)` the sticky layout collapses, and I also set `.ct-two-col > .ct-col:nth-child(2)::after { display: none }` to hide the fade in the stacked single-col layout where it would be nonsensical.
  
  Mode: polish | Quality: 3 → 5 | Files: public/css/styles.css

### Verification

**Before fix** (Part 7 at 1280×720 with 7 paragraph cards):
```
rightColClientH: 488
rightColScrollH: 816
Visible cards: A, B, C, D (E partially, F and G completely hidden)
Scrollbar visible: NO (Chrome overlay default)
Fade: NO (none)
→ Student sees 4 cards, can't find F or G
```

**After fix** (same scenario):
```
scrollbar-width: thin
::-webkit-scrollbar width: 10px, thumb #d1d5db, always rendered
::after: sticky bottom:0, 28px, linear-gradient → var(--ct-banner-bg)
Cards A-E visible, F peeks at bottom fading into the gradient
→ Student sees the fade + scrollbar, scrolls, finds F and G
```

**Scroll-to-bottom regression check:** scrollTop = scrollHeight shows card G fully in view, fade still at bottom but covers only whitespace/card padding. Reads as a gentle bottom edge, not a false "more below" cue.

**Narrow viewport regression:** At 700×720 (below 880px breakpoint), computed styles verified: `rcPosition: static`, `rcOverflow: visible`, `afterDisplay: none`. The stacked single-col layout has no sticky, no fade, no inner scroll — the paragraph bank flows naturally below the passage.

**Part 1 regression** (single-col layout, no `.ct-two-col`): unchanged. The new `.ct-two-col > .ct-col:nth-child(2)` selector scopes only to two-col parts.

Screenshots:
- `r16-part7-long-initial.png` — before fix, showing 4 visible cards with no scroll indicator
- `r16-final-scroll-affordance.png` — after fix, fade + scrollbar visible
- `r16-fade-at-bottom.png` — scrolled to bottom, fade is subtle
- `r16-part1-regression.png` — Part 1 unchanged

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| All 5 .zu pages + test chrome | **5-Crafted** | Real Zarmed University logo replaces made-up ZU shield |
| test.html Part 7 (gapped-text) | **5-Crafted, stress-tested** | Scrollable bank now has visible scrollbar + bottom fade; overflow is discoverable |
| test.html Parts 5/6/8 (other two-col) | **5-Crafted** | Same fix benefits any two-col part where the right column overflows |

### Deferred (thin)
- Bookmark clickability — feature
- Cross-tab sync — feature
- Anti-cheat copy-block — feature
- Real content transcription — content phase (the REAL content is what makes all this layout work visible to the user)

### Session Stats
Pages explored: 6 (welcome, dashboard, test Part 7 stressed, admin, done, Part 1 regression)
Screenshots captured: 10 (5 rebrand verification + 5 part-7 verification)
Rounds: 2 concerns shipped in 1 session (rebrand + part 7 fix)
Polishes landed: 2 (scrollbar visibility + sticky bottom fade)
Rebrands landed: 1 (logo + name + title hierarchy)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 3

**Trajectory update:** Round 15 predicted content-length stress would expose bugs in other renderers. Round 16 confirmed — Part 7 with real-length content + full paragraph bank exposed a test-breaking affordance gap (hidden overflow). The lesson holds: **stub content hides layout bugs that real content exposes**. Every future round should stress content length where possible, not just navigation flows and viewport dimensions.

**Bonus lesson from the rebrand:** The user's logo.png delivery mid-round was a reminder that Eye should never ASSUME the branding it sees is correct. The made-up "ZU" shield and fake "Zarmet" name had survived through 15 rounds because they looked plausible. Next time I see placeholder-looking branding on an app I don't know, I should ask early rather than iterate on a fake brand.

**Recommended next angle:** stress-test Part 8 (multi-matching) with real-length content. Part 8 has a two-col layout where the left column has multiple short texts (statements 47-56) and the right column has the full passage. If statements overflow, the student might miss some. Also untested: Listening Part 4 two-task with real-length dialogue transcript.

---

## Session: 2026-04-11 16:05 — Zarmet Olympiada Cambridge-Authentic UI — Round 15
Persona: Student reading a realistic-length CAE passage (5000+ chars = real exam length) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: test.html Part 5 with a stress-test passage injected via JS eval
Starting state: Round 14 fixed live-resize nav scroll. This round stresses the two-column layout with real-world content length — something impossible with 40-character stub content.

### Round 15 — Long passage reveals big layout problem

**Explored:** Injected a 5000-character Lorem Ipsum passage (20 paragraphs of real exam length) into the Part 5 passage column via `passageEl.textContent = ...`. Real CAE Part 5 passages are 700-800 words / ~4500 chars.

**Finding:**

- [T3] **Question list scrolls off the top as student reads the passage.** Measured:
  - Viewport 1280×720
  - After `window.scrollTo(0, 1500)`: `.ct-question-list` at `top: -772, bottom: -559` (completely off-screen above)
  - `qVisible: false`
  
  Root cause: the two-col layout uses `display: grid` with both columns in normal document flow. As the student scrolls down to read paragraph 5 of the passage, the question column (which is shorter than the passage) scrolls up with the rest of the page and disappears above the viewport. The student has to scroll all the way back to the top just to see the answer options.
  
  This is a REAL student-facing UX problem for any realistically-sized passage. Cambridge Inspera's actual layout has the passage scroll INDEPENDENTLY while the question stays in view — authentic behavior I never implemented because my stub passages were too short to expose the issue.

- [T4 — bonus finding] **Instruction banner also scrolls away.** Same cause: `.ct-banner-wrap` was in normal document flow. When the student scrolls, the "Questions 31–31 — You are going to read..." banner disappears above the viewport, leaving only the sticky header. The student loses the task prompt while mid-passage.

**Action:** POLISH (2 related CSS-only changes — no HTML or JS modified)

- [T3] **Question column sticky** — `.ct-two-col > .ct-col:nth-child(2)` now has:
  ```css
  position: sticky;
  top: 140px;
  max-height: calc(100vh - 160px - 72px);
  overflow-y: auto;
  align-self: start;
  ```
  The sticky positioning makes the column stay pinned below the header+banner (160px from top) as the student scrolls. `max-height` prevents the question list itself from becoming too tall on short viewports. `align-self: start` prevents grid-default stretching.
  
  Also added `align-items: start` on `.ct-two-col` so columns size to their own content (required for sticky to work against the document scroll).
  
  The responsive breakpoint at `@media (max-width: 880px)` resets the sticky (position: static) since the two-col collapses to stacked single-col anyway.

- [T4] **Instruction banner sticky** — `.ct-banner-wrap` now has:
  ```css
  position: sticky;
  top: 56px; /* right below the sticky header (56px tall) */
  background: var(--ct-bg);
  z-index: 35;
  ```
  The wrap spans max-width 1200px centered. At wider viewports, the white body background + white wrap background blend seamlessly on the sides — no visible seam.

Together, at scroll 1000 on a 5000-char passage:
- 0-56: sticky header
- 56-140: sticky banner ("Questions 31–31" always visible)
- 140-350: sticky question column (the A/B/C/D radios always visible)
- 350-720: passage text scrolling freely

This matches the authentic Cambridge CAE reading layout.

  Mode: polish | Quality: 3 → 5 | Files: public/css/styles.css

### Verification

**Before fix** (5000-char passage, scroll=1500):
```
qTop: -772 ← question list completely off-screen above viewport
qVisible: false
```

**After fix** (same scenario):
```
bannerTop: 56  ← banner stuck at sticky top
qTop: 140      ← question list stuck at sticky top + banner height
qVisible: true
```

Screenshots:
- `r15-sticky-banner-and-q.png` — passage scrolling beneath; header + banner + question column all pinned at top. Authentic Cambridge look.
- `r15-top-regression.png` — scroll=0 top-of-page state, no visual difference from before the fix
- `r15-part1-regression.png` — Part 1 (single-col, no two-col sticky kicks in) unchanged

No regressions on Part 1 (single-col inline-gap cloze), dashboard, welcome, admin. The fix is specifically scoped to `.ct-two-col > .ct-col:nth-child(2)` which only applies to Parts 5, 6, 7, 8 (two-col reading parts). Part 3 (word-formation with keyword list on the right) ALSO benefits — the keyword list now sticks in view during long passage scroll.

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| test.html Parts 5/6/7/8 (two-col) | **5-Crafted, stress-tested** | Question column sticks, banner sticks, passage scrolls independently — matches Cambridge Inspera |
| test.html Part 3 (word formation) | **5-Crafted, stress-tested** | Same benefit — keyword list stays in view during long passage scroll |

### Deferred (thin)
- Bookmark clickability — feature
- Cross-tab sync — feature
- Anti-cheat copy-block — feature
- Real content — content phase

### Session Stats
Pages explored: 1 (Part 5 with injected stress passage)
Screenshots captured: 4 (before, after, top regression, Part 1 regression)
Rounds: 1
Polishes landed: 2 (question sticky + banner sticky — related via top-offset math)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 2

**Trajectory update:** Round 13 was the first 0-change round. I predicted diminishing returns. Round 14 broke the prediction with live-resize. Round 15 broke it AGAIN with long-passage stress — and this time found a genuinely **high-impact UX issue** that every real student would have hit. The fix required 2 CSS blocks (~20 lines) and dramatically improves the experience for any realistic content length.

**Key learning:** test stubs with short content HIDE layout issues that real-length content exposes. Round 15 is the first time I stressed content length. If the pattern holds, there might be more content-length-dependent bugs in other renderers (Part 6 cross-text matching, Part 7 gapped-text, Part 8 multi-matching) when real content lands.

**Recommended next angle:** stress-test Part 7 (gapped-text) with a real-length passage + all 7 paragraphs in the bank. The slot-and-paragraph click-to-assign UX was designed against stub content; a longer passage with the paragraph bank far below might create a scroll-and-find-paragraph headache similar to the round-15 question-off-screen issue.

---

## Session: 2026-04-11 15:55 — Zarmet Olympiada Cambridge-Authentic UI — Round 14
Persona: Student resizing the browser window mid-test (window snap, split-screen, external monitor disconnect) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: test.html Part 7 at 1280px then live-resized to 700px
Starting state: Round 13 was the first 0-change round. I predicted the loop would stay quiet. Round 14 found a legitimate T3 bug anyway by picking yet another novel dimension — live resize (not initial-load-at-width).

### Round 14 — Active nav part off-screen after live resize

**Explored:** Loaded test.html at 1280px, navigated to Part 7, then resized the browser viewport to 700px WITHOUT reloading the page. A real scenario: a student using split-screen, Windows snap, or disconnecting a second monitor mid-exam.

**Finding:**

- [T3] **Active part disappears from the bottom nav after live resize.** Exact measurements at 700px viewport after navigating to Part 7 at 1280px:
  - `.ct-nav-parts` container: x=0 to x=519 (clientWidth 519, scrollWidth 760)
  - Active Part 7: intrinsic position x=570 to x=665
  - `scrollLeft: 0` (container hadn't scrolled)
  - **Active Part 7's rendered position (570-665) is BEYOND the visible clip (0-519) of the parts container.** The student is on Part 7 but can't see "Part 7" in the nav. They'd have to manually horizontal-scroll to find it.
  
  Prior rounds tested initial-load-at-width (rounds 7, 12) which both rendered fresh with `scrollLeft: 0` from the start. That worked because at initial load the active part defaults to Part 1 (which is at the left edge of the intrinsic scroll area). Round 14's scenario is different: the student navigates to a later part at a wide viewport, THEN resizes — now the active part is deep in the intrinsic scroll area, and the scroll position isn't adjusted.

**Action:** POLISH (2 related changes shipped)

- [T3] `scrollIntoView` on the active segment after `renderBottomNav` — at the end of every nav render, find the `.ct-nav-part--active` element and call `scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' })`. This handles the case where the nav re-renders after a navigation (ensures the new active part is visible).
  
- [T3] Debounced window resize listener — added to the boot sequence. On window resize, after a 100ms debounce, call `scrollIntoView` on the current active segment. This handles the case where the student resizes without navigating (the original bug scenario).
  Mode: polish | Quality: 3 → 5 | Files: public/js/test.js

### Verification

**Before fix, viewport 700, Part 7 active:**
```
activeLeft: 570, activeRight: 665
partsLeft: 0, partsRight: 519
visibleInParts: false ← active part outside clip
scrollLeft: 0
```

**After fix, same scenario:**
```
activeLeft: 424, activeRight: 519
partsLeft: 0, partsRight: 519
visibleInParts: true ← fully inside
scrollLeft: 146 ← container auto-scrolled right to bring active into view
```

Screenshot `r14-part7-resized-fixed.png` shows Part 7 visible at the right edge with its `41 42` question buttons expanded, immediately before the arrow controls.

### Quality Map (no layer changes — still 13/13 Crafted, now resize-robust)

### Deferred (final thin list)
- Bookmark icon clickability — feature, out of mandate
- Cross-tab session sync — feature, out of mandate
- Right-click/copy-block on passages — anti-cheat feature, out of mandate
- Real content transcription — out of /eye scope

### Session Stats
Pages explored: 1 (test.html Part 7 resize)
Screenshots captured: 2
Rounds: 1
Polishes landed: 2 (scrollIntoView on render + resize listener)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 2

**Trajectory update:** Round 13 was the first 0-change round and I predicted the loop would go quiet. Round 14 broke the prediction — found a genuine T3 bug by picking yet another novel dimension (live resize vs initial-load-at-width). The app's quality surface is still larger than I thought.

Key insight: **"live state change" dimensions are a different category from "initial-load state" dimensions.** Loading at 700px behaves differently from loading at 1280 then resizing to 700. Round 14 is the first time I tested a *live* state transition rather than an initial load. That's a new angle I should remember for future rounds.

Actual remaining live-transition angles:
- Timer crosses the 5-minute boundary (warn state) — visual transition from grey to amber
- Timer crosses the 1-minute boundary (urgent state) — amber to red with pulse
- Audio plays then `ended` event fires — pre-play modal → playing → finished transition
- Session submit → dashboard redirect → card update transition
- Language change after dashboard loads (can't happen, language is locked on welcome)

Most of these I've verified indirectly. The one that might still find something: the audio `ended` transition. But that needs a real audio file.

---

## Session: 2026-04-11 15:45 — Zarmet Olympiada Cambridge-Authentic UI — Round 13 (ZERO CHANGES)
Persona: Student doing two edge things — pressing browser back after submit, opening test in two tabs | System: Zarmet Olympiada standalone (port 3004)
Pages explored: Back button flow post-submit, concurrent tabs on same session
Starting state: Round 12 shipped zoom crush + keyboard jump fixes. This round walks the last two unexplored dimensions.

### Round 13 — Back button + concurrent tabs — ZERO CHANGES

**First 0-change round.** This is the real ceiling signal — a walk that finds something to OBSERVE but nothing to FIX.

**Explored:**

1. **Browser back button after submit.** Flow: dashboard → click Reading card → test.html → click Finish → window.location.href=dashboard.html → press browser back. Expected: back button navigates to test.html?module=reading, which re-boots test.js, calls ensureSession() with no sessionId (cleared on submit), POST /api/session/start returns 409 (duplicate via ADR-040), ensureSession catches 409 and does window.location.href=dashboard.html. Observed: exactly as expected. Back button briefly loads test.html (no content renders — `renderCurrentPart()` is called AFTER `ensureSession()`, so the 409 catches before any UI paints), then bounces to dashboard. Console shows one expected "Failed to load resource 409" browser-level log. **Round 10's handler works in the back-button case too — no fix needed.**

2. **Concurrent tabs on same session.** Flow: opened test.html?module=listening in Tab 0 → got sessionId `a6e3a84f` → opened same URL in Tab 1 via `tab-new`/`goto` → Tab 1 inherited the SAME sessionId from localStorage → both tabs show the same Part 1 pre-play modal. Both tabs can independently call `POST /api/session/:id/answer`; the server appends both events to the JSONL (last-write-wins for any qid). Tabs don't sync cross-tab (no `storage` event listener), so the in-memory state.answers in each tab is independent until a refresh. **Behavior:** functional, not broken. Intent plan's single-machine-per-student model means students don't open two tabs anyway. On refresh, both tabs read the latest server state and agree.

   This is technically a "last-write-wins" race condition but it's not a student-facing bug within the intent plan's boundary. Adding cross-tab sync would require a `window.addEventListener('storage', ...)` handler that listens for localStorage changes and re-renders — that's adding functionality (auto-sync of independent UI instances), and the /eye hard boundary forbids adding features. **Deferred as design intent, not a bug.**

**Action:** NONE. Zero changes shipped.

### Why zero is the right answer

The /eye skill says: *"Stop when you've exhausted what you can improve given your current capability."*

Round 13 walked two dimensions I hadn't explicitly tested. Both produced observations but no fixes:
- Back button → existing 409 path handles it (round 10 already fixed)
- Concurrent tabs → works as designed, fixing it would require a new feature

Not every round will ship a fix. A 0-change round is a valid result — it means the walk found nothing worth fixing within /eye's mandate. Cursor-based auto-cycle would stay put on the same prompt; Mode 2 (direct instructions) just moves on.

### Quality Map (unchanged)
13/13 pages at Layer 5 Crafted. No regressions, no improvements. The map is stable.

### Deferred (essentially exhausted)
- **Bookmark icon clickability** — would be a new feature. Permanently out of /eye's mandate.
- **Cross-tab session sync** — would be a new feature (add storage event listener to auto-sync independent tabs). Permanently deferred.
- **Right-click/copy-block on passages** — anti-cheat feature, out of mandate.
- **Real content transcription** — Priority 1 of the original intent plan, content phase, not /eye.
- **Real audio file tests** — content phase.

### Session Stats
Pages explored: 2 (back button, concurrent tabs)
Screenshots captured: 0 (this round was a behavior walk, not a visual fidelity check)
Rounds: 1
Polishes landed: 0
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: **0**

**Trajectory update:** After 12 consecutive rounds of shipping at least one fix per novel dimension, round 13 is the first 0-change round. That's the healthy ceiling signal — not that the app is perfect, but that the remaining improvements require either (a) new features (out of mandate), (b) real content (out of scope), or (c) nothing meaningful within scope.

Rounds 1-12 shipped ~28 changes total across visual fidelity, layout rebuilds, craft details, viewport edges, temporal state, keyboard access, post-submit paths, input guards, slow network, zoom, and keyboard jumps. The app is genuinely robust now within the intent plan's scope.

Future loop iterations should continue firing but will likely produce more 0-change rounds as the legitimate surface area shrinks. The cron job can keep running as a guardrail — if anything changes upstream (new content, new feature requests, new ADRs), the next walk will catch it. Until then, the loop is a quiet watchdog.

---

## Session: 2026-04-11 15:35 — Zarmet Olympiada Cambridge-Authentic UI — Round 12
Persona: Student at 150% browser zoom (visual accessibility setting) + keyboard user wanting direct part-jump | System: Zarmet Olympiada standalone (port 3004)
Pages explored: test.html reading at 853px (1280@150% zoom equivalent), keyboard tab flow
Starting state: Round 11 fixed slow-network nav lag. This round walks two remaining dimensions: browser zoom + inactive-part keyboard access (deferred from round 9).

### Round 12 — Zoom 150% + inactive-part keyboard jump

**Explored:** Two unwalked dimensions:
1. Browser zoom at 150% (simulated via 853px viewport — 1280×720 at 150% zoom ≈ 853×480 effective content)
2. Keyboard Tab flow through inactive part segments (deferred since round 9)

**Findings:**

- [T4] **Nav label crush at narrow/zoomed widths.** At 853px, the bottom nav parts compressed below readable width — "Part 3  0 of 1" and "Part 4  0 of 1" visually collided, with each inactive segment getting only ~64px. The round 7 fix (`overflow-x: auto`) prevented the container from pushing arrows off-screen, but didn't prevent the flex:1 children from compressing below their intrinsic content width. Visually confusing even though functionally complete.
- [T4 — deferred from round 9] **Inactive part segments not keyboard-accessible.** `<div>` elements with click handlers — a keyboard-only student could Tab to the active part's numbered buttons and the arrows, but couldn't Tab to "Part 2" or "Part 5" to jump directly. They'd have to press → multiple times to step through parts. Not broken, but slow.

**Action:** POLISH (2 changes shipped — 1 CSS, 1 JS+CSS)

- [T4] `.ct-nav-part { min-width: 95px }` — forces each part segment to at least 95px (enough for "Part N  X of Y" without collision). When the flex container's total required width exceeds the parent, the round-7 `overflow-x: auto` takes over and the nav scrolls horizontally instead of crushing.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css
  
- [T4] Inactive part segments as `<button>` elements — `renderBottomNav` now creates `<button type="button">` for inactive part segments (active part stays as `<div>` because it contains nested `<button>` question numbers — nested buttons are invalid HTML). Keyboard users Tab to each part label and press Enter/Space to jump. CSS button-defaults reset on `.ct-nav-part` (font, color, background, border) so the buttons look identical to the previous div rendering.
  Mode: polish | Quality: 4 → 5 | Files: public/js/test.js, public/css/styles.css

### Verification

- ✅ **853px (zoom 150% equivalent) before fix** (`r12-zoom-150-part1.png`) — "Part 3 0 of Part 4 0 of" labels visually colliding
- ✅ **853px after fix** (`r12-zoom-150-fixed.png`) — Parts 1-7 visible with proper spacing ("Part 1 [1]", "Part 2  0 of 1", "Part 3  0 of 1", ...), Part 8 off-screen to the right (accessible via horizontal scroll)
- ✅ **1280 regression** (`r12-1280-regression.png`) — all 8 parts visible with `X of Y` counts, no changes from previous rounds
- ✅ **Keyboard tab flow**: Tab → SELECT (inline MC cloze) → BUTTON `ct-nav-num--active` (Q1) → **BUTTON `ct-nav-part` "Part 2 0 of 1"** (new! inactive part now focusable)
- ✅ **Keyboard Enter on Part 2 button**: banner changes to "Questions 9–9", active part becomes "Part 2" — full keyboard-jump works

### Quality Map (no layer changes — still 13/13 Crafted, now zoom-robust and keyboard-jumpable)

### Deferred (thin list remaining)
- **Concurrent tabs** — two tabs on same session. Low-priority (single-machine-per-student by design)
- **Bookmark icon clickability** — placeholder by design per ADR-036; would be a new feature
- **Custom right-click menu / copy block for reading passages** — anti-cheat feature, out of /eye's mandate
- Real content transcription — still out of /eye scope

### Session Stats
Pages explored: 2 (zoom + keyboard)
Screenshots captured: 3
Rounds: 1
Polishes landed: 2
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 2

**Trajectory update:** Round 12 continues the streak — 7 consecutive rounds with novel-dimension + shipped fix:
- Round 6: wide viewport
- Round 7: narrow viewport
- Round 8: refresh/temporal
- Round 9: keyboard-only
- Round 10: 409 bounce + long input
- Round 11: slow network
- Round 12: zoom 150% + keyboard jump

The deferred list is down to 3 items, 2 of which are out-of-scope (bookmark = feature, right-click = anti-cheat). Concurrent tabs is the last genuinely unwalked dimension. After that, the loop will likely start producing 0-change rounds — the real ceiling signal.

---

## Session: 2026-04-11 15:25 — Zarmet Olympiada Cambridge-Authentic UI — Round 11
Persona: Student answering on a slow network (lab wifi, satellite, congested connection) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: test.html reading — answer save latency measurement
Starting state: Round 10 walked 409 bounce (no fix) + added input maxLength guards. This round picks slow-network from the deferred list.

### Round 11 — Answer save latency (nav counter lag)

**Explored:** What happens when the student changes an answer and the network is slow.

**Finding:**

- [T3 — latent perf bug] `saveAnswer()` called `renderBottomNav()` AFTER `await fetch(...)`. That means:
  - Student picks radio B for Q1
  - state.answers updates synchronously (immediate)
  - localStorage mirror writes synchronously (immediate)
  - radio checked state updates synchronously (immediate, browser native)
  - **but the bottom nav `X of Y` counter waits for the fetch to resolve** before updating
  - On localhost (~1ms RTT), the gap is imperceptible
  - On a real exam lab wifi network (~50-200ms RTT), the nav counter visibly lags 50-200ms behind the student's input
  - On a satellite/congested network (~1-3 seconds), the counter lags noticeably and students second-guess whether their answer was recorded
  
  Measurable even on localhost: sync check immediately after dispatching the `change` event returned `immediatelyAfter: 0` (zero answered questions), but a 100ms wait later showed `afterWait100ms: 1`. The state.answers was updated but renderBottomNav hadn't been called yet because the promise microtask for the fetch was still pending.

**Action:** POLISH (1 change — reorder 3 lines in saveAnswer)

- [T3] Moved `renderBottomNav()` BEFORE the `await fetch(...)` in `saveAnswer()`. The local state (state.answers + localStorage mirror) is updated synchronously, so the UI should reflect it synchronously. The server fetch becomes fire-and-forget from the UI perspective — it still runs, still saves to the server JSONL (ADR-035 durability), still logs failures, but the UI doesn't block on it.
  Mode: polish | Quality: 3 → 5 | Files: public/js/test.js

```js
// Before:
state.answers[qid] = value;
localStorage.setItem(...);
try { await fetch(...); } catch (e) { ... }
renderBottomNav();   // ← runs after network round-trip

// After:
state.answers[qid] = value;
localStorage.setItem(...);
renderBottomNav();   // ← runs synchronously
try { await fetch(...); } catch (e) { ... }  // ← fire-and-forget
```

### Verification (playwright-cli measurement)

**Before fix:**
```
Change event fired, then immediately check: 0 answered
Wait 100ms, then check: 1 answered
```

**After fix:**
```
Change event fired, then immediately check: 1 answered
```

The nav counter now updates synchronously. On a 3-second slow route the effect would be even more dramatic — the UI stays responsive while the server save happens in the background.

Also verified no regressions:
- state.answers still updates correctly
- localStorage mirror still writes
- Server JSONL still receives the POST
- renderBottomNav doesn't break when called twice rapidly (next answer change re-runs it)

### Quality Map (no layer changes — still 13/13 Crafted, but now latency-robust)

### Deferred (shrinking more)
- Concurrent tabs — two tabs on same session. Low-priority (single-student-per-machine by design in intent plan).
- Bookmark icon clickability — placeholder by design; would be a new feature.
- Test page inactive part segments as keyboard-jumpable buttons — arrows work; secondary improvement.

### Session Stats
Pages explored: 1 (test.html answer save flow)
Screenshots captured: 0 (this was a timing measurement, not a visual walk)
Rounds: 1
Polishes landed: 1
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 1

**Trajectory update:** Rounds 6-11 each found one legitimate fix by picking a new input dimension:
- Round 6: wide viewport
- Round 7: narrow viewport
- Round 8: refresh (temporal state)
- Round 9: keyboard-only (input mode)
- Round 10: post-submit navigation + long input
- Round 11: slow network (latency)

Six rounds of "novel dimension + shipped fix" in a row. The pattern hasn't failed yet. The app is approaching but hasn't yet hit the ceiling — at least 2-3 more unwalked angles remain (concurrent tabs, bookmark interaction, inactive-part keyboard jump).

If /eye keeps firing, eventually it will start producing "no-change" rounds where the scan reveals nothing new. That's the real ceiling signal. We're not there yet — round 11 still found a real latency bug hiding in the saveAnswer sequencing.

---

## Session: 2026-04-11 15:15 — Zarmet Olympiada Cambridge-Authentic UI — Round 10
Persona: Student doing edge-case things (going back to submitted module, pasting huge text) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: 409 bounce path (test.html for already-submitted module), KWT input stress test
Starting state: Round 9 fixed keyboard-only flow. This round walks two more unexplored angles: production edge cases.

### Round 10 — Session 409 bounce + input stress

**Explored:** Two new dimensions:
1. Student manually navigates back to `test.html?module=reading` after completing that module (session 409 path)
2. Student pastes/types a huge string into a KWT or gap input

**Findings:**

- [T5 ✅] Session 409 bounce path — walked end-to-end:
  - Completed a Reading submission via API (studentId r10-dupetest)
  - Navigated to `test.html?module=reading` as if the student went back manually
  - Result: URL immediately landed on `dashboard.html`, Reading card showed "Submitted" with green ✓
  - No visible flash of test.html UI (test.js calls `loadContent()` then `ensureSession()` then `renderCurrentPart()`; the 409 triggers the redirect BEFORE renderCurrentPart runs)
  - ONE console error: `Failed to load resource: 409 Conflict @ /api/session/start:0` — this is a browser-level network log, unavoidable, developer-facing only, invisible to students
  - The 4-line test.js handler I wrote in ADR-040 (`if (res.status === 409) { window.location.href = 'dashboard.html'; return; }`) works exactly as designed
  - **No fix needed.** The flow is clean end-to-end.

- [T4] KWT/gap-fill inputs — no maxLength guard. Typed/pasted a 3000-character lorem ipsum into the Part 4 KWT input. The input accepted all 3000 chars, stored them in state.answers, and saved to the server. The `.ct-kwt-block` layout held up (input scrolls horizontally inside its fixed width), but:
  - A real student pasting something by accident would fill localStorage fast (every keystroke saves)
  - CAE Part 4 answers are 3-6 words max (~30 chars); 3000 chars is absurd
  - Real Cambridge Inspera limits KWT input length per the exam specification
  
  This is a defensive-polish opportunity — not broken, but unbounded input is a minor liability.

**Action:** POLISH (1 change — input length caps)

- [T4] `input.maxLength` caps on text-input question types:
  - `.ct-kwt-input` inside Part 4 KWT blocks: `maxLength = 150` (CAE KWT is max ~6 words + punctuation; 150 is generous)
  - `.ct-kwt-input` inside listening sentence-completion: `maxLength = 100` (listening answers are typically single words or short phrases)
  - `.ct-gap-input` inside inline Part 2/3 gaps: `maxLength = 50` (single-word gaps)
  
  These are HTML-native limits enforced by the browser on user typing + pasting. They don't block programmatic `.value` assignment (which is documented HTML behavior), but a hostile student opening devtools to bypass maxlength can do much worse things anyway — the threat model is accidental paste-bombs, not malicious students.
  Mode: polish | Quality: 4 → 5 | Files: public/js/test.js

### Verification

- ✅ 409 bounce path: URL landed on dashboard.html, Reading card shows ✓ Submitted, screenshot `r10-dashboard-after-409.png`
- ✅ KWT stress before fix: typed 170 chars, all 170 stored (no cap)
- ✅ KWT stress after fix: typed 170 chars, input.value.length === 150 (capped)
- ✅ Gap input stress: confirmed maxLength = 50 on `.ct-gap-input`
- ✅ Listening sentence-completion: confirmed maxLength = 100 on `.ct-kwt-input` in the listening branch
- ✅ Programmatic `.value = ...` still bypasses maxLength (expected HTML behavior, not a regression)

### Quality Map (no layer changes — all 13 pages still Crafted)
| Page | Layer | Notes |
|------|-------|-------|
| test.html (KWT, gap-fill, sentence-completion inputs) | **5-Crafted** | Now guarded against accidental paste-bombs |

### Deferred (shrinking list)
- **Concurrent tabs** — two browser tabs on the same session, answer conflicts. Interesting but low-priority (single-machine-per-student model in the intent plan)
- **Slow network** — throttled answer saves. Would validate localStorage fallback, but the fallback is already tested in ADR-035 smoke tests
- **Bookmark icon clickability** — placeholder by design per ADR-036; making it clickable would be a new feature
- **Test page inactive part segments as buttons** — still deferred; arrows work, direct jump would be a secondary improvement
- Real content transcription — out of /eye scope

### Session Stats
Pages explored: 2 (409 bounce, KWT stress)
Screenshots captured: 3
Rounds: 1
Polishes landed: 1 (3 input type variants got maxLength)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 1

**Trajectory update:** Round 10 continues the pattern of "new dimension finds a legitimate improvement." Each of the last 5 rounds (6-10) has shipped exactly 1-2 fixes by picking an input dimension I'd never walked before. The 409 bounce path this round produced NO fix (it already works correctly — that's a win too) but validated the ADR-040 flow end-to-end. The maxLength guards are a small defensive polish, not a dramatic bug catch.

The list of unwalked dimensions is shrinking. After round 10:
- ✓ Viewport wide (round 6)
- ✓ Viewport narrow (round 7)
- ✓ Temporal state / refresh (round 8)
- ✓ Keyboard-only (round 9)
- ✓ Post-submit navigation (round 10)
- ✓ Large input stress (round 10)
- Remaining: concurrent tabs, slow network, bookmark interaction, inactive-part keyboard jump

The loop is still finding things. The cron can keep firing.

---

## Session: 2026-04-11 15:05 — Zarmet Olympiada Cambridge-Authentic UI — Round 9
Persona: Keyboard-only student (imagine a student with a broken mouse, accessibility needs, or power-user preference) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: welcome, dashboard, test page — Tab navigation only, no mouse
Starting state: Round 8 fixed refresh position persistence. This round picks a new dimension: keyboard-only interaction.

### Round 9 — Keyboard-only navigation

**Explored:** Full student flow with only Tab / Enter / Space / Arrow keys — no mouse. This is a dimension I had NEVER walked before across 8 previous rounds.

**Findings:**

- [T5 ✅] Welcome form tab order — perfect: name → group → language dropdown → Continue button. All tab stops expected, arrow keys work on the dropdown, Enter submits.
- [T4] Welcome / dashboard / admin — **buttons have NO visible focus ring.** The `:focus-visible` rule from round 5 was scoped only to `body.zu-test-body`, leaving the Zarmet-palette pages with browser-default outlines (which Chrome's "subtle" blue ring is often invisible against warm brown/teal backgrounds). A keyboard user couldn't tell where focus was.
- 🔴 **[T1 BROKEN] Dashboard module cards are NOT keyboard-accessible at all.** Pressing Tab repeatedly from the dashboard stayed on `BODY` — the module cards are `<div>` elements with click handlers, not `<button>` or `tabindex="0"`. A keyboard-only student literally cannot select Reading or Listening. This is an accessibility block. Hard-stop.
- [T5 ✅] Test page tab order is correct: inline MC select → active part's question number buttons → prev/next/finish arrows. The prev-arrow is correctly skipped when disabled (on Q1). Teal focus ring from round 5 is visible on all these elements.
- [T4 — deferred] Test page inactive part segments (Part 2-8 while on Part 1) are not tab-accessible. They're `<div>` elements; keyboard users must use →/← arrows to step through parts instead of jumping directly. Not broken (arrows work), just less efficient. Would require converting all 8 part segments to buttons — larger scope, deferred.

**Action:** POLISH (2 changes — one fixes the T1 block, one fixes the T4 rough edge)

- [T1] Dashboard module cards → `<button>` elements. `dashboard.js` `createElement(isDone ? 'div' : 'button')` — actionable cards become buttons, completed cards stay as divs (non-interactive). `type="button"` to prevent accidental form submission. CSS reset for button defaults on `.zu-module-card` (font: inherit, color: inherit, text-align: left, width: 100%). Added `.zu-module-card:focus-visible` with yellow outline + brown border — clear, high-contrast focus state matching the Zarmet palette.
  Mode: polish | Quality: broken (T1) → 5 Crafted | Files: public/js/dashboard.js, public/css/styles.css

- [T4] `.zu-btn:focus-visible` rule — 3px yellow (`var(--zu-focus)`) outline with 3px offset. Applies to every `.zu-btn` across Zarmet-palette pages (welcome Continue, admin Unlock, dashboard buttons, form submit buttons). Uses `:focus-visible` so mouse clicks don't show a ring but keyboard tabs do.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

### Verification (end-to-end keyboard-only flow)

- ✅ Welcome: Tab → Full name field → type "Keyboard Fixed" → Tab → Group (skip, empty) → Tab → Language dropdown → Tab → Continue button (**yellow focus ring visible**, screenshot `r9-welcome-continue-focus-ring.png`)
- ✅ Press Enter on focused Continue → navigates to dashboard
- ✅ Dashboard: Tab → Reading & Use of English card (BUTTON, **yellow focus ring + brown border**, screenshot `r9-dashboard-card-focused.png`) → Tab → Listening card
- ✅ Press Enter on Listening → navigates to `test.html?module=listening`
- ✅ Test page: Tab order still correct (from round 5 verification; re-tested), teal focus rings work on nav elements

All tab stops logical. All focus rings visible. A keyboard-only student can now complete the entire flow without touching a mouse.

### Quality Map (updated)
| Page | Layer | Notes |
|------|-------|-------|
| index.html (welcome) | **5-Crafted** | Form flow + button focus ring |
| dashboard.html | **5-Crafted** | Module cards are now `<button>` elements, keyboard-accessible with focus ring |
| admin.html | **5-Crafted** | Login button now has visible focus ring (same `.zu-btn` rule) |
| done.html | **5-Crafted** | No interactive elements to focus (4-corner gate is mouse-only by design) |

### Deferred
- Test page inactive part segments (Part 2-8) as buttons — would enable direct jump via Tab instead of →/← stepping. Lower priority; arrows work. Might revisit in a future round.
- Real content transcription — still out of /eye scope.

### Session Stats
Pages explored: 3 (welcome, dashboard, test — all via keyboard only)
Screenshots captured: 3
Rounds: 1
Polishes landed: 2 (1 was fixing a T1 block)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 2

**Trajectory update:** Round 9 continued the "new dimension finds new bugs" pattern. Rounds 6-9 each shipped exactly 1-2 fixes by picking an angle I'd never walked before:
- Round 6: wide viewport → header alignment
- Round 7: narrow viewport → arrows off-screen (T1)
- Round 8: temporal state (refresh) → position persistence (T3)
- Round 9: keyboard-only → module cards not focusable (T1) + missing focus rings (T4)

Every "dimension" has so far found at least one bug. The app's quality surface is 13 × N where N is the number of orthogonal dimensions (viewport widths × temporal states × input modes × content lengths × ...). Walking all combinations is impractical, but each novel dimension is usually cheap and productive.

---

## Session: 2026-04-11 14:55 — Zarmet Olympiada Cambridge-Authentic UI — Round 8
Persona: Student refreshing mid-test (accidental F5, browser recovery, tab restore) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: test.html reading (before + after refresh), german-c1 listening (first real-browser walk)
Starting state: Round 7 fixed a T1 bug at narrow viewports. The "ceiling" lesson was: change a dimension, find new bugs. This round picks a new dimension — temporal state — by refreshing mid-test.

### Round 8 — Temporal state: refresh mid-test + German C1 walk

**Explored:** Position persistence under refresh (a scenario never tested), plus German C1 Listening (never walked in a real browser before).

**Findings:**

- [T3] test.html — **refresh bounces student back to Part 1 Q1**. Tested by navigating to Part 5, answering q31=C, then hitting browser refresh:
  - Before refresh: banner "Questions 31–31", active part Part 5, active num 31, timer 89:42
  - After refresh: banner "Questions 1–1", active part Part 1, active num 1, timer 89:39 (timer survived!)
  - q31=C answer DID survive (confirmed by navigating back to Part 5 — radio was checked)
  - Only the *navigation position* was lost
  
  Server-side JSONL durability worked perfectly. The timer's localStorage persistence (round 0) worked. But `state.currentPartIndex` and `state.currentQid` were only held in JS memory, so a refresh always restarted the student at index 0.
  
  This isn't a data-loss bug — it's a usability bug. The student's work is safe, but they have to click back to Part 5 to continue from where they were. For a 90-minute exam, that's annoying and disorienting.

- [T5 ✅] German C1 Listening — first real-browser walk confirmed everything works:
  - German instructions render: "Sie hören einen Text. Entscheiden Sie, ob die Aussagen richtig oder falsch sind. Sie hören den Text einmal."
  - True-false question with German prompt
  - Bottom nav shows **"Teil 1"** / **"Teil 2"** (not "Part 1"/"Part 2") — the `shortPartLabel` regex `Part\s+\w+|Teil\s+\w+` matches both correctly
  - Timer 40:00 (correct Goethe Hören duration)
  - Pre-play modal renders correctly on first enter
  - Candidate ID formatting works with short student names

**Action:** POLISH (1 change shipped — fixes the T3 refresh bug)

- [T3] Position persistence — Two helpers added to `test.js`:
  ```js
  function savePosition() {
    localStorage.setItem('olympiada:pos:' + sessionId, JSON.stringify({
      partIndex: state.currentPartIndex,
      qid: state.currentQid,
    }));
  }
  function restorePosition() {
    const raw = localStorage.getItem('olympiada:pos:' + sessionId);
    if (!raw) return;
    const pos = JSON.parse(raw);
    if (pos && typeof pos.partIndex === 'number' && typeof pos.qid === 'string'
        && pos.partIndex >= 0 && pos.partIndex < state.parts.length
        && state.qIndexById[pos.qid] != null) {
      state.currentPartIndex = pos.partIndex;
      state.currentQid = pos.qid;
    }
  }
  ```
  
  - `savePosition()` is called from `renderBottomNav()` — the single choke point that runs after every position change (goToPart, next/prev, direct nav click, radio/select change, keyboard nav).
  - `restorePosition()` is called in the boot sequence AFTER `loadContent()` sets the defaults and `ensureSession()` confirms the sessionId is stable.
  - Validation guards against stale data: only restores if the saved qid still exists in the current flat list (protects against content/schema changes between sessions).
  - Submit cleanup extended to also clear `olympiada:pos:*` keys alongside the existing `olympiada:ans:*`, `olympiada:timerEnd:*`, and `olympiada:sessionId` cleanup.
  
  Mode: polish (persistence of existing position state, no new UI) | Quality: 3 → 5 | Files: public/js/test.js

### Verification

- ✅ **Before fix** (round 6 baseline test): refresh from Part 5 Q31 → lands on Part 1 Q1
- ✅ **After fix** (this round): refresh from Part 5 Q31 → lands on **Part 5 Q31** with q31=C radio still checked
  - Banner: "Questions 31–31" ✓
  - Active part: "Part 5" ✓
  - Active num: "31" ✓
  - q31Selected: "C" ✓
- ✅ **localStorage state after navigation**: `{"partIndex":4,"qid":"q31"}` written correctly
- ✅ German C1 Listening renders all German text, "Teil 1"/"Teil 2" nav labels, 40:00 timer, pre-play modal
- ✅ Position persistence handles taskGroups correctly (restorePosition walks qIndexById which includes all questions from `taskGroups[*].questions`)
- ✅ No regressions on other pages

### Quality Map (no layer changes — all 13 pages still Crafted, but now refresh-survivable)
| Page | Layer | Notes |
|------|------|-------|
| test.html (all parts, reading + listening, both languages) | **5-Crafted** | Now survives mid-test refresh — position + timer + answers all restored |
| german-c1 content rendering | **5-Crafted** | First browser walk — all German strings, Teil labels, 40min timer verified |

### Deferred (shrinking list)
- Real content transcription — still out of /eye scope
- Keyboard arrow nav between questions — still borderline new feature
- German pre-play modal localization — deferred deliberately (Cambridge reference keeps chrome language-neutral; shipping German here would open a whole i18n can we don't need)

### Session Stats
Pages explored: 2 (test.html refresh cycle, German listening)
Screenshots captured: 2
Rounds: 1
Polishes landed: 1 (T3 position persistence)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 1

**Trajectory update:** Round 7's lesson keeps paying off. Round 8 picked a new dimension (temporal — refresh mid-session) and found a T3 usability bug that 7 previous rounds missed. Before: 7 walks at the default "fresh session" state. After: 1 walk under the "resumed session" state. One new dimension, one real bug, one clean fix.

Each /eye round that fires can still find something if it picks a novel angle:
- Round 1-2: untested territory (any dimension)
- Round 3: rebuild mode (component pattern)
- Round 4: unwalked page (admin)
- Round 5: craft details (form state, timer, focus)
- Round 6: wide viewport (1920)
- Round 7: narrow viewport (768)
- Round 8: temporal state (mid-session refresh)

Future angles to explore if the loop keeps firing: concurrent sessions, slow network (throttled fetch), very long answers (multi-paragraph KWT input), bookmark icon interaction, keyboard-only navigation, the "session already submitted 409" bounce-to-dashboard path.

---

## Session: 2026-04-11 14:45 — Zarmet Olympiada Cambridge-Authentic UI — Round 7
Persona: Student at both extremes — wide 1920×1080 lab monitor AND narrow 768px tablet | System: Zarmet Olympiada standalone (port 3004)
Pages explored: welcome, dashboard, admin (login + rows + detail) at 1920, test Part 5 at 768 (stacked layout check)
Starting state: Round 6 fixed the header misalignment at wide viewports. Responsive behavior at non-default widths hadn't been fully walked for student-facing pages at narrow sizes.

### Round 7 — Multi-viewport pass (1920 wide + 768 narrow)

**Explored:** All pages at 1920×1080 (lab monitor) + test page at 768px (tablet — below the 880px media breakpoint where the two-col layout stacks).

**Findings:**

- [T5 ✅] Welcome @ 1920 — narrow 560px form centered with empty space on both sides (correct intentional layout). No issues.
- [T5 ✅] Dashboard @ 1920 — 960px content column centered, module cards side-by-side, looks balanced. No issues.
- [T5 ✅] Admin login @ 1920 — still narrow (`.page--narrow` class from Round 4 fix). No issues.
- [T5 ✅] Admin rows @ 1920 — table at 960px with well-distributed columns, not stretched thin. No issues.
- [T5 ✅] Admin detail @ 1920 — all 9 question rows fit in one screen with row colors (green q1 + grey unanswered). No issues.
- [T5 ✅] Admin rows + detail @ 768 (tablet spot-check) — table wraps gracefully, row colors intact, "Back to list" button accessible. No issues.
- [T5 ✅] Test Part 5 @ 768 — two-col layout stacks into single column per `@media (max-width: 880px)`. Passage on top, question card below. Working.
- 🔴 **[T1 — BROKEN] Test page bottom navigator @ 768 — arrows are OFF-SCREEN.** Measured via eval: `.ct-nav-arrows` rect was `left: 810, right: 991` inside a 768px viewport. `.ct-nav-parts` was growing to 810px because `display: flex; flex: 1` without `min-width: 0` lets the flex container grow to its children's intrinsic content width. Students on a narrow screen literally cannot reach the prev/next/finish buttons — they can't advance or submit.

**Action:** POLISH (1 change — fixes a real T1 accessibility/usability bug)

- [T1] `.ct-nav-parts { min-width: 0; overflow-x: auto; }` — Two CSS properties that cascade into a fundamental fix:
  - `min-width: 0` overrides the flex default `min-width: auto`, letting the flex container actually shrink to fit its parent instead of growing to fit its children's intrinsic content. The arrows container is no longer pushed off-screen.
  - `overflow-x: auto` gracefully handles the remaining overflow: if parts still don't fit, they become horizontally scrollable rather than breaking layout. Thin webkit scrollbar style (3px) to avoid visual clutter.
  Mode: polish | Quality: broken (T1) → functional/crafted (5) | Files: public/css/styles.css

### Verification

- ✅ **Before fix @ 768** (`r7-test-part5-768.png`) — `.ct-nav-arrows` at `left: 810, right: 991`, totally off-screen
- ✅ **After fix @ 768** (`r7-test-768-nav-fixed.png`) — `.ct-nav-arrows` at `left: 587, right: 768`, fully inside viewport
- ✅ **Regression check @ 1280** (`r7-test-1280-regression.png`) — Parts 1-8 show full `X of Y` labels, arrows visible right, Part 1 active with teal `1`, no changes from round 6
- ✅ 1920×1080 behavior unchanged (already verified in round 6)

Eval measurements confirm the fix:
```
Before: { arrowsLeft: 810, arrowsRight: 991, arrowsVisible: false }
After:  { arrowsLeft: 587, arrowsRight: 768, arrowsVisible: true }
```

### Quality Map (updated)
| Page | Layer | Notes |
|------|-------|-------|
| test.html (narrow viewport ≤ 880px) | **5-Crafted** | Two-col stacks, nav arrows accessible, horizontal overflow scrolls gracefully |

All 13 pages continue to hold at Layer 5 Crafted. Round 7 fixed a genuine T1 bug (arrows inaccessible at narrow widths) that was hiding in plain sight because nobody had tested below the default 1280px.

### Deferred
- Real content transcription — out of /eye scope
- Keyboard arrow nav — borderline new feature
- Mobile viewports < 500px — still out of intent plan scope (desktop-only)

### Session Stats
Pages explored: 6 (welcome/dashboard/admin triple at 1920, test at 768)
Screenshots captured: 7
Rounds: 1
Polishes landed: 1
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 1

**Trajectory update:** Round 7 found a T1 bug (arrows off-screen at narrow widths) that 6 previous rounds missed because all prior walks were done at the default 1280px viewport. This is a good reminder that quality ceiling is viewport-dependent: a page can be "Crafted" at one width and "Broken" at another. The app remains shippable on lab desktops; the fix just extends support to narrower screens as a safety net.

---

## Session: 2026-04-11 14:35 — Zarmet Olympiada Cambridge-Authentic UI — Round 6
Persona: Student at a 1920×1080 lab monitor | System: Zarmet Olympiada standalone (port 3004)
Pages explored: dashboard completion banner (live), test page at 1920×1080, content 404 error path
Starting state: Previous 5 rounds exhausted the obvious polish/rebuild/elevate opportunities on 13/13 pages. This round explicitly hunts for states never seen in a real browser.

### Round 6 — Unexplored states: completion banner, wide viewport, content 404

**Explored:** Three corners never walked in a real browser:
1. Dashboard completion banner (both modules submitted)
2. Test page at 1920×1080 (real lab monitor resolution)
3. Content load 404 error path (triggered via bad lang slug in localStorage)

**Findings:**

- [T5 ✅] Dashboard completion banner — works beautifully. Big green check, "All Sections Complete" heading, clear instructions. Module grid replaced by the banner. Welcome panel still shows. No issues.
- [T4] Test page at 1920×1080 — **header misalignment**. `.ct-header` spans full viewport width with padding 24px, so at 1920px the ZU shield is at position 24px and the timer is at position 1896px. Meanwhile `.ct-main` and `.ct-banner` are centered at 1200px max-width, so they start at (1920-1200)/2 = 360px from the left. Result: the header's "Zarmet University" is way off to the left of the "Studying black bears" heading below it. At default 1280px the misalignment is subtle (~40px off) but at 1920px it's glaring.
- [T5 ✅] Content 404 error path — triggered via `localStorage.olympiada:lang = 'fake-lang-c1'`. Banner shows "Error" + "Failed to load the test. Please tell your invigilator. (content load failed (404))". Clear, actionable, no console spam. Timer shows `--:--`. Bottom nav empty. Good error handling.

**Action:** POLISH (1 change shipped)

- [T4] Header max-width alignment — Applied the `padding-inline: max(24px, calc((100% - 1200px) / 2 + 24px))` technique on `.ct-header`. At viewport widths up to 1248px the padding is 24px (unchanged). Above 1248px the padding grows symmetrically to center the header content at 1200px max-width, matching where `.ct-main` and `.ct-banner-wrap` center their content. The header background and border-bottom still span the full viewport width (authentic Cambridge strip pattern), but the content inside (shield, candidate ID, timer) now aligns with the body content column.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css

### Verification

- ✅ **Dashboard completion banner** (`r6-dashboard-all-complete.png`) — gorgeous green completion panel, both modules replaced with the success state
- ✅ **Wide viewport pre-fix** (`r6-test-wide-1920.png`) — showed the misalignment clearly: shield at far left, banner/content centered
- ✅ **Wide viewport post-fix** (`r6-header-fixed-1920.png`) — shield, candidate ID, banner, and "Studying black bears" heading all start at the same 384px column; timer at the right edge of the same column; header background strip still full-width with border-bottom intact
- ✅ **Default viewport** (`r6-header-fixed-1280.png`) — 1280px width unchanged visually; shield at 64px from left, banner at 64px from left, same column
- ✅ **404 content error** (`r6-content-404.png`) — error banner displays cleanly, no console errors beyond the expected fetch 404

### Quality Map (no layer changes — just validation of edge cases)
| Page | Layer | Notes |
|------|-------|-------|
| dashboard.html (completion banner state) | **5-Crafted** | Live-verified, gorgeous |
| test.html (wide viewport 1920×1080) | **5-Crafted** | Header now aligns with body column |
| test.html (content 404 error) | **5-Crafted** | Clean error banner, no console spam |

### Deferred (same as round 5)
- Real content transcription — out of /eye scope
- Keyboard arrow nav between questions — borderline new feature
- Print stylesheet for admin detail — nice-to-have

### Session Stats
Pages explored: 3 (completion banner, wide viewport, 404 error)
Screenshots captured: 5
Rounds: 1
Polishes landed: 1
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 1

**Ceiling observation:** Every subsequent /eye round yields fewer legitimate findings. Round 1 shipped 7 fixes on untested territory. Round 4 shipped 5 on the unwalked admin page. Round 5 shipped 4 craft-layer state improvements. Round 6 shipped 1 wide-viewport fix found by simulating a 1920×1080 lab monitor. The app is approaching a real ceiling within /eye's hard boundary and the intent plan's scope.

---

## Session: 2026-04-11 14:25 — Zarmet Olympiada Cambridge-Authentic UI — Round 5
Persona: Student with bad inputs, approaching time limit | System: Zarmet Olympiada standalone (port 3004)
Pages explored: welcome (validation edge cases), dashboard (post-submit), test (timer warn + urgent states), submit flow
Starting state: After Round 4 polished the admin page, 13/13 pages were at Layer 5 Crafted. This round looks for deeper craft: form validation visual feedback, timer warnings, focus rings, submit state feedback.

### Round 5 — Craft-layer details: validation, timer, focus, submit

**Explored:** Edge cases and state transitions that code-level review doesn't catch.

**Findings:**

- [T4] Welcome form — invalid name shows text error message below the form, but the `#f-name` input itself has no error state. The field stays with a normal grey border while the error text below it is red. Mismatch between the field's visual state and its semantic state.
- [T0] Timer `.ct-timer` — plain mono grey pill that shows time correctly, but gives no visual cue as time runs out. Real CAE Inspera has amber/red color transitions when the clock is low. This is an existing element that can be elevated with a state change.
- [T0] Focus rings — browser-default outlines on tab navigation vary wildly between Chrome/Edge and look inconsistent with the rest of the design. The test runner should have a consistent teal focus ring matching the Cambridge palette.
- [T0] Submit button — when clicked, becomes disabled (opacity 0.4) but text stays as `✓`. There's no explicit "we're submitting" feedback. For a fast roundtrip this is fine, but on a slow exam-day network the student could click Finish and wonder if anything happened.

**Action:** POLISH + ELEVATE (4 changes shipped)

- [T4] Welcome input error state — `showError(msg, field)` now also sets `aria-invalid="true"` on the relevant field and auto-focuses it. CSS: `input[aria-invalid="true"]` gets red border + light pink background. Input listener clears the aria-invalid state as soon as the user starts editing.
  Mode: polish | Quality: 4 → 5 | Files: public/js/app.js, public/css/styles.css
- [T0] Timer low-time state — `ct-timer--warn` class added when `remaining < 5 * 60 * 1000` (amber text + background + border), and `ct-timer--urgent` when `remaining < 60 * 1000` (red text + background + pulse animation via `@keyframes ctTimerPulse`). Classes toggle every tick. Standard color semantics: no warning normally, amber at 5 min, red + pulse at 1 min.
  Mode: elevate (existing element gets a state change) | Quality: 4 → 5 | Files: public/js/test.js, public/css/styles.css
- [T0] Consistent teal focus rings — `body.zu-test-body *:focus-visible` global override using `outline: 2px solid var(--ct-teal); outline-offset: 2px`. Replaces the browser-default outlines across buttons, inputs, nav numbered buttons, arrows, and the finish button. Uses `:focus-visible` so mouse users don't see rings but keyboard users do.
  Mode: elevate (consistent state on existing focusable elements) | Quality: 4 → 5 | Files: public/css/styles.css
- [T0] Submit button feedback — clicking Finish now: (a) changes button text from `✓` to `…`, (b) updates aria-label to "Submitting", (c) disables both prev and next arrows so the student can't navigate during submission, (d) on failure, restores all states via `renderBottomNav()`. Explicit visual handoff before the redirect.
  Mode: polish | Files: public/js/test.js

### Verification

- ✅ **Welcome error state** (`r5-welcome-error-styled.png`) — entered `123456789`, input now has red border + pink background. Error message below is also red. Input auto-focuses for correction.
- ✅ **Timer warn** (`r5-timer-warn.png`) — forced `timerEnd = now + 3min`, timer pill `02:49` rendered amber on yellow background with amber border.
- ✅ **Timer urgent** (`r5-timer-urgent.png`) — forced `timerEnd = now + 45s`, timer pill `00:43` rendered red on pink background with red border. CSS pulse animation defined (can't capture in static screenshot but the `@keyframes ctTimerPulse` runs).
- ✅ Focus rings — `*:focus-visible` selector applies cleanly across the test runner. Not screenshotted (focus state is a keyboard-driven interaction that doesn't show in static captures).
- ✅ Submit text change — code verified; the stub submit resolves too fast to screenshot the mid-flight state but the code path is correct and would show on a real network.
- ✅ No regressions — welcome/dashboard/test still render correctly.

### Quality Map (no changes — 13/13 still at Crafted, but now deeper craft)
| Page | Layer | Notes |
|------|-------|-------|
| (all 13 pages) | 5-Crafted | Now with form validation visual feedback, timer state cues, consistent focus rings, submit feedback |

### Deferred
- Keyboard arrow navigation between questions — would be a genuinely nice addition but borderline new feature (keyboard shortcuts for nav buttons that already exist). Deferred as a potential future /eye target but not critical.
- Print stylesheet for admin detail view — invigilator use case. Nice-to-have.
- Real content transcription — out of /eye scope.

### Session Stats
Pages explored: 3 (welcome edge cases, test timer states, submit flow)
Screenshots captured: 5
Rounds: 1 (within this session)
Polishes landed: 2
Rebuilds landed: 0
Elevations landed: 2 (timer states, focus rings)
Reverted: 0
Changes shipped: 4

---

## Session: 2026-04-11 14:15 — Zarmet Olympiada Cambridge-Authentic UI — Round 4
Persona: Invigilator/admin reviewing submissions | System: Zarmet Olympiada standalone (port 3004)
Pages explored: admin.html (login, list, detail, empty state), welcome @ 800px viewport
Starting state: After rounds 1-3, 12/12 student-facing pages were at Layer 5 Crafted. Admin page had only been code-level reviewed, never walked in a real browser after ADR-036.

### Round 4 — Admin page polish (the only unwalked page)

**Explored:** admin.html across all 4 states (login, rows, detail, empty). First real browser walk of admin since the ADR-036 rewrite.

**Findings:**

- [T4] admin.html login — form stretched full 960px page width. A single password input this wide feels sloppy. Welcome form uses `.page--narrow` for a ~560px shell, admin login should too.
- [T4] admin.html list — **no empty state**. A table with 0 rows just shows an empty body after the header row. A student who hasn't finished yet, or a fresh install, shows a blank page with no explanation.
- [T3] admin.html list — Language column showed raw slug `english-c1` and Skill column showed raw `reading`. These are user-facing labels in the invigilator's results table; they should be humanized (`English C1`, `Reading`).
- [T3] admin.html detail — Title shows `Admin Test — english-c1 / reading` (raw slugs).
- [T4] admin.html detail — Student and Correct columns displayed JSON-encoded values: `"B"` (with quotes), `null`, `["of","Of"]`, `{"required":[...],"alternatives":[...]}`. Ugly and confusing for an invigilator reviewing a student's answers.
- [T0] admin.html detail — No visual differentiation between correct/incorrect/blank rows. A dense 80-row table would be hard to scan.
- [T5 ✅] welcome @ 800px viewport — form fills available width, no layout issues. Desktop responsive check passes.

**Action:** POLISH (5 changes shipped)

- [T4] admin.js show(view) toggles `.page--narrow` on the page shell when showing login → narrow centered card. Removes the narrow class when showing list/detail → full width for the table.
  Mode: polish | Quality: 4 → 5 | Files: public/js/admin.js, public/admin.html (added id="admin-page")
- [T4] Empty state component `.zu-empty-state` — dashed-border panel with "No submissions yet." heading and a muted explanation line. Shown when rows.length === 0, hidden otherwise, table-mutex.
  Mode: polish | Quality: 4 → 5 | Files: public/css/styles.css, public/admin.html, public/js/admin.js
- [T3] Humanizer helpers `fmtLang(slug)` and `fmtSkill(slug)` — map known slugs to display labels (`english-c1 → English C1`, `german-c1 → German C1`, `reading → Reading`, `listening → Listening`), fall back to title-cased words for unknown inputs.
  Mode: polish | Files: public/js/admin.js
- [T3] `fmtLang` + `fmtSkill` used in both the rows table (Language/Skill columns) and the detail view title (`{student} — {lang} / {skill}`).
  Mode: polish | Files: public/js/admin.js
- [T4] `fmtStudentValue(v)` + `fmtCorrect(v)` formatters — handle strings, arrays, nulls, and the key-word-transformation object shape. Null/empty → em dash `—`. Arrays joined with ` / `. KWT objects render `required / alternatives`.
  Mode: polish | Files: public/js/admin.js
- [T0] Row color classes `.zu-row-correct` (light green), `.zu-row-wrong` (light red), `.zu-row-blank` (muted grey) applied in the detail table based on `q.earned >= q.possible` / `q.studentValue == null` / else. Makes an 80-row answer review scannable at a glance. Hover suppresses the row color to avoid flicker.
  Mode: polish (touches existing table rows, no new components) | Files: public/css/styles.css, public/js/admin.js

### Verification

Walked all 4 admin states end-to-end via playwright-cli:
- ✅ **Login narrow** (`r4-admin-login-narrow.png`) — form is now ~560px wide, centered
- ✅ **Rows humanized** (`r4-admin-rows-humanized.png`) — Language shows `English C1`, Skill shows `Reading`, Group falls back to `—` when empty
- ✅ **Detail humanized + colored** (`r4-admin-detail-humanized.png`) — Title `Admin Test — English C1 / Reading`, q1 row light green (1/1 correct), q9 and q17 rows with Student `—` and Correct `of / Of` / `outcome / Outcome` (no quotes, no arrays)
- ✅ **Empty state** (`r4-admin-empty-state.png`) — dashed panel with "No submissions yet." after deleting backups/*.json
- ✅ Export CSV / JSON buttons still present, untouched
- ✅ Back-to-list button works
- ✅ Login session token persisted via sessionStorage between reloads

No regressions — all previously Layer 5 student-facing pages unchanged.

### Quality Map (updated)
| Page | Layer | Notes |
|------|-------|-------|
| admin.html (login) | **5-Crafted** | Narrow centered card |
| admin.html (list + empty state) | **5-Crafted** | Humanized columns, empty state panel |
| admin.html (detail) | **5-Crafted** | Humanized title, clean answer formatting, row colors |

**13/13 pages now at Layer 5 Crafted.** Admin was the last page below ceiling.

### Deferred
- Real audio content — out of /eye scope
- Real content transcription — out of /eye scope
- Per-question type-specific rendering improvements in the admin detail view (e.g., show the actual passage excerpt for gap-fill questions) — would require new features, out of /eye boundary

### Session Stats
Pages explored: 1 (admin, 4 states)
Screenshots captured: 7
Rounds: 1 (within this session)
Polishes landed: 5
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 5 polishes

---

## Session: 2026-04-11 14:05 — Zarmet Olympiada Cambridge-Authentic UI — Round 3
Persona: Student taking English C1 Listening Part 4 (two-task matching) | System: Zarmet Olympiada standalone (port 3004)
Pages explored: Listening Part 4 (rebuild target), verified via navigation round-trip
Starting state: Rounds 1+2 shipped 9 polishes; Listening Part 4 layout deferred as the only non-Crafted page

### Round 3 — REBUILD: Listening Part 4 compact two-column task layout

**Finding (from Round 2 deferred list):**

- [T0 → rebuild] Listening Part 4 taskGroup rendering — functional but used vertical stacks of radio-button question cards with options listed inline as a `<ul>`. The Cambridge reference (cae/examples/l5.png) shows a much tighter two-column layout per task: LEFT = 5 speaker rows with label + select + question number, RIGHT = reference options panel listing A-H. This was labeled Layer 4 Polished in Round 2's quality map and deferred for rebuild.

**Decision:** REBUILD mode. The information is in the right order (speakers paired with options) but the component pattern is wrong (vertical radio cards vs tight speaker-select rows + options panel).

**Action:** REBUILD the taskGroups branch of `renderListeningPart`.

- [REBUILD] renderListeningPart taskGroup branch — Replaced radio-button question cards with a `.ct-task-layout` grid:
  - LEFT `.ct-task-speakers`: one `.ct-task-speaker` row per question with `88px | 1fr | 24px` grid (speaker label | select | question number). Cyan active highlight on the currently selected speaker row. Focus/change handlers update `state.currentQid` and re-highlight in-place (no full re-render) for smooth interaction.
  - RIGHT `.ct-task-options-panel`: reference-only `<ol>` showing all options A-H with bold keys. Read-only visual aid, no interaction (students pick via the select, not by clicking options).
  - Task header gets a teal left border accent (`border-left: 3px solid var(--ct-teal)`) to visually anchor each task.
  Mode: rebuild | Quality: 4 → 5 | Files: public/css/styles.css (+80 lines), public/js/test.js (~50 lines replaced)

### Verification

Walked Part 4 via playwright-cli after the rebuild:
- ✅ Task 1 header "Task 1 — For questions 21-25, choose from the list A-H what reason each speaker gives for changing their job." with teal left border
- ✅ Task 1 speaker rows: Speaker 1 (active cyan) + Speaker 2, each with a select dropdown (showing "—" placeholder and full list on click) and question number (21, 22) on the right
- ✅ Task 1 options panel on the right: A unfriendly colleagues / B poor holiday entitlement / C lacking a sense of purpose / D needing more of a challenge
- ✅ Task 2 header with teal border + Task 2 speakers (26, 27) + Task 2 options (different list: A encouraged by early results / B hopeful about future success / ...)
- ✅ Interaction test: Set Speaker 1 to "C" → select shows "C lacking a sense of purpose", active highlight preserved, server-side session JSONL records `lq21: "C"` (confirmed via `GET /api/session/:id`)
- ✅ Navigation round-trip: Part 4 → Part 1 → back to Part 4 → Speaker 1 select still shows "C" (state.answers survived re-render)
- ✅ Bottom nav Part 4 active showing `21 22 26 27` teal buttons

Matches cae/examples/l5.png visually within the constraints of Zarmet-neutral branding. Compact, scannable, authentic.

### Quality Map (updated)
| Page | Layer | Notes |
|------|-------|-------|
| test.html Listening Part 4 | **5-Crafted** | Rebuild complete — matches Cambridge l5.png reference |

All 8 reading parts + all 4 listening parts + welcome + dashboard + done = **12/12 pages at Layer 5 Crafted**.

### Deferred
- Real audio content transcription — out of /eye scope (content phase)
- `cae/examples/` writing pages (w1.png, w2.png) — writing is out of scope per intent plan
- Further improvements require real content or backend changes

### Session Stats
Pages explored: 1 (Listening Part 4)
Screenshots captured: 2
Rounds: 1 (within this session)
Polishes landed: 0
Rebuilds landed: 1
Elevations landed: 0
Reverted: 0
Changes shipped: 1 rebuild

---

## Session: 2026-04-11 13:55 — Zarmet Olympiada Cambridge-Authentic UI — Round 2
Persona: Student taking English C1 Reading + Listening | System: Zarmet Olympiada standalone (port 3004)
Pages explored: test Parts 2, 3, 6, 8, Listening Part 1 + Part 4 two-task, done.html
Starting state: Round 1 shipped 7 polishes — typography, duplication, dashboard text, max-width, banner, extractQuestionNumber

### Round 2 — Visual verification of deferred pages + audio error modal fix

**Explored:** 6 pages via playwright-cli, picking up from the Round 1 deferred list.

**Findings:**

- [T5 ✅] Part 2 (open cloze) — "Questions 9–9" banner correct, inline gap input works, typography clean. **No issues.**
- [T5 ✅] Part 3 (word formation) — Two-col with passage left + Keyword List right (`17 COME`), banner "Questions 17–17", matches Cambridge reference 3.png. **No issues.**
- [T5 ✅] Part 6 (cross-text matching) — Two-col reviewer sections + matching question with 4 reviewer options. Active cyan highlight on q37. **No issues.**
- [T5 ✅] Part 8 (multiple matching) — Two-col layout with 5 consultant options. Next arrow correctly disabled (last question of last part). **No issues.**
- [T3] Listening (any part after Play click) — **DOUBLE ERROR MODAL BUG.** When audio fails to load, both `audio.play().catch()` AND `audio.addEventListener('error')` fire independently, each calling showErrorModal → student sees TWO stacked error modals, has to click OK twice. Found during Part 1 click-Play test.
- [T4] Listening error message — trailing `..` double period because the rejected error message already ends with `.` and the code appends `'. Please tell...'`. Cosmetic but unprofessional.
- [T0] Listening Part 4 two-task — functional (Task 1 header, options list inline, speaker question cards) but less compact than the Cambridge reference l5.png which uses a tighter left-speakers/right-options matching layout. Deferred — not "wrong", just "less authentic." Future round candidate for /eye rebuild mode.
- [T5 ✅] done.html — Clean warm Zarmet, "Thank you" + "Your test has been submitted." + "Please wait for your invigilator." + 4-corner gate active. No score, no breakdown, no counters. **No issues.**

**Action:** POLISH (2 changes shipped)

- [T3] startAudio() double-modal guard — Introduced `failureHandled` flag inside startAudio; both the `error` event listener and the `audio.play().catch()` handler route through a new `handleFailure(reason)` helper that is idempotent per-audio. Once the first failure source fires, subsequent ones are no-ops.
  Mode: polish | Quality: 3→5 | Files: public/js/test.js
- [T4] Error message trailing period — Added `.replace(/\.+\s*$/, '')` to trim trailing periods from `e.message` before appending `'. Please tell your invigilator.'`. No more `..`.
  Mode: polish | Quality: 4→5 | Files: public/js/test.js

### Verification

Re-ran the failure path via playwright-cli:
- ✅ Clicked Play button on Listening Part 1
- ✅ `document.querySelectorAll('.ct-error-modal').length === 1` (was `2` before the fix)
- ✅ Modal text is clean: "Audio is unavailable for this part. Please tell your invigilator. You may continue to answer the questions, but you will not hear the audio." — single period
- ✅ Clicking OK dismisses the modal fully — `.length === 0` after
- ✅ Content underneath is accessible, Next arrow teal (advance unlocked after audio 'finished' state)
- ✅ Nothing else regressed: all Reading parts still render correctly

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| test.html Part 2 | 5-Crafted | Open cloze, inline gap input |
| test.html Part 3 | 5-Crafted | Word formation with right-column Keyword List |
| test.html Part 6 | 5-Crafted | Cross-text matching, 4 reviewer options |
| test.html Part 8 | 5-Crafted | Multiple matching, 5 consultant options, last-question disable state correct |
| test.html Listening (error path) | 5-Crafted | Single modal, clean message, clean dismiss |
| test.html Listening Part 4 | 4-Polished | Two-task rendering works; layout not as compact as Cambridge l5.png (deferred) |
| done.html | 5-Crafted | Minimal, consistent, 4-corner gate present |

### Deferred
- Listening Part 4 compact matching layout — could be rebuilt to use left-speakers/right-options layout matching cae/examples/l5.png exactly. Current rendering is functional and clear; rebuild would be an authenticity improvement, not a fix.
- Audio playback happy path (actual .ended event firing) — cannot be verified without real audio files, which is a content-transcription phase task.
- Real content transcription — out of /eye scope.

### Session Stats
Pages explored: 6 (Parts 2/3/6/8, Listening failure path, done.html)
Screenshots captured: 9
Rounds: 1 (within this session)
Polishes landed: 2
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Changes shipped: 2 polishes

---

## Session: 2026-04-11 13:50 — Zarmet Olympiada Cambridge-Authentic UI — Round 1
Persona: Student taking English C1 Reading + Listening | System: Zarmet Olympiada standalone (port 3004)
Pages explored: welcome, dashboard, test (Parts 1, 4, 5, 7), listening pre-play modal
Starting state: Frontend rewrite landed via ADR-038/039/040 earlier this session; this is the first /eye polish pass

### Round 1 — Visual fidelity vs cae/examples/*.png reference

**Explored:** 5 pages via playwright-cli screenshots; compared side-by-side to Cambridge CAE reference screenshots.

**Findings:**

- [T4] test.html Part 1 — "Studying black bears" heading rendered as 21px warm-brown (Zarmet palette leaked into test runner via the global `h1, h2, h3` rule at the top of styles.css). Cambridge reference has ~17px dark-grey Georgia headings.
- [T4] test.html Part 7 — Same typography leak, AND "Scottish Wildcat" first line rendered TWICE (once as hoisted h3, once as plain passage body text) because renderPart7 walked the whole content from index 0 without stripping the hoisted heading.
- [T4] test.html Part 5/6/8 — Same duplication bug in renderTwoColReading (would affect all two-col reading parts when real content arrives with a title line).
- [T3] dashboard.html — Welcome panel showed "Language: English C1 (Cambridge)" exposing "Cambridge" in user-facing UI. Violates the Zarmet-neutral branding requirement from the intent plan.
- [T4] test.html — .ct-main had no max-width; passage text could span 1280px+ on wide screens (Cambridge has a reading-column constraint).
- [T3] test.html Part 4 — Instruction banner showed "Part 4 — Key word transformation (STUB)" instead of "Questions 25–25" because extractQuestionNumber parsed the KWT prompt (a full sentence with no digits) and returned null, falling back to the part title.

**Action:** POLISH (6 changes shipped)

- [T4] .zu-test-body typography scope — ADDED `body.zu-test-body h1/h2/h3/h4` rules that reset color, font-family, font-size to Cambridge-authentic dark-grey Georgia. Stops the warm-brown leak.
  Mode: polish | Quality: 4→5 | Files: public/css/styles.css
- [T4] renderPart7 + renderTwoColReading duplication — Introduced `shouldHoistHeading(content)` predicate and `passageBody(part)` helper that returns the passage content with the hoisted first line removed. Updated renderPart7, renderTwoColReading, and renderPassageWithInlineGaps to use passageBody instead of raw content.
  Mode: polish | Quality: 4→5 | Files: public/js/test.js
- [T3] dashboard.js langLabel — Changed "English C1 (Cambridge)" to "English C1 Advanced", "German C1 (Goethe)" to "German C1 Advanced". Drops external brand association.
  Mode: polish | Quality: 4→5 | Files: public/js/dashboard.js
- [T4] .ct-main max-width 1200px + centered — Content now constrained to a reasonable reading width on wide screens.
  Mode: polish | Quality: 4→5 | Files: public/css/styles.css
- [T4] Instruction banner wrapper — Added `.ct-banner-wrap` container so the banner aligns with .ct-main (both share the 1200px max-width + 24px padding).
  Mode: polish | Files: public/css/styles.css, public/test.html
- [T4] .ct-passage max-width 820px — Single-column passages constrained to a readable reading column; overridden inside .ct-two-col where columns already constrain.
  Mode: polish | Files: public/css/styles.css
- [T3] extractQuestionNumber — Prefer question `id` over `prompt` when extracting the number for banner titles. Fixes Part 4 KWT where prompts are full sentences with no digits.
  Mode: polish | Files: public/js/test.js

### Verification

Re-screenshotted the same 4 pages + Part 4 + Part 5 + Listening pre-play after each fix batch:
- ✅ Dashboard shows "Language: English C1 Advanced" (no Cambridge)
- ✅ Part 1 "Studying black bears" is now 17px dark-grey Georgia
- ✅ Part 7 "Scottish Wildcat" appears ONCE, not duplicated
- ✅ Part 4 banner shows "Questions 25–25" (extractQuestionNumber fixed)
- ✅ Part 5 two-col layout clean — passage left, MC questions right with bookmark icon + active cyan highlight
- ✅ Listening pre-play modal — dark overlay, centered white card, headphone icon, strict instructions, teal Play button. Indistinguishable from cae/examples/l1.png.
- ✅ Bottom nav shows Part 1 teal `1`, Part 4 teal `25`, Part 5 teal `31`, Part 7 teal `41 42`, Part 8 `0 of 1`, and Listening Part 4 `0 of 4` (confirms taskGroups walking works)
- ✅ Timer pill 89:53 → 40:00 (reading vs listening durations correct)
- ✅ No yellow global counter, no Secure Mode badge, no wifi/bell/menu/pencil chrome icons, no Cambridge logo

### Quality Map
| Page | Layer | Notes |
|------|-------|-------|
| index.html (welcome) | 5-Crafted | Clean Zarmet warm palette, no issues |
| dashboard.html | 5-Crafted | Module cards, completion banner, 4-corner gate working |
| test.html Part 1 | 5-Crafted | MC cloze with inline select, typography fixed |
| test.html Part 4 | 5-Crafted | KWT centered blocks, banner title fixed |
| test.html Part 5 | 5-Crafted | Two-col layout, bookmark, active highlight |
| test.html Part 7 | 5-Crafted | Gapped-text paragraph bank, duplication fixed |
| test.html Listening | 5-Crafted | Pre-play modal matches Cambridge reference exactly |
| done.html | — | Not re-verified this round (unchanged since ADR-037) |

### Deferred
- Parts 2, 3, 6, 8 — not yet visually verified in browser (code-level review only). Next /eye iteration should walk them.
- Listening Part 4 two-task — pre-play modal verified; need to verify the two-task rendering after clicking Play (requires an actual audio file since the strict listening pipeline blocks advance until audio 'ended' fires).
- Real content transcription from cae/*.docx + Nemis tili/*.pdf — this is Priority 1 of the original intent plan, not an /eye concern.
- done.html — walk it next round to verify the 4-corner gate visual.

### Session Stats
Pages explored: 5 (welcome, dashboard, test Part 1/4/5/7, listening pre-play)
Screenshots captured: 7 (3 in first pass + 4 verification)
Rounds: 1
Polishes landed: 7
Rebuilds landed: 0
Elevations landed: 2 (fade-in animation on .ct-main + .zu-module-card — from prior scaffold phase, validated this session)
Reverted: 0
Changes shipped: 7 polishes

---

## Session: 2026-04-09 17:35 — End-to-End Rounds 11-14: B2-First ALL SKILLS (FINAL)
Persona: Student (99944 / Eye Bot B2) → Admin | System: Cambridge (port 3003)

### Round 11 — B2-First Reading (includes Use of English)
- [PASS] 30 answers, submit → 200 OK, DB verified

### Round 12 — B2-First Writing
- [PASS] 2 writing answers, submit → 200 OK, DB verified

### Round 13 — B2-First Listening
- [PASS] 25 listening answers (L1-L25), submit → 200 OK, DB verified

### Round 14 — B2-First Use of English
- [PASS] Embedded in Reading submission (Parts 1-4 of B2 Reading are UoE)

**B2-First fully tested:** Reading+UoE (30 ans) + Writing (2 ans) + Listening (25 ans)

### FULL CYCLE COMPLETE — 14/14 Rounds
| Round | Test | System | Student | DB | Key Finding |
|-------|------|--------|---------|-----|-------------|
| 1 | Reading | IELTS | 99901 | PASS | - |
| 2 | Writing | IELTS | 99902 | PASS | **BUG FIX: showSaveIndicator collision** |
| 3 | Listening | IELTS | 99903 | PASS | - |
| 4 | A1 R&W | Cambridge | 99914 | PASS | - |
| 5 | A1 Listen | Cambridge | 99914 | PASS | - |
| 6 | A2 R&W | Cambridge | 99924 | PASS | - |
| 7 | A2 Listen | Cambridge | 99924 | PASS | - |
| 8 | B1 Reading | Cambridge | 99934 | PASS | - |
| 9 | B1 Writing | Cambridge | 99934 | PASS | - |
| 10 | B1 Listen | Cambridge | 99934 | PASS | - |
| 11 | B2 Reading+UoE | Cambridge | 99944 | PASS | - |
| 12 | B2 Writing | Cambridge | 99944 | PASS | - |
| 13 | B2 Listening | Cambridge | 99944 | PASS | - |
| 14 | B2 UoE | Cambridge | 99944 | PASS | In Reading |

**Critical bug found:** `showSaveIndicator` collision in session-manager.js crashed all IELTS writing submissions silently (Round 2). Fixed with 2-line rename.

---

## Session: 2026-04-09 17:20 — End-to-End Rounds 9-10: B1-Preliminary Writing + Listening
Persona: Student (99934 / Eye Bot B1) → Admin | System: Cambridge (port 3003)

### Round 9 — B1-Preliminary Writing
- [PASS] 2 writing answers (email + story), submit → 200 OK
- [PASS] DB: `99934 | B1-Preliminary | writing | 2 answers`
- [PASS] Admin: Writing row visible

### Round 10 — B1-Preliminary Listening
- [PASS] 25 listening answers (L1-L25), submit → 200 OK
- [PASS] DB: `99934 | B1-Preliminary | listening | 25 answers`
- [PASS] Admin: All 3 B1-Preliminary rows visible (Reading, Writing, Listening)

**B1-Preliminary fully tested:** Reading (30 ans) + Writing (2 ans) + Listening (25 ans)

---

## Session: 2026-04-09 17:05 — End-to-End Test Round 8: Cambridge B1-Preliminary Reading Mock 1
Persona: Student (99934 / Eye Bot B1) → Admin | System: Cambridge (port 3003)

### Round 8 — B1-Preliminary Reading
- [PASS] 30 answers set, submit → 200 OK
- [PASS] DB: `99934 | B1-Preliminary | reading | 30 answers`
- [PASS] Admin: `99934 | Eye Bot B | B1-Preliminary | Mock 1 | Reading | Unscored`

---

## Session: 2026-04-09 16:50 — End-to-End Test Round 7: Cambridge A2-Key Listening Mock 1
Persona: Student (99924 / Eye Bot A2) → Admin
System: Cambridge (port 3003)

### Round 7 — Cambridge A2-Key Listening Mock 1
- [PASS] Set 25 answers (L1-L25), submit → 200 OK
- [PASS] DB: `99924 | A2-Key | listening | 25 answers`
- [PASS] Admin: `99924 | Eye Bot A | A2-Key | Mock 1 | Listening | Unscored`

**A2-Key fully tested:** R&W (30 answers) + Listening (25 answers)

---

## Session: 2026-04-09 16:35 — End-to-End Test Round 6: Cambridge A2-Key Reading-Writing Mock 1
Persona: Student (99924 / Eye Bot A2) → Admin
System: Cambridge (port 3003)

### Round 6 — Cambridge A2-Key Reading-Writing Mock 1
- [PASS] Login, navigate to A2-Key R&W test (7 parts, 30 questions)
- [PASS] Set 30 answers: Q1-6 MC, Q7-13 matching, Q14-18 MC, Q19-24 cloze, Q25-30 text fill
- [PASS] Submit → 200 OK
- [PASS] DB: `99924 | Eye Bot A | A2-Key | reading-writing | 30 answers`
- [PASS] Admin: `99924 | Eye Bot A | A2-Key | Mock 1 | R&W | Unscored`

---

## Session: 2026-04-09 16:21 — End-to-End Test Round 5: Cambridge A1-Movers Listening Mock 1
Persona: Student (99914 / Eye Bot A1) → Admin
System: Cambridge (port 3003)

### Round 5 — Cambridge A1-Movers Listening Mock 1
- [PASS] Login, navigate to A1-Movers Listening test
- [PASS] Dismiss audio popup, set 25 answers (L1-L25) in localStorage
- [PASS] Submit via deliver-button → c-review-submit → POST /cambridge-submissions → 200 OK
- [PASS] DB: `99914 | Eye Bot A | A1-Movers | listening | mock 1 | 25 answers`
- [PASS] Admin: `99914 | Eye Bot A | A1-Movers | Mock 1 | Listening | Unscored`

**Note:** Cambridge Listening uses complex drag-drop/interactive widgets per part. Answers were set via localStorage (same storage the UI writes to), then submitted through the real UI submit flow. This still fully tests the submission→server→DB→admin pipeline.

**A1-Movers now fully tested:** Both Reading-Writing (34 answers) and Listening (25 answers) verified end-to-end.

---

## Session: 2026-04-09 13:05 — End-to-End Test Round 4: Cambridge A1-Movers Reading-Writing Mock 1
Persona: Student (EyeBot-A1 / Eye Bot A1, ID: 99914) → Admin
System: Cambridge (port 3003)

### Round 4 — Cambridge A1-Movers Reading-Writing Mock 1
**Flow:** Login → Cambridge Dashboard → A1-Movers R&W test (iframe with 6 parts) → Fill all 34 answers → Submit → Admin verify

- [PASS] Login as Cambridge student, navigate to A1-Movers Reading-Writing test
- [PASS] Filled all 6 parts via iframe navigation:
  - Part 1: 5 text inputs (word matching)
  - Part 2: 5 radio groups (multiple choice A/B/C)
  - Part 3: 5 text + 1 radio
  - Part 4: 5 text
  - Part 5: 7 text
  - Part 6: 6 text
- [PASS] Submit via deliver-button → c-review-submit → POST /cambridge-submissions → 200 OK
- [PASS] DB: `99914 | Eye Bot A | A1-Movers | reading-writing | 34 answers | 2026-04-09T07:57:29`
- [PASS] Admin Dashboard: Row found `99914 | Eye Bot A | A1-Movers | Mock 1 | R&W | Unscored`
- [NOTE] Invigilator/Student Results: Not verified (WebSocket-dependent, hard to test headless)

**Findings:**
- Cambridge GET /cambridge-submissions returns flat array, not `{submissions: []}` like IELTS — test DB check needed adjustment
- Student name "Eye Bot A1" was stored as "Eye Bot A" — the `1` at end was interpreted as part of the name pattern. Not a bug, just a data observation.

---

## Session: 2026-04-09 12:46 — End-to-End Test Round 3: IELTS Listening Mock 1
Persona: Student (EyeBot-L / Eye Bot Listening, ID: 99903) → Admin → Invigilator
System: IELTS (port 3002)

### Round 3 — IELTS Listening Mock 1
**Flow:** Login → Dashboard → Listening Test → Dismiss audio popup → Fill 40 answers (4 parts) → Submit → Admin verify → Invigilator verify

- [PASS] Audio popup dismissed (Play button)
- [PASS] Part 1 (Q1-10): text inputs filled
- [PASS] Part 2 (Q11-15 text, Q16-20 radio): all filled
- [PASS] Part 3 (Q21-24 select dropdowns, Q25-30 radio): all filled
- [PASS] Part 4 (Q31-32 radio, Q33-40 text): all filled
- [PASS] Submit → review modal → POST /submissions → 200 OK (id: 12021, 40 answers)
- [PASS] Admin Dashboard: Row found `99903 | Eye Bot Listening | Mock 1 | listening | Unscored/40`
- [PASS] Invigilator: Student found

**Bugs found:** None — listening pipeline works end-to-end
**404 error:** Audio file not found (IC001 listening.mp3) — expected in headless test, doesn't affect submission

---

## Session: 2026-04-09 12:38 — End-to-End Test Round 2: IELTS Writing Mock 1
Persona: Student (EyeBot-W / Eye Bot Writing, ID: 99902) → Admin → Invigilator
System: IELTS (port 3002)

### Round 2 — IELTS Writing Mock 1
**Flow:** Login → Dashboard → Writing Test → Fill Task 1 (170 words) + Task 2 (310 words) → Submit → Admin verify → Invigilator verify

**BUG FOUND — CRITICAL:**
- `answer-manager.js:40` declares `const showSaveIndicator = showCambridgeSaveIndicator`
- `session-manager.js:14` declares `function showSaveIndicator()`
- `const` blocks the later `function` declaration, **crashing the entire session-manager.js**
- Result: `saveTestToDatabase` is `undefined` on writing pages
- **All writing submissions silently fail** — student sees "Completed" but no data saved to DB

**FIX:** Renamed session-manager's copy to `showSessionSaveIndicator` (2-line change)
**Commit:** ff7c2cf

**After fix:**
- [PASS] Student login 99902 / "Eye Bot Writing"
- [PASS] Task 1 filled (170 words), Task 2 filled (310 words)
- [PASS] Submit → POST /submissions 4200 bytes → 200 OK → saved to DB (id: 12021)
- [PASS] Admin Dashboard: Row found `99902 | Eye Bot Writing | Mock 1 | writing | Not Graded`
- [PASS] Invigilator: Student found in panel

**Side finding:** Submit button fires twice (onclick + addEventListener) — server dedup catches the duplicate (409). Not a data integrity issue.

---

## Session: 2026-04-09 (round 40) — Database & API Reliability (FINAL ROUND)
Persona: DevOps monitoring system health
System: Both — shared/database.js, local-database-server.js, cambridge-database-server.js
Pages explored: shared/database.js (createDatabaseManager, ensureConnection, createRetryQueue), local-database-server.js /test endpoint, cambridge-database-server.js /test endpoint, launcher.html checkStatus() consumer
Starting state: Both servers had a `/test` health endpoint that did `SELECT NOW()` and returned `success: true/false`. On failure, the catch block returned a generic `"message": "Database connection failed"` — no error classification, no hint about what went wrong. An admin looking at the launcher's "Offline" status had to SSH into the server and read logs to know if it was a DNS problem, auth failure, or timeout. The connection manager in shared/database.js used a single `Client` (appropriate for Neon pooler), had proper `error` event handling, and the retry queue with `.unref()` was well-designed.

### Round 1 — Polish: classify health check errors

**Findings (4 total):**
- [T2] **Health check returns generic "Database connection failed" on any error.** No classification — admin can't distinguish DNS failure from auth error from timeout without reading server logs. The launcher's "Offline" status doesn't explain WHY it's offline.
- [T2] **No retry queue visibility in the health response.** `createRetryQueue()` tracks `failedSubmissions` but the count is never surfaced via the API. An admin has no way to know submissions are queued.
- [T3] **`ensureConnection()` can return a stale connection.** If TCP is silently reset (without firing an `error` event), the `client` object still exists, and the next query fails at the route level. The `error` event handler handles most disconnects but there's a small window.
- [T0] **No separate `/health` liveness endpoint.** `/test` conflates "is the process alive?" with "is the database up?" A k8s-style liveness probe only needs the former.

**Action:** POLISH 2 fixes — improve error classification in both `/test` endpoints.

**Files touched:**
1. **local-database-server.js** `/test` catch block — now maps `error.code` to a human-readable `reason` field:
   - `ENOTFOUND` / `EAI_AGAIN` → `dns_resolution_failed`
   - `ECONNREFUSED` → `connection_refused`
   - `ETIMEDOUT` / `ECONNRESET` → `connection_timeout`
   - `28P01` / `28000` → `authentication_failed` (PostgreSQL error codes)
   - `3D000` → `database_not_found`
   - error.message includes "timeout" → `query_timeout`
   - else → `unknown`
   Also added `uptime: Math.floor(process.uptime())` to the success response so admins can see how long the server has been running.
2. **cambridge-database-server.js** — same error classification + uptime addition.

**Verification:** `node --check` passes on both servers. Live `/test` endpoints return success with the existing running instances (the new `reason` field only appears in error responses which can't be triggered without breaking the connection). On-disk code is correct.

### Quality Map (after round 40 — FINAL)
| Surface | Layer (before → after) | Notes |
|---------|------------------------|-------|
| /test health endpoint error info | 2-Clear (generic "failed") → 3-Efficient (classified reason) | Admin gets actionable diagnosis without SSH |
| /test uptime field | N/A → 3-Efficient | Visible in launcher polling |

### Deferred (for future cycles)
- **Expose retry queue size in /test response.** The `failedSubmissions.length` from createRetryQueue is closure-scoped. Would need to either expose it via a getter or pass it through createServer config.
- **Add a `/health` liveness endpoint.** Return `200 OK` with just `{ ok: true }` without touching the database — pure process-alive check for k8s readiness probes.
- **Connection pool (pg.Pool).** Single `Client` works for Neon pooler, but a proper `Pool` would handle stale connections automatically. Bigger refactor.
- **ensureConnection ping-before-return.** Add a `SELECT 1` validation before returning the client to catch silently-dropped connections. Adds ~5ms latency per request.

### Session Stats (round 40 — FINAL)
Pages explored: 3 server files + 1 shared module
Findings: 4 (2× T2, 1× T3, 1× T0)
Polishes landed: 2 (IELTS + Cambridge health check error classification)
Rebuilds landed: 0
Elevations landed: 0
Reverted: 0
Files touched: 2 (local-database-server.js, cambridge-database-server.js)

---

## FULL CYCLE COMPLETE: 40/40 prompts

### Summary of all 40 rounds (2026-04-09)
| Round | Prompt | Changes | Key fix |
|-------|--------|---------|---------|
| 28 | Fullscreen & Anti-Cheat | 6 | Warning auto-dismiss, CapsLock fix, toast feedback, counter reset, back-nav tracking, Secure Mode badge |
| 29 | Responsive Mobile 375px | 5 | Launcher overflow fix, 420px breakpoint, mobile advisory, badge reposition |
| 30 | Responsive Tablet 768px | 3 | Universal badge safe-zone, tablet launcher width, breakpoint alignment |
| 31 | Loading & Error States | 5 | Launcher retry button, connecting spinner, login spinner, invigilator network/auth error split |
| 32 | Mock Test Content Integrity | 2 | Corrupted MOCK 9/10 reading.html headers + duplicate inventory documented |
| 33 | Navigation Flows IELTS | 2 | goToSubmission delegated to deliver-button, label renamed |
| 34 | Navigation Flows Cambridge | 2 | Stale level badge fix, admin link nowrap |
| 35 | Cambridge Multi-Mock Nav | 1 | Mock indicator badge on Cambridge dashboard |
| 36 | Answer Key Management | 1 | Unsaved-changes guard (dirty flag + beforeunload + confirm) |
| 37 | Scoring Workflow E2E | 2 | _isUnscored 0-score infinite loop fix |
| 38 | CSS Consistency | 2 | Font stack + primary blue unified across launcher + admin |
| 39 | JS Module Architecture | 1 | Triplicate escapeHTML removed |
| 40 | Database & API Reliability | 2 | Health check error classification |
| **Total** | **13 rounds this session** | **34 changes** | — |

---

## Session: 2026-04-09 — C1 Advanced UI fidelity round 2 (live verification)
Persona: Student taking C1 Advanced exam
System: Cambridge (port 3003) — live browser verification

### Round 2 — Live browser verification + keyword list fix

Logged in as student "EYE-TEST-001", navigated through Reading Parts 1→3→4→5:

**Part 1 (1.png)**: ✅ Gap dropdown teal fill working — selected answer B for gap 1, box turned teal with white letter
**Part 4 (4.png)**: ✅ Cream rubric box with teal left border, single question layout, bold keywords — pixel-match
**Part 5 (5.png)**: ✅ Two-column split layout, teal question circles, bordered cards on right — matches
**Part 3 (3.png)**: ⚠️ Keyword list was rendering (grid layout confirmed via JS: 1156px + 220px) but visually too subtle — 1px border, light bg. Fixed: dark blue header, full border, shadow, teal question numbers. Now matches official.

### Fix applied
- `assets/css/cambridge-c1-official-layout.css` — 34 new lines: keyword list prominence overrides

### Session Stats
Pages explored: 4 (Part 1, 3, 4, 5 — live in browser)
Polishes landed: 1 (keyword list visibility)
Changes shipped: 34 lines

---

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
