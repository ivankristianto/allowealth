import { test as base } from '@playwright/test';
import {
  LoginPage,
  DashboardPage,
  BudgetPage,
  CategoriesPage,
  AddTransactionPage,
  AccountsPage,
  TransactionsPage,
  ReportsPage,
} from '../pages';

/**
 * Custom test fixture that provides page objects pre-initialized.
 * All tests should use this instead of the base Playwright test.
 */
export interface TestFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  budgetPage: BudgetPage;
  categoriesPage: CategoriesPage;
  addTransactionPage: AddTransactionPage;
  accountsPage: AccountsPage;
  transactionsPage: TransactionsPage;
  reportsPage: ReportsPage;
}

/**
 * Extended test with page object fixtures.
 * Each page object is lazily instantiated when accessed.
 */
export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  budgetPage: async ({ page }, use) => {
    await use(new BudgetPage(page));
  },

  categoriesPage: async ({ page }, use) => {
    await use(new CategoriesPage(page));
  },

  addTransactionPage: async ({ page }, use) => {
    await use(new AddTransactionPage(page));
  },

  accountsPage: async ({ page }, use) => {
    await use(new AccountsPage(page));
  },

  transactionsPage: async ({ page }, use) => {
    await use(new TransactionsPage(page));
  },

  reportsPage: async ({ page }, use) => {
    await use(new ReportsPage(page));
  },
});

export { expect } from '@playwright/test';
