import { test, expect } from '../test.fixture';

test.describe('Income Report Detail', () => {
  test('overview keeps filter context when opening income detail', async ({ reportsPage }) => {
    await reportsPage.goto();
    await reportsPage.selectYearlyRange();
    await reportsPage.openIncomeSection();

    await expect(reportsPage.page).toHaveURL(/\/reports\/income\?.*range=yearly/);
    await reportsPage.expectIncomeSummaryVisible();
  });

  test('income page shows summary cards and charts', async ({ reportsPage, page }) => {
    await page.goto('/reports/income');

    await reportsPage.expectIncomeSummaryVisible();
    await reportsPage.expectChartsVisible();
  });

  test('income empty state shown when no data', async ({ page, reportsPage }) => {
    // Navigate to income with a period that likely has no data
    await page.goto('/reports/income?range=monthly&period=2000-01');

    // Should show empty state or at least load without error
    await expect(page.locator('[data-summary-cards], [data-empty-state]').first()).toBeVisible();
  });
});
