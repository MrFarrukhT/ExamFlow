# Architecture — Innovative Centre Test System v2

## Overview

Web-based language exam testing platform for administering Cambridge English and IELTS exams. Two independent systems served by two Express servers.

## Systems

### IELTS System (Port 3002)
- **Server:** `local-database-server.js`
- **Entry:** `launcher.html` → `index.html` (student login) → test pages
- **Dashboard:** `dashboard.html` (admin), `invigilator.html`
- **Tests:** 10 mock sets in `MOCKs/MOCK 1-10/` (reading.html, writing.html, listening.html)
- **Templates:** `templates/reading-template.html`, `templates/writing-template.html`
- **Database:** Neon PostgreSQL — `test_submissions`, `mock_answers` tables

### Cambridge System (Port 3003)
- **Server:** `cambridge-database-server.js`
- **Entry:** `Cambridge/launcher-cambridge.html` → `Cambridge/index.html` → test pages
- **Dashboards:** `cambridge-admin-dashboard.html`, `cambridge-student-results.html`, `cambridge-speaking-evaluations.html`
- **Levels:** A1-Movers, A2-Key, B1-Preliminary, B2-First
- **Mocks:** `Cambridge/MOCKs-Cambridge/{Level}/` — Part 1-8 HTML files, speaking.html
- **Database:** Neon PostgreSQL — `cambridge_submissions`, `cambridge_answer_keys`, `cambridge_student_results` tables

### Admin Panel (Port 3000)
- **Server:** `admin/server.js`
- **Routes:** `admin/api/login.js`, `admin/api/submissions.js`, `admin/api/mock-answers.js`
- **Frontend:** `admin/public/index.html`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express (ES Modules) |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript |
| Database | PostgreSQL (Neon serverless) |
| AI | OpenAI API (writing score suggestions) |
| Packaging | pkg (Windows executable) |
| State | localStorage + sessionStorage |

## Key Frontend Modules

```
assets/
  css/           → reading.css, writing.css, listening.css, etc.
  js/
    core.js            → Timer, drag-drop, answer validation
    session-manager.js → Session/state persistence
    answer-manager.js  → Answer handling & auto-save
    cambridge/         → Cambridge-specific modules
    reading/           → Reading test modules
    writing/           → Writing test modules
    listening/         → Listening test modules
  audio/         → Listening test audio files
  icons/         → App icons
```

## Roles

| Role | Pages | Purpose |
|------|-------|---------|
| **Student** | launcher → index → test pages | Takes exams |
| **Invigilator** | invigilator.html / cambridge-invigilator.html | Supervises live tests |
| **Admin** | dashboard.html / cambridge-admin-dashboard.html | Views submissions, manages scores |

## Data Flow

1. Student logs in (ID + Name) via index.html
2. Selects exam level and skill (Reading/Writing/Listening/Speaking)
3. Test loads with timer, questions render from mock HTML files
4. Answers auto-saved to localStorage periodically
5. On submit: POST to `/submissions` or `/cambridge-submissions`
6. Admin views/scores via dashboard
7. Speaking tests: audio recorded client-side, sent as base64

## Key Patterns

- **No build step** — all JS served directly, no transpilation
- **No framework** — vanilla DOM manipulation
- **Fullscreen enforcement** — distraction-free test mode
- **Auto-reconnect** — database connection recovery on failure
- **Background retry** — failed submissions queued and retried every 90s
- **Parameterized queries** — all SQL uses $N placeholders (injection-safe)
