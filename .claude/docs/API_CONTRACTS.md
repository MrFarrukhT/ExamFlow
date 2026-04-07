# API Contracts — Test System v2

All endpoints return `{ success: boolean, message?: string, ... }` unless noted otherwise.

## IELTS Server (Port 3002)

### Test & Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/test` | Database connectivity check |
| GET | `/` | Redirects to `/launcher.html` |

### Submissions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/submissions` | Save IELTS test submission |
| GET | `/submissions` | Get all submissions (DESC by created_at) |
| POST | `/update-score` | Update score for a submission |

**POST /submissions body:**
```json
{
  "studentId": "string",
  "studentName": "string",
  "mockNumber": "number",
  "skill": "reading|writing|listening",
  "answers": {},
  "score": "number",
  "bandScore": "string",
  "startTime": "ISO timestamp",
  "endTime": "ISO timestamp"
}
```

### Mock Answers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/mock-answers?mock=N&skill=X` | Get answers for mock/skill |
| POST | `/mock-answers` | Save answers for mock/skill |
| DELETE | `/mock-answers?mock=N&skill=X` | Delete answers for mock/skill |

### AI Scoring
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai-score-suggestion` | Get AI writing score suggestion |

**POST /api/ai-score-suggestion body:**
```json
{ "task1": "string", "task2": "string" }
```

---

## Cambridge Server (Port 3003)

### Test & Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/test` | Database connectivity check |
| GET | `/health` | Health check (status: ok/error) |
| GET | `/` | Redirects to Cambridge launcher |

### Submissions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/cambridge-submissions` | Save Cambridge test submission |
| GET | `/cambridge-submissions?level=X&skill=X` | Get submissions (filters optional) |
| PATCH | `/cambridge-submissions/:id/score` | Update score (REST) |
| POST | `/cambridge-update-score` | Update score (legacy) |
| PATCH | `/cambridge-submissions/:id/evaluate` | Evaluate speaking test |
| POST | `/submit-speaking` | Submit speaking test with audio |

### Answer Keys
| Method | Path | Description |
|--------|------|-------------|
| GET | `/cambridge-answers?level=X&skill=X&mock=N` | Get answer key |
| POST | `/cambridge-answers` | Save/update answer key (upsert) |
| DELETE | `/cambridge-answers?level=X&skill=X&mock=N` | Delete answer key |

### Student Results
| Method | Path | Description |
|--------|------|-------------|
| GET | `/cambridge-student-results?level=X&mock_test=N&search=X` | Get results (filters optional) |
| POST | `/cambridge-student-results` | Add new student result |
| PATCH | `/cambridge-student-results/:id` | Update student result |
| DELETE | `/cambridge-student-results/:id` | Delete student result |

---

## Admin Panel (Port 3000)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Admin login |
| * | `/api/submissions` | Submissions CRUD |
| * | `/api/mock-answers` | Mock answers CRUD |

---

## Database Tables

### test_submissions (IELTS)
`id, student_id, student_name, mock_number, skill, answers(JSONB), score, band_score, start_time, end_time, created_at`

### cambridge_submissions
`id, student_id, student_name, exam_type, level, mock_test, skill, answers(JSONB), score, grade, start_time, end_time, created_at, audio_data, audio_size, audio_duration, audio_mime_type, evaluated, evaluator_name, evaluation_date, evaluation_notes`

### cambridge_answer_keys
`id, level, skill, mock_test, answers(JSONB), updated_at` — UNIQUE(level, skill, mock_test)

### cambridge_student_results
`id, student_id, student_name, level, mock_test, reading_raw/max/scale, writing_raw/max/scale, listening_raw/max/scale, speaking_raw/max/scale, use_of_english_raw/max/scale, reading_writing_raw/max/scale, overall_scale, cefr_level, shields_*, passed, created_at`
