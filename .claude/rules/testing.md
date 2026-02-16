---
paths:
  - '**/*.test.ts'
  - 'e2e/**/*.ts'
  - 'playwright.config.ts'
---

# Testing Patterns

## Testing Strategy

- **Unit tests**: Write first, fail first. Use `bun:test`. >80% coverage on critical paths.
- **Integration tests**: Required for user-facing features.
- **E2E tests**: Required for critical user flows. Tag `@critical` for CI smoke runs.

## Unit Testing (bun:test)

```typescript
import { describe, expect, test } from 'bun:test';

describe('BudgetService', () => {
  test('should create budget', async () => {
    const service = new BudgetService();
    const budget = await service.create({
      name: 'Groceries',
      amount: 500000,
      currency: 'IDR',
    });

    expect(budget.name).toBe('Groceries');
    expect(budget.amount).toBe(500000);
  });
});
```

**Rules:**

- ✅ **Write unit tests first** (fail first, then implement)
- ✅ **Use `bun:test`** - not vitest
- ❌ **Skip tests** - all tests must pass before committing

## E2E Testing (Playwright)

### Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 1, // Shared database tests - prevents race conditions
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
  },
});
```

**Rules:**

- ✅ **Set Playwright workers=1 for shared database tests** - prevents race conditions
- ❌ **Rely on Playwright's `webServer.env`** when `reuseExistingServer: true` - env block is not applied to already-running server

### Waiting Patterns

```typescript
// ✅ Correct: Use expect.poll() for condition-based waiting
await expect
  .poll(async () => {
    const balance = await page.locator('[data-balance]').textContent();
    return balance === 'Rp500.000';
  })
  .toBeTruthy();

// ✅ Correct: Use waitForResponse() for AJAX updates
await page.click('[data-add-budget]');
await page.waitForResponse((response) => response.url().includes('/api/budgets'));

// ❌ Wrong: Manual loops or waitForTimeout
await page.waitForTimeout(5000); // Flaky
for (let i = 0; i < 10; i++) {
  // Brittle
  await page.waitForTimeout(100);
  if (await page.isVisible('[data-balance]')) break;
}
```

**Rules:**

- ✅ **Use `expect.poll()` for condition-based waiting** - not manual loops or waitForTimeout
- ✅ **Use `waitForResponse()` for AJAX-driven updates** - `waitForPageLoad(domcontentloaded)` fires before client-side fetch/re-render completes
- ✅ **Use `domcontentloaded` instead of `networkidle`** - faster, still reliable

### Page Objects

```typescript
// page-objects/budget-page.ts
export class BudgetPage {
  constructor(private page: Page) {}

  async createBudget(name: string, amount: number) {
    await this.page.click('[data-add-budget]');
    await this.page.fill('[name="name"]', name);
    await this.page.fill('[name="amount"]', amount.toString());
    await this.page.click('[data-submit]');
  }

  async getBudgetName() {
    return await this.page.locator('[data-budget-name]').textContent();
  }
}
```

**Rules:**

- ✅ **Update page objects when UI components change** - select-to-chips, dual-layout, new selectors break existing locators
- ✅ **Use `data-testid` locators over text/CSS class selectors in E2E tests** - `[data-testid="runtime-card"]` survives heading text changes, CSS class renames, and HTML element swaps (`td` → `dt`)
- ✅ **Check E2E tests when refactoring UI** - heading text changes, element type changes (`td` → `dt`), and CSS class renames (`badge-primary` → `badge-accent`) silently break locators

### Hooks and Timeouts

```typescript
import { beforeAll, afterAll } from 'bun:test';

beforeAll(
  async () => {
    // Schema push can exceed default 5000ms
    await exec('bun run db:push');
  },
  30000 // 30 second timeout
);
```

**Rules:**

- ✅ **Increase `beforeAll` hook timeouts for `drizzle-kit push`** - schema push can exceed default 5000ms; use 30000ms

## Test Data

### Dynamic Dates

```typescript
// ✅ Correct: Use dynamic dates
const currentMonth = new Date().toISOString().slice(0, 7);
const transactions = [
  { date: `${currentMonth}-01`, amount: 100000 },
  { date: `${currentMonth}-15`, amount: 50000 },
];

// ❌ Wrong: Hardcoded dates
const transactions = [
  { date: '2025-02-01', amount: 100000 }, // Fails next month
];
```

**Rules:**

- ✅ **Use dynamic dates for current month in seed data** - not hardcoded

### Password Hashing

```typescript
// ✅ Correct: Remove precomputed hashes when changing algorithms
const users = [
  {
    email: 'test@example.com',
    password: await hashPassword('password123'), // Compute at runtime
  },
];

// ❌ Wrong: Precomputed hash from old algorithm
const users = [
  {
    email: 'test@example.com',
    password: '$2a$10$...', // Fails if algorithm changes
  },
];
```

**Rules:**

- ✅ **Remove precomputed hashes when changing algorithms** - prevents seed mismatches

## Debugging Test Failures

**Follow systematic-debugging skill for test failures:**

1. **Reproduce locally** - Run the exact failing test
2. **Check the error message** - What assertion failed?
3. **Inspect the state** - Use `page.screenshot()`, `console.log()`
4. **Trace the flow** - DB → Service → API → UI
5. **Fix root cause** - Not just the symptom
6. **Verify fix** - Run test again, check related tests

**Rules:**

- ✅ **Follow systematic-debugging skill for test failures** - find root cause
- ✅ **Fix tests before committing, never push with known failures**
- ❌ **Delete tests without replacing coverage**

## Environment Variables

```typescript
// ✅ Correct: Use setTestEnv() to match production code path
import { setTestEnv } from '@/lib/env';

setTestEnv('DATABASE_URL', 'sqlite::memory:');

// ❌ Wrong: Mutate import.meta.env directly
import.meta.env.DATABASE_URL = 'sqlite::memory:'; // Doesn't work in prod
```

**Rules:**

- ❌ **Mutate `import.meta.env` directly in tests** - use `setTestEnv()` to match the production code path

## Common Patterns

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Budget Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budgets');
  });

  test('should create a budget', async ({ page }) => {
    await page.click('[data-add-budget]');
    await page.fill('[name="name"]', 'Groceries');
    await page.fill('[name="amount"]', '500000');
    await page.click('[data-submit]');

    await expect
      .poll(async () => {
        return await page.locator('[data-budget-name]').textContent();
      })
      .toBe('Groceries');
  });
});
```

### Unit Test Template

```typescript
import { describe, expect, test, beforeEach } from 'bun:test';

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(() => {
    service = new BudgetService();
  });

  test('should create budget', async () => {
    const budget = await service.create({
      name: 'Groceries',
      amount: 500000,
    });

    expect(budget.name).toBe('Groceries');
  });

  test('should throw on invalid amount', async () => {
    expect(() =>
      service.create({
        name: 'Groceries',
        amount: -100,
      })
    ).toThrow('Amount must be positive');
  });
});
```

### Integration Test Template

```typescript
import { describe, expect, test } from 'bun:test';
import { createTestDatabase } from '@/test/helpers';

describe('Budget API', () => {
  test('should create and retrieve budget', async () => {
    const db = await createTestDatabase();

    // Create
    const response = await fetch('http://localhost:4321/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Groceries', amount: 500000 }),
    });

    expect(response.status).toBe(201);
    const { budget } = await response.json();

    // Retrieve
    const getResponse = await fetch(`http://localhost:4321/api/budgets/${budget.id}`);
    expect(getResponse.status).toBe(200);

    const retrieved = await getResponse.json();
    expect(retrieved.budget.name).toBe('Groceries');
  });
});
```

## Test Coverage

```bash
# Run all tests
bun run test

# Run specific test file
bun test src/services/budget.test.ts

# Run E2E tests
bun run test:e2e

# Run critical tests only
bun run test:e2e --grep @critical
```

**Coverage goals:**

- Critical paths: >80%
- Services: >80%
- API endpoints: >70%
- UI components: Best effort (Storybook visual regression)
