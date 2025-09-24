/refactor_touchup

You may write code but not change behavior.

Scope:
- Only touched surfaces from this plan.
- No API/DB/contract changes. Tests must still pass.

Rules:
- Minimal diff; respect budgets (≤ N lines, ≤ M files).
- Remove duplication, extract helpers, improve names.
- Keep signatures stable; add adapters if needed.
- Add/adjust brief docstrings; no logic edits.

Before you refactor, state:
- Invariants: what must not change (API, types, side-effects).
- Targets: files/functions you’ll touch.

Output:
- Rename Map (old → new) and moved helpers (from → to)
- Before → After snippet pairs (short, focused)
- Patch/diff (only planned files)
- Safety Notes (1–2 lines: why behavior unchanged)
- Follow-ups (if bigger cleanups needed, list as separate tasks)
