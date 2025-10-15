<!-- 75e3bad3-3429-4586-989a-f1318ff769e3 5f957d1c-441a-49f2-badc-916769e876fd -->
# Cambridge Exam System Setup

## Overview

Create a standalone Cambridge General English exam system with 4 levels (A1 Movers, A2 Key, B1 Preliminary, B2 First), each with 1 MOCK test. The system will mirror the IELTS structure but function independently as a separate product.

## Key Structural Differences

- **A1 Movers & A2 Key**: Combined Reading & Writing section + Listening (2 sections total)
- **B1 Preliminary & B2 First**: Separate Reading, Writing + Listening (3 sections total)

## Implementation Steps

### 1. Create Cambridge Folder Structure

Create new `Cambridge/` directory at root with:

- `index-cambridge.html` - Student entry/login page
- `dashboard-cambridge.html` - Test selection dashboard
- `launcher-cambridge.html` - Application launcher
- `MOCKs-Cambridge/` folder containing:
- `A1-Movers/` - Combined `reading-writing.html` + `listening.html`
- `A2-Key/` - Combined `reading-writing.html` + `listening.html`
- `B1-Preliminary/` - Separate `reading.html`, `writing.html`, `listening.html`
- `B2-First/` - Separate `reading.html`, `writing.html`, `listening.html`
- `answers/` subfolder in each MOCK with answer keys

### 2. Create CSS Files

In `assets/css/`:

- `cambridge-dashboard.css` - Dashboard styling adapted for Cambridge branding
- `cambridge-entry.css` - Entry page styling
- `cambridge-test.css` - Test page styling for combined/separate sections

### 3. Create JavaScript Files

In `assets/js/cambridge/`:

- `cambridge-session-manager.js` - Session management for Cambridge exams
- `cambridge-answer-manager.js` - Answer collection/validation
- `cambridge-core.js` - Core functionality for Cambridge tests
- `a1-a2-handler.js` - Special handler for combined Reading & Writing sections
- `b1-b2-handler.js` - Handler for separate section tests

### 4. Database Configuration

**Separate Cambridge Database:**

- URL: `postgresql://neondb_owner:npg_4HphojyG2lRn@ep-holy-feather-aggb9nm6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- Create dedicated connection handler in `assets/js/cambridge/cambridge-database.js`
- Schema fields: `student_id`, `student_name`, `level` (A1/A2/B1/B2), `mock_number`, `section` (listening/reading/writing/reading-writing), `answers`, `score`, `start_time`, `end_time`
- Completely independent from IELTS database

### 5. Admin Panel Integration

In `admin/`:

- Create `cambridge-submissions.html` view
- Add API endpoint `/api/cambridge-submissions`
- Add filter to distinguish Cambridge from IELTS submissions
- Update admin dashboard to show Cambridge results separately

### 6. Launcher & Entry Updates

- Create batch files: `Launch Cambridge Test System.bat`
- Update `index-cambridge.html` to store `examType: 'Cambridge'` in localStorage
- Update session validation to check exam type

### 7. Test Templates

Create templates based on official Cambridge format:

- A1 Movers: Reading & Writing combined (40 questions typically)
- A2 Key: Reading & Writing combined (7 parts)
- B1 Preliminary: Reading (6 parts, 32 questions), Writing (2 tasks)
- B2 First: Reading & Use of English (7 parts), Writing (2 tasks)
- All levels: Listening (4-5 parts)

### 8. Branding & Styling

- Update headers to show "Cambridge General English" instead of "IELTS"
- Add level badges (A1, A2, B1, B2)
- Maintain Innovative Centre branding
- Adjust timer durations per Cambridge specifications

## Files to Create/Modify

**New Files:**

- `Cambridge/index-cambridge.html`
- `Cambridge/dashboard-cambridge.html`
- `Cambridge/launcher-cambridge.html`
- `Cambridge/MOCKs-Cambridge/A1-Movers/listening.html`
- `Cambridge/MOCKs-Cambridge/A1-Movers/reading-writing.html`
- `Cambridge/MOCKs-Cambridge/A2-Key/listening.html`
- `Cambridge/MOCKs-Cambridge/A2-Key/reading-writing.html`
- `Cambridge/MOCKs-Cambridge/B1-Preliminary/{listening,reading,writing}.html`
- `Cambridge/MOCKs-Cambridge/B2-First/{listening,reading,writing}.html`
- `assets/js/cambridge/*` (all Cambridge-specific JS files)
- `admin/api/cambridge-submissions.js`

**Referenced Files:**

- `assets/js/session-manager.js` - Will be adapted for Cambridge
- `assets/js/answer-manager.js` - Will be extended for Cambridge
- `admin/api/submissions.js` - Will add Cambridge support
- `local-database-server.js` - Will handle Cambridge submissions

### To-dos

- [ ] Create Cambridge folder structure with MOCKs-Cambridge subdirectories for all 4 levels
- [ ] Create Cambridge entry page, launcher, and dashboard HTML files
- [ ] Create test HTML pages for each level (combined R&W for A1/A2, separate for B1/B2)
- [ ] Create Cambridge-specific JavaScript files for session and answer management
- [ ] Create Cambridge-specific CSS files with appropriate branding
- [ ] Create answer key templates for each level
- [ ] Update database schema and API endpoints to support Cambridge submissions
- [ ] Create Cambridge admin views and integrate with existing admin panel
- [ ] Create Windows batch file launcher for Cambridge system