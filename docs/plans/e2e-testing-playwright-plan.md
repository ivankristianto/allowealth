# E2E Testing Plan with Playwright

**Version:** 1.0.0
**Date:** 2025-01-25
**Status:** Draft

## Executive Summary

This document outlines the plan to implement End-to-End (E2E) testing using Playwright for the Expenses application. The focus is on business-critical user flows that directly impact the core functionality of the financial tracking system.

## Research Summary

### Playwright + Astro + Bun Integration

Based on research from [Astro Testing Docs](https://docs.astro.build/en/guides/testing/), [Playwright Best Practices](https://playwright.dev/docs/best-practices), and [BrowserStack Guide](https://www.browserstack.com/guide/playwright-best-practices):

1. **Astro Compatibility**: Astro supports Playwright natively with the `webServer` config option
2. **Bun Runtime**: Playwright works with Bun - use `bun playwright install` for browser binaries
3. **Session Reuse**: Use `storageState` to save authenticated sessions and avoid repeated logins ([Playwright Auth Docs](https://playwright.dev/docs/auth))
4. **Page Object Model**: Recommended pattern for maintainable test code ([Playwright POM](https://playwright.dev/docs/pom))

### Key Best Practices Applied

| Practice | Implementation |
|----------|---------------|
| Test user-visible behavior | Focus on what users see, not implementation |
| Test isolation | Each test starts fresh with `storageState` |
| Smart locators | Use `data-testid` attributes for stability |
| Auto-waiting | Leverage Playwright's built-in waiting |
| Page Object Model | Separate test logic from page interactions |
| Parallel execution | Run tests concurrently with isolated contexts |

## Scope: Business-Critical Flows

### Priority 1: Core Transaction Management

1. **Log Expenses** - Add expense transactions with all required fields
2. **Log Income** - Add income transactions with type switching
3. **Transaction Validation** - Ensure form validation works correctly

### Priority 2: Budget Management

4. **Setup Budget** - Create new category budgets
5. **Update Budget** - Modify existing budget amounts
6. **Budget Alerts** - Verify warning/exceeded states display

### Priority 3: Data Accuracy & Reporting

7. **Budget Spending Accuracy** - Verify spent amounts match transactions
8. **Budget Allocation Display** - Confirm allocated amounts are correct
9. **Budget Progress Calculation** - Validate percentage calculations

---

## Environment Setup

### E2E Environment Configuration

E2E tests run in an isolated environment to avoid affecting development data.

#### Environment File Setup

Create `.env.e2e` from `.env.example` with E2E-specific configuration:

```bash
# .env.e2e - E2E Testing Environment
NODE_ENV=development

# API Configuration
PUBLIC_API_URL=/api

# Database - Separate E2E database to isolate test data
DATABASE_URL=db/.e2e.db

# Session Secret
SESSION_SECRET=e2e-testing-secret-key

# Server - Use different port to avoid conflicts with dev server
PORT=4320

# E2E Test User Credentials (used by global-setup.ts)
E2E_USER_EMAIL=demo@example.com
E2E_USER_PASSWORD=demodemo123
```

#### Setup Script Integration

Before running E2E tests, the environment must be initialized using `scripts/setup.sh`:

```bash
# scripts/setup-e2e.sh
#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== E2E Environment Setup ===${NC}\n"

# 1. Copy .env.example to .env if .env.e2e doesn't exist
if [ ! -f ".env.e2e" ]; then
    echo -e "${YELLOW}Creating .env.e2e from .env.example...${NC}"
    cp .env.example .env.e2e

    # Update DATABASE_URL for E2E
    sed -i 's|DATABASE_URL=db/.dev.db|DATABASE_URL=db/.e2e.db|g' .env.e2e

    # Update PORT for E2E
    sed -i 's|PORT=4321|PORT=4320|g' .env.e2e

    # Add E2E test user credentials
    echo "" >> .env.e2e
    echo "# E2E Test User Credentials" >> .env.e2e
    echo "E2E_USER_EMAIL=demo@example.com" >> .env.e2e
    echo "E2E_USER_PASSWORD=demodemo123" >> .env.e2e

    echo -e "${GREEN}✓ .env.e2e created${NC}\n"
fi

# 2. Switch to E2E environment
echo -e "${YELLOW}Switching to E2E environment...${NC}"
cp .env.e2e .env
echo -e "${GREEN}✓ Environment switched to E2E${NC}\n"

# 3. Run the standard setup script (installs deps + resets DB)
echo -e "${YELLOW}Running setup script...${NC}"
./scripts/setup.sh

echo -e "${GREEN}=== E2E Environment Ready ===${NC}"
echo -e "Server will run on: ${YELLOW}http://localhost:4320${NC}"
```

#### Files to Add to .gitignore

```gitignore
# E2E Testing
db/.e2e.db
db/.e2e.db-wal
db/.e2e.db-shm
e2e/.auth/
playwright-report/
test-results/
.env.e2e
```

---

## Technical Architecture

### Directory Structure

```
e2e/
├── playwright.config.ts          # Playwright configuration
├── global-setup.ts               # One-time setup (auth state)
├── fixtures/
│   ├── test-fixtures.ts          # Custom test fixtures
│   └── auth.fixture.ts           # Authentication fixture
├── pages/                        # Page Object Models
│   ├── BasePage.ts               # Base page with common methods
│   ├── LoginPage.ts              # Login page interactions
│   ├── TransactionsPage.ts       # Transactions list page
│   ├── AddTransactionPage.ts     # Add transaction form
│   └── BudgetPage.ts             # Budget overview page
├── tests/
│   ├── auth/
│   │   └── login.spec.ts         # Authentication tests
│   ├── transactions/
│   │   ├── add-expense.spec.ts   # Log expense tests
│   │   └── add-income.spec.ts    # Log income tests
│   ├── budget/
│   │   ├── setup-budget.spec.ts  # Setup budget tests
│   │   └── update-budget.spec.ts # Update budget tests
│   └── reports/
│       └── budget-accuracy.spec.ts # Data accuracy tests
├── utils/
│   ├── test-data.ts              # Test data generators
│   └── api-helpers.ts            # Direct API calls for setup/teardown
└── .auth/                        # Stored auth state (gitignored)
    └── user.json
```

### Configuration

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// E2E tests run on port 4320 to avoid conflicts with dev server (4321)
const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Start dev server before tests using E2E environment
  webServer: {
    command: 'bun run dev',
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Environment is already configured via .env (copied from .env.e2e)
  },

  projects: [
    // Setup project - runs first to create auth state
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    // Main tests - depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Mobile viewport tests
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### Authentication Strategy

Based on [Playwright Authentication Best Practices](https://playwright.dev/docs/auth):

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to login (E2E server runs on port 4320)
  await page.goto(`${E2E_BASE_URL}/login`);

  // Fill login form using seeded demo user credentials
  // These are set in .env.e2e and loaded into process.env
  await page.fill('[data-testid="email-input"]', process.env.E2E_USER_EMAIL!);
  await page.fill('[data-testid="password-input"]', process.env.E2E_USER_PASSWORD!);
  await page.click('[data-testid="login-button"]');

  // Wait for successful login (redirect to dashboard)
  await page.waitForURL('**/dashboard');

  // Save authentication state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });

  await browser.close();
}

export default globalSetup;
```

### Page Object Model Examples

```typescript
// e2e/pages/BasePage.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async expectToastMessage(message: string, type: 'success' | 'error' = 'success') {
    const toast = this.page.locator(`[data-testid="toast-${type}"]`);
    await expect(toast).toContainText(message);
  }
}

// e2e/pages/AddTransactionPage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AddTransactionPage extends BasePage {
  readonly typeExpenseButton: Locator;
  readonly typeIncomeButton: Locator;
  readonly amountInput: Locator;
  readonly categorySelect: Locator;
  readonly paymentMethodSelect: Locator;
  readonly dateInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly budgetWarning: Locator;

  constructor(page: Page) {
    super(page);
    this.typeExpenseButton = page.locator('#type-expense');
    this.typeIncomeButton = page.locator('#type-income');
    this.amountInput = page.locator('input[name="amount"]');
    this.categorySelect = page.locator('select[name="category_id"]');
    this.paymentMethodSelect = page.locator('select[name="payment_method_id"]');
    this.dateInput = page.locator('input[name="transaction_date"]');
    this.descriptionInput = page.locator('textarea[name="description"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.budgetWarning = page.locator('#budget-warning');
  }

  async goto(type: 'expense' | 'income' = 'expense') {
    await this.page.goto(`/transactions/add?type=${type}`);
    await this.waitForPageLoad();
  }

  async fillExpenseForm(data: {
    amount: string;
    categoryId: string;
    paymentMethodId: string;
    date?: string;
    description?: string;
  }) {
    await this.typeExpenseButton.check();
    await this.amountInput.fill(data.amount);
    await this.categorySelect.selectOption(data.categoryId);
    await this.paymentMethodSelect.selectOption(data.paymentMethodId);
    if (data.date) {
      await this.dateInput.fill(data.date);
    }
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }
  }

  async fillIncomeForm(data: {
    amount: string;
    categoryId: string;
    paymentMethodId: string;
    date?: string;
    description?: string;
  }) {
    await this.typeIncomeButton.check();
    await this.amountInput.fill(data.amount);
    await this.categorySelect.selectOption(data.categoryId);
    await this.paymentMethodSelect.selectOption(data.paymentMethodId);
    if (data.date) {
      await this.dateInput.fill(data.date);
    }
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectBudgetWarningVisible() {
    await expect(this.budgetWarning).toBeVisible();
  }

  async expectBudgetWarningHidden() {
    await expect(this.budgetWarning).toBeHidden();
  }
}

// e2e/pages/BudgetPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class BudgetPage extends BasePage {
  readonly budgetCards: Locator;
  readonly setNewBudgetButton: Locator;
  readonly budgetModal: Locator;
  readonly categorySelect: Locator;
  readonly amountInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.budgetCards = page.locator('[data-budget-card]');
    this.setNewBudgetButton = page.locator('[data-testid="set-new-budget-btn"]');
    this.budgetModal = page.locator('#set-new-budget-modal');
    this.categorySelect = page.locator('#set-new-budget-modal-category');
    this.amountInput = page.locator('#set-new-budget-modal-amount');
    this.saveButton = page.locator('#set-new-budget-modal-form button[type="submit"]');
  }

  async goto(year?: number, month?: number, currency: 'IDR' | 'USD' = 'IDR') {
    const params = new URLSearchParams();
    if (year) params.set('year', year.toString());
    if (month) params.set('month', month.toString());
    params.set('currency', currency);
    await this.page.goto(`/budget?${params.toString()}`);
    await this.waitForPageLoad();
  }

  async setBudget(categoryId: string, amount: string) {
    await this.setNewBudgetButton.click();
    await expect(this.budgetModal).toBeVisible();
    await this.categorySelect.selectOption(categoryId);
    await this.amountInput.fill(amount);
    await this.saveButton.click();
  }

  async editBudget(categoryId: string, newAmount: string) {
    const editButton = this.page.locator(`[data-edit-budget="${categoryId}"]`);
    await editButton.click();
    await expect(this.budgetModal).toBeVisible();
    await this.amountInput.clear();
    await this.amountInput.fill(newAmount);
    await this.saveButton.click();
  }

  async getBudgetCardData(categoryId: string) {
    const card = this.page.locator(`[data-budget-card="${categoryId}"]`);
    return {
      spent: await card.getAttribute('data-spent'),
      budgetAmount: await card.locator('[data-budget-amount]').textContent(),
      percentageUsed: await card.locator('[data-status-badge]').textContent(),
    };
  }

  async expectCategoryBudgetStatus(
    categoryId: string,
    status: 'ok' | 'warning' | 'exceeded'
  ) {
    const card = this.page.locator(`[data-budget-card="${categoryId}"]`);
    const badge = card.locator('[data-status-badge]');

    const statusClasses = {
      ok: 'text-success',
      warning: 'text-warning',
      exceeded: 'text-error',
    };

    await expect(badge).toHaveClass(new RegExp(statusClasses[status]));
  }
}
```

---

## Test Specifications

### 1. Log Expenses (Priority 1)

```typescript
// e2e/tests/transactions/add-expense.spec.ts
import { test, expect } from '@playwright/test';
import { AddTransactionPage } from '../../pages/AddTransactionPage';
import { TransactionsPage } from '../../pages/TransactionsPage';

test.describe('Log Expenses', () => {
  let addTransactionPage: AddTransactionPage;

  test.beforeEach(async ({ page }) => {
    addTransactionPage = new AddTransactionPage(page);
  });

  test('should add a new expense with all required fields', async ({ page }) => {
    await addTransactionPage.goto('expense');

    await addTransactionPage.fillExpenseForm({
      amount: '150000',
      categoryId: 'food-category-id',  // Will use actual ID from test data
      paymentMethodId: 'cash-id',
      description: 'E2E Test - Lunch expense',
    });

    await addTransactionPage.submit();

    // Should redirect to transactions list
    await expect(page).toHaveURL('/transactions');

    // Verify transaction appears in list
    const transactionsPage = new TransactionsPage(page);
    await transactionsPage.expectTransactionExists('E2E Test - Lunch expense', '150000');
  });

  test('should show budget warning when expense approaches limit', async ({ page }) => {
    await addTransactionPage.goto('expense');

    // Select a category that has budget set
    await addTransactionPage.categorySelect.selectOption('budgeted-category-id');

    await addTransactionPage.expectBudgetWarningVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await addTransactionPage.goto('expense');

    // Try to submit without filling required fields
    await addTransactionPage.submit();

    // Should show validation errors
    await expect(page.locator('[aria-invalid="true"]')).toBeVisible();

    // Should NOT redirect
    await expect(page).toHaveURL(/\/transactions\/add/);
  });

  test('should reject future dates', async ({ page }) => {
    await addTransactionPage.goto('expense');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = tomorrow.toISOString().split('T')[0];

    await addTransactionPage.dateInput.fill(futureDate);
    await addTransactionPage.amountInput.fill('100000');

    // Trigger validation
    await addTransactionPage.amountInput.blur();

    // Should show date validation error
    await expect(page.locator('#transaction_date-error')).toContainText('future');
  });
});
```

### 2. Log Income (Priority 1)

```typescript
// e2e/tests/transactions/add-income.spec.ts
import { test, expect } from '@playwright/test';
import { AddTransactionPage } from '../../pages/AddTransactionPage';

test.describe('Log Income', () => {
  let addTransactionPage: AddTransactionPage;

  test.beforeEach(async ({ page }) => {
    addTransactionPage = new AddTransactionPage(page);
  });

  test('should add a new income transaction', async ({ page }) => {
    await addTransactionPage.goto('income');

    await addTransactionPage.fillIncomeForm({
      amount: '5000000',
      categoryId: 'salary-category-id',
      paymentMethodId: 'bank-transfer-id',
      description: 'E2E Test - Monthly salary',
    });

    await addTransactionPage.submit();

    await expect(page).toHaveURL('/transactions');
  });

  test('should switch between expense and income types', async ({ page }) => {
    await addTransactionPage.goto('expense');

    // Initially expense categories should be visible
    await expect(addTransactionPage.categorySelect).toContainText('Food');

    // Switch to income
    await addTransactionPage.typeIncomeButton.check();

    // Income categories should be visible, expense hidden
    await expect(addTransactionPage.categorySelect).toContainText('Salary');
    await expect(addTransactionPage.categorySelect).not.toContainText('Food');
  });

  test('should NOT show budget warning for income', async ({ page }) => {
    await addTransactionPage.goto('income');

    await addTransactionPage.categorySelect.selectOption('salary-category-id');

    await addTransactionPage.expectBudgetWarningHidden();
  });
});
```

### 3. Setup and Update Budget (Priority 2)

```typescript
// e2e/tests/budget/setup-budget.spec.ts
import { test, expect } from '@playwright/test';
import { BudgetPage } from '../../pages/BudgetPage';

test.describe('Setup Budget', () => {
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ page }) => {
    budgetPage = new BudgetPage(page);
    await budgetPage.goto();
  });

  test('should set a new budget for a category', async ({ page }) => {
    const categoryId = 'entertainment-id';
    const budgetAmount = '500000';

    await budgetPage.setBudget(categoryId, budgetAmount);

    // Modal should close
    await expect(budgetPage.budgetModal).toBeHidden();

    // Budget card should update
    const cardData = await budgetPage.getBudgetCardData(categoryId);
    expect(cardData.budgetAmount).toContain('500');
  });

  test('should update an existing budget', async ({ page }) => {
    const categoryId = 'food-category-id';  // Assuming this has existing budget
    const newAmount = '2000000';

    await budgetPage.editBudget(categoryId, newAmount);

    // Verify update
    const cardData = await budgetPage.getBudgetCardData(categoryId);
    expect(cardData.budgetAmount).toContain('2,000,000');
  });

  test('should show warning status when budget is 80-99% used', async ({ page }) => {
    // This test requires setup: create transactions that use 80-99% of budget
    const categoryId = 'warning-test-category';

    await budgetPage.expectCategoryBudgetStatus(categoryId, 'warning');
  });

  test('should show exceeded status when budget is 100%+ used', async ({ page }) => {
    const categoryId = 'exceeded-test-category';

    await budgetPage.expectCategoryBudgetStatus(categoryId, 'exceeded');
  });
});
```

### 4. Budget Accuracy Tests (Priority 3)

```typescript
// e2e/tests/reports/budget-accuracy.spec.ts
import { test, expect } from '@playwright/test';
import { BudgetPage } from '../../pages/BudgetPage';
import { AddTransactionPage } from '../../pages/AddTransactionPage';
import { ApiHelpers } from '../../utils/api-helpers';

test.describe('Budget Data Accuracy', () => {
  test('should accurately reflect spending after adding expense', async ({ page, request }) => {
    const budgetPage = new BudgetPage(page);
    const addTransactionPage = new AddTransactionPage(page);
    const api = new ApiHelpers(request);

    // Setup: Get initial budget state
    await budgetPage.goto();
    const categoryId = 'accuracy-test-category';
    const initialData = await budgetPage.getBudgetCardData(categoryId);
    const initialSpent = parseFloat(initialData.spent || '0');

    // Add a known expense
    const expenseAmount = 100000;
    await addTransactionPage.goto('expense');
    await addTransactionPage.fillExpenseForm({
      amount: expenseAmount.toString(),
      categoryId: categoryId,
      paymentMethodId: 'cash-id',
      description: 'Accuracy test expense',
    });
    await addTransactionPage.submit();

    // Verify budget page reflects the new spending
    await budgetPage.goto();
    const updatedData = await budgetPage.getBudgetCardData(categoryId);
    const updatedSpent = parseFloat(updatedData.spent || '0');

    // Spent amount should increase by exact expense amount
    expect(updatedSpent).toBe(initialSpent + expenseAmount);
  });

  test('should correctly calculate percentage used', async ({ page }) => {
    const budgetPage = new BudgetPage(page);
    await budgetPage.goto();

    const categoryId = 'percentage-test-category';
    const cardData = await budgetPage.getBudgetCardData(categoryId);

    // Extract values
    const spent = parseFloat(cardData.spent || '0');
    const budgetText = cardData.budgetAmount || '0';
    const budget = parseFloat(budgetText.replace(/[^\d.-]/g, ''));
    const displayedPercentage = cardData.percentageUsed || '0%';

    // Calculate expected percentage
    const expectedPercentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;

    // Verify displayed percentage matches calculation
    expect(displayedPercentage).toContain(`${expectedPercentage}%`);
  });

  test('should show correct remaining amount', async ({ page }) => {
    const budgetPage = new BudgetPage(page);
    await budgetPage.goto();

    const categoryId = 'remaining-test-category';
    const card = page.locator(`[data-budget-card="${categoryId}"]`);

    // Get budget and spent values
    const spent = parseFloat(await card.getAttribute('data-spent') || '0');
    const budgetAmount = await card.locator('[data-budget-amount]').textContent();
    const budget = parseFloat((budgetAmount || '0').replace(/[^\d.-]/g, ''));

    // Get displayed remaining
    const footerAmount = await card.locator('[data-footer-amount]').textContent();
    const displayedRemaining = parseFloat((footerAmount || '0').replace(/[^\d.-]/g, ''));

    // Verify remaining calculation
    const expectedRemaining = Math.abs(budget - spent);
    expect(displayedRemaining).toBe(expectedRemaining);
  });
});
```

---

## Data-TestID Attributes to Add

For stable test locators, add these `data-testid` attributes to components:

### Login Page (`src/components/molecules/LoginForm.astro`)
```html
<input data-testid="email-input" name="email" />
<input data-testid="password-input" name="password" />
<button data-testid="login-button" type="submit">Login</button>
```

### Transaction Form (`src/components/molecules/TransactionForm.astro`)
```html
<form data-testid="transaction-form">
<button data-testid="type-expense-btn" />
<button data-testid="type-income-btn" />
<input data-testid="amount-input" />
<select data-testid="category-select" />
<select data-testid="payment-method-select" />
<input data-testid="date-input" />
<textarea data-testid="description-input" />
<button data-testid="submit-btn" type="submit" />
```

### Budget Page (`src/pages/budget/index.astro`)
```html
<button data-testid="set-new-budget-btn" />
<div data-testid="budget-card-{categoryId}" />
```

### Toast Component (`src/components/molecules/Toast.astro`)
```html
<div data-testid="toast-success" />
<div data-testid="toast-error" />
```

---

## Test Data Strategy

### Approach: API Seeding

Use direct API calls for test data setup/teardown instead of UI interactions:

```typescript
// e2e/utils/api-helpers.ts
import { APIRequestContext } from '@playwright/test';

export class ApiHelpers {
  constructor(private request: APIRequestContext) {}

  async createTransaction(data: {
    type: 'expense' | 'income';
    amount: string;
    categoryId: string;
    paymentMethodId: string;
  }) {
    const response = await this.request.post('/api/transactions', {
      data: {
        type: data.type,
        amount: data.amount,
        currency: 'IDR',
        category_id: data.categoryId,
        payment_method_id: data.paymentMethodId,
        transaction_date: new Date().toISOString().split('T')[0],
        description: 'E2E Test Transaction',
      },
    });
    return response.json();
  }

  async deleteTransaction(id: string) {
    await this.request.delete(`/api/transactions/${id}`);
  }

  async setBudget(categoryId: string, amount: string) {
    const response = await this.request.patch(`/api/budget/category/${categoryId}`, {
      data: { budget_amount: amount },
    });
    return response.json();
  }
}
```

### Test User Requirements

The E2E tests use the **demo user** that is created by `db:seed` (run via `scripts/setup.sh`):

- **Email:** `demo@example.com`
- **Password:** `demodemo123`
- **Pre-configured:** Categories, payment methods, sample transactions, and budgets

The demo user credentials are configured in `.env.e2e`:
```bash
# .env.e2e (auto-generated by setup-e2e.sh)
E2E_USER_EMAIL=demo@example.com
E2E_USER_PASSWORD=demodemo123
```

**Important:** The `scripts/setup-e2e.sh` script runs `scripts/setup.sh` which:
1. Installs Bun dependencies (`bun install`)
2. Resets and seeds the database (`bun run db:reset`)

This ensures a clean, consistent test environment with the demo user available.

---

## Implementation Plan

### Phase 1: Setup Infrastructure

1. Install Playwright: `bun add -D @playwright/test`
2. Install browsers: `bun playwright install`
3. Create directory structure
4. **Create E2E environment setup:**
   - Create `scripts/setup-e2e.sh` script
   - Copy `.env.example` → `.env.e2e`
   - Configure `DATABASE_URL=db/.e2e.db`
   - Configure `PORT=4320`
   - Add E2E test user credentials
5. Configure `playwright.config.ts` (use port 4320)
6. Implement global auth setup
7. Add test scripts to `package.json`
8. Update `.gitignore` for E2E artifacts

### Phase 2: Add Test Locators

1. Add `data-testid` attributes to LoginForm
2. Add `data-testid` attributes to TransactionForm
3. Add `data-testid` attributes to BudgetPage components
4. Add `data-testid` attributes to Toast component

### Phase 3: Create Page Objects

1. Implement `BasePage.ts`
2. Implement `LoginPage.ts`
3. Implement `AddTransactionPage.ts`
4. Implement `TransactionsPage.ts`
5. Implement `BudgetPage.ts`

### Phase 4: Write Tests

1. Transaction tests (add-expense.spec.ts, add-income.spec.ts)
2. Budget tests (setup-budget.spec.ts, update-budget.spec.ts)
3. Accuracy tests (budget-accuracy.spec.ts)

### Phase 5: CI/CD Integration

1. Add E2E test job to GitHub Actions
2. Configure test artifacts (screenshots, traces)
3. Set up test database seeding for CI

---

## Package.json Updates

```json
{
  "scripts": {
    "test:e2e:setup": "./scripts/setup-e2e.sh",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

### Running E2E Tests

```bash
# First time setup (creates .env.e2e, installs deps, seeds E2E database)
bun run test:e2e:setup

# Run all E2E tests
bun run test:e2e

# Run with UI mode for debugging
bun run test:e2e:ui

# Run specific test file
bun playwright test tests/transactions/add-expense.spec.ts
```

---

## Quality Gates

Based on the constitution (constitution wins):

| Gate | Blocking | Notes |
|------|----------|-------|
| E2E Tests | No* | Like unit tests, failed E2E tests create ticket, fix in separate PR |
| Lint | Yes | Must pass before commit |
| Types | Yes | Must pass before commit |

*E2E tests are expensive and can be flaky. Follow constitution guidance: "E2E tests: Last priority (high cost, low frequency)"

---

## Success Criteria

1. **All business-critical flows covered**: Log expense, log income, setup budget, update budget
2. **Data accuracy verified**: Budget spending, allocation, and progress calculations
3. **Test stability**: < 5% flaky test rate
4. **Execution time**: Full suite completes in < 5 minutes
5. **Maintainability**: Page Object Model enables easy updates when UI changes

---

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Authentication](https://playwright.dev/docs/auth)
- [Playwright Page Object Model](https://playwright.dev/docs/pom)
- [Astro Testing Guide](https://docs.astro.build/en/guides/testing/)
- [BrowserStack Playwright Guide](https://www.browserstack.com/guide/playwright-best-practices)
- [Checkly Auth Management](https://www.checklyhq.com/docs/learn/playwright/authentication/)

---

**Next Steps**: Review this plan and proceed with Phase 1 implementation.
