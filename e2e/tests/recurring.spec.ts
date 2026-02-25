import { test, expect } from './test.fixture';
import { generateTestId } from '../helpers';

function currentMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function currentMonthIso(): string {
  return currentMonthValue();
}

test.describe.serial('Recurring Transactions', () => {
  test('navigate to /recurring and verify page loads', async ({ page }) => {
    await page.goto('/recurring');
    await expect(page.locator('#recurring-page')).toBeVisible();
    await expect(page.locator('[data-testid="recurring-pending-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="recurring-template-list"]')).toBeVisible();
  });

  test('create template and confirm generated pending occurrence', async ({ page }) => {
    const id = generateTestId();
    const templateName = `E2E Confirm ${id}`;
    const dayOfMonth = Math.min(new Date().getDate(), 28);

    await page.goto('/recurring');

    await page.click('[data-open-recurring-template]');
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toBeVisible();

    await page.fill('#recurring-template-form input[name="name"]', templateName);
    await page.fill('#recurring-template-form input[name="amount"]', '123456');
    await page.selectOption('#recurring-template-form select[name="category_id"]', {
      label: 'Entertainment',
    });
    await page.selectOption('#recurring-template-form select[name="account_id"]', {
      label: 'Cash',
    });
    await page.selectOption(
      '#recurring-template-form select[name="day_of_month"]',
      String(dayOfMonth)
    );
    await page.fill('#recurring-template-form input[name="start_month"]', currentMonthValue());

    await page.click('#recurring-template-form button[type="submit"]');

    await expect(page.locator('#recurring-template-drawer.drawer-open')).toHaveCount(0);
    await expect(page.locator('[data-testid="recurring-template-list"]')).toContainText(
      templateName
    );

    const pendingCard = page
      .locator('[data-testid="recurring-pending-card"]')
      .filter({ hasText: templateName })
      .first();
    await expect(pendingCard).toBeVisible();

    await pendingCard.locator('[data-open-confirm-modal]').click();
    await expect(page.locator('#recurring-confirm-modal[open]')).toBeVisible();

    await page.click('#recurring-confirm-form [data-confirm-submit]');

    await expect(page.locator('#recurring-confirm-modal[open]')).toHaveCount(0);
    await expect(pendingCard).toHaveCount(0);
  });

  test('skip pending occurrence and keep template history', async ({ page }) => {
    const id = generateTestId();
    const templateName = `E2E Skip ${id}`;
    const dayOfMonth = Math.min(new Date().getDate(), 28);

    await page.goto('/recurring');

    await page.click('[data-open-recurring-template]');
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toBeVisible();

    await page.fill('#recurring-template-form input[name="name"]', templateName);
    await page.fill('#recurring-template-form input[name="amount"]', '76543');
    await page.selectOption('#recurring-template-form select[name="category_id"]', {
      label: 'Entertainment',
    });
    await page.selectOption('#recurring-template-form select[name="account_id"]', {
      label: 'Cash',
    });
    await page.selectOption(
      '#recurring-template-form select[name="day_of_month"]',
      String(dayOfMonth)
    );
    await page.fill('#recurring-template-form input[name="start_month"]', currentMonthValue());

    await page.click('#recurring-template-form button[type="submit"]');

    const pendingCard = page
      .locator('[data-testid="recurring-pending-card"]')
      .filter({ hasText: templateName })
      .first();
    await expect(pendingCard).toBeVisible();

    await pendingCard.locator('[data-open-skip-modal]').click();
    await expect(page.locator('#recurring-skip-modal[open]')).toBeVisible();

    await page.fill('#recurring-skip-modal [data-skip-reason]', 'E2E skipped occurrence');
    await page.click('#recurring-skip-modal [data-confirm-action]');

    await expect(page.locator('#recurring-skip-modal[open]')).toHaveCount(0);
    await expect(pendingCard).toHaveCount(0);
    await expect(page.locator('[data-testid="recurring-template-list"]')).toContainText(
      templateName
    );
  });

  test('cancel template and remove its future pending occurrences', async ({ page }) => {
    const id = generateTestId();
    const templateName = `E2E Cancel ${id}`;

    await page.goto('/recurring');

    await page.click('[data-open-recurring-template]');
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toBeVisible();

    await page.fill('#recurring-template-form input[name="name"]', templateName);
    await page.fill('#recurring-template-form input[name="amount"]', '98000');
    await page.selectOption('#recurring-template-form select[name="category_id"]', {
      label: 'Entertainment',
    });
    await page.selectOption('#recurring-template-form select[name="account_id"]', {
      label: 'Cash',
    });
    await page.selectOption('#recurring-template-form select[name="day_of_month"]', '28');
    await page.fill('#recurring-template-form input[name="start_month"]', currentMonthValue());

    await page.click('#recurring-template-form button[type="submit"]');

    const pendingCard = page
      .locator('[data-testid="recurring-pending-card"]')
      .filter({ hasText: templateName })
      .first();
    await expect(pendingCard).toBeVisible();

    const directCancel = page
      .locator(`[data-template-action="cancel"][data-template-name="${templateName}"]:visible`)
      .first();

    if ((await directCancel.count()) > 0) {
      await directCancel.click();
    } else {
      const templateRow = page
        .locator('[data-testid="recurring-template-row"]:visible')
        .filter({ hasText: templateName })
        .first();
      await expect(templateRow).toBeVisible();
      await templateRow.locator('[aria-label="Template actions"]').click();
      await templateRow.locator('[data-template-action="cancel"]').first().click();
    }

    await expect(page.locator('#recurring-cancel-modal[open]')).toBeVisible();
    await page.click('#recurring-cancel-modal [data-confirm-action]');

    await expect(page.locator('#recurring-cancel-modal[open]')).toHaveCount(0);
    await expect(pendingCard).toHaveCount(0);
  });

  test('calendar view renders occurrences and supports month navigation', async ({ page }) => {
    await page.goto(`/recurring?view=calendar&month=${currentMonthIso()}`);

    await expect(page.locator('[data-recurring-calendar]')).toBeVisible();

    const previousUrl = page.url();
    const nextButton = page.locator('[data-period-nav="next"]');

    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect.poll(() => page.url()).not.toBe(previousUrl);
      await expect(page.locator('[data-recurring-calendar]')).toBeVisible();
    }
  });
});
