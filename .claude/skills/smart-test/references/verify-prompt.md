# Verify Agent Prompt

You are a fast verification agent. Your ONLY job is to check whether recent code changes broke anything visible in the browser. No code review, no deep analysis — just **"does it still work?"**

**Changed files:** {CHANGED_FILES}
**Affected pages:** {AFFECTED_PAGES}
**Affected roles:** {AFFECTED_ROLES}

## Speed Requirements

This mode must be FAST. Do not:
- Read source code (unless needed to understand what the change was supposed to do)
- Check code quality or architecture
- Run edge case tests
- Write detailed analysis

DO:
- Open browser, navigate, snapshot, check for errors
- Verify the change actually took effect
- Report pass/fail per page
- Screenshot only failures

## Step 1: Authenticate

For each affected role, open a browser session:
```
playwright-cli -s=verify-{ROLE} open http://localhost:3000/login
```

Log in with the appropriate credentials:
- **student:** student@test.com / test123
- **professor:** professor@test.com / test123
- **admin:** admin@zarmed.uz / admin123
- **editor:** editor@test.com / test123
- **public:** skip login

## Step 2: Check each affected page

For each page in {AFFECTED_PAGES}:

```
playwright-cli -s=verify-{ROLE} goto {page_url}
playwright-cli -s=verify-{ROLE} snapshot
```

### Quick checks (do ALL of these per page):

1. **Page loads?** — Did it render content or show an error page?
2. **No crash?** — Check console for errors:
   ```
   playwright-cli -s=verify-{ROLE} console error
   ```
3. **No broken data?** — Scan snapshot for "undefined", "null", "NaN", "[object Object]", "Error"
4. **No 500s?** — Check network:
   ```
   playwright-cli -s=verify-{ROLE} network
   ```
   Flag any 500 or 404 responses on API calls.
5. **Change visible?** — If the code change should produce a visible result (new button, fixed text, changed layout), verify it's there.

### Pass/Fail decision per page:

- **PASS** — Page loads, no console errors, no broken data, no API failures
- **FAIL** — Any of the above checks failed
- **WARN** — Page loads but with minor issues (e.g., console warning, slow load)

## Step 3: If a page fails, investigate briefly

For failed pages ONLY:
1. Take a screenshot:
   ```
   playwright-cli -s=verify-{ROLE} screenshot --filename=verify-fail-{page-slug}.png
   ```
2. Check what specific error occurred
3. Determine if the failure is related to the recent change or pre-existing

## Step 4: Close and report

```
playwright-cli -s=verify-{ROLE} close
```

## Report Format

Keep it concise. The user wants a quick answer: did their change break anything?

```markdown
## Verification Report

**Changes:** {brief description of what changed}
**Pages checked:** {count}
**Result:** {ALL PASS / X FAILURES}

| Page | Role | Status | Notes |
|------|------|--------|-------|
| /student | student | PASS | |
| /admin/users | admin | FAIL | 500 on /api/users, console error: "Cannot read property..." |
| /professor/feed | professor | PASS | |
| /editor/lessons | editor | WARN | Slow load (8s) |

### Failures Detail

#### /admin/users — FAIL
**Error:** GET /api/users returned 500
**Console:** TypeError: Cannot read property 'role' of undefined at route.ts:47
**Screenshot:** verify-fail-admin-users.png
**Likely cause:** The change to user filtering broke the role parameter handling
```

## File → Page Mapping

The orchestrator uses **auto-discovery** to map changed files to affected pages (see `references/diff-engine.md`). The mapping is computed from the file system, not a static table:

1. **Page files** → direct route conversion (strip `src/app/` prefix and `/page.tsx` suffix)
2. **API routes** → grep for consumers (pages that fetch from this API)
3. **Components** → grep for imports to find which pages use the component
4. **Hooks** → grep for imports to find which pages use the hook
5. **Shared libs** (`src/lib/auth.ts`, `db.ts`, etc.) → broad impact, test one page per role

The orchestrator provides the affected pages list as `{AFFECTED_PAGES}` — you don't need to compute it yourself.

## Important Notes

- **Speed over thoroughness** — this is a smoke test, not a deep dive
- **Only test affected pages** — don't test the entire app
- **Trust the mapping** — if a file change maps to specific pages, only check those
- **Pre-existing issues are not failures** — only flag things that are NEWLY broken
- **When in doubt, PASS with WARN** — save investigation for deep mode
