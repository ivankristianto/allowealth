import { test, expect } from '../test.fixture';
import {
  createTransactionViaAPI,
  createCategoryViaAPI,
  createAccountViaAPI,
  deleteTransactionViaAPI,
  deleteCategoryViaAPI,
} from '../../helpers';
import { TEST_AMOUNTS } from '../../helpers/test-data';

/**
 * Cross-Page Data Consistency Tests
 *
 * This test suite verifies that financial data is displayed correctly
 * across different pages of the application:
 * - Dashboard: summary view of income and expenses
 * - Transactions: detailed transaction list
 * - Reports: financial analysis and totals
 *
 * Note: These tests verify data visibility, not exact cross-page consistency,
 * as each page may have different filtering and aggregation logic.
 */

// Path to the authentication storage state file
const AUTH_STATE_PATH = 'e2e/.auth/user.json';

// Generate unique suffix for test data to avoid conflicts across test runs
const TEST_RUN_ID = Date.now().toString(36);

test.describe('Cross-Page Data Verification', () => {
  // Run tests serially to share beforeAll/afterAll state
  test.describe.configure({ mode: 'serial' });

  let testCategoryExpenseId: string;
  let testCategoryIncomeId: string;
  let testAccountId: string;
  let testExpenseTransactionId: string;
  let testIncomeTransactionId: string;

  test.beforeAll(async ({ browser }) => {
    // Set up test data once for all tests in this suite
    // Create a new context WITH authentication storage state
    const context = await browser.newContext({
      storageState: AUTH_STATE_PATH,
    });
    const page = await context.newPage();

    try {
      // Create test expense category with unique name
      const expenseCategory = await createCategoryViaAPI(page.request, {
        name: `E2E Expense ${TEST_RUN_ID}`,
        type: 'expense',
        icon: 'shopping-cart',
        color: '#ef4444',
      });
      testCategoryExpenseId = expenseCategory.id;

      // Create test income category with unique name
      const incomeCategory = await createCategoryViaAPI(page.request, {
        name: `E2E Income ${TEST_RUN_ID}`,
        type: 'income',
        icon: 'briefcase',
        color: '#22c55e',
      });
      testCategoryIncomeId = incomeCategory.id;

      // Create test account with unique name
      const account = await createAccountViaAPI(page.request, {
        name: `E2E Account ${TEST_RUN_ID}`,
        type: 'bank_account',
        balance: TEST_AMOUNTS.SMALL_INCOME,
        currency: 'IDR',
      });
      testAccountId = account.id;

      // Create test transactions
      const expenseTransaction = await createTransactionViaAPI(page.request, {
        type: 'expense',
        amount: TEST_AMOUNTS.MEDIUM_EXPENSE,
        categoryId: testCategoryExpenseId,
        accountId: testAccountId,
        description: `E2E Expense ${TEST_RUN_ID}`,
      });
      testExpenseTransactionId = expenseTransaction.id;

      const incomeTransaction = await createTransactionViaAPI(page.request, {
        type: 'income',
        amount: TEST_AMOUNTS.MEDIUM_INCOME,
        categoryId: testCategoryIncomeId,
        accountId: testAccountId,
        description: `E2E Income ${TEST_RUN_ID}`,
      });
      testIncomeTransactionId = incomeTransaction.id;
    } finally {
      await context.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    // Clean up test data
    // Create a new context WITH authentication storage state
    const context = await browser.newContext({
      storageState: AUTH_STATE_PATH,
    });
    const page = await context.newPage();

    try {
      if (testExpenseTransactionId) {
        await deleteTransactionViaAPI(page.request, testExpenseTransactionId);
      }
      if (testIncomeTransactionId) {
        await deleteTransactionViaAPI(page.request, testIncomeTransactionId);
      }
      if (testCategoryExpenseId) {
        await deleteCategoryViaAPI(page.request, testCategoryExpenseId);
      }
      if (testCategoryIncomeId) {
        await deleteCategoryViaAPI(page.request, testCategoryIncomeId);
      }
    } finally {
      await context.close();
    }
  });

  test('dashboard displays financial totals', async ({ dashboardPage }) => {
    // Navigate to dashboard
    await dashboardPage.gotoDashboard();
    await expect(dashboardPage.page).toHaveURL('/dashboard');

    // Verify dashboard elements are visible
    await dashboardPage.expectTotalExpensesVisible();
    await dashboardPage.expectTotalIncomeVisible();

    // Get totals from dashboard
    const dashboardExpenses = await dashboardPage.getTotalExpenses();
    const dashboardIncome = await dashboardPage.getTotalIncome();

    // Dashboard should show some expenses and income (may include other data)
    // We verify that the values are at least as much as our test amounts
    expect(dashboardExpenses).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_EXPENSE);
    expect(dashboardIncome).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_INCOME);
  });

  test('transactions page displays transaction list', async ({ transactionsPage }) => {
    // Navigate to transactions page
    await transactionsPage.goto();
    await expect(transactionsPage.page).toHaveURL('/transactions');

    // Verify transaction list is visible
    await transactionsPage.expectTransactionListVisible();

    // Get transaction count to verify we have data
    const transactionCount = await transactionsPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);

    // Verify our test expense transaction is visible
    await transactionsPage.expectTransactionExists(`E2E Expense ${TEST_RUN_ID}`);
  });

  test('reports page displays summary', async ({ reportsPage }) => {
    // Navigate to reports page
    await reportsPage.goto();
    await expect(reportsPage.page).toHaveURL('/reports');

    // Verify reports page is visible
    await reportsPage.expectReportsPageVisible();
    await reportsPage.expectSummaryCardsVisible();

    // Get totals from reports
    const reportsIncome = await reportsPage.getTotalIncome();
    const reportsExpenses = await reportsPage.getTotalExpenses();

    // Reports should show reasonable amounts (may differ from dashboard due to date range)
    expect(reportsIncome).toBeGreaterThanOrEqual(0);
    expect(reportsExpenses).toBeGreaterThanOrEqual(0);
  });

  test('net worth is displayed on dashboard', async ({ dashboardPage }) => {
    // Navigate to dashboard
    await dashboardPage.gotoDashboard();

    // Verify net worth is visible
    await dashboardPage.expectNetWorthVisible();

    // Get net worth value
    const dashboardNetWorth = await dashboardPage.getNetWorth();

    // Net worth should be a reasonable value (can be 0 or positive)
    expect(dashboardNetWorth).toBeGreaterThanOrEqual(0);
  });

  test('navigation between pages preserves data visibility', async ({
    dashboardPage,
    transactionsPage,
    reportsPage,
  }) => {
    // Start at dashboard
    await dashboardPage.gotoDashboard();
    await dashboardPage.expectTotalExpensesVisible();

    // Navigate to transactions
    await transactionsPage.goto();
    await transactionsPage.expectTransactionListVisible();

    // Navigate to reports
    await reportsPage.goto();
    await reportsPage.expectReportsPageVisible();

    // Navigate back to dashboard
    await dashboardPage.gotoDashboard();
    await dashboardPage.expectTotalExpensesVisible();
  });
});
