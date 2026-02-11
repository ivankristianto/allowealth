import { test, expect } from '../test.fixture';
import { generateTestId, generateAssetData, formatIDR } from '../../helpers';
import { getVerificationToken } from '../../helpers/email-verification';

let freshWorkspaceEmailCounter = 0;

function uniqueFreshWorkspaceEmail(): string {
  return `e2e-assets-fresh-${Date.now()}-${freshWorkspaceEmailCounter++}@test.com`;
}

/**
 * E2E Tests for Asset Management.
 *
 * These tests verify the complete asset lifecycle:
 * - Navigate to assets page
 * - View existing assets and portfolio total
 * - Create new assets (bank accounts, cash, investments)
 * - Verify assets appear in list
 * - Verify portfolio total is updated correctly
 * - Verify asset balance displays correctly
 */
test.describe('Asset Management', () => {
  /**
   * Test: Navigate to assets page and verify initial state
   */
  test('navigate to assets page and view existing assets', async ({ assetsPage, page }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Verify we're on the assets page
    expect(page.url()).toContain('/assets');

    // Verify add asset button is visible
    await assetsPage.expectAddAssetButtonVisible();

    // Verify portfolio total is displayed (may be empty if no assets)
    const portfolioTotal = await assetsPage.getPortfolioTotal();
    expect(portfolioTotal).toBeDefined();
  });

  /**
   * Test: Create new asset and verify it appears in list
   */
  test('create new asset and verify it appears in list', async ({ assetsPage, page }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Generate test data
    const assetData = generateAssetData({
      name: `Test Bank Account ${generateTestId()}`,
      type: 'bank_account',
      balance: 5000000, // 5M IDR
      currency: 'IDR',
    });

    // Create asset via UI
    await assetsPage.createAsset({
      name: assetData.name,
      type: assetData.type,
      currency: assetData.currency,
      initialBalance: assetData.balance,
    });

    // Wait for page to load after asset creation
    await assetsPage.waitForPageLoad();

    // Verify asset appears in list (this is the primary success verification)
    // Note: Toast message verification is skipped because the page reloads after asset creation,
    // causing the toast to disappear before we can assert on it.
    await assetsPage.expectAssetExists(assetData.name);
  });

  /**
   * Test: Create asset and verify portfolio total is updated
   */
  test('create asset and verify portfolio total is updated', async ({ assetsPage, page }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Get initial portfolio total
    const initialPortfolioTotal = await assetsPage.getPortfolioTotal();
    let initialBalance = 0;

    if (initialPortfolioTotal && initialPortfolioTotal.trim().length > 0) {
      // Parse initial portfolio total if it exists
      initialBalance = parseInt(initialPortfolioTotal.replace(/[^\d]/g, ''), 10) || 0;
    }

    // Generate test asset with known balance
    const assetBalance = 2500000; // 2.5M IDR
    const assetData = generateAssetData({
      name: `Portfolio Test ${generateTestId()}`,
      type: 'bank_account',
      balance: assetBalance,
      currency: 'IDR',
    });

    // Create asset
    await assetsPage.createAsset({
      name: assetData.name,
      type: assetData.type,
      currency: assetData.currency,
      initialBalance: assetBalance,
    });

    // Wait for page to fully reload and data to update
    await assetsPage.waitForPageLoad();

    // Force a page refresh to ensure we get the latest data
    await page.reload();
    await assetsPage.waitForPageLoad();

    // Get updated portfolio total
    const updatedPortfolioTotal = await assetsPage.getPortfolioTotal();
    const updatedBalance = parseInt(updatedPortfolioTotal.replace(/[^\d]/g, ''), 10);

    // Verify portfolio total includes at least the new asset balance
    expect(updatedBalance).toBeGreaterThanOrEqual(assetBalance);

    // Verify portfolio total increased by approximately the asset balance
    // Allow for some variance due to other tests potentially running in parallel
    // or existing seeded data
    const expectedMinBalance = initialBalance + assetBalance;
    expect(updatedBalance).toBeGreaterThanOrEqual(expectedMinBalance);
  });

  /**
   * Test: Create multiple assets and verify portfolio reflects total
   */
  test('create multiple assets and verify combined portfolio total', async ({ assetsPage }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Create first asset
    const asset1Balance = 3000000; // 3M IDR
    const asset1Data = generateAssetData({
      name: `Asset One ${generateTestId()}`,
      type: 'bank_account',
      balance: asset1Balance,
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: asset1Data.name,
      type: asset1Data.type,
      currency: asset1Data.currency,
      initialBalance: asset1Balance,
    });

    await assetsPage.waitForPageLoad();

    // Create second asset
    const asset2Balance = 1500000; // 1.5M IDR
    const asset2Data = generateAssetData({
      name: `Asset Two ${generateTestId()}`,
      type: 'e_wallet',
      balance: asset2Balance,
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: asset2Data.name,
      type: asset2Data.type,
      currency: asset2Data.currency,
      initialBalance: asset2Balance,
    });

    await assetsPage.waitForPageLoad();

    // Get portfolio total
    const portfolioTotal = await assetsPage.getPortfolioTotal();
    const totalBalance = parseInt(portfolioTotal.replace(/[^\d]/g, ''), 10);

    // Verify portfolio total is at least the sum of the two assets
    const expectedMinTotal = asset1Balance + asset2Balance;
    expect(totalBalance).toBeGreaterThanOrEqual(expectedMinTotal);

    // Verify both assets appear in list
    await assetsPage.expectAssetExists(asset1Data.name);
    await assetsPage.expectAssetExists(asset2Data.name);
  });

  /**
   * Test: Verify asset balance is displayed correctly
   */
  test('verify asset balance is displayed correctly', async ({ assetsPage }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Generate test asset with specific balance
    const assetBalance = 7500000; // 7.5M IDR
    const assetData = generateAssetData({
      name: `Balance Display Test ${generateTestId()}`,
      type: 'stock',
      balance: assetBalance,
      currency: 'IDR',
    });

    // Create asset
    await assetsPage.createAsset({
      name: assetData.name,
      type: assetData.type,
      currency: assetData.currency,
      initialBalance: assetBalance,
    });

    await assetsPage.waitForPageLoad();

    // Format expected balance for display
    const expectedBalance = formatIDR(assetBalance);

    // Verify asset balance is displayed correctly
    await assetsPage.expectAssetBalance(assetData.name, expectedBalance);
  });

  /**
   * Test: Create asset with different currencies
   */
  test('create asset with USD currency', async ({ assetsPage }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Generate test asset with USD currency
    const assetData = generateAssetData({
      name: `USD Account ${generateTestId()}`,
      type: 'bank_account',
      balance: 1000, // 1000 USD
      currency: 'USD',
    });

    // Create asset with USD currency
    await assetsPage.createAsset({
      name: assetData.name,
      type: assetData.type,
      currency: 'USD',
      initialBalance: assetData.balance,
    });

    await assetsPage.waitForPageLoad();

    // Verify asset appears in list
    await assetsPage.expectAssetExists(assetData.name);

    // Get asset ID by name
    const assetId = await assetsPage.getAssetIdByName(assetData.name);
    expect(assetId).not.toBeNull();
  });

  /**
   * Test: Asset with zero initial balance
   */
  test('create asset with zero initial balance', async ({ assetsPage }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Generate test asset with zero balance
    const assetData = generateAssetData({
      name: `Empty Account ${generateTestId()}`,
      type: 'bank_account',
      balance: 0,
      currency: 'IDR',
    });

    // Create asset with zero balance
    await assetsPage.createAsset({
      name: assetData.name,
      type: assetData.type,
      currency: assetData.currency,
      initialBalance: 0,
    });

    await assetsPage.waitForPageLoad();

    // Verify asset appears even with zero balance
    await assetsPage.expectAssetExists(assetData.name);

    // Verify balance shows zero or empty formatted value
    const expectedBalance = formatIDR(0);
    await assetsPage.expectAssetBalance(assetData.name, expectedBalance);
  });

  /**
   * Test: Verify different asset types can be created
   */
  test('create assets of different types', async ({ assetsPage }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Create e-wallet asset
    const eWalletAsset = generateAssetData({
      name: `E-Wallet ${generateTestId()}`,
      type: 'e_wallet',
      balance: 500000,
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: eWalletAsset.name,
      type: eWalletAsset.type,
      currency: eWalletAsset.currency,
      initialBalance: eWalletAsset.balance,
    });

    await assetsPage.waitForPageLoad();

    // Create investment asset
    const investmentAsset = generateAssetData({
      name: `Investment Portfolio ${generateTestId()}`,
      type: 'stock',
      balance: 10000000,
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: investmentAsset.name,
      type: investmentAsset.type,
      currency: investmentAsset.currency,
      initialBalance: investmentAsset.balance,
    });

    await assetsPage.waitForPageLoad();

    // Create other asset
    const otherAsset = generateAssetData({
      name: `Other Asset ${generateTestId()}`,
      type: 'other',
      balance: 250000,
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: otherAsset.name,
      type: otherAsset.type,
      currency: otherAsset.currency,
      initialBalance: otherAsset.balance,
    });

    await assetsPage.waitForPageLoad();

    // Verify all assets appear in list
    await assetsPage.expectAssetExists(eWalletAsset.name);
    await assetsPage.expectAssetExists(investmentAsset.name);
    await assetsPage.expectAssetExists(otherAsset.name);
  });

  /**
   * Test: Get asset ID by name and verify it's returned
   */
  test('get asset ID by name', async ({ assetsPage }) => {
    // Navigate to assets page
    await assetsPage.goto();

    // Generate and create asset
    const assetData = generateAssetData({
      name: `ID Test Asset ${generateTestId()}`,
      type: 'bank_account',
      balance: 1000000,
      currency: 'IDR',
    });

    await assetsPage.createAsset({
      name: assetData.name,
      type: assetData.type,
      currency: assetData.currency,
      initialBalance: assetData.balance,
    });

    await assetsPage.waitForPageLoad();

    // Get asset ID by name
    const assetId = await assetsPage.getAssetIdByName(assetData.name);

    // Verify asset ID is returned and is a non-empty string
    expect(assetId).not.toBeNull();
    expect(typeof assetId).toBe('string');
    expect(assetId).toBeTruthy();
  });
});

test.describe('Asset Management - Fresh Workspace', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('empty state add button opens asset modal for new workspace users', async ({
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

    await page.goto('/assets');

    const addFirstAssetButton = page.locator('button[data-add-asset-btn]');
    await expect(addFirstAssetButton).toBeVisible();

    await addFirstAssetButton.click();

    await expect(page.locator('dialog#asset-form-modal[open]')).toBeVisible();
  });
});
