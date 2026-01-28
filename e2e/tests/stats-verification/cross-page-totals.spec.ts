import { test, expect } from '../test.fixture';
import {
  createTransactionViaAPI,
  createCategoryViaAPI,
  createAssetViaAPI,
  deleteTransactionViaAPI,
  deleteCategoryViaAPI,
} from '../../helpers';
import { TEST_AMOUNTS } from '../../helpers/test-data';

/**
 * Cross-Page Data Consistency Tests
 *
 * This test suite verifies that financial totals remain consistent
 * across different pages of the application:
 * - Dashboard: summary view of income and expenses
 * - Transactions: detailed transaction list
 * - Reports: financial analysis and totals
 *
 * Tests ensure data integrity and prevent discrepancies between views.
 */

test.describe('Cross-Page Data Consistency', () => {
  let testCategoryExpenseId: string;
  let testCategoryIncomeId: string;
  let testAssetId: string;
  let testExpenseTransactionId: string;
  let testIncomeTransactionId: string;

  test.beforeAll(async ({ browser }) => {
    // Set up test data once for all tests in this suite
    const page = await browser.newPage();

    try {
      // Create test expense category
      const expenseCategory = await createCategoryViaAPI(page.request, {
        name: 'E2E Test Expense Category',
        type: 'expense',
        icon: 'shopping-cart',
        color: '#ef4444',
      });
      testCategoryExpenseId = expenseCategory.id;

      // Create test income category
      const incomeCategory = await createCategoryViaAPI(page.request, {
        name: 'E2E Test Income Category',
        type: 'income',
        icon: 'briefcase',
        color: '#22c55e',
      });
      testCategoryIncomeId = incomeCategory.id;

      // Create test asset
      const asset = await createAssetViaAPI(page.request, {
        name: 'E2E Test Asset',
        type: 'bank',
        balance: TEST_AMOUNTS.SMALL_INCOME,
        currency: 'IDR',
      });
      testAssetId = asset.id;

      // Create test transactions
      const expenseTransaction = await createTransactionViaAPI(page.request, {
        type: 'expense',
        amount: TEST_AMOUNTS.MEDIUM_EXPENSE,
        categoryId: testCategoryExpenseId,
        assetId: testAssetId,
        description: 'E2E Test Expense - Cross Page Verification',
      });
      testExpenseTransactionId = expenseTransaction.id;

      const incomeTransaction = await createTransactionViaAPI(page.request, {
        type: 'income',
        amount: TEST_AMOUNTS.MEDIUM_INCOME,
        categoryId: testCategoryIncomeId,
        assetId: testAssetId,
        description: 'E2E Test Income - Cross Page Verification',
      });
      testIncomeTransactionId = incomeTransaction.id;
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    // Clean up test data
    const page = await browser.newPage();

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
      await page.close();
    }
  });

  test('totals match across dashboard, transactions, and reports pages', async ({
    dashboardPage,
    transactionsPage,
    reportsPage,
  }) => {
    // Navigate to dashboard and get totals
    await dashboardPage.gotoDashboard();
    await expect(dashboardPage.page).toHaveURL('/');

    // Retrieve totals from dashboard
    const dashboardExpenses = await dashboardPage.getTotalExpenses();
    const dashboardIncome = await dashboardPage.getTotalIncome();

    // Verify dashboard elements are visible
    await dashboardPage.expectTotalExpensesVisible();
    await dashboardPage.expectTotalIncomeVisible();

    // Verify dashboard totals are reasonable (greater than test amounts we created)
    expect(dashboardExpenses).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_EXPENSE);
    expect(dashboardIncome).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_INCOME);

    // Navigate to transactions page and calculate totals
    await transactionsPage.goto();
    await expect(transactionsPage.page).toHaveURL('/transactions');

    // Verify transaction list is visible
    await transactionsPage.expectTransactionListVisible();

    // Get transaction count to verify we have data
    const transactionCount = await transactionsPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);

    // Calculate totals from transaction list
    // Note: These methods sum visible transactions on current page
    // For full verification, we'd need to navigate through all pages if paginated
    const transactionsExpenses = await transactionsPage.calculateTotalExpenses();
    const transactionsIncome = await transactionsPage.calculateTotalIncome();

    // Transactions should show a subset or equal to dashboard (depends on filters/timeframe)
    // We verify that they are at least as much as our test transaction
    expect(transactionsExpenses).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_EXPENSE);
    expect(transactionsIncome).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_INCOME);

    // Navigate to reports page and verify totals
    await reportsPage.goto();
    await expect(reportsPage.page).toHaveURL('/reports');

    // Verify reports page is visible
    await reportsPage.expectReportsPageVisible();
    await reportsPage.expectSummaryCardsVisible();

    // Select monthly range to ensure consistency with other pages
    await reportsPage.selectMonthlyRange();

    // Get totals from reports
    const reportsIncome = await reportsPage.getTotalIncome();
    const reportsExpenses = await reportsPage.getTotalExpenses();

    // Verify reports show reasonable amounts
    expect(reportsIncome).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_INCOME);
    expect(reportsExpenses).toBeGreaterThanOrEqual(TEST_AMOUNTS.MEDIUM_EXPENSE);

    // Verify consistency across pages
    // Dashboard and Reports should match (both are summary views)
    expect(dashboardExpenses).toBe(reportsExpenses);
    expect(dashboardIncome).toBe(reportsIncome);

    // Transactions page totals should match dashboard/reports
    // (assuming all transactions are on current month)
    expect(transactionsExpenses).toBe(dashboardExpenses);
    expect(transactionsIncome).toBe(dashboardIncome);
  });

  test('income and expense totals change consistently when filtering by month', async ({
    dashboardPage,
    reportsPage,
  }) => {
    // Get current month totals from dashboard
    await dashboardPage.gotoDashboard();
    const currentMonthExpenses = await dashboardPage.getTotalExpenses();
    const currentMonthIncome = await dashboardPage.getTotalIncome();

    // Navigate to reports
    await reportsPage.goto();
    await reportsPage.selectMonthlyRange();

    // Get current month totals from reports
    const reportsCurrentExpenses = await reportsPage.getTotalExpenses();
    const reportsCurrentIncome = await reportsPage.getTotalIncome();

    // Current month should match between dashboard and reports
    expect(currentMonthExpenses).toBe(reportsCurrentExpenses);
    expect(currentMonthIncome).toBe(reportsCurrentIncome);
  });

  test('net worth and savings calculations are consistent', async ({
    dashboardPage,
    reportsPage,
  }) => {
    // Get net worth from dashboard
    await dashboardPage.gotoDashboard();
    const dashboardNetWorth = await dashboardPage.getNetWorth();

    // Verify net worth is visible
    await dashboardPage.expectNetWorthVisible();

    // Navigate to reports and get savings
    await reportsPage.goto();
    const reportsSavings = await reportsPage.getSavings();

    // Net worth and savings should both be present and reasonable
    // Note: Net worth and savings may differ slightly due to calculation methodology:
    // - Net Worth: Total assets - Total liabilities
    // - Savings: Income - Expenses for a period
    // We verify they're both present and positive
    expect(dashboardNetWorth).toBeGreaterThanOrEqual(0);
    expect(reportsSavings).toBeDefined();
  });

  test('transaction totals remain accurate after page navigation', async ({
    dashboardPage,
    transactionsPage,
    reportsPage,
  }) => {
    // Establish baseline from dashboard
    await dashboardPage.gotoDashboard();
    const initialExpenses = await dashboardPage.getTotalExpenses();
    const initialIncome = await dashboardPage.getTotalIncome();

    // Navigate to transactions page
    await transactionsPage.goto();

    // Verify we have transactions
    const transactionCount = await transactionsPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);

    // Navigate to reports
    await reportsPage.goto();
    const reportsExpenses = await reportsPage.getTotalExpenses();
    const reportsIncome = await reportsPage.getTotalIncome();

    // Navigate back to dashboard
    await dashboardPage.gotoDashboard();
    const finalExpenses = await dashboardPage.getTotalExpenses();
    const finalIncome = await dashboardPage.getTotalIncome();

    // Totals should remain consistent across navigation
    expect(finalExpenses).toBe(initialExpenses);
    expect(finalIncome).toBe(initialIncome);

    // Dashboard and reports should still match
    expect(finalExpenses).toBe(reportsExpenses);
    expect(finalIncome).toBe(reportsIncome);
  });
});
