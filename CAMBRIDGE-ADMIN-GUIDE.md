# Cambridge Admin Dashboard - Quick Start Guide

## 🚀 How to Launch

### Option 1: Use the Batch File (Easiest)
1. Double-click `Launch Cambridge Admin Dashboard.bat`
2. The Cambridge database server will start automatically
3. Your browser will open the admin dashboard
4. Login with credentials below

### Option 2: Manual Launch
1. **Start the Cambridge Database Server:**
   ```bash
   node cambridge-database-server.js
   ```
   
2. **Open the Admin Dashboard:**
   - Open `cambridge-admin-dashboard.html` in your browser
   - Or navigate to: `file:///[your-path]/cambridge-admin-dashboard.html`

---

## 🔐 Login Credentials

- **Username:** `admin`
- **Password:** `Adm!n#2025$SecureP@ss`

---

## 📊 Features

### 1. **View All Cambridge Submissions**
- See all test submissions from students
- Organized by student, level, skill, and mock test

### 2. **Filter & Search**
- **Search by Student:** ID or Name
- **Filter by Level:** A1-Movers, A2-Key, B1-Preliminary, B2-First
- **Filter by Skill:** Reading, Writing, Listening, etc.
- **Filter by Mock Test:** Mock 1, 2, or 3
- **Date Range:** Filter by submission date
- **Quick Filter:** "Today's Submissions" button

### 3. **View Student Answers**
- Click on any submission row to view details
- See all student answers
- Compare with correct answers (when available)

### 4. **Score Management**
- Assign scores to submissions
- Scores are saved to the database
- Track average scores across all submissions

### 5. **Export Data**
- Export filtered data as CSV
- Includes all submission details
- Easy to import into Excel/Google Sheets

### 6. **Statistics Dashboard**
- Total submissions count
- Today's test count
- Filtered results count
- Average score calculation

---

## 🎓 Cambridge Test Structure

### Levels & Modules

| Level | Modules |
|-------|---------|
| **A1-Movers** | Reading & Writing (combined), Listening |
| **A2-Key** | Reading & Writing (combined), Listening |
| **B1-Preliminary** | Reading, Writing, Listening |
| **B2-First** | Reading & Use of English, Writing, Listening |

### Mock Tests
- Mock Test 1 (Currently available)
- Mock Test 2 (Coming soon)
- Mock Test 3 (Coming soon)

---

## 🗄️ Database Information

- **Server:** Cambridge Database Server
- **Port:** 3003
- **Database:** Neon PostgreSQL
- **Table:** `cambridge_submissions`

### Database Fields:
- `id` - Unique submission ID
- `student_id` - Student ID
- `student_name` - Student name
- `level` - Cambridge level (A1-Movers, A2-Key, etc.)
- `mock_test` - Mock test number (1, 2, or 3)
- `skill` - Test skill (reading, writing, listening, etc.)
- `answers` - JSON object with all answers
- `score` - Percentage score (0-100)
- `grade` - Letter grade (optional)
- `start_time` - Test start timestamp
- `end_time` - Test end timestamp
- `created_at` - Submission timestamp

---

## 📋 Admin Dashboard vs IELTS Dashboard

### Differences:

| Feature | IELTS Dashboard | Cambridge Dashboard |
|---------|----------------|---------------------|
| Port | 3002 | 3003 |
| Levels | Mock 1-10 | A1, A2, B1, B2 |
| Skills | L, R, W | R, W, L, R&W, R&UoE |
| Mock Tests | 10 versions | 3 versions |
| Database Table | `ielts_submissions` | `cambridge_submissions` |

Both dashboards are completely separate and independent!

---

## 🔧 Troubleshooting

### Dashboard shows "Database Offline"
**Solution:** Make sure the Cambridge database server is running
```bash
node cambridge-database-server.js
```

### No submissions showing
**Possible causes:**
1. No students have submitted tests yet
2. Database connection issue
3. Filters are too restrictive

**Solutions:**
- Check if database server is running
- Clear all filters
- Verify students have completed tests

### Can't login
**Check:**
- Username: `admin`
- Password: `Adm!n#2025$SecureP@ss` (case-sensitive!)

---

## 💡 Tips

1. **Use Date Filters:** Set a date range to focus on recent submissions
2. **Today's Button:** Quick access to today's tests
3. **Export Regularly:** Export data for backup and analysis
4. **Check Connection:** Green "✅ Database Connected" status means everything is working
5. **Pagination:** Use pagination controls to navigate through many submissions

---

## 🎯 Common Tasks

### How to view today's submissions:
1. Click "📅 Today's Submissions" button
2. All filters will be set to today's date

### How to find a specific student:
1. Type student ID or name in "Search Student" field
2. Click "🔍 Apply Filters"

### How to score a test:
1. Click on the submission row
2. Modal will open with student answers
3. Enter score (0-100) in the score field
4. Click "Save Score"

### How to export data:
1. Apply any filters you want (optional)
2. Click "📊 Export CSV"
3. File will download automatically

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Verify database server is running
3. Check browser console for errors (F12)
4. Ensure you're using the correct login credentials

---

## 🔄 Auto-Refresh

The dashboard automatically refreshes submissions every 60 seconds to show the latest data.

---

**Last Updated:** November 5, 2025
**Version:** 1.0
