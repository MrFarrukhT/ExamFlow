# Fix Strategies by Category

Each category has standard fix patterns. Fix agents should use these as starting points, adapting to the specific finding.

---

## Security Fixes

### Missing auth / authorization
```typescript
// BEFORE: No auth check
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await query(`DELETE FROM users WHERE id = $1`, [id]);
}

// AFTER: Add withAuth or withPermission wrapper
export const DELETE = withAuth(['admin'], async (request, { user }) => {
  const { id } = await request.json();
  await query(`DELETE FROM users WHERE id = $1`, [id]);
});
```

### Self-action prevention (e.g., admin self-deactivation)
```typescript
// Add guard before the mutation
if (targetUserId === user.id) {
  return ApiResponse.badRequest("O'z akkauntingizni o'zgartira olmaysiz");
}
```

### Missing input sanitization (XSS)
```typescript
// Find existing stripHtml in codebase and import it
import { stripHtml } from '@/lib/utils'; // or wherever it exists

// Apply in schema transform
const schema = z.object({
  content: z.string().min(1).max(5000).transform(stripHtml),
});

// OR apply before DB insert
const sanitizedContent = stripHtml(content);
```

### IDOR (Insecure Direct Object Reference)
```typescript
// Add ownership check
const resource = await queryOne<Resource>(
  `SELECT * FROM resources WHERE id = $1 AND owner_id = $2`,
  [resourceId, user.id]
);
if (!resource) {
  return ApiResponse.notFound("Topilmadi");
}
```

### Unscoped data queries
```typescript
// BEFORE: Returns all data
const students = await query(`SELECT * FROM students`);

// AFTER: Scope to professor's courses
const students = await query(
  `SELECT s.* FROM students s
   JOIN enrollments e ON e.student_id = s.id
   JOIN courses c ON c.id = e.course_id
   WHERE c.professor_id = $1`,
  [user.id]
);
```

### Missing rate limiting
```typescript
// BEFORE
export const POST = withAuth([], async (request, { user }) => { ... });

// AFTER
export const POST = withAuthAndRateLimit([], RateLimiters.api, async (request, { user }) => { ... });
```

---

## Bug Fixes

### Validation gaps (unbounded values, empty inputs)
```typescript
// Add .max() or .min(1) to Zod schema
const schema = z.object({
  score: z.number().min(0).max(100),  // add reasonable upper bound
  title: z.string().min(1).max(200),   // prevent empty and overflow
  options: z.array(z.string().min(1)), // prevent empty option text
});
```

### Progress exceeding bounds
```typescript
// Clamp values
const percentage = Math.min(100, Math.max(0, rawPercentage));
```

### Pagination totalCount bug
```typescript
// BEFORE: Returns page size as total
const items = await query(`SELECT * FROM table LIMIT $1 OFFSET $2`, [limit, offset]);
return { items, total: items.length }; // BUG: page size, not total

// AFTER: Separate count query
const [items, countResult] = await Promise.all([
  query(`SELECT * FROM table LIMIT $1 OFFSET $2`, [limit, offset]),
  queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM table`)
]);
return { items, total: countResult?.count ?? 0 };
```

### Hydration mismatch (Date in render)
```typescript
// BEFORE: new Date() during render
const startTime = useRef(new Date().toISOString());

// AFTER: Initialize in useEffect
const startTime = useRef<string | null>(null);
useEffect(() => {
  startTime.current = new Date().toISOString();
}, []);
```

### useEffect dependency issues
```typescript
// BEFORE: searchParams in dependency causes re-fire
useEffect(() => {
  // logic that uses searchParams
}, [searchParams]); // searchParams changes on every navigation

// AFTER: Extract value and use as dependency
const tab = searchParams.get('tab');
const initialTabRef = useRef(tab);
useEffect(() => {
  // Only run on mount with initial value
  if (initialTabRef.current) {
    setActiveTab(initialTabRef.current);
  }
}, []); // empty deps = mount only
```

### Nested interactive elements (a > button)
```typescript
// BEFORE: <Link> wrapping a <button>
<Link href={url}>
  <div>
    <button onClick={handleClick}>Action</button>
  </div>
</Link>

// AFTER: Use one interactive element
<div onClick={() => router.push(url)} role="link" tabIndex={0}
     onKeyDown={(e) => e.key === 'Enter' && router.push(url)}>
  <div>
    <span>Action</span>
  </div>
</div>

// OR: Make the whole card a link, remove inner button
<Link href={url}>
  <div>
    <span>Action</span>
  </div>
</Link>
```

### Form state not reset on dialog close
```typescript
// Add reset handler
const handleClose = () => {
  setFormData(initialState);
  setOpen(false);
};
```

### Empty string after sanitization
```typescript
// Check after sanitizing
const sanitized = stripHtml(content).trim();
if (!sanitized) {
  return ApiResponse.badRequest("Xabar bo'sh bo'lishi mumkin emas");
}
```

---

## Accessibility Fixes

### Missing h1
```typescript
// Add visually hidden h1 or promote existing h2
<h1 className="text-2xl font-bold">Page Title</h1>
// OR
<h1 className="sr-only">Page Title</h1>
```

### Multiple h1 elements
```typescript
// Demote secondary h1 to h2
// BEFORE: <h1>Secondary heading</h1>
// AFTER:  <h2>Secondary heading</h2>
```

### Missing aria-controls on tabs
```typescript
// Add aria-controls linking tab to panel
<button role="tab" aria-selected={active} aria-controls={`panel-${id}`}>
  {label}
</button>
<div role="tabpanel" id={`panel-${id}`}>
  {content}
</div>
```

### Missing skip-to-content
```typescript
// Add as first child of body/layout
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded">
  Asosiy mazmun
</a>
// ... later ...
<main id="main-content">
```

### Non-keyboard-accessible elements
```typescript
// Add tabIndex and keyboard handler
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
>
```

---

## UX Fixes

### alert() usage
```typescript
// BEFORE
alert('Xatolik yuz berdi');

// AFTER: Use toast or inline error state
setError('Xatolik yuz berdi');
// OR
toast.error('Xatolik yuz berdi');
```

### Hardcoded role links
```typescript
// BEFORE
<Link href="/student">Bosh sahifa</Link>

// AFTER: Use role from session
const dashboardUrl = user?.role === 'admin' ? '/admin' :
                     user?.role === 'professor' ? '/professor' :
                     user?.role === 'editor' ? '/editor' : '/student';
<Link href={dashboardUrl}>Bosh sahifa</Link>
```

### Raw Zod errors shown to users
```typescript
// BEFORE
return ApiResponse.badRequest(zodError.message);

// AFTER: Format errors for display
const formatted = zodError.issues.map(i => i.message).join(', ');
return ApiResponse.badRequest(formatted);
// OR: Use the existing handleApiError which should handle ZodError
```

### Search input without maxLength
```typescript
// Add maxLength to input and server validation
<input maxLength={200} ... />

// Server side
const q = searchParams.get('q')?.slice(0, 200) ?? '';
if (q.length < 2) {
  return ApiResponse.success({ results: [], message: "Kamida 2 ta belgi kiriting" });
}
```

---

## Database Fixes

### Missing transaction
```typescript
// BEFORE: Separate queries
await query(`INSERT INTO items ...`, [data]);
await createAuditLog(user.id, 'create', ...);

// AFTER: Wrap in transaction
await transaction(async (client) => {
  await client.query(`INSERT INTO items ...`, [data]);
  await client.query(`INSERT INTO audit_logs ...`, [user.id, 'create', ...]);
});
```

**Important:** If `createAuditLog` uses the pool directly (not the transaction client), you must either:
1. Inline the audit log INSERT inside the transaction, OR
2. Pass the transaction client to createAuditLog

### Missing index
```sql
-- Create a new migration file
CREATE INDEX idx_table_column ON table_name(column_name);
```
**Note:** Index additions require migration files. The fix agent should create the migration SQL file and note that it needs to be run on the database.

### Unbounded queries
```typescript
// Add LIMIT with reasonable default
const DEFAULT_LIMIT = 50;
const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
const offset = parseInt(searchParams.get('offset') || '0');

const items = await query(
  `SELECT * FROM table ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
  [limit, offset]
);
```

---

## Type Safety Fixes

### Non-null assertions on nullable results
```typescript
// BEFORE
const result = await queryOne<T>(sql);
return result!.count; // crashes if null

// AFTER
const result = await queryOne<T>(sql);
return result?.count ?? 0;
```

### Unsafe JWT payload cast
```typescript
// BEFORE
const payload = jwt.verify(token, secret) as JwtPayload;

// AFTER
const decoded = jwt.verify(token, secret);
if (!decoded || typeof decoded === 'string' || !('userId' in decoded)) {
  return null;
}
const payload = decoded as JwtPayload;
```

---

## Tech Debt Fixes

### Duplicate functions across files
```typescript
// 1. Find the most complete implementation
// 2. Move to shared location (e.g., lib/utils.ts)
// 3. Update all imports
// 4. Delete duplicates
```

### Dead code removal
```typescript
// Simply delete the unused file/function
// Verify no imports reference it first (grep for the export name)
```

### Stale comments
```typescript
// Remove or update comments that no longer match the code
// BEFORE: // SEC: Enrollment check ensures student has access
// AFTER: (remove if enrollment check was removed)
```

---

## Patterns to Follow

### Language
- Error messages in Uzbek (the app's primary language) unless the existing pattern uses English
- Check surrounding code for the language convention

### Imports
- Use `@/lib/...` path aliases
- Import from the same location as surrounding code
- If `ApiResponse` is imported from `@/lib/api-middleware`, keep it that way

### Error handling
- If the route uses `withAuth`/`withPermission`, don't add redundant try/catch (the wrapper handles it)
- If adding new error returns, use `ApiResponse.badRequest()` / `ApiResponse.notFound()` etc.

### Validation
- Use Zod schemas for input validation
- Use `validateBody()` helper if it exists in the codebase
- Add transforms (`.transform(stripHtml)`) for user-generated content
