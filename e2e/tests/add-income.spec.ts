import { test, expect } from './test.fixture';
import { TEST_AMOUNTS, generateTestId } from '../helpers';
import { expectSuccessToast } from '../helpers/assertions';

test.describe('Add Income Transaction', () => {
  /**
   * Successfully add an income with all fields filled.
   *
   * Flow:
   * 1. Navigate to add transaction page with income type pre-selected
   * 2. Fill form with income details (amount, category, asset, date, description)
   * 3. Submit the form
   * 4. Verify redirect to transactions list page
   * 5. Verify success toast notification
   * 6. Verify the income appears in the transaction list
   */
  test('successfully add income with all fields', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const incomeId = generateTestId();
    const incomeDescription = `E2E Income Test ${incomeId}`;
    const incomeAmount = TEST_AMOUNTS.MEDIUM_INCOME; // 5,000,000 IDR

    // Navigate to add transaction page with income type pre-selected
    await addTransactionPage.gotoAddTransaction('income');

    // Fill the form with income details
    await addTransactionPage.fillForm({
      type: 'income',
      amount: incomeAmount,
      categoryName: 'Salary',
      assetName: 'Bank Account',
      description: incomeDescription,
      date: new Date().toISOString().split('T')[0], // Today's date
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect to transactions list page
    await addTransactionPage.expectRedirectToTransactions();

    // Verify success toast notification
    await expectSuccessToast(page, /successfully|created|added/i);

    // Verify the income appears in the transaction list
    await transactionsPage.expectTransactionExists(incomeDescription);
  });

  /**
   * Successfully add a small income without optional fields.
   *
   * Tests that only required fields (amount, category, asset) are necessary.
   */
  test('successfully add income with required fields only', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const incomeId = generateTestId();
    const incomeDescription = `E2E Income ${incomeId}`;
    const incomeAmount = TEST_AMOUNTS.SMALL_INCOME; // 1,000,000 IDR

    // Navigate to add transaction page
    await addTransactionPage.gotoAddTransaction('income');

    // Fill only required fields
    await addTransactionPage.fillForm({
      type: 'income',
      amount: incomeAmount,
      categoryName: 'Bonus',
      assetName: 'Bank Account',
      // description and date are optional
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect
    await addTransactionPage.expectRedirectToTransactions();

    // Verify success toast
    await expectSuccessToast(page, /successfully|created|added/i);
  });

  /**
   * Successfully add a large income amount.
   *
   * Verifies the form can handle larger income amounts.
   */
  test('successfully add large income amount', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const incomeId = generateTestId();
    const incomeDescription = `Large Income ${incomeId}`;
    const incomeAmount = TEST_AMOUNTS.LARGE_INCOME; // 15,000,000 IDR

    // Navigate to add transaction page
    await addTransactionPage.gotoAddTransaction('income');

    // Fill the form with large amount
    await addTransactionPage.fillForm({
      type: 'income',
      amount: incomeAmount,
      categoryName: 'Investment Income',
      assetName: 'Bank Account',
      description: incomeDescription,
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect
    await addTransactionPage.expectRedirectToTransactions();

    // Verify success toast
    await expectSuccessToast(page, /successfully|created|added/i);

    // Verify income appears in list
    await transactionsPage.expectTransactionExists(incomeDescription);
  });

  /**
   * Successfully add income with custom date.
   *
   * Tests that past dates can be added (e.g., backdating an income).
   */
  test('successfully add income with past date', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data with a date 7 days ago
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const formattedDate = pastDate.toISOString().split('T')[0];

    const incomeId = generateTestId();
    const incomeDescription = `Past Income ${incomeId}`;
    const incomeAmount = TEST_AMOUNTS.MEDIUM_INCOME;

    // Navigate to add transaction page
    await addTransactionPage.gotoAddTransaction('income');

    // Fill the form with past date
    await addTransactionPage.fillForm({
      type: 'income',
      amount: incomeAmount,
      categoryName: 'Freelance',
      assetName: 'Bank Account',
      description: incomeDescription,
      date: formattedDate,
    });

    // Submit the form
    await addTransactionPage.submit();

    // Verify redirect
    await addTransactionPage.expectRedirectToTransactions();

    // Verify success toast
    await expectSuccessToast(page, /successfully|created|added/i);

    // Verify income appears in list
    await transactionsPage.expectTransactionExists(incomeDescription);
  });

  /**
   * Verify the transaction type is correctly set to income.
   *
   * Ensures that form submission sets the transaction type to 'income'.
   */
  test('verify income transaction type is set correctly', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    // Generate test data
    const incomeId = generateTestId();
    const incomeDescription = `Type Test Income ${incomeId}`;
    const incomeAmount = TEST_AMOUNTS.MEDIUM_INCOME;

    // Navigate to add transaction page with income pre-selected
    await addTransactionPage.gotoAddTransaction('income');

    // Fill and submit
    await addTransactionPage.fillForm({
      type: 'income',
      amount: incomeAmount,
      categoryName: 'Salary',
      assetName: 'Bank Account',
      description: incomeDescription,
    });

    await addTransactionPage.submit();

    // Verify redirect and toast
    await addTransactionPage.expectRedirectToTransactions();
    await expectSuccessToast(page, /successfully|created|added/i);

    // Verify the transaction exists with income type
    // The TransactionsPage will look for the description text
    await transactionsPage.expectTransactionExists(incomeDescription);

    // Verify we're filtering by income transactions
    // This ensures the transaction is indeed an income type
    await transactionsPage.filterByType('income');
    await transactionsPage.expectTransactionExists(incomeDescription);
  });

  /**
   * Successfully add multiple incomes in sequence.
   *
   * Tests that multiple incomes can be added without issues.
   */
  test('successfully add multiple incomes in sequence', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    const incomes = [
      {
        id: generateTestId(),
        amount: TEST_AMOUNTS.SMALL_INCOME,
        category: 'Bonus',
      },
      {
        id: generateTestId(),
        amount: TEST_AMOUNTS.MEDIUM_INCOME,
        category: 'Salary',
      },
      {
        id: generateTestId(),
        amount: TEST_AMOUNTS.LARGE_INCOME,
        category: 'Investment Income',
      },
    ];

    for (const income of incomes) {
      // Navigate to add transaction page
      await addTransactionPage.gotoAddTransaction('income');

      // Fill and submit
      const description = `Income ${income.id}`;
      await addTransactionPage.fillForm({
        type: 'income',
        amount: income.amount,
        categoryName: income.category,
        assetName: 'Bank Account',
        description,
      });

      await addTransactionPage.submit();

      // Verify success
      await addTransactionPage.expectRedirectToTransactions();
      await expectSuccessToast(page, /successfully|created|added/i);
      await transactionsPage.expectTransactionExists(description);
    }
  });

  /**
   * Verify transaction form is properly reset after submission.
   *
   * Tests that form state is cleared after successful submission.
   */
  test('verify form is reset after income submission', async ({ addTransactionPage }) => {
    // Navigate to add transaction
    await addTransactionPage.gotoAddTransaction('income');

    // Fill the form
    await addTransactionPage.fillForm({
      type: 'income',
      amount: TEST_AMOUNTS.MEDIUM_INCOME,
      categoryName: 'Salary',
      assetName: 'Bank Account',
      description: 'Test Income',
    });

    // Verify form values were filled
    expect(await addTransactionPage.getAmountValue()).toBeTruthy();
    expect(await addTransactionPage.getSelectedCategory()).toBeTruthy();
    expect(await addTransactionPage.getSelectedAsset()).toBeTruthy();

    // Submit the form
    await addTransactionPage.submit();

    // Wait for redirect
    await addTransactionPage.expectRedirectToTransactions();

    // Navigate back to add income page
    await addTransactionPage.gotoAddTransaction('income');

    // Verify form is empty or reset
    const amountValue = await addTransactionPage.getAmountValue();
    // Amount should be empty or cleared
    expect(amountValue).toBe('');
  });

  /**
   * Test adding income with different asset types.
   *
   * Verifies that income can be added to various asset types.
   */
  test('successfully add income with different asset types', async ({
    addTransactionPage,
    transactionsPage,
    page,
  }) => {
    const assets = ['Bank Account', 'Cash Wallet'];

    for (const assetName of assets) {
      const incomeId = generateTestId();
      const incomeDescription = `Income to ${assetName} ${incomeId}`;
      const incomeAmount = TEST_AMOUNTS.MEDIUM_INCOME;

      // Navigate to add transaction page
      await addTransactionPage.gotoAddTransaction('income');

      // Fill the form with different asset
      await addTransactionPage.fillForm({
        type: 'income',
        amount: incomeAmount,
        categoryName: 'Salary',
        assetName,
        description: incomeDescription,
      });

      // Submit the form
      await addTransactionPage.submit();

      // Verify success
      await addTransactionPage.expectRedirectToTransactions();
      await expectSuccessToast(page, /successfully|created|added/i);
      await transactionsPage.expectTransactionExists(incomeDescription);
    }
  });
});
