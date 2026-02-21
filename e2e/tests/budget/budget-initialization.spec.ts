import { test, expect } from '../test.fixture';

test.describe.serial('Budget Initialization', () => {
  test.beforeEach(async ({ budgetPage }) => {
    await budgetPage.gotoBudget();
  });

  test('shows initialize button and opens confirmation modal', async ({ page }) => {
    const initializeButton = page.locator('[data-testid="initialize-budgets-btn"]');
    const isVisible = await initializeButton.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, 'All categories already initialized');
      return;
    }

    if (await initializeButton.isDisabled()) {
      test.skip(true, 'All categories already initialized in current seeded month');
    }

    await initializeButton.click();

    const modal = page.locator('dialog#initialize-budgets-modal');
    await expect(modal).toBeVisible();

    const categoryItems = modal.locator('[role="listitem"]');
    const categoryCount = await categoryItems.count();
    expect(categoryCount).toBeGreaterThan(0);
  });

  test('initializes budgets and shows success toast after refresh', async ({ page }) => {
    const initializeButton = page.locator('[data-testid="initialize-budgets-btn"]');
    const isVisible = await initializeButton.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, 'All categories already initialized');
      return;
    }

    if (await initializeButton.isDisabled()) {
      test.skip(true, 'All categories already initialized in current seeded month');
    }

    await initializeButton.click();
    await expect(page.locator('dialog#initialize-budgets-modal')).toBeVisible();

    await page.locator('[data-confirm-initialize]').click();
    await page.waitForLoadState('domcontentloaded');

    const successToast = page.locator('[data-testid="toast-success"]').first();
    await expect(successToast).toContainText('Initialized');
  });
});
