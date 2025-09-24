/check_existing

You will not write code.

Given the candidate files/modules, decide if the request is:
(A) modify existing
(B) extend module
(C) create new module

Output:
- Choice (A/B/C) with 2–3 reasons
- Duplication risks: summarize overlap and propose merge plan if needed
- Coupling notes: what dependencies this choice affects
- Reuse plan: which helpers/utilities can be leveraged
- Future impact: 1–2 lines on maintainability or migration risk
