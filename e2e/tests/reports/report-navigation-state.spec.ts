import { test, expect } from '../test.fixture';

function trackReportRequests(page: import('@playwright/test').Page): string[] {
  const requests: string[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/reports')) return;
    requests.push(`${url.pathname}${url.search}`);
  });

  return requests;
}

async function clickPreviousPeriod(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-selector-container] [data-period-nav="prev"]').first().click();
  await page.waitForLoadState('networkidle');
}

test.describe('Report navigation state', () => {
  test('overview summary action buttons preserve the current report filters', async ({ page }) => {
    await page.goto('/reports?range=yearly&period=2026');

    const incomeHref = await page
      .locator('[data-summary-cards] a', { hasText: 'Income Report' })
      .getAttribute('href');
    let url = new URL(incomeHref ?? '', 'http://localhost');
    expect(url.pathname).toBe('/reports/income');
    expect(url.searchParams.get('range')).toBe('yearly');
    expect(url.searchParams.get('period')).toBe('2026');

    await page.goto('/reports?range=monthly&period=2026-02');

    const expenseHref = await page
      .locator('[data-summary-cards] a', { hasText: 'Expense Report' })
      .getAttribute('href');
    url = new URL(expenseHref ?? '', 'http://localhost');
    expect(url.pathname).toBe('/reports/expenses');
    expect(url.searchParams.get('range')).toBe('monthly');
    expect(url.searchParams.get('period')).toBe('2026-02');
  });

  test('income period changes stay on income data after navigating from overview', async ({
    page,
  }) => {
    const requests = trackReportRequests(page);

    await page.goto('/reports?range=monthly&period=2026-02');
    await page.locator('[data-overview-previews] a', { hasText: 'View breakdown' }).first().click();

    await expect(page).toHaveURL(/\/reports\/income\?range=monthly&period=2026-02/);

    requests.length = 0;
    await clickPreviousPeriod(page);

    const url = new URL(page.url());
    expect(url.pathname).toBe('/reports/income');
    expect(url.searchParams.get('period')).toBe('2026-01');
    expect(requests.some((request) => request.startsWith('/api/reports/income?'))).toBe(true);
    expect(requests.some((request) => request.startsWith('/api/reports?'))).toBe(false);
    await expect(page.locator('[data-summary-container]')).not.toContainText('Expense Report');
  });

  test('expense period changes keep expense components after navigating from overview', async ({
    page,
  }) => {
    const requests = trackReportRequests(page);

    await page.goto('/reports?range=monthly&period=2026-02');
    await page.locator('[data-overview-previews] a', { hasText: 'View breakdown' }).nth(1).click();

    await expect(page).toHaveURL(/\/reports\/expenses\?range=monthly&period=2026-02/);

    requests.length = 0;
    await clickPreviousPeriod(page);

    const url = new URL(page.url());
    expect(url.pathname).toBe('/reports/expenses');
    expect(url.searchParams.get('period')).toBe('2026-01');
    expect(requests.some((request) => request.startsWith('/api/reports/expenses?'))).toBe(true);
    expect(requests.some((request) => request.startsWith('/api/reports?'))).toBe(false);
    await expect(page.locator('[data-summary-container]')).toContainText('Allocated Budget');
    await expect(page.locator('[data-summary-container]')).not.toContainText('Income Report');
    await expect(page.locator('[data-charts-container]')).toContainText('Expense Breakdown');
  });
});
