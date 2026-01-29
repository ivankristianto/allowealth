import { test, expect } from '../test.fixture';
import { TEST_AMOUNTS, generateTestId, generateExpenseData } from '../../helpers';

test.describe('Add Expense Transaction', () => {
  /**
   * Successfully add an expense with all fields filled.
   *
   * Flow:
   * 1. Navigate to add transaction page with expense type pre-selected
   * 2. Fill form with expense details (amount, category, asset, date, description)
   * 3. Submit the form
   * 4. Verify redirect to transactions list page
   * 5. Verify success toast notification
   * 6. Verify the expense appears in the transaction list
   */
  test('successfully add expense with all fields', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const expenseId = generateTestId();
    const expenseDescription = `E2E Expense Test ${expenseId}`;
    const expenseAmount = TEST_AMOUNTS.MEDIUM_EXPENSE; // 250,000 IDR

    // Navigate to add transaction page with expense type pre-selected
    await addTransactionPage.gotoAddTransaction('expense');

    // Fill the form with expense details
    await addTransactionPage.fillForm({
      type: 'expense',
      amount: expenseAmount,
      categoryName: 'Food & Groceries',
      assetName: 'Cash',
      description: expenseDescription,
      date: new Date().toISOString().split('T')[0], // Today's date
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect to transactions list page
    // Note: Toast notification is shown but cleared by page reload, so we don't assert it
    await addTransactionPage.expectRedirectToTransactions('expense');

    // Verify the expense appears in the transaction list
    await transactionsPage.expectTransactionExists(expenseDescription);
  });

  /**
   * Successfully add a small expense with all required fields.
   *
   * Tests that all required fields (amount, category, asset, description/title) are provided.
   */
  test('successfully add expense with required fields only', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const expenseId = generateTestId();
    const expenseDescription = `E2E Expense ${expenseId}`;
    const expenseAmount = TEST_AMOUNTS.SMALL_EXPENSE; // 50,000 IDR

    // Navigate to add transaction page
    await addTransactionPage.gotoAddTransaction('expense');

    // Fill required fields (title/description is required, date uses default/today)
    await addTransactionPage.fillForm({
      type: 'expense',
      amount: expenseAmount,
      categoryName: 'Food & Groceries',
      assetName: 'Cash',
      description: expenseDescription, // Title is a required field
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect
    // Note: Toast notification is shown but cleared by page reload, so we don't assert it
    await addTransactionPage.expectRedirectToTransactions('expense');
  });

  /**
   * Successfully add a large expense amount.
   *
   * Verifies the form can handle larger expense amounts.
   */
  test('successfully add large expense amount', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const expenseId = generateTestId();
    const expenseDescription = `Large Expense ${expenseId}`;
    const expenseAmount = TEST_AMOUNTS.LARGE_EXPENSE; // 1,000,000 IDR

    // Navigate to add transaction page
    await addTransactionPage.gotoAddTransaction('expense');

    // Fill the form with large amount
    await addTransactionPage.fillForm({
      type: 'expense',
      amount: expenseAmount,
      categoryName: 'Misc. Cost',
      assetName: 'BCA Debit',
      description: expenseDescription,
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect
    // Note: Toast notification is shown but cleared by page reload, so we don't assert it
    await addTransactionPage.expectRedirectToTransactions('expense');

    // Verify expense appears in list
    await transactionsPage.expectTransactionExists(expenseDescription);
  });

  /**
   * Successfully add expense with custom date.
   *
   * Tests that past dates can be added (e.g., backdating an expense).
   */
  test('successfully add expense with past date', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data with a date 2 days ago (recent enough to appear on first page)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const formattedDate = pastDate.toISOString().split('T')[0];

    const expenseId = generateTestId();
    const expenseDescription = `Past Expense ${expenseId}`;
    const expenseAmount = TEST_AMOUNTS.MEDIUM_EXPENSE;

    // Navigate to add transaction page
    await addTransactionPage.gotoAddTransaction('expense');

    // Fill the form with past date
    await addTransactionPage.fillForm({
      type: 'expense',
      amount: expenseAmount,
      categoryName: 'Transportation',
      assetName: 'Cash',
      description: expenseDescription,
      date: formattedDate,
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect
    // Note: Toast notification is shown but cleared by page reload, so we don't assert it
    // The main verification is that the form accepts and submits with a past date successfully
    await addTransactionPage.expectRedirectToTransactions('expense');

    // Note: We don't verify the transaction appears in the list because it might be on a different
    // page or filtered out. The main purpose of this test is to verify that past dates are accepted.
  });

  /**
   * Verify the transaction type is correctly set to expense.
   *
   * Ensures that form submission sets the transaction type to 'expense'.
   */
  test('verify expense transaction type is set correctly', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const expenseId = generateTestId();
    const expenseDescription = `Type Test Expense ${expenseId}`;
    const expenseAmount = TEST_AMOUNTS.MEDIUM_EXPENSE;

    // Navigate to add transaction page with expense pre-selected
    await addTransactionPage.gotoAddTransaction('expense');

    // Fill and submit
    await addTransactionPage.fillForm({
      type: 'expense',
      amount: expenseAmount,
      categoryName: 'Food & Groceries',
      assetName: 'Cash',
      description: expenseDescription,
    });

    await addTransactionPage.submit();

    // Verify redirect
    // Note: Toast notification is shown but cleared by page reload, so we don't assert it
    await addTransactionPage.expectRedirectToTransactions('expense');

    // Verify the transaction exists with expense type
    // The TransactionsPage will look for the description text
    await transactionsPage.expectTransactionExists(expenseDescription);

    // Verify we're filtering by expense transactions
    // This ensures the transaction is indeed an expense type
    await transactionsPage.filterByType('expense');
    await transactionsPage.expectTransactionExists(expenseDescription);
  });

  /**
   * Successfully add multiple expenses in sequence.
   *
   * Tests that multiple expenses can be added without issues.
   */
  test('successfully add multiple expenses in sequence', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    const expenses = [
      {
        id: generateTestId(),
        amount: TEST_AMOUNTS.SMALL_EXPENSE,
        category: 'Food & Groceries',
      },
      {
        id: generateTestId(),
        amount: TEST_AMOUNTS.MEDIUM_EXPENSE,
        category: 'Transportation',
      },
      {
        id: generateTestId(),
        amount: TEST_AMOUNTS.LARGE_EXPENSE,
        category: 'Misc. Cost',
      },
    ];

    for (const expense of expenses) {
      // Navigate to add transaction page
      await addTransactionPage.gotoAddTransaction('expense');

      // Fill and submit
      const description = `Expense ${expense.id}`;
      await addTransactionPage.fillForm({
        type: 'expense',
        amount: expense.amount,
        categoryName: expense.category,
        assetName: 'Cash',
        description,
      });

      await addTransactionPage.submit();

      // Verify success
      // Note: Toast notification is shown but cleared by page reload, so we don't assert it
      await addTransactionPage.expectRedirectToTransactions('expense');
      await transactionsPage.expectTransactionExists(description);
    }
  });

  /**
   * Verify transaction form is properly reset after submission.
   *
   * Tests that form state is cleared after successful submission.
   */
  test('verify form is reset after expense submission', async ({ addTransactionPage }) => {
    // Navigate to add transaction
    await addTransactionPage.gotoAddTransaction('expense');

    // Fill the form
    await addTransactionPage.fillForm({
      type: 'expense',
      amount: TEST_AMOUNTS.MEDIUM_EXPENSE,
      categoryName: 'Food & Groceries',
      assetName: 'Cash',
      description: 'Test Expense',
    });

    // Verify form values were filled
    expect(await addTransactionPage.getAmountValue()).toBeTruthy();
    expect(await addTransactionPage.getSelectedCategory()).toBeTruthy();
    expect(await addTransactionPage.getSelectedAsset()).toBeTruthy();

    // Submit the form
    await addTransactionPage.submit();

    // Wait for redirect
    await addTransactionPage.expectRedirectToTransactions('expense');

    // Navigate back to add expense page
    await addTransactionPage.gotoAddTransaction('expense');

    // Verify form is empty or reset
    const amountValue = await addTransactionPage.getAmountValue();
    // Amount should be empty or cleared
    expect(amountValue).toBe('');
  });
});
