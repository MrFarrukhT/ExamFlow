/pr_body

You will not write app code.

Prepare a PR body that captures context and validation.

Output:
- Summary: 2–4 lines on what changed & why
- Links: relevant docs (/docs/specs/<FEATURE>.md, ADR if exists)
- Checklist:
  [ ] Lint/Types
  [ ] Unit/Integration tests
  [ ] E2E/Browser tests
  [ ] Security scan
  [ ] Performance check (p95, DB pool, cache)
  [ ] Docs updated
- Validation Summary: what was run, what passed/failed
- Risks: top 2–3 with mitigations
- Rollback Steps: feature flag off, revert migration, config toggle
- Release Notes: 1–2 lines in user-facing language (optional)
