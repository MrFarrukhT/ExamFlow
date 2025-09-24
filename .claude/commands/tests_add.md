/tests_add

You may write tests only.

Scope:
- Cover ONLY surfaces touched in the plan (functions, routes, models, UI paths).
- Prioritize: contract tests → unit → integration → minimal e2e.
- Tests must be deterministic (seed data, fixed clock, isolated test DB, stub external I/O).

Rules:
- No flaky timing; wait on signals (status, text, event) not sleeps.
- Prefer provider/consumer contract tests when interfaces changed.
- Browser tests: 1 happy path + 1 failure path per changed flow (Playwright/Cypress).
- Security headers: assert CORS/CSP/Auth cookies on relevant endpoints.
- Performance: add a lightweight latency assertion ONLY for hot endpoints (p95 budget note).

Output:
- Test files (full content if small, otherwise unified diffs)
- Fixtures/factories/seeds added or updated
- Commands to run locally (unit/integration/e2e) and expected exit criteria
- Browser/security checks:
  • CORS preflight (curl or supertest snippet)
  • CSP header assertion
  • Cookie flags (HttpOnly, Secure, SameSite) assertion
- Summary: what each test asserts (1–2 lines per file)

Examples to include inline (adapt to stack):
- CORS preflight:
  curl -i -X OPTIONS https://localhost:3000/api/x \
    -H "Origin:https://app.local" -H "Access-Control-Request-Method:POST"
  # expect: 204/200 and Access-Control-Allow-Origin: https://app.local

- CSP header (supertest):
  await request(app).get('/').expect('Content-Security-Policy', /default-src 'self'/)

- Auth cookie flags (supertest):
  expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly; Secure; SameSite=Lax/)
