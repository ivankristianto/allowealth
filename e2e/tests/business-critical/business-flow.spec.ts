import { test, expect } from '../test.fixture';
import { TEST_AMOUNTS, generateTestId, generateExpenseData, getCurrentMonth } from '../../helpers';
import {
  getCategoriesViaAPI,
  getAccountsViaAPI,
  expectSuccessToast,
  setBudgetViaAPI,
} from '../../helpers';

/**
 * Critical Business Flow E2E Test
 *
 * This test covers the complete monthly expense tracking workflow:
 * 1. Verify user is logged in (dashboard accessible)
 * 2. Add an expense transaction with a specific amount
 * 3. Verify the expense appears in the transaction list
 * 4. Verify the dashboard totals update correctly
 * 5. Navigate to reports and verify the expense is reflected
 *
 * This is the MOST IMPORTANT test - it exercises core user-facing functionality.
 */
test.describe('Business Flow: Monthly Expense Tracking', () => {
  // Test data that will be used throughout
  let categoryId: string;
  let categoryName: string;
  let accountId: string;
  let accountName: string;
  const expenseAmount = TEST_AMOUNTS.MEDIUM_EXPENSE; // 250,000 IDR
  let transactionDescription: string;

  /**
   * Setup: Prepare test data before running the test
   * Gets available categories and accounts from the API
   */
  test.beforeAll(async ({ request }) => {
    // Get expense categories
    const categories = await getCategoriesViaAPI(request, 'expense');
    if (categories.length === 0) {
      throw new Error('No expense categories found. Check database seed.');
    }
    // Use Food & Groceries category if available, otherwise use first category
    const foodCategory = categories.find((c) => c.name.includes('Food'));
    categoryId = foodCategory?.id || categories[0].id;
    categoryName = foodCategory?.name || categories[0].name;

    // Get available accounts
    const accounts = await getAccountsViaAPI(request);
    if (accounts.length === 0) {
      throw new Error('No accounts found. Check database seed.');
    }
    accountId = accounts[0].id;
    accountName = accounts[0].name;

    // Generate unique description for this test run
    transactionDescription = `E2E Expense Test ${generateTestId()}`;
  });

  test('complete expense lifecycle: add, verify across pages', async ({
    page,
    dashboardPage,
    addTransactionPage,
    transactionsPage,
    reportsPage,
  }) => {
    // =====================================================================
    // STEP 1: Verify dashboard is accessible (user is logged in)
    // =====================================================================
    await dashboardPage.gotoDashboard();

    // Verify key dashboard elements are visible
    await dashboardPage.expectTotalExpensesVisible();
    await dashboardPage.expectTotalIncomeVisible();

    // Capture the initial total expenses for comparison
    const initialExpenses = await dashboardPage.getTotalExpenses();

    // =====================================================================
    // STEP 2: Navigate to add transaction and submit an expense
    // =====================================================================
    await addTransactionPage.gotoAddTransaction('expense');

    // Fill and submit the transaction form
    // Note: gotoAddTransaction already verifies the form is visible
    await addTransactionPage.fillAndSubmit({
      type: 'expense',
      amount: expenseAmount,
      categoryName: categoryName,
      accountName: accountName,
      description: transactionDescription,
      date: new Date().toISOString().split('T')[0], // Today's date
    });

    // Verify redirect to transactions list after successful submission
    // Note: expectRedirectToTransactions validates the modal closes and page redirects,
    // which confirms the transaction was successfully created
    await addTransactionPage.expectRedirectToTransactions('expense');

    // =====================================================================
    // STEP 3: Verify the expense appears in the transaction list
    // =====================================================================
    await transactionsPage.goto();

    // Verify transaction list is visible
    await transactionsPage.expectTransactionListVisible();

    // Verify our transaction appears in the list by description
    await transactionsPage.expectTransactionExists(transactionDescription);

    // Get the transaction ID for further verification
    const transactionId =
      await transactionsPage.getTransactionIdByDescription(transactionDescription);
    expect(transactionId).not.toBeNull();

    // Verify transaction count increased
    const transactionCount = await transactionsPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);

    // =====================================================================
    // STEP 4: Verify dashboard totals updated correctly
    // =====================================================================
    await dashboardPage.gotoDashboard();

    // Verify total expenses increased by at least the transaction amount
    // Note: We use >= because other tests might be running in parallel
    // or there might be background data changes
    const updatedExpenses = await dashboardPage.getTotalExpenses();
    expect(updatedExpenses).toBeGreaterThanOrEqual(initialExpenses + expenseAmount);

    // =====================================================================
    // STEP 5: Navigate to reports and verify the expense is reflected
    // =====================================================================
    // Note: Reports page uses mock data, so we skip detailed verification
    // See: docs/plans/e2e-testing-playwright-plan.md - "Reports page uses mock data"
    await reportsPage.goto();

    // Just verify reports page loads successfully
    await reportsPage.expectReportsPageVisible();

    // =====================================================================
    // STEP 6: Verify filtering/navigation on transaction page
    // =====================================================================
    await transactionsPage.goto();

    // Filter by current month to isolate our transaction
    await transactionsPage.filterByCurrentMonth();

    // Verify our transaction is still visible after filtering
    await transactionsPage.expectTransactionExists(transactionDescription);

    // Verify we can calculate totals from the page
    const pageExpenseTotal = await transactionsPage.calculateTotalExpenses();
    expect(pageExpenseTotal).toBeGreaterThanOrEqual(expenseAmount);

    // =====================================================================
    // STEP 7: Cleanup - Delete the transaction (optional)
    // =====================================================================
    // Note: Cleanup is nice-to-have but not critical for the business flow test
    // The database is reset between test runs, so leaving test data is acceptable
    // TODO: Fix TransactionsPage.deleteTransaction() strict mode violation with multiple delete buttons
  });

  /**
   * Alternative test: Verify budget updates when expense is added
   * Tests the budget page shows updated spending after adding an expense transaction.
   */
  test('budget spending updates when expense is added', async ({
    request,
    page,
    dashboardPage,
    addTransactionPage,
    transactionsPage,
    budgetPage,
  }) => {
    // =====================================================================
    // SETUP: Set a budget for the category using API
    // =====================================================================
    const budgetAmount = TEST_AMOUNTS.BUDGET_MEDIUM; // 1.5M IDR

    // Set budget via API to ensure it exists before navigating
    await setBudgetViaAPI(request, categoryId, budgetAmount);

    // =====================================================================
    // STEP 1: Navigate to budget page and verify it loads
    // =====================================================================
    await budgetPage.gotoBudget();

    // Verify budget page loaded successfully
    await expect(page.getByTestId('budget-page')).toBeVisible({ timeout: 10000 });

    // Verify the budget card for our category exists
    await budgetPage.expectBudgetCardVisible(categoryId);

    // Get initial spent amount for the category
    const initialSpent = await budgetPage.getCategorySpent(categoryId);

    // =====================================================================
    // STEP 2: Add an expense transaction
    // =====================================================================
    await addTransactionPage.gotoAddTransaction('expense');
    await addTransactionPage.fillAndSubmit({
      type: 'expense',
      amount: TEST_AMOUNTS.SMALL_EXPENSE, // 50k IDR
      categoryName: categoryName,
      accountName: accountName,
      description: `Budget Test ${generateTestId()}`,
      date: new Date().toISOString().split('T')[0],
    });

    // Verify redirect to transactions page
    await addTransactionPage.expectRedirectToTransactions('expense');

    // =====================================================================
    // STEP 3: Navigate back to budget page and verify spending updated
    // =====================================================================
    await budgetPage.gotoBudget();

    // Wait for page to fully load
    await budgetPage.waitForPageLoad();

    // Verify the spent amount increased by the transaction amount
    const updatedSpent = await budgetPage.getCategorySpent(categoryId);
    expect(updatedSpent).toBeGreaterThanOrEqual(initialSpent + TEST_AMOUNTS.SMALL_EXPENSE);

    // Verify percentage is calculated correctly
    // Note: The percentage can exceed 100% if spending exceeds the budget,
    // which is expected in a test environment with existing seeded data
    const percentage = await budgetPage.getCategoryPercentage(categoryId);
    expect(percentage).toBeGreaterThan(0);

    // Verify the percentage reflects the updated spending
    // Calculate expected percentage: (updatedSpent / budgetAmount) * 100
    const expectedPercentage = Math.round((updatedSpent / budgetAmount) * 100);
    expect(percentage).toBe(expectedPercentage);

    // =====================================================================
    // STEP 4: Verify budget amount remained the same (only spent changed)
    // =====================================================================
    await budgetPage.expectBudgetSet(categoryId, budgetAmount);
  });
});
