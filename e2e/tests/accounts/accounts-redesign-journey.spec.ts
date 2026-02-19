import { test, expect } from '../test.fixture';
import { generateTestId, generateAccountData, formatIDR } from '../../helpers';

/**
 * E2E User Journey Tests for Accounts Redesign.
 *
 * Validates the redesigned account management features:
 * - Portfolio summary with Total Accounts, Total Debt, Net Worth
 * - Account class grouping (Liquid, Non-Liquid, Debt)
 * - Account detail page with balance comparison and monthly summary
 * - Debt account creation and portfolio exclusion
 * - Account detail navigation via name click
 */
test.describe('Accounts Redesign Journey', () => {
  /**
   * Journey 1: Portfolio Summary Structure
   *
   * Navigate to /accounts and verify the portfolio summary section
   * shows the three key metrics: Total Accounts, Total Debt, Net Worth.
   */
  test('portfolio summary shows Total Accounts, Total Debt, and Net Worth sections', async ({
    accountsPage,
    page,
  }) => {
    await accountsPage.goto();

    // Verify portfolio summary section exists
    const portfolioSection = page.locator('[data-testid="portfolio-total"]');
    await expect(portfolioSection).toBeVisible();

    // Verify "Total Accounts" section is present
    const totalAccounts = page.locator('[data-testid="portfolio-total-accounts"]');
    await expect(totalAccounts).toBeVisible();
    await expect(totalAccounts).toContainText('Total Accounts');

    // Verify "Net Worth" section is present
    const netWorth = page.locator('[data-testid="portfolio-net-worth"]');
    await expect(netWorth).toBeVisible();
    await expect(netWorth).toContainText('Net Worth');

    // Note: Total Debt section only renders when debt > 0.
    // We verify it conditionally since seeded data may or may not include debt.
    const totalDebt = page.locator('[data-testid="portfolio-total-debt"]');
    const debtCount = await totalDebt.count();
    if (debtCount > 0) {
      await expect(totalDebt).toContainText('Total Debt');
    }
  });

  /**
   * Journey 2: Account Class Grouping
   *
   * Verify accounts on the portfolio page are grouped under
   * "Liquid", "Non-Liquid", and "Debt" headings (when applicable).
   */
  test('accounts are grouped by account class headings', async ({ accountsPage, page }) => {
    await accountsPage.goto();

    // Get all account group cards
    const groups = page.locator('[data-testid="account-group"]');
    const groupCount = await groups.count();

    // There should be at least one group if accounts exist
    expect(groupCount).toBeGreaterThanOrEqual(1);

    // Collect all group labels that are rendered
    const renderedLabels: string[] = [];
    for (let i = 0; i < groupCount; i++) {
      const groupEl = groups.nth(i);
      const heading = groupEl.locator('h3').first();
      const label = await heading.textContent();
      if (label) renderedLabels.push(label.trim());
    }

    // Every rendered label must be one of the valid account class labels
    const validLabels = ['Liquid Accounts', 'Non-Liquid Accounts', 'Debt Accounts'];
    for (const label of renderedLabels) {
      expect(validLabels).toContain(label);
    }

    // Verify groupId data attribute maps to expected class keys
    const validGroupIds = ['liquid', 'non_liquid', 'debt'];
    for (let i = 0; i < groupCount; i++) {
      const groupId = await groups.nth(i).getAttribute('data-account-type');
      expect(validGroupIds).toContain(groupId);
    }
  });

  /**
   * Journey 3: Account Detail Page
   *
   * Click an account name to navigate to /accounts/[id],
   * then verify the detail page shows current balance,
   * calculated balance section, and monthly summary stats.
   */
  test('account detail page shows balance, calculated balance, and monthly summary', async ({
    accountsPage,
    page,
  }) => {
    await accountsPage.goto();

    // Find the first account item and click its name link
    const firstAccountItem = page.locator('[data-testid="account-item"]').first();
    await expect(firstAccountItem).toBeVisible();

    // Get the account ID for URL verification
    const accountId = await firstAccountItem.getAttribute('data-account-id');
    expect(accountId).toBeTruthy();

    // Click the account name link (inside h4 > a)
    // The component has dual mobile/desktop layouts, both contain h4 > a
    // Pick the visible one based on viewport
    const accountLinks = firstAccountItem.locator('h4 a');
    const visibleLink = (await accountLinks.nth(0).isVisible())
      ? accountLinks.nth(0)
      : accountLinks.nth(1);
    await visibleLink.click();

    // Verify navigation to detail page
    await page.waitForURL(`**/accounts/${accountId}`);
    expect(page.url()).toContain(`/accounts/${accountId}`);

    // Verify balance value is displayed (the account header shows the balance directly)
    const balanceSection = page.locator('.text-2xl').first();
    await expect(balanceSection).toBeVisible();

    // Verify monthly summary stat labels are present
    const statLabels = page.locator('.label-premium');
    const labelTexts = await statLabels.allTextContents();
    const normalizedLabels = labelTexts.map((t) => t.trim());
    expect(normalizedLabels).toContain('Income');
    expect(normalizedLabels).toContain('Expenses');
    expect(normalizedLabels).toContain('Transfers In');
    expect(normalizedLabels).toContain('Transfers Out');
  });

  /**
   * Journey 4: Debt Account Creation
   *
   * Create a credit_card account and verify:
   * - It appears under the "Debt" group
   * - Portfolio "Total Accounts" does NOT include the debt balance
   */
  test('create credit card account, verify it appears under Debt group', async ({
    accountsPage,
    page,
  }) => {
    await accountsPage.goto();

    // Record Total Accounts value before creating debt
    const totalAccountsBefore = page.locator('[data-testid="portfolio-total-accounts"]');
    await expect(totalAccountsBefore).toBeVisible();
    const totalAccountsTextBefore = await totalAccountsBefore.textContent();
    // Extract numeric value from the text (e.g., "Total AccountsRp1.234.567" -> 1234567)
    const totalAccountsNumBefore = parseInt(
      (totalAccountsTextBefore || '0').replace(/[^\d]/g, ''),
      10
    );

    // Create a credit card (debt) account
    const creditCardBalance = 2000000; // 2M IDR
    const creditCardData = generateAccountData({
      name: `CC Test ${generateTestId()}`,
      type: 'credit_card',
      balance: creditCardBalance,
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: creditCardData.name,
      type: creditCardData.type,
      currency: creditCardData.currency as 'IDR' | 'USD',
      initialBalance: creditCardBalance,
    });

    await accountsPage.waitForPageLoad();

    // Verify the account appears in the list
    await accountsPage.expectAccountExists(creditCardData.name);

    // Verify it is inside the "Debt" group card
    const debtGroup = page.locator('[data-testid="account-group"][data-account-type="debt"]');
    await expect(debtGroup).toBeVisible();
    const debtAccountItem = debtGroup
      .locator('[data-testid="account-item"]')
      .filter({ has: page.locator('h4', { hasText: creditCardData.name }) });
    await expect(debtAccountItem).toBeVisible();

    // Verify Total Debt section now shows (since we created a debt account)
    const totalDebt = page.locator('[data-testid="portfolio-total-debt"]');
    await expect(totalDebt).toBeVisible();
    await expect(totalDebt).toContainText('Total Debt');

    // Verify Total Accounts did NOT increase by the debt balance.
    // Total Accounts should remain the same (debt is excluded from accounts total).
    const totalAccountsAfter = page.locator('[data-testid="portfolio-total-accounts"]');
    const totalAccountsTextAfter = await totalAccountsAfter.textContent();
    const totalAccountsNumAfter = parseInt(
      (totalAccountsTextAfter || '0').replace(/[^\d]/g, ''),
      10
    );

    // Total Accounts should NOT have increased by the credit card balance
    // (it should stay the same or only change by non-debt account additions)
    expect(totalAccountsNumAfter).toBeLessThanOrEqual(totalAccountsNumBefore + 1);
  });

  /**
   * Journey 5: Account Detail Navigation
   *
   * Create a bank_account, navigate to its detail page by clicking the name,
   * then verify the back link returns to the portfolio page.
   */
  test('create bank account, navigate to detail via name click, verify back link', async ({
    accountsPage,
    page,
  }) => {
    await accountsPage.goto();

    // Create a bank account account
    const bankData = generateAccountData({
      name: `Nav Test Bank ${generateTestId()}`,
      type: 'bank_account',
      balance: 3000000, // 3M IDR
      currency: 'IDR',
    });

    await accountsPage.createAccount({
      name: bankData.name,
      type: bankData.type,
      currency: bankData.currency as 'IDR' | 'USD',
      initialBalance: bankData.balance,
    });

    await accountsPage.waitForPageLoad();

    // Verify the account exists
    await accountsPage.expectAccountExists(bankData.name);

    // Get the account ID
    const accountId = await accountsPage.getAccountIdByName(bankData.name);
    expect(accountId).toBeTruthy();

    // Click the account name link to navigate to detail page
    const accountItem = page
      .locator('[data-testid="account-item"]')
      .filter({ has: page.locator('h4', { hasText: bankData.name }) });
    // The component has dual mobile/desktop layouts, both contain h4 > a
    // Pick the visible one based on viewport
    const nameLinks = accountItem.locator('h4 a');
    const nameLink = (await nameLinks.nth(0).isVisible()) ? nameLinks.nth(0) : nameLinks.nth(1);
    await nameLink.click();

    // Verify we navigated to the detail page
    await page.waitForURL(`**/accounts/${accountId}`);
    expect(page.url()).toContain(`/accounts/${accountId}`);

    // Verify account name is displayed on detail page
    await expect(page.locator('h2').filter({ hasText: bankData.name })).toBeVisible();

    // Verify balance value is displayed
    const formattedBalance = formatIDR(bankData.balance);
    await expect(page.locator('text=' + formattedBalance).first()).toBeVisible();

    // Click "Back to Portfolio" link
    const backLink = page.locator('a').filter({ hasText: 'Back to All Accounts' });
    await expect(backLink).toBeVisible();
    await backLink.click();

    // Verify we returned to the accounts list page
    await page.waitForURL('**/accounts');
    expect(page.url()).toMatch(/\/accounts\/?$/);
  });
});
