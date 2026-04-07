# Severity Classification & False Positive Rules

This document is a quick-reference for subagents. The authoritative source is `.claude/rules/audit-rules.md`.

---

## Severity Levels

### CRITICAL (S1) — Must fix immediately
- Missing authentication on data-modifying endpoints (POST, PUT, DELETE, PATCH)
- SQL injection (string concatenation/interpolation in queries)
- Exposed credentials in source code
- Path traversal vulnerabilities
- Session token exposure in logs or responses
- **Regressions** (was fixed, came back — auto-promoted)

### HIGH (S2) — Fix within 1 sprint
- Inconsistent authorization (some paths protected, others not)
- Missing rate limiting on auth endpoints
- XSS vulnerabilities (unsanitized user input rendered in HTML)
- Missing CSRF protection on state-changing endpoints
- Insecure Direct Object References (IDOR)

### MEDIUM (S3) — Plan to fix
- `any` type usage reducing type safety
- Inconsistent error handling patterns across similar endpoints
- Dead/unreachable code
- Missing database indexes on frequently queried columns
- N+1 query patterns in production paths
- Console.log in production code (not console.error in catch blocks)

### LOW (S4) — Nice to have
- Naming convention violations
- Unused imports
- Minor accessibility issues (missing alt text, aria-labels)
- Code style inconsistencies
- Small duplication (<10 lines)

---

## False Positive Patterns — DO NOT FLAG

### Authentication
- `/api/auth/login` without auth → expected (login endpoint)
- `/api/auth/logout` without auth → expected
- `/api/health` without auth → expected (health check)
- `getSession()` check inside handler → valid alternative to wrapper

### SQL Queries
- Template literals with ONLY `$1, $2, $3` placeholders → parameterized, safe
- String concatenation for table/column names from CONSTANTS (not user input) → safe
- Query builder patterns that sanitize internally → safe

### Type `any`
- External library type definitions (`.d.ts` files) → skip
- Catch block error parameters (`catch (e: any)`) → standard pattern
- `JSON.parse` results immediately validated → acceptable
- Generic type parameters constrained elsewhere → skip

### Console Statements
- `console.error` in catch blocks → legitimate error logging
- Intentional debug endpoints (marked with comment) → skip
- Server startup logs → skip

### Dead Code
- Feature flags (code behind feature toggle) → skip
- Backwards compatibility exports → skip
- Test utilities → skip

### Complexity
- Large `types.ts` → centralized types is intentional
- Path utilities (`createLessonPaths`) → reduces duplication, keep
- Auth middleware (`withAuth`, `withPermission`) → provides consistency, keep
- `ApiResponse` helpers → standardization, keep
- Storage provider abstraction → allows R2/local switching, keep

---

## Essential vs Accidental Complexity

### Essential (DO NOT flag as issues)
- 6+ user roles (medical education hierarchy requirement)
- Lesson workflow (draft → review → publish)
- Multi-language content (Uzbek/Russian/Latin)
- Quiz difficulty tiers
- Course enrollment constraints
- File storage abstraction (R2 vs local)

### Accidental (SHOULD flag)
- Auth check written manually when `withAuth` exists
- `NextResponse.json` used when `ApiResponse` is available
- Same validation regex in multiple files
- Component copied instead of parameterized
- Helper function used exactly once
- Re-export file that adds nothing
- Same logic duplicated in 3+ places
- God files >500 lines doing multiple unrelated things
- 5+ different patterns for the same operation

---

## Verification Requirements

Before marking a finding as VERIFIED, the subagent MUST:

1. **Read the actual file** — grep results alone are insufficient
2. **Navigate to the exact line** — confirm code matches
3. **Extract 3-10 lines** — copy actual code as evidence
4. **Check for compensating controls** — middleware, wrappers, parent components
5. **Confirm exploitability** — theoretical issues without real impact are LOW at best

When uncertain: do NOT report. Only report findings you can prove with code.
