# Post-Fix Verification

## Compilation Verification

After all fix agents return, the orchestrator runs:

```bash
cd lms && npx tsc --noEmit 2>&1 | head -50
```

### If compilation succeeds
All fixes are valid. Proceed to ledger update.

### If compilation fails

**Step 1: Identify the broken fix**
- Parse the tsc error output for file paths
- Match each error file to the fix agent that modified it
- Errors in files NOT touched by any fix agent indicate a pre-existing issue (ignore)

**Step 2: Spawn repair agent**
Give the repair agent:
- The tsc error output (relevant lines only)
- The file that has errors
- What was changed and why (the finding + fix summary)

The repair agent should:
1. Read the file
2. Understand the compilation error
3. Fix the type error while preserving the intended fix
4. Common issues:
   - Missing import for a new type/function used
   - Type mismatch when adding a guard clause (need to narrow the type)
   - Optional chaining changing the return type (need `?? defaultValue`)

**Step 3: Re-verify**
Run `tsc --noEmit` again. If still failing after 2 repair attempts:
- Revert the specific file: `git checkout -- <file_path>`
- Mark that finding as "open" with note: "Auto-fix attempted, compilation failed"
- Continue with other successful fixes

## What NOT to verify

- Runtime behavior (that's `/smart-test verify`)
- Test suite (tests may not exist or may be broken independently)
- Lint rules (not a blocker for fixes)
- Browser rendering (that's `/smart-test verify`)

## Verification is compile-only

The `/fix` skill is intentionally limited to compile-time verification. For runtime verification:
- Use `/smart-test verify` after committing fixes
- Use `/audit live` to re-verify audit findings in browser

This separation keeps `/fix` fast and focused.
