# expenses

Personal and Family Financial Application

## Quick Start

```bash
# Install dependencies
bun install

# Set up database (migrate + seed with demo data)
bun run db:reset

# Start development server
bun run dev
```

## Database Seeding

### Demo User Credentials

After seeding, you can log in with:

- **Email:** `demo@example.com`
- **Password:** `demo123`

### Seeded Data

The seeder creates realistic sample data for testing:

- **1 User** with default settings (IDR as primary currency)
- **15 Categories** (4 income, 11 expense types)
- **5 Payment Methods** (Cash, BCA Debit/Credit, GoPay, OVO)
- **360+ Transactions** spanning 90 days with Indonesian spending patterns
- **6 Assets** (bank accounts, mutual funds, stocks, crypto)
- **72 Asset History entries** (weekly balance updates)
- **6 Asset Update Reminders**
- **3 Asset Snapshots** with items
- **90 Exchange Rate entries** (IDR/USD for last 90 days)

### Seed Commands

```bash
# Seed database with full demo data (keeps existing data)
bun run db:seed

# Seed database with dashboard test data (lightweight, focused on dashboard)
bun run db:seed:dashboard

# Reset database with full demo data
bun run db:reset

# Reset database with dashboard test data
bun run db:reset:dashboard
```

### Dashboard Test User

For dashboard testing, you can use the dashboard seeder which creates:

- **Email:** `test@example.com`
- **Password:** `Test12345678!`

The dashboard seeder creates focused test data:

- **1 User** with default settings
- **11 Categories** (3 income, 8 expense types)
- **3 Payment Methods** (Cash, Bank Transfer, Credit Card)
- **200+ Transactions** spanning 90 days
- **6 Assets** with varied update dates (to test priority logic)
- **90 Exchange Rate entries** (IDR/USD)

### Troubleshooting

**Issue:** "no such table" error when running `db:seed`

**Solution:** The database tables haven't been created yet. Run `bun run db:reset` to set up the database from scratch.

**Issue:** Database becomes corrupted or has invalid data

**Solution:** Run `bun run db:reset` to start fresh with a clean database.

## E2E Testing

End-to-end tests use Playwright with a Page Object Model pattern.

### Prerequisites

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium --with-deps
```

### Running E2E Tests

```bash
# Setup E2E environment (creates .env.e2e and seeds test database)
bun run test:e2e:setup

# Run all E2E tests
bun run test:e2e

# Run tests with browser visible
bun run test:e2e:headed

# Run tests in UI mode (interactive debugging)
bun run test:e2e:ui

# Run tests in debug mode (step through)
bun run test:e2e:debug

# Run only critical business flow tests
bun run test:e2e:critical

# View HTML test report
bun run test:e2e:report
```

### E2E Test Structure

```
e2e/
├── playwright.config.ts     # Playwright configuration
├── tests/
│   ├── global-setup.ts      # Authentication setup
│   ├── test.fixture.ts      # Custom test fixtures
│   ├── business-flow.spec.ts # Critical path tests
│   ├── add-expense.spec.ts  # Expense transaction tests
│   ├── add-income.spec.ts   # Income transaction tests
│   ├── assets/              # Asset management tests
│   ├── budget/              # Budget management tests
│   ├── categories/          # Category CRUD tests
│   └── stats-verification/  # Cross-page data consistency
├── pages/                   # Page Object Models
│   ├── BasePage.ts          # Base class with utilities
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── ... (other page objects)
└── helpers/                 # Test utilities
    ├── api-helpers.ts       # API interaction helpers
    ├── test-data.ts         # Test data generators
    └── assertions.ts        # Custom assertions
```

### Test Credentials

E2E tests use the demo user from the seed data:

- **Email:** `demo@example.com`
- **Password:** `demo123456789`

### Writing New Tests

Tests use custom fixtures that provide pre-initialized page objects:

```typescript
import { test, expect } from './test.fixture';

test('example test', async ({ dashboardPage, transactionsPage }) => {
  await dashboardPage.goto();
  const total = await dashboardPage.getTotalExpenses();
  expect(total).toBeGreaterThan(0);
});
```

### CI/CD

E2E tests run automatically on:

- Pull requests to main branch
- Pushes to main branch
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for the full CI configuration.
