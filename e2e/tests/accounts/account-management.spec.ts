import { test, expect } from '../test.fixture';
import { generateTestId, generateAccountData, formatIDR } from '../../helpers';
import { getVerificationToken } from '../../helpers/email-verification';

let freshWorkspaceEmailCounter = 0;

function uniqueFreshWorkspaceEmail(): string {
  return `e2e-accounts-fresh-${Date.now()}-${freshWorkspaceEmailCounter++}@test.com`;
}

/**
 * E2E Tests for Account Management.
 *
 * These tests verify the complete account lifecycle:
 * - Navigate to accounts page
 * - View existing accounts and portfolio total
 * - Create new accounts (bank accounts, cash, investments)
 * - Verify accounts appear in list
 * - Verify portfolio total is updated correctly
 * - Verify account balance displays correctly
 */
test.describe('Account Management', () => {
  /**
   * Test: Navigate to accounts page and verify initial state
   */
  test('navigate to accounts page and view existing accounts', async ({ accountsPage, page }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Verify we're on the accounts page
    expect(page.url()).toContain('/accounts');

    // Verify add account button is visible
    await accountsPage.expectAddAccountButtonVisible();

    // Verify portfolio total is displayed (may be empty if no accounts)
    const portfolioTotal = await accountsPage.getPortfolioTotal();
    expect(portfolioTotal).toBeDefined();
  });

  /**
   * Test: Create new account and verify it appears in list
   */
  test('create new account and verify it appears in list', async ({ accountsPage, page }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Generate test data
    const accountData = generateAccountData({
      name: `Test Bank Account ${generateTestId()}`,
      type: 'bank_account',
      balance: 5000000, // 5M IDR
      currency: 'IDR',
    });

    // Create account via UI
    await accountsPage.createAccount({
      name: accountData.name,
      type: accountData.type,
      currency: accountData.currency,
      initialBalance: accountData.balance,
    });

    // Wait for page to load after account creation
    await accountsPage.waitForPageLoad();

    // Verify account appears in list (this is the primary success verification)
    // Note: Toast message verification is skipped because the page reloads after account creation,
    // causing the toast to disappear before we can assert on it.
    await accountsPage.expectAccountExists(accountData.name);
  });

  /**
   * Test: Create account and verify portfolio total is updated
   */
  test('create account and verify portfolio total is updated', async ({ accountsPage, page }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Get initial portfolio total
    const initialPortfolioTotal = await accountsPage.getPortfolioTotal();
    let initialBalance = 0;

    if (initialPortfolioTotal && initialPortfolioTotal.trim().length > 0) {
      // Parse initial portfolio total if it exists
      initialBalance = parseInt(initialPortfolioTotal.replace(/[^\d]/g, ''), 10) || 0;
    }

    // Generate test account with known balance
    const accountBalance = 2500000; // 2.5M IDR
    const accountData = generateAccountData({
      name: `Portfolio Test ${generateTestId()}`,
      type: 'bank_account',
      balance: accountBalance,
      currency: 'IDR',
    });

    // Create account
    await accountsPage.createAccount({
      name: accountData.name,
      type: accountData.type,
      currency: accountData.currency,
      initialBalance: accountBalance,
    });

    // Wait for page to fully reload and data to update
    await accountsPage.waitForPageLoad();

    // Force a page refresh to ensure we get the latest data
    await page.reload();
    await accountsPage.waitForPageLoad();

    // Get updated portfolio total
    const updatedPortfolioTotal = await accountsPage.getPortfolioTotal();
    const updatedBalance = parseInt(updatedPortfolioTotal.replace(/[^\d]/g, ''), 10);

    // Verify portfolio total includes at least the new account balance
    expect(updatedBalance).toBeGreaterThanOrEqual(accountBalance);

    // Verify portfolio total increased by approximately the account balance
    // Allow for some variance due to other tests potentially running in parallel
    // or existing seeded data
    const expectedMinBalance = initialBalance + accountBalance;
    expect(updatedBalance).toBeGreaterThanOrEqual(expectedMinBalance);
  });

  /**
   * Test: Create multiple accounts and verify portfolio reflects total
   */
  test('create multiple accounts and verify combined portfolio total', async ({ accountsPage }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Create first account
    const account1Balance = 3000000; // 3M IDR
    const account1Data = generateAccountData({
      name: `Account One ${generateTestId()}`,
      type: 'bank_account',
      balance: account1Balance,
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: account1Data.name,
      type: account1Data.type,
      currency: account1Data.currency,
      initialBalance: account1Balance,
    });

    await accountsPage.waitForPageLoad();

    // Create second account
    const account2Balance = 1500000; // 1.5M IDR
    const account2Data = generateAccountData({
      name: `Account Two ${generateTestId()}`,
      type: 'e_wallet',
      balance: account2Balance,
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: account2Data.name,
      type: account2Data.type,
      currency: account2Data.currency,
      initialBalance: account2Balance,
    });

    await accountsPage.waitForPageLoad();

    // Get portfolio total
    const portfolioTotal = await accountsPage.getPortfolioTotal();
    const totalBalance = parseInt(portfolioTotal.replace(/[^\d]/g, ''), 10);

    // Verify portfolio total is at least the sum of the two accounts
    const expectedMinTotal = account1Balance + account2Balance;
    expect(totalBalance).toBeGreaterThanOrEqual(expectedMinTotal);

    // Verify both accounts appear in list
    await accountsPage.expectAccountExists(account1Data.name);
    await accountsPage.expectAccountExists(account2Data.name);
  });

  /**
   * Test: Verify account balance is displayed correctly
   */
  test('verify account balance is displayed correctly', async ({ accountsPage }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Generate test account with specific balance
    const accountBalance = 7500000; // 7.5M IDR
    const accountData = generateAccountData({
      name: `Balance Display Test ${generateTestId()}`,
      type: 'stock',
      balance: accountBalance,
      currency: 'IDR',
    });

    // Create account
    await accountsPage.createAccount({
      name: accountData.name,
      type: accountData.type,
      currency: accountData.currency,
      initialBalance: accountBalance,
    });

    await accountsPage.waitForPageLoad();

    // Format expected balance for display
    const expectedBalance = formatIDR(accountBalance);

    // Verify account balance is displayed correctly
    await accountsPage.expectAccountBalance(accountData.name, expectedBalance);
  });

  /**
   * Test: Create account with different currencies
   */
  test('create account with USD currency', async ({ accountsPage }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Generate test account with USD currency
    const accountData = generateAccountData({
      name: `USD Account ${generateTestId()}`,
      type: 'bank_account',
      balance: 1000, // 1000 USD
      currency: 'USD',
    });

    // Create account with USD currency
    await accountsPage.createAccount({
      name: accountData.name,
      type: accountData.type,
      currency: 'USD',
      initialBalance: accountData.balance,
    });

    await accountsPage.waitForPageLoad();

    // Verify account appears in list
    await accountsPage.expectAccountExists(accountData.name);

    // Get account ID by name
    const accountId = await accountsPage.getAccountIdByName(accountData.name);
    expect(accountId).not.toBeNull();
  });

  /**
   * Test: Account with zero initial balance
   */
  test('create account with zero initial balance', async ({ accountsPage }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Generate test account with zero balance
    const accountData = generateAccountData({
      name: `Empty Account ${generateTestId()}`,
      type: 'bank_account',
      balance: 0,
      currency: 'IDR',
    });

    // Create account with zero balance
    await accountsPage.createAccount({
      name: accountData.name,
      type: accountData.type,
      currency: accountData.currency,
      initialBalance: 0,
    });

    await accountsPage.waitForPageLoad();

    // Verify account appears even with zero balance
    await accountsPage.expectAccountExists(accountData.name);

    // Verify balance shows zero or empty formatted value
    const expectedBalance = formatIDR(0);
    await accountsPage.expectAccountBalance(accountData.name, expectedBalance);
  });

  /**
   * Test: Verify different account types can be created
   */
  test('create accounts of different types', async ({ accountsPage }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Create e-wallet account
    const eWalletAccount = generateAccountData({
      name: `E-Wallet ${generateTestId()}`,
      type: 'e_wallet',
      balance: 500000,
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: eWalletAccount.name,
      type: eWalletAccount.type,
      currency: eWalletAccount.currency,
      initialBalance: eWalletAccount.balance,
    });

    await accountsPage.waitForPageLoad();

    // Create investment account
    const investmentAccount = generateAccountData({
      name: `Investment Portfolio ${generateTestId()}`,
      type: 'stock',
      balance: 10000000,
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: investmentAccount.name,
      type: investmentAccount.type,
      currency: investmentAccount.currency,
      initialBalance: investmentAccount.balance,
    });

    await accountsPage.waitForPageLoad();

    // Create other account
    const otherAccount = generateAccountData({
      name: `Other Account ${generateTestId()}`,
      type: 'other',
      balance: 250000,
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: otherAccount.name,
      type: otherAccount.type,
      currency: otherAccount.currency,
      initialBalance: otherAccount.balance,
    });

    await accountsPage.waitForPageLoad();

    // Verify all accounts appear in list
    await accountsPage.expectAccountExists(eWalletAccount.name);
    await accountsPage.expectAccountExists(investmentAccount.name);
    await accountsPage.expectAccountExists(otherAccount.name);
  });

  /**
   * Test: Get account ID by name and verify it's returned
   */
  test('get account ID by name', async ({ accountsPage }) => {
    // Navigate to accounts page
    await accountsPage.goto();

    // Generate and create account
    const accountData = generateAccountData({
      name: `ID Test Account ${generateTestId()}`,
      type: 'bank_account',
      balance: 1000000,
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: accountData.name,
      type: accountData.type,
      currency: accountData.currency,
      initialBalance: accountData.balance,
    });

    await accountsPage.waitForPageLoad();

    // Get account ID by name
    const accountId = await accountsPage.getAccountIdByName(accountData.name);

    // Verify account ID is returned and is a non-empty string
    expect(accountId).not.toBeNull();
    expect(typeof accountId).toBe('string');
    expect(accountId).toBeTruthy();
  });
});

test.describe('Account Management - Fresh Workspace', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('empty state add button opens account modal for new workspace users', async ({
    page,
    request,
  }) => {
    const email = uniqueFreshWorkspaceEmail();
    const password = 'TestPassword123!';

    const signupResponse = await request.post('/api/auth/signup', {
      data: { email, password, name: 'E2E Fresh Workspace' },
    });
    expect(signupResponse.status()).toBe(201);

    const verificationToken = getVerificationToken(email);
    expect(verificationToken).toBeTruthy();

    await page.goto(`/api/auth/verify-email?token=${verificationToken}`);
    await page.waitForURL('**/login**');

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('**/dashboard');

    await page.goto('/accounts');

    const addFirstAccountButton = page.locator('button[data-add-account-btn]');
    await expect(addFirstAccountButton).toBeVisible();

    await addFirstAccountButton.click();

    await expect(page.locator('dialog#account-form-modal[open]')).toBeVisible();
  });
});
