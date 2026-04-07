# Eye Loop Prompts — Test System v2

These prompts are used by `/eye` in auto-cycle mode. Each prompt targets a specific area of the application.

---

## IELTS SYSTEM

### 1. IELTS Launcher & Entry
**URL:** `http://localhost:3002/launcher.html`
**Persona:** Student arriving to take an IELTS exam
**Walk:** Launcher page → visual design, system info, "Start" action → transition to index.html
**Focus:** First impression, clarity of purpose, branding, responsiveness

### 2. IELTS Student Login
**URL:** `http://localhost:3002/index.html`
**Persona:** Student logging in with ID and name
**Walk:** Login form → validation → field behavior → error states → successful login → redirect to test
**Focus:** Form UX, validation messages, empty/invalid states, mobile layout

### 3. IELTS Reading Test — Test Interface
**URL:** `http://localhost:3002/` (navigate to Reading test via login)
**Persona:** Student taking a Reading test (Mock 1)
**Walk:** Question display → passage reading → answer selection → drag-drop → navigation between questions → timer behavior → auto-save indicator
**Focus:** Readability, question clarity, interaction patterns, timer visibility, distraction-free mode

### 4. IELTS Writing Test — Test Interface
**URL:** `http://localhost:3002/` (navigate to Writing test)
**Persona:** Student writing Task 1 and Task 2
**Walk:** Task prompt display → text editor → word count → Task switching → auto-save → submission
**Focus:** Writing area comfort, word count accuracy, task navigation, save feedback

### 5. IELTS Listening Test — Audio & Questions
**URL:** `http://localhost:3002/` (navigate to Listening test)
**Persona:** Student listening to audio and answering
**Walk:** Audio player → play/pause controls → question sync → answer input → timer → submission
**Focus:** Audio controls, question timing, answer input types, accessibility

### 6. IELTS Admin Dashboard
**URL:** `http://localhost:3002/dashboard.html`
**Persona:** Admin reviewing submissions and scoring
**Walk:** Submission list → filters → view details → score entry → AI score suggestion → data display
**Focus:** Data table UX, filter functionality, scoring workflow, AI integration feedback

### 7. IELTS Invigilator Panel
**URL:** `http://localhost:3002/invigilator.html`
**Persona:** Invigilator supervising live exam session
**Walk:** Student list → monitoring controls → test status → access management
**Focus:** Real-time status clarity, control accessibility, multi-student overview

---

## CAMBRIDGE SYSTEM

### 8. Cambridge Launcher & Entry
**URL:** `http://localhost:3003/Cambridge/launcher-cambridge.html`
**Persona:** Student arriving for Cambridge exam
**Walk:** Launcher → level selection → visual design → navigation to login
**Focus:** Level clarity (A1/A2/B1/B2), visual hierarchy, branding

### 9. Cambridge Student Login
**URL:** `http://localhost:3003/Cambridge/index.html`
**Persona:** Student logging in and selecting exam level + skill
**Walk:** Login → level selection → mock selection → skill selection → start test
**Focus:** Selection flow, level descriptions, clear path to test start

### 10. Cambridge A1 Movers — Parts 1-5
**URL:** `http://localhost:3003/` (navigate to A1 Movers test)
**Persona:** Young learner taking A1 Movers exam
**Walk:** Part 1 → Part 2 → Part 3 → Part 4 → Part 5 → all question types → navigation between parts
**Focus:** Age-appropriate design, visual clarity, large touch targets, fun factor

### 11. Cambridge A2 Key — Reading & Writing
**URL:** `http://localhost:3003/` (navigate to A2 Key Reading-Writing)
**Persona:** A2 level student taking Reading & Writing combined test
**Walk:** All parts → question types → answer input → writing tasks → submission
**Focus:** Question variety handling, writing area, part navigation

### 12. Cambridge A2 Key — Listening
**URL:** `http://localhost:3003/` (navigate to A2 Key Listening)
**Persona:** A2 level student taking Listening test
**Walk:** Audio playback → question sync → answer input → Part 4 specifics → submission
**Focus:** Audio player reliability, question timing, answer capture

### 13. Cambridge B1 Preliminary — Reading (Parts 2-6)
**URL:** `http://localhost:3003/` (navigate to B1 Reading)
**Persona:** B1 level student taking Reading test
**Walk:** Part 2 through Part 6 → all question types → passage display → navigation
**Focus:** Text readability, question-passage pairing, long passage handling

### 14. Cambridge B1 Preliminary — Writing (Parts 7-8)
**URL:** `http://localhost:3003/` (navigate to B1 Writing)
**Persona:** B1 level student writing exam responses
**Walk:** Part 7 (short writing) → Part 8 (longer writing) → word count → formatting
**Focus:** Writing prompt clarity, text area sizing, word guidance

### 15. Cambridge B1 Preliminary — Listening
**URL:** `http://localhost:3003/` (navigate to B1 Listening)
**Persona:** B1 level student taking Listening test
**Walk:** All listening parts → audio playback → question types → submission
**Focus:** Audio quality indicators, question variety, answer input types

### 16. Cambridge B2 First — Reading (Parts 1-6)
**URL:** `http://localhost:3003/` (navigate to B2 Reading)
**Persona:** B2 level student taking Reading test
**Walk:** All 6 reading parts → long passages → multiple question types → navigation
**Focus:** Long text handling, question complexity, scroll behavior, part switching

### 17. Cambridge B2 First — Writing (Parts 7-8)
**URL:** `http://localhost:3003/` (navigate to B2 Writing)
**Persona:** B2 level student writing essay and optional tasks
**Walk:** Part 7 (compulsory essay) → Part 8 (choice task) → word count → time management
**Focus:** Advanced writing interface, task choice presentation, word count tracking

### 18. Cambridge B2 First — Use of English
**URL:** `http://localhost:3003/` (navigate to B2 Use of English)
**Persona:** B2 level student taking Use of English
**Walk:** All Use of English question types → cloze tests → transformations → word formation
**Focus:** Input precision, gap-fill UX, keyboard navigation

### 19. Cambridge B2 First — Listening
**URL:** `http://localhost:3003/` (navigate to B2 Listening)
**Persona:** B2 level student taking Listening test
**Walk:** All listening parts → complex audio → note-taking → submission
**Focus:** Audio controls at higher difficulty, question complexity handling

### 20. Cambridge Speaking Tests (All Levels)
**URL:** `http://localhost:3003/` (navigate to any Speaking test)
**Persona:** Student recording speaking responses
**Walk:** Speaking instructions → audio recording start → recording indicator → playback → submission
**Focus:** Microphone access, recording UX, playback quality, submission confidence

---

## ADMIN & MANAGEMENT

### 21. Cambridge Admin Dashboard
**URL:** `http://localhost:3003/cambridge-admin-dashboard.html`
**Persona:** Admin managing Cambridge exam submissions
**Walk:** Dashboard overview → submission filters → individual submission view → scoring → data tables
**Focus:** Data density, filter effectiveness, scoring workflow, visual hierarchy

### 22. Cambridge Student Results
**URL:** `http://localhost:3003/cambridge-student-results.html`
**Persona:** Admin reviewing student results and CEFR levels
**Walk:** Results table → filters → individual student → scores per skill → pass/fail → CEFR mapping
**Focus:** Results clarity, skill breakdown, pass/fail visibility, export options

### 23. Cambridge Speaking Evaluations
**URL:** `http://localhost:3003/cambridge-speaking-evaluations.html`
**Persona:** Evaluator listening to and scoring speaking submissions
**Walk:** Pending evaluations → audio playback → scoring form → evaluation notes → submit evaluation
**Focus:** Audio player quality, scoring form layout, evaluation workflow efficiency

### 24. Enhanced Admin Dashboard
**URL:** `http://localhost:3003/enhanced-admin-dashboard.html`
**Persona:** Admin using the enhanced dashboard for analytics
**Walk:** Analytics overview → charts → submission trends → level breakdown → exports
**Focus:** Data visualization, chart readability, actionable insights

### 25. Admin Panel (IELTS)
**URL:** `http://localhost:3000/`
**Persona:** Admin managing IELTS submissions via dedicated panel
**Walk:** Login → dashboard → submission management → mock answer management
**Focus:** Admin login flow, CRUD operations, data management UX

---

## CROSS-CUTTING

### 26. Timer System — All Tests
**Persona:** Student mid-test watching the timer
**Walk:** Timer start → countdown display → warning states (10min, 5min, 1min) → auto-submit on expiry
**Focus:** Timer visibility, warning urgency levels, auto-submit smoothness

### 27. Auto-Save & Answer Persistence
**Persona:** Student whose browser might disconnect
**Walk:** Fill answers → verify localStorage saves → close browser → reopen → verify answers restored → submission retry queue
**Focus:** Save indicators, recovery flow, queue status for failed saves

### 28. Fullscreen & Anti-Cheat
**Persona:** Student trying to leave the test window
**Walk:** Enter test → fullscreen enforcement → try right-click → try copy/paste → try new tab → try Alt+Tab
**Focus:** Security enforcement UX, non-intrusive blocking, clear messaging

### 29. Responsive — Mobile (375px)
**Persona:** Student taking test on a mobile phone
**Walk:** Launcher → login → test interface → answer selection → timer → submission (all at 375px)
**Focus:** Touch targets, text readability, form inputs, audio controls

### 30. Responsive — Tablet (768px)
**Persona:** Student taking test on a tablet
**Walk:** Same flow as mobile but at tablet width — landscape and portrait
**Focus:** Layout adaptation, split-view opportunities, touch vs mouse

### 31. Loading & Error States
**Persona:** Student on a slow connection
**Walk:** Throttled network → page loads → database timeout → server error → recovery
**Focus:** Loading indicators, error messages, retry affordances, graceful degradation

### 32. Mock Test Content Integrity
**Persona:** Test content manager
**Walk:** Check all 10 IELTS mocks → verify questions load → verify answers exist → check Cambridge mocks across all levels
**Focus:** Content completeness, answer key accuracy, image/audio loading

### 33. Navigation Flows — IELTS
**Persona:** Student navigating the IELTS system end-to-end
**Walk:** Launcher → Login → Select Mock → Reading → finish → back to select → Writing → Listening → complete
**Focus:** Flow continuity, back navigation, state preservation between skills

### 34. Navigation Flows — Cambridge
**Persona:** Student navigating the Cambridge system end-to-end
**Walk:** Launcher → Login → Select Level → Select Skill → Take Test → Parts navigation → Finish → Next Skill
**Focus:** Level-to-skill flow, part-to-part navigation, completion states

### 35. Cambridge Multi-Mock Navigation
**Persona:** Student selecting between Mock 1, 2, 3 for same level
**Walk:** Login → Level selection → Mock selection → verify correct content loads → switch mocks
**Focus:** Mock selector clarity, content differentiation, correct data loading

### 36. Answer Key Management
**Persona:** Admin uploading and editing answer keys
**Walk:** Dashboard → manage answers → upload for specific mock/level/skill → verify → edit individual answers
**Focus:** Upload UX, validation feedback, edit granularity

### 37. Scoring Workflow — End to End
**Persona:** Admin scoring a full set of student submissions
**Walk:** Open dashboard → filter by mock/level → score reading → score writing (with AI) → evaluate speaking → view results
**Focus:** Workflow efficiency, batch operations, score accuracy

### 38. CSS Consistency Across Systems
**Persona:** Designer reviewing visual consistency
**Walk:** Compare IELTS launcher vs Cambridge launcher → compare dashboards → compare test interfaces → compare admin panels
**Focus:** Shared design language, color consistency, typography alignment, branding coherence

### 39. JavaScript Module Architecture
**Persona:** Developer reviewing code organization
**Walk:** `assets/js/core.js` → session-manager → answer-manager → cambridge/ modules → reading/ → writing/ → listening/
**Focus:** Module boundaries, global scope leaks, event listener cleanup, error handling consistency

### 40. Database & API Reliability
**Persona:** DevOps monitoring system health
**Walk:** Hit `/test` and `/health` endpoints → test submission flow → test background retry → test connection recovery
**Focus:** Health check completeness, retry behavior, error logging, connection pool management
