# Innovative Centre Test System v2.0

> **Two Independent Test Systems**: IELTS MOCK Tests & Cambridge Level Tests

## 📋 Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Running the Systems](#running-the-systems)
- [For Invigilators](#for-invigilators)
- [For Administrators](#for-administrators)
- [System Requirements](#system-requirements)
- [Troubleshooting](#troubleshooting)

---

## Overview

This is a complete test administration system with two fully separated exam platforms:

### 🔵 IELTS MOCK Test System
- **Purpose**: Practice IELTS Reading, Writing, and Listening
- **Structure**: 10 Mock Tests (Mock 1 through Mock 10)
- **Scoring**: IELTS Band Scores (0-9)
- **Server**: Port 3002
- **Database**: `test_submissions` table

### 🟢 Cambridge Level Tests
- **Purpose**: Cambridge General English assessments
- **Levels**: A1-Movers, A2-Key, B1-Preliminary, B2-First
- **Modules**: Reading, Writing, Listening (varies by level)
- **Scoring**: Cambridge Grades
- **Server**: Port 3003
- **Database**: `cambridge_submissions` table

---

## Quick Start

### For IELTS Tests
```powershell
# Double-click this file:
Launch IELTS Test System.bat
```

### For Cambridge Tests
```powershell
# Double-click this file:
Launch Cambridge Test System.bat
```

That's it! The system will:
1. Start the database server
2. Open your browser in fullscreen mode
3. Load the test entry page

---

## System Architecture

```
┌─────────────────────────────────────────┐
│         IELTS MOCK SYSTEM               │
├─────────────────────────────────────────┤
│ Entry: index.html                       │
│ Dashboard: dashboard.html               │
│ Invigilator: invigilator.html           │
│ Server: local-database-server.js (3002) │
│ Database: Neon PostgreSQL               │
│ Tests: MOCKs/MOCK 1-10/                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      CAMBRIDGE LEVEL TESTS              │
├─────────────────────────────────────────┤
│ Entry: Cambridge/index.html             │
│ Dashboard: Cambridge/dashboard-*.html   │
│ Invigilator: Cambridge/cambridge-*.html │
│ Server: cambridge-database-server.js    │
│         (3003)                          │
│ Database: Neon PostgreSQL (Separate)    │
│ Tests: Cambridge/MOCKs-Cambridge/       │
└─────────────────────────────────────────┘
```

**Key Point**: Both systems are completely independent. They can run simultaneously without any conflicts.

---

## Installation

### Prerequisites
- **Node.js** v14 or higher
- **NPM** (comes with Node.js)
- **Modern Browser** (Chrome or Edge recommended)
- **Internet Connection** (for database access)

### Setup Steps

1. **Install Dependencies**
   ```powershell
   npm install
   ```
   This installs:
   - `pg` - PostgreSQL client
   - `express` - Web server
   - `cors` - Cross-origin resource sharing

2. **Verify Installation**
   ```powershell
   node local-database-server.js
   ```
   You should see: "✅ Database connected successfully"

3. **Test Cambridge Server**
   ```powershell
   node cambridge-database-server.js
   ```
   You should see: "✅ Cambridge Database connected successfully"

---

## Running the Systems

### Method 1: Batch Files (Recommended)

**IELTS System:**
- Double-click: `Launch IELTS Test System.bat`
- Browser opens at: `launcher.html`
- Server runs on: `localhost:3002`

**Cambridge System:**
- Double-click: `Launch Cambridge Test System.bat`
- Browser opens at: `Cambridge/launcher-cambridge.html`
- Server runs on: `localhost:3003`

### Method 2: Manual Start

**IELTS:**
```powershell
# Terminal 1 - Start server
node local-database-server.js

# Then open in browser:
# http://localhost:3002/launcher.html
```

**Cambridge:**
```powershell
# Terminal 2 - Start server
node cambridge-database-server.js

# Then open in browser:
# http://localhost:3003/Cambridge/launcher-cambridge.html
```

### Method 3: Run Both Simultaneously

```powershell
# Terminal 1
node local-database-server.js

# Terminal 2
node cambridge-database-server.js
```

Both systems will run on different ports without conflict.

---

## For Invigilators

### IELTS Mock Tests

1. **Access Invigilator Panel**
   - Click "Admin" on any IELTS page
   - Enter password: `InV!#2025$SecurePass`
   - Or direct link: `http://localhost:3002/invigilator.html`

2. **Configure Mock Test**
   - Select Mock number (1-10) from dropdown
   - Click "Set Mock Test"
   - All students will now take that Mock

3. **Manage Sessions**
   - View current student sessions
   - Download test results (TXT/JSON)
   - Reset sessions if needed
   - View test history (last 3 tests)

### Cambridge Level Tests

1. **Access Invigilator Panel**
   - Click "Admin" on any Cambridge page
   - Enter password: `InV!#2025$SecurePass`
   - Or direct link: `http://localhost:3003/Cambridge/cambridge-invigilator.html`

2. **Configure Level**
   - Click on level card:
     - A1 - Movers
     - A2 - Key (KET)
     - B1 - Preliminary (PET)
     - B2 - First (FCE)
   - Level is now set for all students

3. **Manage Sessions**
   - Same as IELTS: view sessions, download results, reset

---

## For Administrators

### IELTS Admin Dashboard

**Access**: `http://localhost:3002/admin-dashboard.html`

**Features**:
- View all test submissions
- Filter by Mock number, skill, student
- See scores and band scores
- Download submissions as CSV
- View detailed answers for each submission

### Cambridge Admin Dashboard

**Access**: `http://localhost:3003/admin/cambridge-submissions.html`

**Features**:
- View all Cambridge submissions
- Filter by Level (A1/A2/B1/B2), skill, student
- See scores and grades
- Download submissions as CSV
- View detailed answers

### Database Access

Both systems use **Neon PostgreSQL** (cloud database):

**IELTS Database**:
- Table: `test_submissions`
- Columns: student_id, student_name, mock_number, skill, answers, score, band_score, timestamps

**Cambridge Database**:
- Table: `cambridge_submissions`
- Columns: student_id, student_name, level, skill, answers, score, grade, timestamps

---

## System Requirements

### Minimum
- **OS**: Windows 10+
- **RAM**: 4GB
- **Browser**: Chrome 90+, Edge 90+
- **Node.js**: v14+
- **Internet**: Stable connection

### Recommended
- **OS**: Windows 11
- **RAM**: 8GB+
- **Browser**: Latest Chrome or Edge
- **Node.js**: v18+
- **Internet**: Broadband 10Mbps+

---

## Troubleshooting

### Server Won't Start

**Problem**: "Cannot find module 'pg'"
```powershell
# Solution:
npm install
```

**Problem**: "Port already in use"
```powershell
# Solution: Close other instances or use different port
# Check what's using the port:
netstat -ano | findstr :3002
```

### Database Connection Failed

**Problem**: "Database connection failed"

**Solutions**:
1. Check internet connection
2. Verify database connection string in server files
3. Check Neon PostgreSQL status
4. Restart server

### Tests Not Saving

**Problem**: Submissions not appearing in admin panel

**Check**:
1. Is server running? Look for terminal window
2. Check browser console for errors (F12)
3. Verify correct port (3002 for IELTS, 3003 for Cambridge)
4. Check fallback: localStorage (data saves locally if database unavailable)

### Wrong Exam Type

**Problem**: Logged into IELTS but seeing Cambridge, or vice versa

**Solution**:
1. Each system sets `examType` in localStorage
2. Dashboard validates exam type
3. If wrong type, you're redirected to login
4. Clear browser cache and re-login

### Invigilator Password Not Working

**Current Password**: `InV!#2025$SecurePass`

**To Change**:
1. Edit `invigilator.html` (line ~100)
2. Edit `Cambridge/cambridge-invigilator.html` (line ~128)
3. Change `INVIGILATOR_PASSWORD` constant
4. Save and refresh

---

## File Structure

```
Test-System-v2-/
│
├── 📄 README.md (this file)
├── 📄 package.json
│
├── 🔵 IELTS System Files
│   ├── index.html
│   ├── launcher.html
│   ├── dashboard.html
│   ├── invigilator.html
│   ├── admin-dashboard.html
│   ├── local-database-server.js
│   ├── Launch IELTS Test System.bat
│   └── MOCKs/ (MOCK 1-10)
│
├── 🟢 Cambridge System Files
│   ├── Cambridge/
│   │   ├── index.html
│   │   ├── launcher-cambridge.html
│   │   ├── dashboard-cambridge.html
│   │   ├── cambridge-invigilator.html
│   │   └── MOCKs-Cambridge/ (A1, A2, B1, B2)
│   ├── cambridge-database-server.js
│   └── Launch Cambridge Test System.bat
│
└── 🎨 Shared Assets
    └── assets/
        ├── css/ (stylesheets)
        ├── js/ (scripts)
        └── icons/ (images)
```

---

## Security Features

1. **Distraction-Free Mode**
   - Fullscreen enforcement
   - Prevents F5, Ctrl+R (refresh)
   - Prevents F12 (developer tools)
   - Prevents right-click
   - Prevents back navigation

2. **Session Management**
   - Validates student login
   - Tracks test progress
   - Auto-saves answers every 30 seconds
   - Prevents session tampering

3. **Data Protection**
   - Encrypted database connections (SSL)
   - Separate databases for each system
   - Password-protected admin access
   - Automatic backup to localStorage

---

## Support & Contact

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review browser console (F12) for errors
3. Check server terminal for error messages
4. Verify database connection strings
5. Contact system administrator

---

## Change Log

**v2.0** - November 2025
- Complete system separation (IELTS/Cambridge)
- Dedicated databases for each system
- Simplified architecture
- Improved error handling
- Consolidated documentation

**v1.0** - Initial Release
- Basic IELTS system
- Single database
- Foundation architecture

---

## License & Credits

**Developed for**: Innovative Centre  
**Purpose**: Educational testing and assessment  
**Technology**: Node.js, Express, PostgreSQL (Neon), HTML5, CSS3, JavaScript

---

**System Status**: ✅ Fully Operational  
**Last Updated**: November 4, 2025  
**Version**: 2.0
