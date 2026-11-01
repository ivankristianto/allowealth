import { test, expect } from './test.fixture';
import { createAccountViaAPI, createCategoryViaAPI, generateTestId } from '../helpers';

test.describe('Recurring transactions', () => {
  test('create a template and confirm its pending occurrence', async ({ page, request }) => {
    const id = generateTestId();
    const templateName = `E2E Recurring ${id}`;
    const categoryName = `E2E Bills ${id}`;
    const accountName = `E2E Recurring Account ${id}`;
    await createCategoryViaAPI(request, { name: categoryName, type: 'expense' });
    await createAccountViaAPI(request, { name: accountName, type: 'cash', balance: 1000000 });

    // Day 1 of the current month is always due, so the occurrence is confirmable on any date.
    const startMonth = new Date().toISOString().slice(0, 7);

    await page.goto('/recurring');
    await page.click('[data-open-recurring-template]');
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toBeVisible();

    const form = page.locator('#recurring-template-form');
    await form.locator('input[name="name"]').fill(templateName);
    await form.locator('input[name="amount"]').fill('123456');
    await form.locator('select[name="category_id"]').selectOption({ label: categoryName });
    await form.locator('select[name="account_id"]').selectOption({ label: accountName });
    await form.locator('select[name="day_of_month"]').selectOption('1');
    await form.locator('input[name="start_month"]').fill(startMonth);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('#recurring-template-drawer.drawer-open')).toHaveCount(0);
    await expect(page.locator('[data-testid="recurring-template-list"]')).toContainText(
      templateName
    );

    const pendingCard = page
      .locator('[data-testid="recurring-pending-card"]:visible')
      .filter({ hasText: templateName });
    await pendingCard.locator('[data-open-confirm-modal]').click();
    await expect(page.locator('#recurring-confirm-modal[open]')).toBeVisible();
    await page.click('#recurring-confirm-form [data-confirm-submit]');

    await expect(page.locator('#recurring-confirm-modal[open]')).toHaveCount(0);
    await expect(pendingCard).toHaveCount(0);

    await page.goto(`/transactions?type=expense&search=${encodeURIComponent(templateName)}`);
    await expect(page.locator('[data-transaction-card]', { hasText: templateName })).toBeVisible();
  });
});
