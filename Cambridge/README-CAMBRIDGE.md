# Cambridge General English Test System - Setup Guide

## Overview
This is a complete Cambridge General English exam system with 4 levels (A1 Movers, A2 Key, B1 Preliminary, B2 First), integrated with the Innovative Centre testing platform.

## System Structure

### Levels & Test Structure:
- **A1 Movers** (Basic): Reading & Writing (combined) + Listening
- **A2 Key** (Elementary): Reading & Writing (combined) + Listening
- **B1 Preliminary** (Intermediate): Reading + Writing + Listening (separate)
- **B2 First** (Upper-Intermediate): Reading & Use of English + Writing + Listening (separate)

## Installation & Setup

### 1. Launch the System
Double-click: `Launch Cambridge Test System.bat`

This will:
- Start the local database server
- Launch the Cambridge test system in fullscreen mode
- Load the entry page for student login

### 2. Student Workflow
1. Students enter their ID and name on `index.html`
2. Select their Cambridge level (A1, A2, B1, or B2) on the dashboard
3. Complete test modules (Reading/Writing, Listening)
4. Submit answers - automatically saved to database

### 3. Admin Access
- Click "Admin Access" on any page
- Password: `InV!#2025$SecurePass`
- View all Cambridge submissions at `admin/cambridge-submissions.html`

## File Structure

```
Cambridge/
├── index.html                    # Entry/login page
├── dashboard-cambridge.html      # Level selection & module dashboard
├── launcher-cambridge.html       # Application launcher
├── README-CAMBRIDGE.md          # This file
└── MOCKs-Cambridge/
    ├── A1-Movers/
    │   ├── reading-writing.html  # Combined test
    │   ├── listening.html
    │   └── answers/
    │       └── answer-key.json   # Add answer key here
    ├── A2-Key/
    │   ├── reading-writing.html  # Combined test
    │   ├── listening.html
    │   └── answers/
    │       └── answer-key.json
    ├── B1-Preliminary/
    │   ├── reading.html          # Separate tests
    │   ├── writing.html
    │   ├── listening.html
    │   └── answers/
    │       └── answer-key.json
    └── B2-First/
        ├── reading.html          # Separate tests
        ├── writing.html
        ├── listening.html
        └── answers/
            └── answer-key.json
```

## Adding Test Content

### Step 1: Add Questions to Test Files
All test files have **CONTENT PLACEHOLDER** sections marked clearly. Simply:
1. Open any test HTML file (e.g., `A1-Movers/reading-writing.html`)
2. Find sections marked with `📝 CONTENT PLACEHOLDER`
3. Replace with actual test content (passages, questions, images)

### Step 2: Create Answer Keys
Create `answer-key.json` in each level's `answers/` folder:

```json
{
  "level": "A1-Movers",
  "reading-writing": {
    "1": "correct_answer",
    "2": "correct_answer",
    ...
  },
  "listening": {
    "1": "correct_answer",
    "2": "correct_answer",
    ...
  }
}
```

### Step 3: Add Audio Files
For listening tests, add MP3 files:
- `A1-Movers/A1-Movers-Listening.mp3`
- `A2-Key/A2-Key-Listening.mp3`
- etc.

## Database Configuration

### Cambridge Database (Separate from IELTS)
- **URL**: `postgresql://neondb_owner:npg_4HphojyG2lRn@ep-holy-feather-aggb9nm6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Table**: `cambridge_submissions`
- **Columns**:
  - `student_id` (VARCHAR)
  - `student_name` (VARCHAR)
  - `level` (VARCHAR) - A1-Movers, A2-Key, B1-Preliminary, B2-First
  - `module` (VARCHAR) - listening, reading, writing, reading-writing
  - `answers` (JSONB)
  - `score` (INTEGER)
  - `start_time` (TIMESTAMP)
  - `end_time` (TIMESTAMP)
  - `submission_time` (TIMESTAMP)

## Features

✅ **Fully Integrated**
- Session management stores exam type ('Cambridge')
- Separate test history for Cambridge exams
- Download test results as formatted text files
- Auto-save answers to localStorage
- Submit to dedicated Cambridge database

✅ **Level-Specific Handling**
- A1/A2: Shows combined "Reading & Writing" module
- B1/B2: Shows separate Reading, Writing, Listening modules
- Dynamic module loading based on selected level

✅ **Cambridge Branding**
- Blue gradient theme (#0066cc)
- Level badges (A1, A2, B1, B2)
- "Cambridge General English" branding throughout

## Customization

### Change Colors
Edit `assets/css/cambridge-dashboard.css` and `cambridge-entry.css`
- Main color: `#0066cc` (Cambridge blue)
- Gradient: `linear-gradient(135deg, #0066cc, #0052a3)`

### Change Timer Duration
Edit each test HTML file, find:
```html
<span class="timer-display">60:00</span>
```
Change to desired duration.

### Change Password
Edit any HTML file with admin access, find:
```javascript
const correctPassword = 'InV!#2025$SecurePass';
```

## Support

For questions or issues:
1. Check `INSTALLATION-GUIDE.md` in the root directory
2. Review JavaScript console for errors (F12)
3. Verify database connection in `local-database-server.js`

## Notes

- System requires Node.js for database server
- Tests work offline (answers saved locally)
- Database submission requires internet connection
- Audio files must be in same folder as listening.html
- All test content is customizable via HTML files

---

**System Version**: 1.0.0
**Build Date**: October 2025
**Exam Type**: Cambridge General English (Independent from IELTS system)
