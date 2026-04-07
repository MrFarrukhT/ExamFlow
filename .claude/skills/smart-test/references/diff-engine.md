# Diff Engine — Auto-Discovery File-to-Route Mapping

This reference defines how to map changed files to affected test targets. Used by `/smart-test diff` and `/smart-test verify` modes.

**Key principle:** The file→route mapping is **computed from the file system**, not maintained in a static table. This means new routes are automatically discovered without manual updates.

---

## How Diff Mode Works

### Step 1: Determine the base commit

Priority order:
1. User-specified: `--base=abc1234`
2. Last run: read `lms/test-results/findings-ledger.json` → `lastRunCommit` field
3. Last baseline: read `lms/test-results/baseline.json` → `gitCommit` field
4. Fallback: `HEAD~1`

### Step 2: Get changed files

```bash
git diff {base}..HEAD --name-only -- 'lms/src/'
```

### Step 3: Auto-discover affected routes

For each changed file, determine affected routes using these rules:

#### Rule 1: Page files → direct route mapping

Convert the file path to a URL route:

```
src/app/student/page.tsx           → /student
src/app/student/study/[lessonId]/page.tsx → /student/study/[lessonId]
src/app/admin/courses/[id]/page.tsx → /admin/courses/[id]
src/app/(landing)/about-zarmed/page.tsx → /about-zarmed
```

**Algorithm:**
1. Strip `src/app/` prefix and `/page.tsx` suffix
2. Remove route group parentheses: `(landing)/` → ``
3. The remaining path is the URL route
4. Determine role from the first path segment: student, professor, admin, editor, or public

#### Rule 2: API route files → find consuming pages

For changed `route.ts` files:

1. Convert to API path: `src/app/api/quiz/attempts/[id]/route.ts` → `/api/quiz/attempts/[id]`
2. **Find consumers** by grepping the codebase for this API path:
   ```
   Grep for: /api/quiz or fetch.*quiz or api/quiz
   In: src/app/**/page.tsx, src/hooks/**, src/components/**
   ```
3. The pages that import/use these consumers are the affected pages
4. Determine roles from the consuming page paths

#### Rule 3: Component files → find importing pages

For changed files in `src/components/`:

1. Get the component's export name or file path
2. Grep for imports of this component:
   ```
   Grep for: from.*components/{component-path}
   In: src/app/**/page.tsx, src/components/**
   ```
3. Trace transitively until you reach page.tsx files
4. Those page routes are affected

#### Rule 4: Hook files → find importing pages

For changed files in `src/hooks/`:

1. Grep for imports of the hook:
   ```
   Grep for: from.*hooks/{hook-file}
   In: src/app/**/page.tsx, src/components/**
   ```
2. Trace transitively to page.tsx files
3. Those page routes are affected

#### Rule 5: Shared library files → broad impact

For changed files in `src/lib/`:

| File | Impact | Test strategy |
|------|--------|---------------|
| `auth.ts` | ALL authenticated pages | Test login + one page per role |
| `db.ts` | ALL database-backed pages | Test one page per role |
| `types.ts` | Potentially all pages | Check TypeScript build first, then test one page per role |
| `schemas.ts` | All forms using validation | Grep for schema imports, test those pages |
| `api-response.ts` | All API consumers | Test one API-heavy page per role |
| `api-middleware.ts` | All API routes | Test one page per role |
| `rate-limit.ts` | Auth + submission endpoints | Test login + one POST per role |
| `session-store.ts` | Session management | Test login/logout flow |
| `content/**` | Lesson content | Test `/student/study/*` with affected lesson |

**Note:** For `src/lib/` files not in this table, grep for imports to determine impact dynamically.

#### Rule 6: Config files → full verification

| File | Test strategy |
|------|---------------|
| `package.json` | Full build check + one page per role |
| `next.config.*` | Full build check + one page per role |
| `tailwind.config.*` | Visual check on one page per role |
| `tsconfig.json` | Build check |
| `.env*` | Test one page per role |

### Step 4: Classify the change scope

After mapping files to routes, classify:

| Scope | Criteria | Action |
|-------|----------|--------|
| **Trivial** | Single page file, no API changes | Verify mode sufficient |
| **Moderate** | 2-5 files, API + page, or shared component | Targeted diff agents |
| **Broad** | 6+ files, multiple zones | Multi-zone diff agents |
| **Critical** | Auth/DB/types changed, or 15+ files | Recommend full sweep |

### Step 5: Spawn targeted agents

Only spawn agents for affected zones. Each agent gets:
- The specific pages to test (from route mapping)
- The specific changed files to review (from git diff)
- Context about what changed (brief diff summary)
- Open findings from the ledger for those pages (for confirmation/clearing)

### Step 6: Merge results into findings ledger

Follow the standard merge logic (Step 4 of the main orchestration in SKILL.md).

---

## Baseline Comparison Logic

When `baseline.json` exists and diff mode runs:

### For each page in the baseline that's in an affected zone:

1. **Visit the page** in browser
2. **Count elements** — compare against baseline counts
3. **Check key text** — compare against baseline text snapshots
4. **Check API responses** — compare response shapes
5. **Check console** — new errors not in baseline?

### Regression detection rules:

| Check | Regression threshold | Finding severity |
|-------|---------------------|-----------------|
| Table rows dropped to 0 | Was >0, now 0 | HIGH |
| Table rows changed >50% | ±50% change | MEDIUM |
| New console error | Any new error | HIGH |
| API status changed | Was 200, now 500 | CRITICAL |
| API response missing keys | Key in baseline but not current | HIGH |
| Heading changed to "undefined" | Contains "undefined"/"null"/"NaN" | HIGH |
| Element count dropped >80% | ±80% change | MEDIUM |
| Page fails to load | Was success, now error | CRITICAL |

### Non-regression changes (ignore):

- Data count changes within ±30% (natural data growth/shrink)
- New elements added (improvements)
- Text content changes (data updates)
- Additional API calls (new features)
- Faster load times (improvements)

---

## Example Diff Run

Given these changed files:
```
lms/src/app/api/users/route.ts
lms/src/app/admin/users/page.tsx
lms/src/app/api/users/[id]/route.ts
```

**Auto-discovery result:**
- `admin/users/page.tsx` → Rule 1: direct route `/admin/users`
- `api/users/route.ts` → Rule 2: grep for `/api/users` → found in `admin/users/page.tsx` → `/admin/users` (already mapped)
- `api/users/[id]/route.ts` → Rule 2: grep for `/api/users/` → found in `admin/users/page.tsx` → `/admin/users`
- Zone: `admin`
- Roles: `admin`
- Classification: Moderate (3 files, single zone)

**Agent spawned:** One admin-zone agent that:
1. Logs in as admin
2. Goes to `/admin/users`
3. Checks page loads correctly
4. Tests user list, filtering, search
5. Tests user detail page (navigate to one user)
6. Reviews the changed code in the 3 files
7. Compares against baseline if available
8. Checks open ledger findings for admin zone
9. Reports findings (new + recurring + resolved)
