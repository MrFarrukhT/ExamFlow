# Quick Start Guide - Separated Systems

## For Invigilators & Administrators

### Running IELTS Mock Tests
1. Double-click: `Launch IELTS Test System.bat`
2. Configure Mock (1-10) in: `invigilator.html`
3. View results: `admin-dashboard.html`
4. Server runs on: `http://localhost:3002`

### Running Cambridge Level Tests
1. Double-click: `Launch Cambridge Test System.bat`
2. Configure Level (A1/A2/B1/B2) in: `Cambridge/cambridge-invigilator.html`
3. View results: `admin/cambridge-submissions.html`
4. Server runs on: `http://localhost:3003`

### Running Both Simultaneously
```powershell
# Terminal 1
node local-database-server.js

# Terminal 2
node cambridge-database-server.js
```

## Server Ports
- **IELTS**: Port 3002
- **Cambridge**: Port 3003

## Database Tables
- **IELTS**: `test_submissions` (Original database)
- **Cambridge**: `cambridge_submissions` (New separate database)

## Important URLs

### IELTS System
- Test Entry: `http://localhost:3002/index.html`
- Invigilator: `http://localhost:3002/invigilator.html`
- Admin: `http://localhost:3002/admin-dashboard.html`

### Cambridge System
- Test Entry: `http://localhost:3003/Cambridge/index.html`
- Invigilator: `http://localhost:3003/Cambridge/cambridge-invigilator.html`
- Admin: `http://localhost:3003/admin/cambridge-submissions.html`

## Troubleshooting

### Database not connecting?
- Check if server is running (look for terminal window)
- Verify port is available (3002 or 3003)
- Check internet connection (both use Neon PostgreSQL)

### Wrong exam type showing?
- IELTS uses Mock numbers (1-10)
- Cambridge uses Levels (A1-Movers, A2-Key, B1-Preliminary, B2-First)
- Use correct launcher for each exam type

### Data not saving?
- Check server terminal for errors
- Verify database connection string
- Fallback: Data saves to localStorage automatically

---

**System Status**: ✅ Fully Separated and Operational
