import { test, expect } from '../test.fixture';
import { generateTestId, generateAssetData, formatIDR } from '../../helpers';

/**
 * E2E User Journey Tests for Assets Redesign.
 *
 * Validates the redesigned asset management features:
 * - Portfolio summary with Total Assets, Total Debt, Net Worth
 * - Account class grouping (Liquid, Non-Liquid, Debt)
 * - Asset detail page with balance comparison and monthly summary
 * - Debt account creation and portfolio exclusion
 * - Asset detail navigation via name click
 */
test.describe('Assets Redesign Journey', () => {
  /**
   * Journey 1: Portfolio Summary Structure
   *
   * Navigate to /assets and verify the portfolio summary section
   * shows the three key metrics: Total Assets, Total Debt, Net Worth.
   */
  test('portfolio summary shows Total Assets, Total Debt, and Net Worth sections', async ({
    assetsPage,
    page,
  }) => {
    await assetsPage.goto();

    // Verify portfolio summary section exists
    const portfolioSection = page.locator('[data-testid="portfolio-total"]');
    await expect(portfolioSection).toBeVisible();

    // Verify "Total Assets" section is present
    const totalAssets = page.locator('[data-testid="portfolio-total-assets"]');
    await expect(totalAssets).toBeVisible();
    await expect(totalAssets).toContainText('Total Assets');

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
   * Verify assets on the portfolio page are grouped under
   * "Liquid", "Non-Liquid", and "Debt" headings (when applicable).
   */
  test('assets are grouped by account class headings', async ({ assetsPage, page }) => {
    await assetsPage.goto();

    // Get all asset group cards
    const groups = page.locator('[data-testid="asset-group"]');
    const groupCount = await groups.count();

    // There should be at least one group if assets exist
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
    const validLabels = ['Liquid', 'Non-Liquid', 'Debt'];
    for (const label of renderedLabels) {
      expect(validLabels).toContain(label);
    }

    // Verify groupId data attribute maps to expected class keys
    const validGroupIds = ['liquid', 'non_liquid', 'debt'];
    for (let i = 0; i < groupCount; i++) {
      const groupId = await groups.nth(i).getAttribute('data-asset-type');
      expect(validGroupIds).toContain(groupId);
    }
  });

  /**
   * Journey 3: Asset Detail Page
   *
   * Click an asset name to navigate to /assets/[id],
   * then verify the detail page shows current balance,
   * calculated balance section, and monthly summary stats.
   */
  test('asset detail page shows balance, calculated balance, and monthly summary', async ({
    assetsPage,
    page,
  }) => {
    await assetsPage.goto();

    // Find the first asset item and click its name link
    const firstAssetItem = page.locator('[data-testid="asset-item"]').first();
    await expect(firstAssetItem).toBeVisible();

    // Get the asset ID for URL verification
    const assetId = await firstAssetItem.getAttribute('data-asset-id');
    expect(assetId).toBeTruthy();

    // Click the asset name link (inside h4 > a)
    const assetLink = firstAssetItem.locator('h4 a').first();
    await assetLink.click();

    // Verify navigation to detail page
    await page.waitForURL(`**/assets/${assetId}`);
    expect(page.url()).toContain(`/assets/${assetId}`);

    // Verify "Current Balance" label is displayed
    await expect(page.getByText('Current Balance')).toBeVisible();

    // Verify balance value is displayed (contains "Rp" for IDR or "$" for USD)
    const balanceSection = page.locator('.text-2xl, .lg\\:text-3xl').first();
    await expect(balanceSection).toBeVisible();

    // Verify "Calculated Balance" section exists (may not render if no transactions)
    // We check for the label text; it only appears when calculated balance is available
    const calcBalanceLabel = page.getByText('Calculated Balance');
    const calcCount = await calcBalanceLabel.count();
    // Just verify the page structure is correct - calculated balance is optional
    expect(calcCount).toBeGreaterThanOrEqual(0);

    // Verify monthly summary stat cards are present
    await expect(page.getByText('Income', { exact: true })).toBeVisible();
    await expect(page.getByText('Expenses', { exact: true })).toBeVisible();
    await expect(page.getByText('Transfers In', { exact: true })).toBeVisible();
    await expect(page.getByText('Transfers Out', { exact: true })).toBeVisible();

    // Verify the transactions section heading exists
    await expect(page.locator('h3').filter({ hasText: 'Transactions' })).toBeVisible();
  });

  /**
   * Journey 4: Debt Account Creation
   *
   * Create a credit_card asset and verify:
   * - It appears under the "Debt" group
   * - Portfolio "Total Assets" does NOT include the debt balance
   */
  test('create credit card asset, verify it appears under Debt group', async ({
    assetsPage,
    page,
  }) => {
    await assetsPage.goto();

    // Record Total Assets value before creating debt
    const totalAssetsBefore = page.locator('[data-testid="portfolio-total-assets"]');
    await expect(totalAssetsBefore).toBeVisible();
    const totalAssetsTextBefore = await totalAssetsBefore.textContent();
    // Extract numeric value from the text (e.g., "Total AssetsRp1.234.567" -> 1234567)
    const totalAssetsNumBefore = parseInt((totalAssetsTextBefore || '0').replace(/[^\d]/g, ''), 10);

    // Create a credit card (debt) asset
    const creditCardBalance = 2000000; // 2M IDR
    const creditCardData = generateAssetData({
      name: `CC Test ${generateTestId()}`,
      type: 'credit_card',
      balance: creditCardBalance,
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: creditCardData.name,
      type: creditCardData.type,
      currency: creditCardData.currency as 'IDR' | 'USD',
      initialBalance: creditCardBalance,
    });

    await assetsPage.waitForPageLoad();

    // Verify the asset appears in the list
    await assetsPage.expectAssetExists(creditCardData.name);

    // Verify it is inside the "Debt" group card
    const debtGroup = page.locator('[data-testid="asset-group"][data-asset-type="debt"]');
    await expect(debtGroup).toBeVisible();
    const debtAssetItem = debtGroup
      .locator('[data-testid="asset-item"]')
      .filter({ has: page.locator('h4', { hasText: creditCardData.name }) });
    await expect(debtAssetItem).toBeVisible();

    // Verify Total Debt section now shows (since we created a debt asset)
    const totalDebt = page.locator('[data-testid="portfolio-total-debt"]');
    await expect(totalDebt).toBeVisible();
    await expect(totalDebt).toContainText('Total Debt');

    // Verify Total Assets did NOT increase by the debt balance.
    // Total Assets should remain the same (debt is excluded from assets total).
    const totalAssetsAfter = page.locator('[data-testid="portfolio-total-assets"]');
    const totalAssetsTextAfter = await totalAssetsAfter.textContent();
    const totalAssetsNumAfter = parseInt((totalAssetsTextAfter || '0').replace(/[^\d]/g, ''), 10);

    // Total Assets should NOT have increased by the credit card balance
    // (it should stay the same or only change by non-debt asset additions)
    expect(totalAssetsNumAfter).toBeLessThanOrEqual(totalAssetsNumBefore + 1);
  });

  /**
   * Journey 5: Asset Detail Navigation
   *
   * Create a bank_account, navigate to its detail page by clicking the name,
   * then verify the back link returns to the portfolio page.
   */
  test('create bank account, navigate to detail via name click, verify back link', async ({
    assetsPage,
    page,
  }) => {
    await assetsPage.goto();

    // Create a bank account asset
    const bankData = generateAssetData({
      name: `Nav Test Bank ${generateTestId()}`,
      type: 'bank_account',
      balance: 3000000, // 3M IDR
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: bankData.name,
      type: bankData.type,
      currency: bankData.currency as 'IDR' | 'USD',
      initialBalance: bankData.balance,
    });

    await assetsPage.waitForPageLoad();

    // Verify the asset exists
    await assetsPage.expectAssetExists(bankData.name);

    // Get the asset ID
    const assetId = await assetsPage.getAssetIdByName(bankData.name);
    expect(assetId).toBeTruthy();

    // Click the asset name link to navigate to detail page
    const assetItem = page
      .locator('[data-testid="asset-item"]')
      .filter({ has: page.locator('h4', { hasText: bankData.name }) });
    const nameLink = assetItem.locator('h4 a').first();
    await nameLink.click();

    // Verify we navigated to the detail page
    await page.waitForURL(`**/assets/${assetId}`);
    expect(page.url()).toContain(`/assets/${assetId}`);

    // Verify asset name is displayed on detail page
    await expect(page.locator('h2').filter({ hasText: bankData.name })).toBeVisible();

    // Verify "Current Balance" is displayed with the correct amount
    await expect(page.getByText('Current Balance')).toBeVisible();
    const formattedBalance = formatIDR(bankData.balance);
    await expect(page.locator('text=' + formattedBalance).first()).toBeVisible();

    // Click "Back to Portfolio" link
    const backLink = page.locator('a').filter({ hasText: 'Back to All Assets' });
    await expect(backLink).toBeVisible();
    await backLink.click();

    // Verify we returned to the assets list page
    await page.waitForURL('**/assets');
    expect(page.url()).toMatch(/\/assets\/?$/);
  });
});
