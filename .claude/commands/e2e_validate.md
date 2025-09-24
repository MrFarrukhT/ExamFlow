/e2e_validate

You will not write app code.

Goal: run end-to-end checks created in /tests_add against a realistic env (prod-like base URL, HTTPS, real CORS/CSP/cookies), then report gaps and tiny fixes.

Scope:
- Only flows and surfaces changed in this plan.
- Deterministic: fixed clock, seeded data, no sleep() — wait on signals.

Runbook:
- Frontend↔Backend: CORS preflight + actual request; auth headers; (optional) WebSocket connect/echo.
- Browser Security: CSP header present/correct; HTTPS required in prod; cookie flags (HttpOnly, Secure, SameSite).
- Auth Flow: login → store token → protected route → token expiry/refresh → logout cleanup.
- API Contracts: content-type, error envelope shape, rate-limit headers; file upload/download if present.
- UX/Perf: loading/error states visible; p95 under budget on changed endpoints; light concurrent users; DB connection ceiling respected.

Output:
- Happy paths (bullet steps + actual assertions passed)
- Failure paths (what was simulated + expected vs actual)
- Browser/CORS/CSP findings (exact headers seen)
- Gaps (missing tests/config), with tiny proposed diffs
- Monitoring blind spots (events/logs missing), with 1-line add plan
- Perf notes (measured p95, any bottleneck hints)

If any critical fails:
- Mark “BLOCKER” and propose a 1–2 step fix with minimal diffs.
- End with “Ready to proceed” or “Needs fixes (see above)”.
