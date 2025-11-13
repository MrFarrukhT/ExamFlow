# Cambridge Enhanced Admin Dashboard

## Overview
The Cambridge Admin Dashboard has been upgraded with all the features from the IELTS Enhanced Admin Dashboard, including:

1. ✅ **Answer Key Management** - Add, edit, and store correct answers for auto-checking
2. ✅ **Side-by-Side Answer Comparison** - View student answers vs correct answers
3. ✅ **Automatic Scoring** - Auto-calculate scores based on correct answers
4. ✅ **Date Grouping View** - View submissions organized by date
5. ✅ **Advanced Filtering** - Filter by level, skill, mock, date, and score status
6. ✅ **Pagination** - Navigate through large datasets efficiently
7. ✅ **CSV Export** - Export filtered data for reporting

## What's New

### Database Changes
- **New Table**: `cambridge_answer_keys` - Stores correct answers for each level, skill, and mock test
- **New API Endpoints**:
  - `GET /cambridge-answers` - Retrieve answer keys
  - `POST /cambridge-answers` - Save answer keys
  - `DELETE /cambridge-answers` - Delete answer keys

### Features

#### 1. Answer Key Management
Located in a collapsible section at the top of the dashboard:
- Select **Level** (A1-Movers, A2-Key, B1-Preliminary, B2-First)
- Select **Skill** (Reading, Listening, Reading-Writing, Reading-Use of English)
- Select **Mock Test** (Mock 1, 2, or 3)
- Enter up to 40 answers
- **Save** to database
- **Load** from database
- **Clear** to delete

**Multiple Answers**: For questions with multiple acceptable answers, separate them with commas:
```
Question 1: cat, feline
```

#### 2. Side-by-Side Answer Comparison
When viewing a submission:
- Student answers displayed on the left
- Correct answers displayed on the right
- **Green highlighting** for correct answers
- **Red highlighting** for incorrect answers
- Automatic score calculation based on matches

#### 3. Automatic Scoring
- Compares student answers with stored answer keys
- Calculates percentage automatically
- Case-insensitive matching
- Handles multiple acceptable answers
- Manual override available

#### 4. Enhanced Statistics
- Total Submissions
- Filtered Results
- Average Score
- Unique Students
- Needs Scoring (unscored submissions)

## How to Use

### Step 1: Start the Server
```bash
node cambridge-database-server.js
```
The server will automatically create the `cambridge_answer_keys` table on first run.

### Step 2: Access the Dashboard
Open in your browser:
```
http://localhost:3003/admin
```
Or directly open: `cambridge-admin-dashboard.html`

### Step 3: Login
- **Username**: `admin`
- **Password**: `Adm!n#2025$SecureP@ss`

### Step 4: Add Answer Keys
1. Click **"📝 Manage Cambridge Answer Keys"** to expand the section
2. Select the **Level**, **Skill**, and **Mock Test**
3. Enter the correct answers for each question (Q1-Q40)
   - The system automatically matches different question ID formats
   - Enter answers as: Q1, Q2, Q3, etc.
   - System will match: `q1`, `listening_L1`, `reading-writing_1`, etc.
4. Click **"💾 Save"** to store in the database
5. Answers are now available for auto-checking all student submissions

**Note**: For Reading & Writing combined tests, just enter the answers in order (Q1-Q40). The system will automatically normalize and match question IDs regardless of how they're formatted in student submissions.

### Step 5: View and Grade Submissions
1. Click on any submission row or the **"📋 View"** button
2. See side-by-side comparison of student vs correct answers
3. View automatically calculated score
4. Adjust score manually if needed
5. Add grade (A, B, C, etc.)
6. Click **"Save Score"** to update

## Answer Key Structure

Answers are stored per:
- **Level** (e.g., "A2-Key")
- **Skill** (e.g., "reading")
- **Mock Test** (e.g., "1")

This allows you to have different answer keys for:
- A2-Key Reading Mock 1
- A2-Key Reading Mock 2
- B1-Preliminary Listening Mock 1
- etc.

## Filtering Options

### By Status
- **All Submissions** - Show everything
- **Scored** - Only submissions with scores
- **Unscored** - Only submissions needing grading

### By Date
- Use "📅 Today's Submissions" for quick daily view
- Set custom date ranges with From/To fields

### View Modes
- **📋 Table View** - Traditional table layout with pagination
- **📅 Date View** - Submissions grouped and collapsible by date

## Question ID Normalization

The system automatically normalizes different question ID formats to ensure proper matching:

### Supported Formats
Student submissions may use various formats:
- `q1`, `q2`, `q3` → Standard format
- `listening_L1`, `listening_L2` → Listening questions
- `reading-writing_1`, `reading-writing_2` → R&W questions
- `L1`, `L2`, `L3` → Short format
- `1`, `2`, `3` → Numbers only

### How It Works
1. When you enter answer keys as Q1, Q2, Q3, etc., they're saved as `q1`, `q2`, `q3`
2. When comparing with student answers, the system:
   - Removes prefixes (`listening_`, `reading-writing_`, etc.)
   - Normalizes to consistent format
   - Matches questions across different naming conventions
3. Example matches:
   - Answer key `q1` matches student answer `listening_L1` ✓
   - Answer key `q5` matches student answer `reading-writing_5` ✓
   - Answer key `q10` matches student answer `L10` ✓

This ensures that regardless of how the test questions are labeled, they'll be properly compared.

## Tips

### For Reading/Listening Tests
1. Add answer keys once per level/skill/mock combination
2. All future submissions will auto-score against these answers
3. Review auto-scored submissions and adjust if needed

### For Writing Tests
1. Writing tests don't have predefined answer keys
2. Grade manually by viewing student's written response
3. Enter score (0-100%) and grade (A, B, C, etc.)

### Multiple Acceptable Answers
When entering answer keys, you can provide multiple acceptable answers:
```
Q1: color, colour
Q2: analyze, analyse
Q3: 5, five
```

### Exporting Data
1. Apply desired filters
2. Click **"📤 Export CSV"**
3. Opens in Excel or Google Sheets for further analysis

## Database Schema

### cambridge_answer_keys Table
```sql
- id: Serial Primary Key
- level: VARCHAR(50) - e.g., "A2-Key"
- skill: VARCHAR(100) - e.g., "reading"
- mock_test: VARCHAR(10) - e.g., "1"
- answers: JSONB - { "q1": "answer1", "q2": ["ans2a", "ans2b"], ... }
- updated_at: TIMESTAMP
- UNIQUE(level, skill, mock_test)
```

## Backup

A backup of the previous dashboard was created at:
`cambridge-admin-dashboard-backup.html`

## Support

For issues or questions:
1. Check that `cambridge-database-server.js` is running
2. Check browser console for errors (F12)
3. Check server console logs
4. Verify database connection status in the header

## Credits

Based on the IELTS Enhanced Admin Dashboard design with adaptations for Cambridge test structure.

