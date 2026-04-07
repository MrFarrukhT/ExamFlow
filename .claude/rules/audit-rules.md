# Audit Rules — Test System v2

## Severity Classification

### CRITICAL
- SQL injection (raw string interpolation in queries)
- Database credentials exposed in client-side code
- Unvalidated user input passed to `eval()` or `innerHTML` with user data
- Missing parameterized queries in any SQL statement
- XSS via unsanitized HTML rendering of user answers

### HIGH
- Missing input validation on API endpoints
- Exposed secrets in version-controlled files (.env committed)
- Missing CORS restrictions on sensitive endpoints
- No rate limiting on submission endpoints
- Unhandled promise rejections that crash the server
- Audio data stored without size limits

### MEDIUM
- Missing error handling in async Express routes
- Inconsistent response formats across endpoints
- Hardcoded configuration that should be in .env
- Missing request body validation
- Dead code / unreachable code blocks
- Duplicated database query patterns

### LOW
- Console.log statements in production code
- Inconsistent naming conventions (camelCase vs snake_case)
- Missing JSDoc on exported functions
- Unused CSS selectors
- Missing alt attributes on images

## False Positives — DO NOT Flag

- `rejectUnauthorized: false` in SSL config — required for Neon pooler
- Database connection strings in server files — these are server-side only
- `express.static('./')` — intentional, serves test HTML files
- `disable-web-security` in batch launchers — required for local file access
- Base64 audio data in submissions — required for speaking test storage
- Large JSON payloads (50mb limit) — required for audio submissions
- No authentication on student test pages — by design, controlled by invigilator
- `localStorage` for answer persistence — intentional offline-first approach

## Domains

### Security
- Focus: SQL injection, XSS, input validation, CORS, rate limiting
- Key files: `local-database-server.js`, `cambridge-database-server.js`, `admin/api/*.js`

### Architecture
- Focus: Code duplication between IELTS/Cambridge servers, god files, dead code
- Key files: Both server files, `assets/js/core.js`, dashboard HTML files

### API
- Focus: Consistent response format, error handling, validation
- Key files: All Express route handlers

### Database
- Focus: Query safety, missing indexes, N+1, connection handling
- Key files: Both server files, `admin/api/*.js`

### Frontend
- Focus: DOM security, event handler leaks, accessibility, dead JS/CSS
- Key files: `assets/js/*.js`, `assets/css/*.css`, all HTML files
