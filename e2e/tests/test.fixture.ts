import { test as base } from '@playwright/test';
import { DashboardPage, BudgetPage, AddTransactionPage, AccountsPage, ReportsPage } from '../pages';

/**
 * Custom test fixture that provides page objects pre-initialized.
 * All tests should use this instead of the base Playwright test.
 */
export interface TestFixtures {
  dashboardPage: DashboardPage;
  budgetPage: BudgetPage;
  addTransactionPage: AddTransactionPage;
  accountsPage: AccountsPage;
  reportsPage: ReportsPage;
}

/**
 * Extended test with page object fixtures.
 * Each page object is lazily instantiated when accessed.
 */
export const test = base.extend<TestFixtures>({
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  budgetPage: async ({ page }, use) => {
    await use(new BudgetPage(page));
  },

  addTransactionPage: async ({ page }, use) => {
    await use(new AddTransactionPage(page));
  },

  accountsPage: async ({ page }, use) => {
    await use(new AccountsPage(page));
  },

  reportsPage: async ({ page }, use) => {
    await use(new ReportsPage(page));
  },
});

export { expect } from '@playwright/test';
