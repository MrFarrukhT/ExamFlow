# Autopilot Journal

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
