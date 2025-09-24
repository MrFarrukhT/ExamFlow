/implement_step

You may write code for the next planned step only.

Rules:
- Minimal diff; change only the files listed in the plan.
- Keep style/linters; no drive-by edits; respect budgets.
- If existing code already solves it, modify/extend instead of duplicating.

Before code, answer RUBRIC (1–2 lines each):
- Validation: where/how are inputs checked?
- AuthZ: which check(s) guard this path?
- Errors: which AppError kinds can be raised?
- Perf: why is this not O(n^2)? any pagination/cache?
- Reuse: which helpers/utilities are leveraged?
- Observability: logs/metrics/traces added?
- Tests-next: filenames you will add/modify

Output:
1) Patch/diff for this step (only planned files)
2) Rationale (≤2 lines: why this change, why safe/reversible)
3) TODO (tests to add next)

Stop if scope creep or budget exceeded; propose a split into a new step.