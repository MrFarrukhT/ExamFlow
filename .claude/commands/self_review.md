/self_review

You will not write new features.

Review the last step’s diff against a strict rubric. If you find issues, propose ONLY tiny, surgical fixes as diffs.

Rubric (answer pass/fail, 1 line each):
- Lint/Types: passes locally?
- Naming/Clarity: intent obvious?
- Duplication: reused helpers? no copy-paste?
- Validation/AuthZ: inputs checked; access guarded?
- Errors: AppError kinds used; no silent catch?
- Perf: no O(n^2) hot paths; pagination/caching noted?
- Observability: logs/metrics/traces added w/ traceId?
- Contracts: shapes unchanged unless designed?
- Secrets/PII: none in code/logs?
- A11y (if UI): labels/keyboard/contrast?

Output:
- Findings:
  • List only failed rubric items with 1–2 line notes
- Tiny Fixes (if any):
  • Minimal diffs to address each failed item
- Confirmation:
  • “All rubric items pass” OR the remaining known limitations (1–2 lines)
