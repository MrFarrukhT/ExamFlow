/task_plan

You will not write code.

Produce an ordered plan between 5 and 15 atomic steps with tiny diffs.

Rules:
- Each step touches specific files only (list exact paths).
- Keep changes reversible; add/flip feature flags if needed.
- Set budgets per step: max diff size, max files, max function churn.
- Declare expected signal per step (log/metric/trace or UI change).
- Respect deps (DAG): list `deps: [step#,...]`.
- If unknowns exist, insert a 15–30m spike step first.
- No meta steps (e.g., “run tests”); plan concrete edits only.

Output:
- Steps (1..N): {desc, files[], deps[], budgets{diff,files,funcs}, signal}
- End with: "Awaiting PROCEED."
