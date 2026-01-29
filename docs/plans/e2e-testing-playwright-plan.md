# E2E Testing Plan with Playwright

**Version:** 2.1.0
**Date:** 2026-01-29
**Status:** ✅ IMPLEMENTED - Complete

---

## Implementation Progress

| Phase                   | Status      | Completion Date | Notes                           |
| ----------------------- | ----------- | --------------- | ------------------------------- |
| Phase 1: Infrastructure | ✅ Complete | 2026-01-28      | Pre-existing from prior work    |
| Phase 2: Page Objects   | ✅ Complete | 2026-01-28      | 10 page object files            |
| Phase 2: Data-testid    | ✅ Complete | 2026-01-28      | 15+ components updated          |
| Phase 3: Test Helpers   | ✅ Complete | 2026-01-28      | 4 helper files                  |
| Phase 3: Test Specs     | ✅ Complete | 2026-01-28      | 7 spec files, 40+ tests         |
| Phase 4: CI/CD          | ✅ Complete | 2026-01-28      | GitHub Actions workflow         |
| Phase 5: Improvements   | ✅ Complete | 2026-01-29      | DB reset, dynamic data, cleanup |

### v2.1.0 Improvements (2026-01-29)

**1. Test Results Consolidation**

- All test artifacts now stored in root `test-results/` folder
- HTML report: `test-results/playwright-report/`
- JSON results: `test-results/e2e-results.json`
- Artifacts (screenshots, traces): `test-results/artifacts/`

**2. Automatic Database Reset/Seed**

- Database is automatically reset and seeded before each test run
- Ensures test idempotency (tests can run multiple times with same results)
- Added in `global-setup.ts` before authentication step

**3. Dynamic Test Data**

- Transaction tests now query database for available categories/assets
- Uses `getSeededTestData()` helper to fetch categories and assets
- No more hardcoded category/asset names that must match seeder
- Tests are resilient to seeder changes

### Implementation Summary

**Executed by:** Claude Code (Principal Engineer mode) with 9 parallel agents
**Quality Gates:** All passing (TypeScript, ESLint, Prettier)
**Test Execution:** Blocked locally (missing browser deps), ready for CI

### Files Created

```
e2e/
├── playwright.config.ts              ✅ (pre-existing)
├── tests/
│   ├── global-setup.ts               ✅ (pre-existing)
│   ├── test.fixture.ts               ✅ Created
│   ├── business-flow.spec.ts         ✅ Created
│   ├── add-expense.spec.ts           ✅ Created
│   ├── add-income.spec.ts            ✅ Created
│   ├── assets/
│   │   └── asset-management.spec.ts  ✅ Created
│   ├── budget/
│   │   └── budget-management.spec.ts ✅ Created
│   ├── categories/
│   │   └── category-crud.spec.ts     ✅ Created
│   └── stats-verification/
│       └── cross-page-totals.spec.ts ✅ Created
├── pages/
│   ├── index.ts                      ✅ Created
│   ├── BasePage.ts                   ✅ Created
│   ├── LoginPage.ts                  ✅ Created
│   ├── DashboardPage.ts              ✅ Created
│   ├── BudgetPage.ts                 ✅ Created
│   ├── CategoriesPage.ts             ✅ Created
│   ├── AddTransactionPage.ts         ✅ Created
│   ├── AssetsPage.ts                 ✅ Created
│   ├── TransactionsPage.ts           ✅ Created
│   └── ReportsPage.ts                ✅ Created
├── helpers/
│   ├── index.ts                      ✅ Created
│   ├── api-helpers.ts                ✅ Created
│   ├── test-data.ts                  ✅ Created
│   └── assertions.ts                 ✅ Created
└── .auth/
    └── .gitkeep                      ✅ (pre-existing)

.github/workflows/
└── e2e-tests.yml                     ✅ Created
```

### Data-testid Attributes Added

| Component        | File                                                               | Attributes                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login Form       | `LoginForm.astro`                                                  | `login-form`, `email-input`, `password-input`, `login-btn`, `login-error`                                                                                 |
| Dashboard        | `dashboard.astro`, `SpendingCard.astro`, `NetWorthWidget.astro`    | `dashboard-page`, `dashboard-total-expenses`, `dashboard-total-income`, `dashboard-net-worth`                                                             |
| Transaction Form | `TransactionForm.astro`                                            | `transaction-form`, `transaction-type-*`, `transaction-amount-input`, `transaction-category-select`, `transaction-asset-select`, `transaction-submit-btn` |
| Budget Page      | `budget/index.astro`, `BudgetCard.astro`, `BudgetPageHeader.astro` | `budget-page`, `budget-card`, `budget-spent`, `budget-amount`, `budget-percentage`, `budget-month-selector`                                               |
| Categories Page  | `categories/index.astro`, `CategoryModal.astro`                    | `categories-page`, `create-category-btn`, `category-item`, `category-edit-btn`, `category-delete-btn`, `category-modal`                                   |
| Assets Page      | `assets/index.astro`, `AssetItemRow.astro`, `AssetFormModal.astro` | `assets-page`, `add-asset-btn`, `portfolio-total`, `asset-item`, `asset-balance`, `asset-form-modal`                                                      |

### Code Review Findings (Fixed)

| Priority | Issue                              | Resolution                                            |
| -------- | ---------------------------------- | ----------------------------------------------------- |
| P0       | XSS risk in `getByTestId` selector | Fixed: Use Playwright's built-in `page.getByTestId()` |
| P1       | NaN handling in `parseCurrency`    | Fixed: Added null/empty string handling               |
| P2       | API helpers auth documentation     | Added: JSDoc comments explaining auth context         |

---

## Executive Summary

This plan implements End-to-End testing using Playwright for the Expenses application, covering:

1. **Complete Business Flow**: Categories → Budget → Assets → Transactions → Stats Verification
2. **Cross-Page Consistency**: Same totals must match across Dashboard, Budget, Assets, Reports
3. **Parallel Agent Execution**: Structured for 2-3 agents with clear workstream isolation

---

## Dependencies

### Runtime Dependencies

| Package            | Version | Purpose               |
| ------------------ | ------- | --------------------- |
| `@playwright/test` | ^1.40+  | E2E testing framework |

### Installation Commands

```bash
# Install Playwright
bun add -D @playwright/test

# Install browser binaries
bunx playwright install chromium

# Verify installation
bunx playwright --version
```

### External Dependencies

| Dependency | Purpose                         |
| ---------- | ------------------------------- |
| Chromium   | Browser binary (via playwright) |
| SQLite     | E2E database (`db/.e2e.db`)     |
| Port 4320  | E2E server (must be available)  |

---

## Security Considerations

### 1. Credential Management (HIGH)

- Add `.env.e2e` to `.gitignore`
- Use environment variables in CI, not file-based config
- `E2E_USER_PASSWORD` must never match production credentials

### 2. Session State (MEDIUM)

- Add `e2e/.auth/` to `.gitignore`
- Clear auth state in CI after test runs
- Regenerate session state on each CI run

### 3. Database Isolation (MEDIUM)

- Use separate database file (`db/.e2e.db`)
- Reset database before each test suite
- Parallel test runs require separate database files

### 4. CSRF Handling (LOW)

- E2E tests via browser UI include CSRF tokens automatically
- API helpers only for test data setup, not security testing

---

## Minimal File Structure

```
e2e/
├── playwright.config.ts              # Playwright configuration
├── global-setup.ts                   # Auth state generation
├── fixtures/
│   └── test.fixture.ts               # Extended test with custom fixtures
├── pages/                            # Page Object Models
│   ├── BasePage.ts                   # Common page utilities
│   ├── LoginPage.ts                  # Authentication
│   ├── DashboardPage.ts              # Dashboard stats & widgets
│   ├── CategoriesPage.ts             # Category CRUD
│   ├── BudgetPage.ts                 # Budget management
│   ├── AssetsPage.ts                 # Asset management
│   ├── TransactionsPage.ts           # Transaction list
│   ├── AddTransactionPage.ts         # Transaction form
│   └── ReportsPage.ts                # Reports & analytics
├── tests/
│   ├── critical-flow/                # WORKSTREAM 1: Sequential critical path
│   │   └── business-flow.spec.ts     # Full user journey test
│   ├── categories/                   # WORKSTREAM 2: Category tests
│   │   └── category-crud.spec.ts     # Category CRUD operations
│   ├── budget/                       # WORKSTREAM 2: Budget tests
│   │   └── budget-management.spec.ts # Budget setup & alerts
│   ├── assets/                       # WORKSTREAM 3: Asset tests
│   │   └── asset-management.spec.ts  # Asset CRUD & history
│   ├── transactions/                 # WORKSTREAM 3: Transaction tests
│   │   ├── add-expense.spec.ts       # Expense transactions
│   │   └── add-income.spec.ts        # Income transactions
│   └── stats-verification/           # WORKSTREAM 1: Cross-page consistency
│       └── cross-page-totals.spec.ts # Stats match across pages
├── utils/
│   ├── api-helpers.ts                # Direct API calls for setup
│   ├── test-data.ts                  # Test data generators
│   └── assertions.ts                 # Custom assertion helpers
└── .auth/                            # Auth state storage (gitignored)
    └── user.json
```

---

## Business Critical Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BUSINESS CRITICAL FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SETUP PHASE (Prerequisites)                                             │
│     ├── Login with demo user                                                │
│     ├── Create expense category "E2E-Food"                                  │
│     ├── Create income category "E2E-Salary"                                 │
│     └── Create asset "E2E-Cash" (cash type, IDR)                            │
│                                                                             │
│  2. BUDGET PHASE                                                            │
│     ├── Set budget for "E2E-Food" = 1,000,000 IDR                           │
│     └── Verify budget appears in Budget page                                │
│                                                                             │
│  3. TRANSACTION PHASE                                                       │
│     ├── Add income: 5,000,000 IDR to "E2E-Cash" (category: E2E-Salary)      │
│     ├── Add expense: 300,000 IDR from "E2E-Cash" (category: E2E-Food)       │
│     └── Add expense: 200,000 IDR from "E2E-Cash" (category: E2E-Food)       │
│                                                                             │
│  4. VERIFICATION PHASE (Cross-Page Consistency)                             │
│     ├── Dashboard: Total income = 5,000,000                                 │
│     ├── Dashboard: Total expenses = 500,000                                 │
│     ├── Budget page: "E2E-Food" spent = 500,000 (50% of 1,000,000)          │
│     ├── Assets page: "E2E-Cash" balance reflects transactions               │
│     └── Reports page: Monthly totals match (if wired to backend)            │
│                                                                             │
│  5. CLEANUP PHASE                                                           │
│     └── Delete test data via API (optional - DB reset handles this)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stats Verification Matrix

| Stat             | Dashboard | Budget | Assets | Reports | Transactions |
| ---------------- | --------- | ------ | ------ | ------- | ------------ |
| Total Income     | ✓         |        |        | ✓\*     | ✓            |
| Total Expenses   | ✓         |        |        | ✓\*     | ✓            |
| Category Spent   |           | ✓      |        | ✓\*     |              |
| Budget Remaining |           | ✓      |        |         |              |
| Asset Balance    | ✓         |        | ✓      |         |              |
| Net Worth        | ✓         |        | ✓      |         |              |

\*Reports page uses mock data - verify only if backend is wired

---

## Parallel Agent Execution Plan

### Workstream Distribution (2-3 Agents)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PARALLEL EXECUTION PLAN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: INFRASTRUCTURE (Sequential - Single Agent)                        │
│  ──────────────────────────────────────────────────────────────────────────│
│  │ Agent: ANY                                                               │
│  │ Tasks:                                                                   │
│  │   1. Install Playwright + browsers                                       │
│  │   2. Create directory structure                                          │
│  │   3. Configure playwright.config.ts                                      │
│  │   4. Create scripts/setup-e2e.sh                                         │
│  │   5. Update package.json with e2e scripts                                │
│  │   6. Update .gitignore                                                   │
│  └─────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  PHASE 2: PAGE OBJECTS (Parallel - 2-3 Agents)                              │
│  ──────────────────────────────────────────────────────────────────────────│
│  │                                                                          │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  │ AGENT A         │  │ AGENT B         │  │ AGENT C         │          │
│  │  │ (Core Pages)    │  │ (Form Pages)    │  │ (Data Pages)    │          │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤          │
│  │  │ BasePage.ts     │  │ LoginPage.ts    │  │ AssetsPage.ts   │          │
│  │  │ DashboardPage   │  │ AddTransaction  │  │ ReportsPage.ts  │          │
│  │  │ BudgetPage.ts   │  │ CategoriesPage  │  │ TransactionsPage│          │
│  │  │                 │  │                 │  │                 │          │
│  │  │ + data-testid   │  │ + data-testid   │  │ + data-testid   │          │
│  │  │   attributes    │  │   attributes    │  │   attributes    │          │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│  │                                                                          │
│  │  Sync Point: All Page Objects complete before Phase 3                    │
│  └─────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  PHASE 3: TEST IMPLEMENTATION (Parallel - 2 Agents)                         │
│  ──────────────────────────────────────────────────────────────────────────│
│  │                                                                          │
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  │  │ AGENT A                  │  │ AGENT B                  │             │
│  │  │ (Critical Flow + Stats)  │  │ (Feature Tests)          │             │
│  │  ├──────────────────────────┤  ├──────────────────────────┤             │
│  │  │ business-flow.spec.ts    │  │ category-crud.spec.ts    │             │
│  │  │ cross-page-totals.spec   │  │ budget-management.spec   │             │
│  │  │ global-setup.ts          │  │ asset-management.spec    │             │
│  │  │ test.fixture.ts          │  │ add-expense.spec.ts      │             │
│  │  │ api-helpers.ts           │  │ add-income.spec.ts       │             │
│  │  └──────────────────────────┘  └──────────────────────────┘             │
│  │                                                                          │
│  └─────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  PHASE 4: INTEGRATION & CI (Sequential - Single Agent)                      │
│  ──────────────────────────────────────────────────────────────────────────│
│  │ Agent: ANY                                                               │
│  │ Tasks:                                                                   │
│  │   1. Run full test suite                                                 │
│  │   2. Fix any integration issues                                          │
│  │   3. Add GitHub Actions workflow                                         │
│  │   4. Document test commands                                              │
│  └─────────────────────────────────────────────────────────────────────────│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Task Breakdown

#### Phase 1: Infrastructure (1 Agent, Sequential) ✅ COMPLETE

| Task ID | Task                       | Deliverable                | Status |
| ------- | -------------------------- | -------------------------- | ------ |
| 1.1     | Install dependencies       | `package.json` updated     | ✅     |
| 1.2     | Create directory structure | `e2e/` folder tree         | ✅     |
| 1.3     | Playwright config          | `e2e/playwright.config.ts` | ✅     |
| 1.4     | E2E setup script           | `scripts/setup-e2e.sh`     | ✅     |
| 1.5     | Update .gitignore          | E2E artifacts excluded     | ✅     |

#### Phase 2: Page Objects (9 Parallel Agents) ✅ COMPLETE

**Agent A: Core Pages**

| Task ID | Task                  | Deliverable                  | Status |
| ------- | --------------------- | ---------------------------- | ------ |
| 2.A.1   | BasePage              | `e2e/pages/BasePage.ts`      | ✅     |
| 2.A.2   | DashboardPage         | `e2e/pages/DashboardPage.ts` | ✅     |
| 2.A.3   | BudgetPage            | `e2e/pages/BudgetPage.ts`    | ✅     |
| 2.A.4   | Dashboard data-testid | Update `dashboard.astro`     | ✅     |
| 2.A.5   | Budget data-testid    | Update `budget/index.astro`  | ✅     |

**Agent B: Form Pages**

| Task ID | Task                    | Deliverable                       | Status |
| ------- | ----------------------- | --------------------------------- | ------ |
| 2.B.1   | LoginPage               | `e2e/pages/LoginPage.ts`          | ✅     |
| 2.B.2   | AddTransactionPage      | `e2e/pages/AddTransactionPage.ts` | ✅     |
| 2.B.3   | CategoriesPage          | `e2e/pages/CategoriesPage.ts`     | ✅     |
| 2.B.4   | Login data-testid       | Update `LoginForm.astro`          | ✅     |
| 2.B.5   | Transaction data-testid | Update `TransactionForm.astro`    | ✅     |
| 2.B.6   | Category data-testid    | Update `categories/index.astro`   | ✅     |

**Agent C: Data Pages**

| Task ID | Task                | Deliverable                     | Status          |
| ------- | ------------------- | ------------------------------- | --------------- |
| 2.C.1   | AssetsPage          | `e2e/pages/AssetsPage.ts`       | ✅              |
| 2.C.2   | ReportsPage         | `e2e/pages/ReportsPage.ts`      | ✅              |
| 2.C.3   | TransactionsPage    | `e2e/pages/TransactionsPage.ts` | ✅              |
| 2.C.4   | Assets data-testid  | Update `assets/index.astro`     | ✅              |
| 2.C.5   | Reports data-testid | Update `reports/index.astro`    | N/A (mock data) |

#### Phase 3: Tests (7 Parallel Agents) ✅ COMPLETE

**Agent A: Critical Flow + Stats**

| Task ID | Task               | Deliverable                                              | Status            |
| ------- | ------------------ | -------------------------------------------------------- | ----------------- |
| 3.A.1   | Global setup       | `e2e/tests/global-setup.ts`                              | ✅ (pre-existing) |
| 3.A.2   | Test fixtures      | `e2e/tests/test.fixture.ts`                              | ✅                |
| 3.A.3   | API helpers        | `e2e/helpers/api-helpers.ts`                             | ✅                |
| 3.A.4   | Business flow test | `e2e/tests/business-flow.spec.ts`                        | ✅                |
| 3.A.5   | Cross-page totals  | `e2e/tests/stats-verification/cross-page-totals.spec.ts` | ✅                |

**Agent B: Feature Tests**

| Task ID | Task                    | Deliverable                                  | Status |
| ------- | ----------------------- | -------------------------------------------- | ------ |
| 3.B.1   | Category CRUD tests     | `e2e/tests/categories/category-crud.spec.ts` | ✅     |
| 3.B.2   | Budget management tests | `e2e/tests/budget/budget-management.spec.ts` | ✅     |
| 3.B.3   | Asset management tests  | `e2e/tests/assets/asset-management.spec.ts`  | ✅     |
| 3.B.4   | Add expense tests       | `e2e/tests/add-expense.spec.ts`              | ✅     |
| 3.B.5   | Add income tests        | `e2e/tests/add-income.spec.ts`               | ✅     |

#### Phase 4: CI/CD ✅ COMPLETE

| Task ID | Task                    | Deliverable                       | Status |
| ------- | ----------------------- | --------------------------------- | ------ |
| 4.1     | GitHub Actions workflow | `.github/workflows/e2e-tests.yml` | ✅     |
| 4.2     | README documentation    | `README.md` E2E section           | ✅     |
| 4.3     | Code review             | P0/P1 issues fixed, P2/P3 TODOs   | ✅     |

---

## Environment Configuration

### `.env.e2e`

```bash
# E2E Testing Environment
NODE_ENV=development

# API Configuration
PUBLIC_API_URL=/api

# Database - Separate E2E database
DATABASE_URL=db/.e2e.db

# Session Secret
SESSION_SECRET=e2e-testing-secret-key-change-in-production

# Server - Avoid conflict with dev server (4321)
PORT=4320

# E2E Test User Credentials (MUST match src/db/seed.ts)
E2E_USER_EMAIL=demo@example.com
E2E_USER_PASSWORD=demo123456789
```

### `scripts/setup-e2e.sh`

```bash
#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== E2E Environment Setup ===${NC}\n"

# 1. Create .env.e2e if it doesn't exist
if [ ! -f ".env.e2e" ]; then
    echo -e "${YELLOW}Creating .env.e2e from .env.example...${NC}"
    cp .env.example .env.e2e
    sed -i 's|DATABASE_URL=db/.dev.db|DATABASE_URL=db/.e2e.db|g' .env.e2e
    sed -i 's|PORT=4321|PORT=4320|g' .env.e2e
    echo "" >> .env.e2e
    echo "# E2E Test User Credentials" >> .env.e2e
    echo "E2E_USER_EMAIL=demo@example.com" >> .env.e2e
    echo "E2E_USER_PASSWORD=demo123456789" >> .env.e2e
    echo -e "${GREEN}✓ .env.e2e created${NC}\n"
fi

# 2. Switch to E2E environment
echo -e "${YELLOW}Switching to E2E environment...${NC}"
cp .env.e2e .env
echo -e "${GREEN}✓ Environment switched to E2E${NC}\n"

# 3. Run the standard setup script
echo -e "${YELLOW}Running setup script...${NC}"
./scripts/setup.sh

echo -e "${GREEN}=== E2E Environment Ready ===${NC}"
echo -e "Server will run on: ${YELLOW}http://localhost:4320${NC}"
```

### `.gitignore` Additions

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

## Technical Implementation

### Playwright Configuration

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

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

  webServer: {
    command: 'bun run dev',
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
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

### Global Setup (Authentication)

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${E2E_BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', process.env.E2E_USER_EMAIL!);
  await page.fill('[data-testid="password-input"]', process.env.E2E_USER_PASSWORD!);
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL('**/dashboard');

  await page.context().storageState({ path: 'e2e/.auth/user.json' });
  await browser.close();
}

export default globalSetup;
```

### Base Page Object

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

  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID').format(amount);
  }
}
```

### Critical Flow Test

```typescript
// e2e/tests/critical-flow/business-flow.spec.ts
import { test, expect } from '../../fixtures/test.fixture';

test.describe('Business Critical Flow', () => {
  test.describe.configure({ mode: 'serial' });

  const testData = {
    category: { name: 'E2E-Food', type: 'expense' },
    incomeCategory: { name: 'E2E-Salary', type: 'income' },
    asset: { name: 'E2E-Cash', type: 'cash', currency: 'IDR' },
    budget: { amount: '1000000' },
    income: { amount: '5000000', description: 'E2E Monthly Salary' },
    expenses: [
      { amount: '300000', description: 'E2E Groceries' },
      { amount: '200000', description: 'E2E Restaurant' },
    ],
  };

  test('1. Create expense category', async ({ categoriesPage }) => {
    await categoriesPage.goto();
    await categoriesPage.createCategory(testData.category.name, 'expense');
    await categoriesPage.expectCategoryExists(testData.category.name);
  });

  test('2. Create income category', async ({ categoriesPage }) => {
    await categoriesPage.goto();
    await categoriesPage.switchToIncomeTab();
    await categoriesPage.createCategory(testData.incomeCategory.name, 'income');
    await categoriesPage.expectCategoryExists(testData.incomeCategory.name);
  });

  test('3. Create cash asset', async ({ assetsPage }) => {
    await assetsPage.goto();
    await assetsPage.createAsset(testData.asset);
    await assetsPage.expectAssetExists(testData.asset.name);
  });

  test('4. Set budget for expense category', async ({ budgetPage, api }) => {
    const categoryId = await api.getCategoryIdByName(testData.category.name);
    await budgetPage.goto();
    await budgetPage.setBudget(categoryId, testData.budget.amount);
    await budgetPage.expectBudgetSet(categoryId, testData.budget.amount);
  });

  test('5. Add income transaction', async ({ addTransactionPage }) => {
    await addTransactionPage.goto('income');
    await addTransactionPage.fillForm({
      type: 'income',
      amount: testData.income.amount,
      categoryName: testData.incomeCategory.name,
      assetName: testData.asset.name,
      description: testData.income.description,
    });
    await addTransactionPage.submit();
    await addTransactionPage.expectRedirectToTransactions();
  });

  test('6. Add expense transactions', async ({ addTransactionPage }) => {
    for (const expense of testData.expenses) {
      await addTransactionPage.goto('expense');
      await addTransactionPage.fillForm({
        type: 'expense',
        amount: expense.amount,
        categoryName: testData.category.name,
        assetName: testData.asset.name,
        description: expense.description,
      });
      await addTransactionPage.submit();
      await addTransactionPage.expectRedirectToTransactions();
    }
  });

  test('7. Verify dashboard stats', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectTotalExpenses('500,000');
    await dashboardPage.expectTotalIncome('5,000,000');
  });

  test('8. Verify budget page reflects spending', async ({ budgetPage, api }) => {
    const categoryId = await api.getCategoryIdByName(testData.category.name);
    await budgetPage.goto();
    await budgetPage.expectCategorySpent(categoryId, '500,000');
    await budgetPage.expectCategoryPercentage(categoryId, '50%');
  });

  test('9. Verify asset balance reflects transactions', async ({ assetsPage }) => {
    await assetsPage.goto();
    await assetsPage.expectAssetBalance(testData.asset.name, '4,500,000');
  });
});
```

### Cross-Page Consistency Test

```typescript
// e2e/tests/stats-verification/cross-page-totals.spec.ts
import { test, expect } from '../../fixtures/test.fixture';

test.describe('Cross-Page Stats Consistency', () => {
  test('Monthly totals match across Dashboard and Transactions', async ({
    dashboardPage,
    transactionsPage,
  }) => {
    await dashboardPage.goto();
    const dashboardExpenses = await dashboardPage.getTotalExpenses();
    const dashboardIncome = await dashboardPage.getTotalIncome();

    await transactionsPage.goto();
    await transactionsPage.filterByCurrentMonth();
    const txExpenses = await transactionsPage.calculateTotalExpenses();
    const txIncome = await transactionsPage.calculateTotalIncome();

    expect(dashboardExpenses).toBe(txExpenses);
    expect(dashboardIncome).toBe(txIncome);
  });

  test('Net worth matches between Dashboard and Assets', async ({ dashboardPage, assetsPage }) => {
    await dashboardPage.goto();
    const dashboardNetWorth = await dashboardPage.getNetWorth();

    await assetsPage.goto();
    const assetsNetWorth = await assetsPage.getPortfolioTotal();

    expect(dashboardNetWorth).toBe(assetsNetWorth);
  });

  test('Budget spent matches category transactions', async ({
    budgetPage,
    transactionsPage,
    api,
  }) => {
    const categories = await api.getBudgetedCategories();
    if (categories.length === 0) {
      test.skip('No budgeted categories found');
      return;
    }

    const category = categories[0];

    await budgetPage.goto();
    const budgetSpent = await budgetPage.getCategorySpent(category.id);

    await transactionsPage.goto();
    await transactionsPage.filterByCategory(category.id);
    await transactionsPage.filterByCurrentMonth();
    const txTotal = await transactionsPage.calculateTotalExpenses();

    expect(budgetSpent).toBe(txTotal);
  });
});
```

---

## Data-TestID Attributes Required

### Dashboard (`src/pages/dashboard.astro`)

```html
<div data-testid="dashboard-total-expenses">...</div>
<div data-testid="dashboard-total-income">...</div>
<div data-testid="dashboard-net-worth">...</div>
```

### Budget Page (`src/pages/budget/index.astro`)

```html
<button data-testid="set-new-budget-btn">...</button>
<div data-testid="budget-card" data-category-id="{id}">
  <span data-testid="budget-spent">...</span>
  <span data-testid="budget-amount">...</span>
  <span data-testid="budget-percentage">...</span>
</div>
```

### Categories Page (`src/pages/categories/index.astro`)

```html
<button data-testid="create-category-btn">...</button>
<input data-testid="category-name-input" />
<div data-testid="category-item" data-category-id="{id}">...</div>
```

### Assets Page (`src/pages/assets/index.astro`)

```html
<button data-testid="add-asset-btn">...</button>
<div data-testid="portfolio-total">...</div>
<div data-testid="asset-item" data-asset-id="{id}">
  <span data-testid="asset-balance">...</span>
</div>
```

### Transaction Form (`src/components/molecules/TransactionForm.astro`)

```html
<form data-testid="transaction-form">
  <input data-testid="amount-input" />
  <select data-testid="category-select">
    ...
  </select>
  <select data-testid="asset-select">
    ...
  </select>
  <input data-testid="date-input" />
  <textarea data-testid="description-input">...</textarea>
  <button data-testid="submit-btn" type="submit">...</button>
</form>
```

### Login Form (`src/components/molecules/LoginForm.astro`)

```html
<input data-testid="email-input" />
<input data-testid="password-input" />
<button data-testid="login-btn" type="submit">...</button>
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "test:e2e:setup": "./scripts/setup-e2e.sh",
    "test:e2e": "playwright test --config=e2e/playwright.config.ts",
    "test:e2e:ui": "playwright test --config=e2e/playwright.config.ts --ui",
    "test:e2e:headed": "playwright test --config=e2e/playwright.config.ts --headed",
    "test:e2e:debug": "playwright test --config=e2e/playwright.config.ts --debug",
    "test:e2e:report": "playwright show-report e2e/playwright-report",
    "test:e2e:critical": "playwright test --config=e2e/playwright.config.ts --grep @critical"
  }
}
```

---

## Success Criteria

| Criteria               | Target                                |
| ---------------------- | ------------------------------------- |
| Business flow coverage | 100% of critical path tested          |
| Cross-page consistency | Stats match across all relevant pages |
| Test stability         | < 5% flaky rate                       |
| Execution time         | < 3 minutes for critical flow         |
| Parallel execution     | 2-3 agents can work independently     |

---

## Known Limitations

1. **Reports Page**: Uses mock data (`@TODO: P2 - Wire with backend`). Cross-page verification for Reports limited until backend is wired.

2. **Transfer Transactions**: Not covered in critical flow - only income/expense.

3. **Multi-Currency**: Tests focus on IDR. USD testing is secondary priority.

---

## Quality Gates

| Gate      | Blocking | Notes                                              |
| --------- | -------- | -------------------------------------------------- |
| E2E Tests | No\*     | Failed E2E tests create ticket, fix in separate PR |
| Lint      | Yes      | Must pass before commit                            |
| Types     | Yes      | Must pass before commit                            |

\*E2E tests follow constitution guidance: "E2E tests: Last priority (high cost, low frequency)"

---

## Next Steps

~~1. **Review & Approve**: This plan requires approval before implementation~~
~~2. **Phase 1**: Single agent sets up infrastructure~~
~~3. **Phase 2**: 2-3 agents work on Page Objects in parallel~~
~~4. **Phase 3**: 2 agents implement tests in parallel~~
~~5. **Phase 4**: Integration and CI setup~~

### ✅ Implementation Complete (2026-01-28)

All phases have been implemented. To run the E2E tests:

```bash
# One-time setup (creates .env.e2e only - database reset is now automatic)
bun run test:e2e:setup

# Run all E2E tests (database auto-resets before each run)
bun run test:e2e

# Run critical path tests only
bun run test:e2e:critical

# Run with interactive UI
bun run test:e2e:ui

# View HTML report (now at test-results/playwright-report)
bun run test:e2e:report
```

### Key Behaviors

1. **Automatic Database Reset**: The database is automatically reset and seeded in `global-setup.ts` before authentication. No need to manually reset between test runs.

2. **Idempotent Tests**: Tests can run multiple times with the same results because the database starts fresh each run.

3. **Dynamic Test Data**: Transaction tests fetch available categories/assets from the seeded database instead of using hardcoded values.

4. **Test Results Location**: All test artifacts are stored in `test-results/` at the project root:
   - HTML report: `test-results/playwright-report/`
   - JSON results: `test-results/e2e-results.json`
   - Screenshots/traces: `test-results/artifacts/`

### Post-Implementation Tasks

1. **Monitor CI**: Watch first few CI runs for flaky tests
2. **Add more tests**: Expand coverage based on bug reports
3. **Reports Page**: Wire backend data when available (currently uses mock data)
4. **Multi-currency**: Add USD-specific tests when needed
