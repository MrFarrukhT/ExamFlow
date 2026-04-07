# Smart Test Data Schemas

These schemas define the persistent data files that enable cross-run intelligence.

---

## app-map.json

**Produced by:** `/smart-test crawl`
**Consumed by:** `/smart-test deep`, `/smart-test baseline`
**Location:** `lms/test-results/app-map.json`

This file is the complete inventory of every discoverable page, form, button, and interactive element in the application.

### Schema

```json
{
  "generatedAt": "2026-03-15T01:29:00Z",
  "gitCommit": "abc1234",
  "totalPages": 38,
  "totalForms": 12,
  "totalInteractiveElements": 245,

  "routes": [
    {
      "path": "/student",
      "title": "Student Dashboard",
      "roles": ["student"],
      "type": "page",
      "dynamic": false,
      "elements": {
        "links": [
          {
            "text": "Search Lessons",
            "href": "/student/search",
            "location": "sidebar"
          }
        ],
        "forms": [
          {
            "id": "search-form",
            "action": "GET /api/search",
            "method": "GET",
            "fields": [
              {
                "name": "q",
                "type": "text",
                "required": true,
                "placeholder": "Qidirish...",
                "maxLength": null
              }
            ],
            "submitButton": "Qidirish"
          }
        ],
        "buttons": [
          {
            "text": "Taqdimot",
            "type": "navigation",
            "disabled": false,
            "href": "/student/study/{lessonId}"
          }
        ],
        "tabs": [
          {
            "label": "Barcha darslar",
            "panelId": "all-lessons"
          }
        ],
        "tables": [
          {
            "id": "lessons-table",
            "columns": ["Dars", "Fan", "Progress", "Harakatlar"],
            "rowCount": 5,
            "hasPagination": false
          }
        ],
        "modals": [],
        "dropdowns": [
          {
            "label": "Filter by course",
            "options": ["Barcha", "Odam anatomiyasi"],
            "type": "filter"
          }
        ]
      },
      "apiCalls": [
        {
          "method": "GET",
          "url": "/api/progress",
          "status": 200,
          "responseShape": "{ items: [], total: number }"
        }
      ],
      "consoleErrors": [],
      "loadState": "success"
    }
  ],

  "deadLinks": [
    {
      "source": "/journals",
      "href": "#",
      "text": "View Archive",
      "count": 9
    }
  ],

  "failedRoutes": [
    {
      "path": "/admin/model-mapper",
      "error": "404",
      "reason": "Empty directory — no page.tsx"
    }
  ]
}
```

### Notes on app-map.json

- **roles** — which roles can access this page. A page may be accessible by multiple roles.
- **dynamic** — true for routes like `/admin/courses/[id]`. The crawl agent visits at least one real instance.
- **elements** — exhaustive inventory. Deep-dive agents use this to know what to test.
- **apiCalls** — recorded during the crawl. Helps deep-dive agents know which APIs to stress-test.
- **deadLinks** — links that go nowhere (href="#", 404 targets).
- **failedRoutes** — pages that couldn't be loaded at all.

---

## baseline.json

**Produced by:** `/smart-test baseline`
**Consumed by:** `/smart-test diff`
**Location:** `lms/test-results/baseline.json`

This file is a snapshot of the application state at a known-good point. Future runs compare against it to detect regressions.

### Schema

```json
{
  "generatedAt": "2026-03-15T01:29:00Z",
  "gitCommit": "abc1234",
  "gitBranch": "main",

  "pages": [
    {
      "path": "/student",
      "role": "student",
      "snapshot": {
        "title": "Student Dashboard — ZarMed LMS",
        "headingText": "Bosh sahifa",
        "elementCounts": {
          "links": 12,
          "buttons": 5,
          "inputs": 1,
          "tables": 1,
          "tableRows": 5,
          "cards": 4,
          "images": 3
        },
        "visibleText": {
          "statsBar": ["5 dars", "3 fan", "73% progress"],
          "firstCardTitle": "Klinik anatomiya"
        },
        "consoleErrors": [],
        "networkRequests": [
          { "method": "GET", "url": "/api/progress", "status": 200 },
          { "method": "GET", "url": "/api/courses", "status": 200 }
        ]
      }
    }
  ],

  "apiResponses": [
    {
      "endpoint": "GET /api/progress",
      "role": "student",
      "responseShape": {
        "type": "object",
        "keys": ["items", "total"],
        "itemKeys": ["lesson_id", "progress_percent", "last_accessed"]
      },
      "sampleValues": {
        "total": 5,
        "itemCount": 5
      }
    }
  ]
}
```

### How baseline comparison works

When `/smart-test diff` runs:

1. For each page in baseline.json, visit the same page
2. Compare:
   - **Element counts** — did the number of table rows, cards, buttons change significantly?
   - **Key text** — did headings or stat values change unexpectedly?
   - **Console errors** — new errors that weren't in the baseline?
   - **API responses** — did response shapes change? New fields? Missing fields?
3. Flag differences as `regression` category findings

**What constitutes a regression:**
- Element count changed by >50% (e.g., 10 rows → 2 rows)
- New console errors that weren't in baseline
- API endpoint returning different status code
- API response missing keys that were in baseline
- Key text changed to "undefined", "null", "NaN"

**What is NOT a regression:**
- Small count changes (data grows/shrinks naturally)
- New elements added (improvements)
- Different text content (data changes)

---

## known-issues.json

**Maintained by:** User (manually or via `/smart-test accept [issue-id]`)
**Consumed by:** All modes (for deduplication)
**Location:** `lms/test-results/known-issues.json`

This file prevents known/accepted issues from cluttering future reports.

### Schema

```json
[
  {
    "id": "KNOWN-001",
    "title": "Bukhara campus area contradiction across pages",
    "category": "bug",
    "severity": "HIGH",
    "status": "accepted",
    "reason": "Content team is resolving — tracked in Linear CAMPUS-42",
    "acceptedAt": "2026-03-15",
    "matchPattern": "Bukhara.*area.*contradict",
    "matchLocation": "(landing)"
  },
  {
    "id": "KNOWN-002",
    "title": "In-memory rate limiter not shared across instances",
    "category": "tech-debt",
    "severity": "LOW",
    "status": "accepted",
    "reason": "Documented as TODO ANTI-004, will fix when scaling to multi-instance",
    "acceptedAt": "2026-03-15",
    "matchPattern": "in-memory.*(rate limit|session store)",
    "matchLocation": "lib/"
  }
]
```

### Fields

- **id** — unique identifier (KNOWN-NNN)
- **title** — human-readable description
- **status** — `accepted` (won't fix now), `in-progress` (being worked on), `resolved` (should be removed)
- **reason** — why this issue is accepted
- **matchPattern** — regex to match against finding titles. If a new finding matches, it's suppressed.
- **matchLocation** — optional file/path filter. Only suppress if the finding is in this location.
- **acceptedAt** — when the issue was accepted. Useful for cleanup — issues accepted >90 days ago should be re-evaluated.

### Deduplication logic

When generating a report, for each finding:
1. Check if `finding.title` matches any `knownIssue.matchPattern` (case-insensitive)
2. If `matchLocation` is set, also check if `finding.location` contains it
3. If both match and status is `accepted` or `in-progress`, suppress the finding
4. Add a "Suppressed Known Issues" count to the report summary

---

## findings-ledger.json

**Produced by:** All modes (orchestrator merges subagent findings into the ledger)
**Consumed by:** All modes (for deduplication, regression detection, status tracking)
**Location:** `lms/test-results/findings-ledger.json`

This file is the **single source of truth** for all findings across all runs. It replaces the need for `known-issues.json` and provides cross-run deduplication, regression memory, and fix tracking.

### Schema

```json
{
  "version": 2,
  "lastRunAt": "2026-03-17T05:10:00Z",
  "lastRunCommit": "a2e28b3",
  "runs": [
    {
      "id": "run-20260316-1200",
      "mode": "sweep",
      "commit": "5ac0656",
      "zones": ["student", "professor", "admin", "editor", "public", "api-architecture"],
      "findingsNew": 14,
      "findingsRecurring": 0,
      "findingsResolved": 0,
      "findingsRegressed": 0
    },
    {
      "id": "run-20260316-1754",
      "mode": "deep",
      "commit": "a2e28b3",
      "zones": ["student"],
      "findingsNew": 5,
      "findingsRecurring": 8,
      "findingsResolved": 2,
      "findingsRegressed": 1
    }
  ],
  "findings": [
    {
      "fingerprint": "bug:useQuizAttempt.ts:quiz-auto-finishes-refresh",
      "title": "Quiz Auto-Finishes on Page Refresh",
      "severity": "CRITICAL",
      "category": "bug",
      "location": "lms/src/hooks/lesson/useQuizAttempt.ts:36-88",
      "relatedFiles": ["useQuizAttempt.ts", "quiz-storage.ts", "QuizContainer.tsx"],
      "firstSeenRun": "run-20260316-1200",
      "firstSeenAt": "2026-03-16",
      "lastSeenRun": "run-20260316-1754",
      "lastSeenAt": "2026-03-16",
      "seenCount": 2,
      "status": "open",
      "fixedInCommit": null,
      "acceptedReason": null
    }
  ]
}
```

### Finding Statuses

| Status | Meaning | How it's set |
|--------|---------|-------------|
| `open` | Found and not yet fixed | Auto — found in latest run |
| `fixed` | Was in ledger, NOT found in latest run where its files were in scope | Auto — orchestrator marks when finding disappears |
| `accepted` | Manually accepted — will be suppressed in future reports | Manual — user runs `/smart-test accept [fingerprint]` |
| `regressed` | Was `fixed`, reappeared in a later run | Auto — promoted to CRITICAL severity |

### Fingerprint Generation

The orchestrator generates a stable fingerprint for each finding using:

```
fingerprint = "{category}:{primary_file_basename}:{slugified_title_keywords}"
```

Example: A finding with category `bug`, location `useQuizAttempt.ts:36`, title "Quiz Auto-Finishes on Page Refresh" produces:
```
bug:useQuizAttempt.ts:quiz-auto-finishes-refresh
```

### Cross-Run Matching

Two findings match if ANY of these are true:
1. **Fingerprint collision** — exact same fingerprint string
2. **File overlap + title similarity** — `relatedFiles` overlap >60% AND title shares >50% of significant keywords (excluding stop words like "the", "on", "in", "a")

### Ledger Update Logic (run by orchestrator after each mode)

For each finding returned by subagents in the current run:
1. Generate fingerprint
2. Search ledger for match (fingerprint or file+title similarity)
3. **If match found:**
   - Update `lastSeenRun`, `lastSeenAt`, `seenCount`
   - If severity changed, use the higher severity
   - If status was `fixed`, change to `regressed` and promote to CRITICAL
   - Mark as RECURRING in the markdown report
4. **If no match:**
   - Add to ledger as new finding with status `open`
   - Mark as NEW in the markdown report

For ledger findings NOT seen in the current run:
5. **If the finding's zone was tested in this run** (the relevant files/pages were in scope):
   - Change status from `open` to `fixed`
   - Record `fixedInCommit` as the current HEAD
   - Mark as RESOLVED in the markdown report
6. **If the finding's zone was NOT tested** (e.g., only student zone was tested but finding is in admin zone):
   - Leave status unchanged — cannot confirm either way

### Migration from known-issues.json

If `lms/test-results/known-issues.json` exists, the orchestrator should:
1. Read each entry
2. Convert to a ledger finding with `status: "accepted"` and `acceptedReason` from the `reason` field
3. Add to the findings array
4. Delete (or rename) `known-issues.json`
5. This migration runs once automatically

---

## Directory Structure

After all modes have been run at least once:

```
lms/test-results/
├── findings-ledger.json                 ← persistent findings database (ALL modes)
├── app-map.json                         ← route inventory (static + crawl)
├── baseline.json                        ← known-good snapshot (baseline mode)
├── smart-test-2026-03-15-0129.md       ← full sweep report (view of ledger)
├── smart-test-2026-03-15-1430.md       ← diff report (view of ledger)
├── smart-test-2026-03-15-1445.md       ← verify report
├── verify-fail-admin-users.png         ← failure screenshots
├── deep-student-empty-search.png       ← deep-dive screenshots
├── adversary-student-idor.png          ← adversary screenshots
└── crawl-screenshots/                   ← crawl discovery screenshots
    ├── student-dashboard.png
    ├── professor-kpi.png
    └── ...
```
