---
name: test-generation
description: Generate E2E tests that catch real bugs by validating business logic, data correctness, and state transitions — not just element presence. Use when asked to create, write, or generate Playwright tests from a plan or spec.
---

# E2E Test Generation — Behavior Tests, Not Presence Tests

## Core Principle

**A test that can't fail when the feature is broken is worthless.**

Every assertion must answer: "What bug would this catch?" If the answer is "none" or "the element was deleted," the assertion is a presence test and should be replaced or removed.

---

## What NOT to Write

### Presence tests (worthless)
```typescript
// BAD: Just checks something appears. What bug does this catch?
await expect(page.getByText(/\d+ mavzu/)).toBeVisible();
await expect(page.getByText(/\d+-semestr/).first()).toBeVisible();
await expect(modal.getByText(/bo'lim/).first()).toBeVisible();
```

### Regex-only assertions (lazy)
```typescript
// BAD: Passes if count is 0, 999, or wrong
await expect(page.getByText(/\d+ programs/)).toBeVisible();
```

### Empty verification steps
```typescript
// BAD: The comment says "verify filtering works" but the code doesn't
await modal.getByText(/8-semestr/).click();
// expect: The lesson list is filtered
// (no actual assertion follows)
```

### waitForTimeout as verification
```typescript
// BAD: Hoping nothing crashes isn't a test
await page.waitForTimeout(2000);
await expect(page.getByRole('heading')).toBeVisible(); // still there? great.
```

### Duplicated setup code
```typescript
// BAD: Copy-pasting 15 lines of login flow in every test file
test('dashboard shows courses', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email manzil' }).fill('student@test.com');
  await page.getByRole('textbox', { name: 'Parol' }).fill('test123');
  // ... 10 more lines identical to every other test
});
```

---

## What to Write Instead

### 1. Assert Exact Values When Data Is Known

Use exact values when seed data is stable. If tests run against a seeded database, the counts are deterministic — assert them precisely.

```typescript
// GOOD: If the count changes unexpectedly, this catches it
await expect(page.getByText('30 fan, 742 mavzu mavjud')).toBeVisible();
await expect(page.getByText('48 mavzu', { exact: true })).toBeVisible();
```

When seed data may change between runs, use relative assertions:

```typescript
// GOOD: Assert the value is reasonable, not a specific number
const countText = await page.getByTestId('course-count').textContent();
const count = parseInt(countText!);
expect(count).toBeGreaterThan(0);
expect(count).toBeLessThanOrEqual(100);
```

### 2. Assert State Changes After Actions

```typescript
// GOOD: Verify the filter ACTUALLY FILTERED, not just that something is visible
await expect(modal.getByText('1-12 / 48 mavzu')).toBeVisible();
await modal.getByText('8-semestr (24)').click();
await expect(modal.getByText('1-12 / 24 mavzu')).toBeVisible(); // count changed!
```

### 3. Assert Counts of Elements

```typescript
// GOOD: Verify the right NUMBER of items appear
const lessonItems = modal.locator('[data-testid="lesson-item"]');
await expect(lessonItems).toHaveCount(12); // exactly 12 per page

// GOOD: Verify filtering reduced the count
await expect(page.locator('.course-card')).toHaveCount(30); // all courses
await page.getByText('Guruhsiz').click();
await expect(page.getByText(/\(\d+ fan\)/)).toHaveCount(0); // category headings gone
```

### 4. Assert Cross-Page Consistency

Verify that data shown in one place matches another — catches rendering bugs, stale caches, and broken aggregations.

```typescript
// GOOD: Dashboard count matches the detail modal
const summaryText = await page.getByText(/\d+ fan, \d+ mavzu/).textContent();
const totalFan = parseInt(summaryText!.match(/(\d+) fan/)![1]);
expect(totalFan).toBe(30);

// Then open the modal and count the actual items
await page.getByText('Batafsil').click();
const items = modal.locator('[data-testid="course-item"]');
await expect(items).toHaveCount(totalFan);
```

```typescript
// GOOD: Sidebar count matches table rows
const sidebarText = await page.getByTestId('student-count').textContent();
const sidebarCount = parseInt(sidebarText!);
const tableRows = page.locator('table tbody tr');
await expect(tableRows).toHaveCount(sidebarCount);
```

### 5. Assert Before/After for Toggle and Filter Actions

```typescript
// GOOD: Verify toggle actually changes the layout
const cardViewBtn = page.getByRole('button', { name: /Kartochkalar/ });
const listViewBtn = page.getByRole('button', { name: /Ro'yxat/ });

// Before: card view is active
await expect(cardViewBtn).toHaveAttribute('aria-pressed', 'true');
await expect(listViewBtn).toHaveAttribute('aria-pressed', 'false');

// After: list view is active
await listViewBtn.click();
await expect(cardViewBtn).toHaveAttribute('aria-pressed', 'false');
await expect(listViewBtn).toHaveAttribute('aria-pressed', 'true');
```

### 6. Assert Navigation Destinations Exactly

```typescript
// GOOD: Exact URL, not a regex that matches anything
await page.getByRole('link', { name: /Dentistry DMD/ }).click();
await expect(page).toHaveURL(
  'http://localhost:3000/students/course-catalog?program=dentistry'
);
```

### 7. Assert Negative Cases Properly

```typescript
// GOOD: Verify what "no results" actually looks like
await searchInput.fill('xyznonexistent');
await expect(page.getByText('Natija topilmadi')).toBeVisible(); // actual empty state
// AND: verify the results container has 0 items
await expect(page.locator('.search-result-item')).toHaveCount(0);
```

### 8. Assert Disabled/Enabled State Transitions

```typescript
// GOOD: Verify the button goes from disabled → enabled on selection
await expect(continueBtn).toBeDisabled();
await page.getByRole('radio', { name: 'Davolash ishi fakulteti' }).click();
await expect(continueBtn).toBeEnabled();
```

---

## Waiting for Things Correctly

**Never use `waitForTimeout` as a substitute for proper waiting.** Playwright auto-waits on most actions, but some scenarios need explicit waits.

### Wait for navigation to complete
```typescript
// GOOD: Wait for the URL to change after a click
await page.getByRole('link', { name: 'Kurslar' }).click();
await expect(page).toHaveURL(/\/students\/course-catalog/, { timeout: 15000 });
```

### Wait for network-dependent content
```typescript
// GOOD: Wait for the API response, then assert the result
const responsePromise = page.waitForResponse(resp =>
  resp.url().includes('/api/courses') && resp.status() === 200
);
await page.getByRole('button', { name: 'Yuklash' }).click();
await responsePromise;
await expect(page.locator('.course-card')).toHaveCount(30);
```

### Wait for content to stabilize after dynamic load
```typescript
// GOOD: Wait for loading indicator to disappear
await expect(page.getByTestId('loading-spinner')).toBeHidden({ timeout: 15000 });
await expect(page.locator('.course-card').first()).toBeVisible();
```

### Custom timeouts for slow operations
```typescript
// GOOD: Login + faculty/language selection is multi-step — allow time
await expect(page.getByRole('heading', { name: /Xush kelibsiz/ }))
  .toBeVisible({ timeout: 15000 });
```

### What NOT to do
```typescript
// BAD: Arbitrary sleep
await page.waitForTimeout(3000);

// BAD: Sleep then hope
await page.waitForTimeout(1000);
await expect(page.getByText('loaded')).toBeVisible();

// BAD: Retry loop with sleep
for (let i = 0; i < 5; i++) {
  if (await page.getByText('Ready').isVisible()) break;
  await page.waitForTimeout(500);
}
```

---

## Test Data & Seed Assumptions

Tests run against a pre-seeded database. Understand the data contract:

### Pre-seeded test accounts

| Role      | Email                | Password  |
|-----------|----------------------|-----------|
| Student   | `student@test.com`   | `test123` |
| Professor | `professor@test.com` | `test123` |
| Editor    | `editor@test.com`    | `test123` |
| Admin     | `admin@zarmed.uz`    | `admin123`|

### When to use exact vs relative assertions

| Scenario | Assertion style | Example |
|----------|----------------|---------|
| Seed data is fixed (known count of courses) | Exact: `toBe(30)` | Course catalog has 30 courses |
| Data may grow (new lessons added) | Lower bound: `toBeGreaterThanOrEqual(30)` | At least 30 courses |
| Action changes a value | Before/after delta | Filter reduced count from X to Y |
| Data comes from user input in the test | Exact match on what was typed | Search results contain the search term |

---

## Workflow: How to Generate Tests

Follow this order. Do NOT skip to writing tests.

### Step 1: Inspect the live app FIRST

Before writing a single line of test code, collect exact data from every page the test plan covers.

```bash
# Open browser and navigate
playwright-cli open http://localhost:3000/programs
playwright-cli snapshot --filename=programs.yml

# Read the snapshot to extract exact text values
# Record: headings, counts, button texts, link URLs, badge values

# For counts of elements, use eval
playwright-cli eval "document.querySelectorAll('.program-card').length"

# Navigate to the next page in the plan
playwright-cli goto http://localhost:3000/students/course-catalog
playwright-cli snapshot --filename=catalog.yml
```

For authenticated pages, log in through the browser first:
```bash
playwright-cli open http://localhost:3000/login
playwright-cli fill e43 "student@test.com"
playwright-cli fill e48 "test123"
playwright-cli click e49
# Complete onboarding...
playwright-cli snapshot --filename=dashboard.yml
```

> **Prerequisite:** The `playwright-cli` skill requires the Playwright MCP server to be running. If `playwright-cli` commands fail, ensure the MCP server is configured in `.mcp.json`.

### Step 2: Build a data sheet

From the snapshots, build a list of exact values you'll assert against:

```
/programs:
  Bachelor's: 21 programs, Show all 21 programs button
  Master's: 5 programs, NO show all button
  Medical Residency: 17 programs, Show all 17 programs button
  Professional Development: 36 programs, Show all 36 programs button

/student dashboard:
  Stats: Jami mavzular=742, Fanlar soni=30, Faol semestr=1-semestr
  Summary: "30 fan, 742 mavzu mavjud"
  Categories: Klinik fanlar (12 fan), Jarrohlik fanlar (4 fan), ...
```

### Step 3: Write tests that assert the data sheet values

Now — and only now — write the tests. Every assertion should reference a value from your data sheet.

### Step 4: Run against the live app, fix REAL failures only

When a test fails:
1. **First assume the app has a bug** — check the page manually
2. Only fix the test if the app is correct and your locator was wrong
3. Never weaken an assertion to make it pass (e.g., replacing exact match with regex)

---

## Test Structure Rules

### Use shared login helpers — don't duplicate setup code

Extract login flows into reusable functions. The full student login (email, password, faculty selection, language selection) is ~15 lines — duplicating it in every file is a maintenance burden and masks the actual test logic.

```typescript
async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email manzil' }).fill('student@test.com');
  await page.getByRole('textbox', { name: 'Parol' }).fill('test123');
  await page.getByRole('button', { name: 'Tizimga kirish' }).click();
  await expect(page.getByText('Fakultetni tanlang')).toBeVisible({ timeout: 15000 });
  await page.getByRole('radio', { name: 'Davolash ishi fakulteti' }).click();
  await page.getByRole('button', { name: 'Davom etish' }).click();
  await expect(page.getByText('Tilni tanlang')).toBeVisible({ timeout: 15000 });
  await page.getByRole('radio', { name: "O'zbek tili" }).click();
  await page.getByRole('button', { name: 'Saqlash' }).click();
  await expect(page.getByRole('heading', { name: /Xush kelibsiz/ })).toBeVisible({ timeout: 15000 });
}

async function loginAsAdmin(page: Page) { /* ... */ }
async function loginAsProfessor(page: Page) { /* ... */ }
```

### Tests must be independent — no shared state

Each test must work in isolation and in any order. Never rely on a previous test's side effects.

```typescript
// BAD: Test B depends on Test A creating data
test('A: create a course', async ({ page }) => { /* creates course */ });
test('B: enroll in the course', async ({ page }) => { /* assumes course exists */ });

// GOOD: Each test sets up what it needs
test('enroll in a course', async ({ page }) => {
  await loginAsStudent(page);
  await page.goto('/students/course-catalog');
  // ... test enrollment
});
```

### Use `test.beforeEach` for repeated setup within a describe block

```typescript
test.describe('Student dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('shows enrolled courses', async ({ page }) => { /* ... */ });
  test('search filters courses by name', async ({ page }) => { /* ... */ });
});
```

### One assertion theme per test, not one assertion per test

Group related assertions that test a single behavior. A test called "semester filter works" should assert the before state, the action, AND the after state — not just one of those.

### Name tests after the behavior being verified, not the UI element

```typescript
// BAD
test('Programs page loads and displays all degree types')

// GOOD
test('Programs page shows exactly 4 degree categories with correct program counts')
```

### Assert the MOST SPECIFIC thing possible

```typescript
// WEAK: Just checks heading exists
await expect(page.getByRole('heading', { name: 'General Medicine' })).toBeVisible();

// STRONG: Checks heading AND the data it should display
await expect(page.getByRole('heading', { name: 'General Medicine' })).toBeVisible();
await expect(page.getByText('10 semesters')).toBeVisible();
await expect(page.getByText('300 total credits')).toBeVisible();
```

---

## The Litmus Test

For every assertion, ask:

1. **"If I delete this assertion, could a real bug slip through?"** — If no, delete it.
2. **"If the feature breaks, will this test fail?"** — If not guaranteed, strengthen it.
3. **"Am I testing behavior or existence?"** — Always behavior.
4. **"Would this pass if the feature rendered wrong data?"** — If yes, assert the data.

---

## When Presence Tests Are Acceptable

Presence tests belong **only** in dedicated smoke or guard specs — never in feature tests.

| Acceptable use | Where it belongs | The real assertion |
|---------------|------------------|-------------------|
| Page doesn't crash on load | `smoke-tests.spec.ts` | Response status 200 + key heading visible |
| Error state renders | `failed-login.spec.ts` | Exact error message text, not just "something appeared" |
| Auth guard redirects | `route-guards.spec.ts` | Destination URL is the assertion |
| 404 page renders | `smoke-tests.spec.ts` | Exact "not found" text |

Even in these cases, prefer asserting the specific text/URL over just "something is visible."
