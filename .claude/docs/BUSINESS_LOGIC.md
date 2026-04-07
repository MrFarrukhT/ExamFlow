# Business Logic — Test System v2

## Exam Types & Scoring

### IELTS
- **Skills:** Reading (40 questions), Writing (2 tasks), Listening (40 questions)
- **Timer:** 60 min (Reading/Writing), 40 min (Listening)
- **Scoring:** Raw score → Band score (1-9, 0.5 increments)
- **AI Writing Scores:** OpenAI GPT-4 suggests band scores for Task 1 & Task 2

### Cambridge — Levels & Pass Thresholds

| Level | Scale Pass | Reading Max/Pass | Writing Max/Pass | Listening Max/Pass | Speaking Max/Pass | UoE Max/Pass |
|-------|-----------|-----------------|-----------------|-------------------|------------------|-------------|
| A1 Movers | — | Shield-based | Shield-based | Shield-based | Shield-based | — |
| A2 Key | 120 | 30/20 (67%) | 30/18 (60%) | 25/17 (68%) | 45/27 (60%) | — |
| B1 Preliminary | 140 | 32/23 (72%) | 40/24 (60%) | 25/18 (72%) | 30/18 (60%) | — |
| B2 First | 160 | 42/24 (57%) | 40/24 (60%) | 30/18 (60%) | 60/36 (60%) | 28/18 (64%) |

### Cambridge — Skills per Level
- **A1 Movers:** Parts 1-5 (Reading/Writing combined), Listening, Speaking
- **A2 Key:** Reading-Writing (combined), Listening, Speaking
- **B1 Preliminary:** Reading (Parts 2-6), Writing (Parts 7-8), Listening, Speaking
- **B2 First:** Reading (Parts 1-6), Writing (Parts 7-8), Use of English, Listening, Speaking

## Test Flow

### Student Journey
1. Open launcher → select exam type (IELTS or Cambridge)
2. Enter Student ID + Name
3. Select level (Cambridge) or mock number (IELTS)
4. Choose skill (Reading/Writing/Listening/Speaking)
5. Timer starts, questions displayed
6. Answers auto-saved to localStorage every few seconds
7. Submit → answers sent to database
8. Timer expiry → auto-submit

### Invigilator Controls
- Monitor active test sessions
- Control test access (start/stop)
- View real-time student progress

### Admin Workflows
- View all submissions with filters (level, skill, date)
- Score submissions (manual scoring + AI suggestions for writing)
- Evaluate speaking tests (listen to audio, assign scores)
- Manage answer keys (upload/edit correct answers)
- View student results dashboard
- Export data

## Answer Validation
- **Reading/Listening:** Compared against answer keys in database
- **Writing:** Manual evaluation by admin + optional AI suggestions
- **Speaking:** Audio recording evaluated by admin (listen + score)
- **Alternative answers:** Supported — answers can have primary + alternative correct values

## Security Model
- No authentication on student-facing pages (access controlled by invigilator)
- Admin panel: basic login (username/password)
- Fullscreen enforcement to prevent cheating
- Context menu disabled during tests
- Right-click blocked
- Copy/paste disabled in test areas
