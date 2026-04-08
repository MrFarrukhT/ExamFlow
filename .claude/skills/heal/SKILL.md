---
name: heal
description: "Self-healing code quality loop for the Test System. Scans for issues, fixes them, verifies the fix, commits, and loops. Adapted for vanilla HTML/CSS/JS + Node.js/Express exam platform — no TypeScript, no build step."
---

# Heal — Self-Healing Code Quality Loop

You are a senior engineer who finds problems and fixes them in the same breath. No reports that sit in a drawer. No separate "fix later" step. You scan, you fix, you verify, you move on.

---

## Project Context

This is a **vanilla JavaScript** project — no TypeScript, no build step, no framework.

- **Backend:** Node.js + Express (ES Modules) — two servers
  - IELTS: `local-database-server.js` (port 3002)
  - Cambridge: `cambridge-database-server.js` (port 3003)
  - Admin: `admin/server.js` (port 3000, CommonJS)
- **Frontend:** Static HTML + vanilla JS (`assets/js/`) + CSS (`assets/css/`)
- **Database:** PostgreSQL (Neon) via `pg` client with parameterized queries
- **No TypeScript** — verification uses `node --check` and browser testing, not `tsc`

---

## Invocation

```
/heal                    # Full auto — scan all domains, fix what you find
/heal security           # Security domain only
/heal architecture       # Dead code, duplication, god files only
/heal api                # API consistency only
/heal database           # Query safety, indexes only
/heal frontend           # DOM security, event leaks, dead CSS/JS only
/heal --max-rounds=5     # Limit iterations (default: 3)
/heal --severity=HIGH    # Only fix HIGH and above
```

Read `heal-journal.md` (project root) if it exists. Don't repeat past work.

---

## The Loop

```
REPEAT until clean or diminishing returns:

  +---------------------------------+
  |  1. SCAN (subagents, parallel)  |
  |  Find issues in code.           |
  |  Max 5 domains in parallel.     |
  +-----------------+---------------+
                    |
  +-----------------v---------------+
  |  2. RANK (you, 10 sec)          |
  |  Pick top 5 fixable findings.   |
  |  Skip unfixable (arch, deps).   |
  +-----------------+---------------+
                    |
  +-----------------v---------------+
  |  3. FIX (parallel agents)       |
  |  One agent per file group.      |
  |  Minimal, correct fixes.        |
  +-----------------+---------------+
                    |
  +-----------------v---------------+
  |  4. VERIFY (you)                |
  |  Syntax check (node --check).   |
  |  Revert what breaks.            |
  |  Commit what works.             |
  +-----------------+---------------+
                    |
  +-----------------v---------------+
  |  5. LEDGER (you)                |
  |  Update audit-ledger.json.      |
  |  Mark fixed findings.           |
  |  Log to heal-journal.md.        |
  +---------------------------------+
```

---

## Step 0: Pre-flight

Read these yourself (not via agent):

1. **`.claude/rules/audit-rules.md`** — severity classification, false positives
2. **`audit-ledger.json`** — existing findings (create in project root if missing)
3. **`heal-journal.md`** — previous heal sessions (skip past work)

If `audit-ledger.json` doesn't exist, initialize:
```json
{
  "version": 1,
  "lastRunAt": null,
  "lastRunCommit": null,
  "runs": [],
  "findings": []
}
```

**Checkpoint:** State: "Ledger loaded: {N} total, {N} open. Journal: {N} previous sessions."

---

## Step 1: SCAN — Find the Problems

### Before scanning:
```bash
git add -A && git commit -m "heal: checkpoint before round N"
```

### Domains for this project

| Agent | Focus | Key Files |
|-------|-------|-----------|
| security | SQL injection, XSS, input validation, CORS, secrets exposure | `local-database-server.js`, `cambridge-database-server.js`, `admin/api/*.js`, all HTML files with inline `<script>` |
| api | Consistent response format, error handling, validation, missing endpoints | Both server files, `admin/api/*.js` |
| database | Query safety, missing indexes, connection handling, N+1 patterns | Both server files |
| architecture | Code duplication between servers, god files, dead code, unused CSS/JS | All `.js` and `.html` files |
| frontend | DOM security (`innerHTML` with user data), event listener leaks, accessibility, dead CSS | `assets/js/*.js`, `assets/css/*.css`, all HTML files |

### Scanner output format

Each scanner returns findings in **fix-ready format**:

```markdown
### [{SEVERITY}] {Title}

**Fingerprint:** {domain}:{file_basename}:{slug}
**File:** {exact_path}:{line_start}-{line_end}
**Fixable:** Yes / No (needs architecture) / No (needs migration)

**Code now:**
```javascript
{3-10 lines with line numbers}
```

**Code should be:**
```javascript
{concrete replacement code}
```

**Why:** {1 sentence}
```

---

## Step 2: RANK — Pick What to Fix

You rank, not an agent. Pick **max 5** to fix this round.

**Priority order:**
1. CRITICAL — always fix first
2. HIGH with `Fixable: Yes` — fix next
3. MEDIUM with `Fixable: Yes` and low effort — fill remaining slots
4. Skip LOW in early rounds

**Skip entirely:**
- Findings marked `Fixable: No`
- Findings that need database migrations
- Findings that need dependency changes
- Findings already fixed in a previous round

---

## Step 3: FIX — Sequential on Main Branch

### Group by file

Multiple findings in the same file → fix them together.

### For each finding:

1. Read the full target file
2. Use the Edit tool for surgical changes
3. Follow existing code patterns (ES Modules for server files, vanilla JS for frontend)
4. Make the minimal change — nothing more
5. Don't touch other files. Don't refactor. Don't add comments.
6. If the suggested fix doesn't work after reading context, skip it and log why.

### Work directly — no subagents for code changes.

Fix each finding yourself, sequentially. Read the file, make the edit, move to the next. Max 5 findings per round.

---

## Step 4: VERIFY — Syntax Check + Revert Bad Fixes

### 4a. JavaScript syntax check

For server-side files:
```bash
node --check local-database-server.js 2>&1
node --check cambridge-database-server.js 2>&1
```

For frontend JS files:
```bash
node --check assets/js/core.js 2>&1
# etc. for any modified JS files
```

For HTML files with inline scripts — open in browser and check console.

### 4b. If syntax check fails:

1. Identify which file caused the error
2. Try one repair attempt
3. If still failing: revert that file
   ```bash
   git checkout -- {file}
   ```
4. Log as "reverted — syntax error"

### 4c. If all checks pass:

```bash
git add -A && git commit -m "heal: round N — {summary of what was fixed}"
```

### 4d. Browser verification (CRITICAL/HIGH security findings only)

For security findings that are browser-testable:
```bash
playwright-cli open http://localhost:3002
# Test the specific endpoint/page
playwright-cli close
```

---

## Step 5: LEDGER — Update Persistent State

### 5a. Update audit-ledger.json

For each finding this round:
- **Fixed:** Set `status: "fixed"`, `fixedInCommit: "{hash}"`
- **Reverted:** Leave as `open`, add note
- **New finding not in ledger:** Add appropriately
- **Cannot fix:** Leave as `open`, add note

### 5b. Update heal-journal.md

```markdown
### Round N
- [CRITICAL] {title} → fixed — `{file}`
- [HIGH] {title} → fixed — `{file}`
- [MEDIUM] {title} → reverted (syntax error) — `{file}`

### Deferred
- {title} — needs architecture change
```

### 5c. Write both files using Write tool directly

**HARD GATE:** Never delegate ledger writes to a subagent.

---

## When to Stop

- **No fixable findings remain** → stop
- **All remaining are LOW** and 2+ rounds done → stop
- **Same findings keep appearing** → stop, flag for manual
- **Max rounds reached** (default 3) → stop

Report:
> "Healed {N} findings across {N} rounds. {N} deferred (need manual work)."
> Then list deferred items.

---

## The Journal

Maintain `heal-journal.md` in the project root:

```markdown
# Heal Journal

## Session: YYYY-MM-DD HH:mm
Domains: {which domains were scanned}
Starting state: {N} open findings in ledger

### Round 1
- [CRITICAL] {title} → {fixed/reverted/skipped} — `{file}`

### Round 2
- [MEDIUM] {title} → {fixed/reverted/skipped} — `{file}`

### Deferred
- {title} — needs: {architecture/migration/manual}

### Stats
Rounds: {N} | Fixed: {N} | Reverted: {N} | Deferred: {N}
Ending state: {N} open findings in ledger
```

---

## Fix Quality Rules

### DO
- Read entire target file before changes
- Follow existing patterns (ES Modules for servers, vanilla JS for frontend)
- Make the minimal change that resolves the finding
- Use `pg` parameterized queries (`$1`, `$2`, etc.)
- Use Edit tool for surgical changes

### DO NOT
- Modify files outside assignment
- Add comments explaining the fix
- Refactor surrounding code
- Add new dependencies
- Change function signatures without checking callers
- Convert CommonJS to ESM or vice versa

### Codebase Patterns

**Express routes:**
```javascript
app.post('/endpoint', async (req, res) => {
    try {
        const dbClient = await ensureConnection();
        const result = await dbClient.query(`...`, [params]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: '...', error: error.message });
    }
});
```

**Database queries (parameterized):**
```javascript
const result = await dbClient.query(
    'SELECT * FROM table WHERE id = $1 AND level = $2',
    [id, level]
);
```

**Frontend localStorage:**
```javascript
localStorage.setItem('key', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('key') || '{}');
```

---

## Severity → Action Mapping

| Severity | Action | Max per round |
|----------|--------|---------------|
| CRITICAL | Fix immediately, browser-verify | 1-2 |
| HIGH | Fix this round | 2-3 |
| MEDIUM | Fix if slots remain | Up to 5 |
| LOW | Fix in later rounds only | Up to 5 |

---

## Error Recovery

| Situation | Action |
|-----------|--------|
| Syntax check fails after fix | Revert file, log, continue |
| Fix agent can't fix | Log as deferred, continue |
| Fix makes thing worse | Revert, log, continue |
| Same finding keeps appearing | After 2 attempts, defer as "needs manual" |
| All agents fail | Stop round, report what happened |

The system never gets stuck. It reverts, logs, and moves on.

---

## Integration with /loop

```
/loop 20m /heal security     # Every 20 min, scan security
/loop 30m /heal               # Every 30 min, full scan
```
