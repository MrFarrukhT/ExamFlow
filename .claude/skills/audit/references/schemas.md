# Audit Data Schemas

These schemas define the persistent data files that enable cross-run intelligence.

---

## audit-ledger.json

**Location:** `lms/test-results/audit-ledger.json`
**Purpose:** Single source of truth for all audit findings across all runs.

### Schema

```json
{
  "version": 1,
  "lastRunAt": "2026-03-19T14:00:00Z",
  "lastRunCommit": "abc1234",
  "runs": [
    {
      "id": "audit-20260319-1400",
      "mode": "pipeline",
      "commit": "abc1234",
      "domainsAnalyzed": ["security", "types", "api", "database", "architecture", "best-practices"],
      "findingsNew": 23,
      "findingsRecurring": 5,
      "findingsResolved": 2,
      "findingsRegressed": 0,
      "researchSources": [
        { "url": "https://nextjs.org/docs/...", "topic": "Server Actions security" }
      ]
    }
  ],
  "bestPracticesCache": {
    "nextjs": {
      "version": "16.x",
      "fetchedAt": "2026-03-19T14:00:00Z",
      "recommendations": [
        {
          "title": "Use Server Actions for mutations",
          "source": "https://nextjs.org/docs/...",
          "applies": true,
          "detail": "Server Actions are preferred over API routes for form mutations..."
        }
      ]
    },
    "react": {
      "version": "19.x",
      "fetchedAt": "2026-03-19T14:00:00Z",
      "recommendations": []
    },
    "postgresql": {
      "fetchedAt": "2026-03-19T14:00:00Z",
      "securityAdvisories": [],
      "recommendations": []
    },
    "dependencies": {
      "fetchedAt": "2026-03-19T14:00:00Z",
      "stale": [],
      "deprecated": [],
      "cves": []
    }
  },
  "dependencyGraph": {
    "generatedAt": "2026-03-19T14:00:00Z",
    "commit": "abc1234",
    "orphans": ["src/lib/old-helper.ts"],
    "hotspots": ["src/lib/auth.ts", "src/lib/db.ts"],
    "circularDeps": [],
    "godFiles": [
      { "path": "src/lib/types.ts", "lines": 1200, "intentional": true }
    ]
  },
  "findings": [
    {
      "fingerprint": "security:route.ts:missing-auth-delete-users",
      "title": "Missing auth on DELETE /api/users/[id]",
      "severity": "CRITICAL",
      "category": "security",
      "domain": "security",
      "location": "lms/src/app/api/users/[id]/route.ts:45-49",
      "relatedFiles": ["route.ts", "auth.ts"],
      "evidence": {
        "codeSnippet": "export async function DELETE(request: NextRequest) {\n  const { id } = await request.json();\n  await query(`DELETE FROM users WHERE id = $1`, [id]);\n  return NextResponse.json({ success: true });\n}",
        "lineRange": [45, 49],
        "screenshotFile": null,
        "webResearchUrl": null
      },
      "impact": {
        "description": "Any authenticated user can delete any other user",
        "affectedRoutes": ["/admin/users"],
        "affectedRoles": ["all"],
        "removable": false,
        "dependents": []
      },
      "recommendation": {
        "action": "wrap_with_auth",
        "detail": "Add withPermission(['admin'], 'manage_users') wrapper to DELETE handler",
        "effort": "5 minutes",
        "codeChange": "export const DELETE = withPermission(['admin'], 'manage_users', async (request, { user }) => {\n  // existing logic\n});"
      },
      "firstSeenRun": "audit-20260319-1400",
      "firstSeenAt": "2026-03-19",
      "lastSeenRun": "audit-20260319-1400",
      "lastSeenAt": "2026-03-19",
      "seenCount": 1,
      "status": "open",
      "fixedInCommit": null,
      "acceptedReason": null,
      "liveVerified": false,
      "liveVerifiedAt": null
    }
  ]
}
```

### Finding Statuses

| Status | Meaning | Transitions |
|--------|---------|-------------|
| `open` | Active finding, needs attention | → `fixed`, `accepted` |
| `fixed` | Not found in latest run of its domain | → `open` (regressed) |
| `accepted` | Manually suppressed by user | → `open` (reopened) |
| `regressed` | Was `fixed`, reappeared — auto-promoted to CRITICAL | → `fixed` |

### Fingerprint Generation

```
fingerprint = "{domain}:{primary_file_basename}:{slugified_title_keywords}"
```

Rules:
- Domain: the audit domain (security, types, api, database, architecture, best-practices)
- Primary file: basename of the main file involved (e.g., `route.ts`)
- Title keywords: lowercase, hyphenated, stop words removed, max 6 words

Examples:
- `security:route.ts:missing-auth-delete-users`
- `types:api-response.ts:explicit-any-return-type`
- `architecture:old-helper.ts:dead-code-never-imported`
- `database:route.ts:n-plus-one-student-grades`

### Cross-Run Matching

When matching a new finding against the ledger:

1. **Exact fingerprint match** → same finding, update `lastSeenRun`, `seenCount`, `lastSeenAt`
2. **File overlap >60% AND title keyword overlap >50%** → likely same finding (renamed/reworded), update existing
3. **No match** → new finding, add to ledger with `status: "open"`

### Resolved Detection

After a run completes for domains D1, D2, ...:
- For each `open` finding in the ledger whose `domain` is in {D1, D2, ...}:
  - If NOT matched by any new finding → mark as `fixed`, set `fixedInCommit` to current HEAD
- For findings in domains NOT in {D1, D2, ...}: leave unchanged

### Regression Detection

During matching, if a finding with `status: "fixed"` gets matched:
- Set `status: "regressed"`
- Promote `severity` to `"CRITICAL"` (regardless of original severity)
- Set `seenCount += 1`

---

## bestPracticesCache

**TTL:** 7 days. Skip web research if `fetchedAt` is within 7 days of current date.

**Force refresh:** Use `--refresh` flag to ignore cache age.

The cache stores structured recommendations from web research, so subsequent runs can compare against the codebase without re-fetching.

---

## dependencyGraph

**Regenerated:** Every run that includes Step 2 (SCAN).

Stores:
- `orphans` — files that export symbols but are never imported
- `hotspots` — files imported by >10 other files (high-impact changes)
- `circularDeps` — arrays of file paths forming cycles
- `godFiles` — files >500 lines with `intentional: true/false` flag
