/security_perf_scan

You will not write app code (tiny diffs allowed for fixes).

Goal: check security + performance (incl. frontend↔backend) on the exact surfaces changed. Use prod-like env (HTTPS, real CORS/CSP/cookies).

Scope rules:
- Boundaries only (handlers, middleware, API clients, UI entry points)
- Deterministic: fixed clock, seeded data, no sleeps
- Collect evidence (headers, snippets, query plans) for each finding

Checklist (mark Pass/Fail + 1-line evidence):
Security
- Input validation at boundaries (schema present? where?)
- AuthZ on read/write paths (which guard?)
- Secrets via env; no secrets/PII in logs
- Logging redaction in place (tokens, emails, IDs masked)
- ORM/queries parameterized; no string-built SQL
- CORS: allowed origins precise; preflight handled
- CSP: header present; sensible default-src; script-src non-wildcard
- Cookies: HttpOnly, Secure, SameSite set where applicable
- HTTPS: enforced in prod; HSTS if applicable
- Dependency vulns/SAST on touched files (note tool result)

Frontend Integration Security
- Cross-origin auth header flow verified
- Token storage choice justified (httpOnly cookie vs localStorage)
- Error envelopes sanitized (no stack traces/leaks)

Performance
- p95 estimate for changed endpoints (evidence: quick run/log)
- No obvious O(n^2)/N+1; pagination where needed
- DB pooling healthy (max/idle/timeout); basic EXPLAIN for hot query
- Cache notes: hit path identified; TTL/keys, or “no cache” with reason
- Frontend↔backend latency under throttle (devtools/network)

Browser/Runtime
- Mixed content: none
- WebSocket stability (if used): connect/echo ok
- Upload/download limits + content-type checks

Output:
- Findings: list failed items with severity (High/Med/Low) + evidence
- Tiny Fixes: minimal diffs to remediate fails (only touched surfaces)
- Residual Risks: what remains + mitigation plan
- Verdict: “Ready to proceed” or “Needs fixes (see above)”
