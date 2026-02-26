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

function nextMonthValue(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
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
    const dayOfMonth = 1;

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
    const dayOfMonth = 1;

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
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toHaveCount(0);

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

  test('future occurrences cannot be confirmed or skipped from list view', async ({ page }) => {
    const id = generateTestId();
    const templateName = `E2E Future Lock ${id}`;
    const nextMonth = nextMonthValue();

    await page.goto('/recurring');

    await page.click('[data-open-recurring-template]');
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toBeVisible();

    await page.fill('#recurring-template-form input[name="name"]', templateName);
    await page.fill('#recurring-template-form input[name="amount"]', '456789');
    await page.selectOption('#recurring-template-form select[name="category_id"]', {
      label: 'Entertainment',
    });
    await page.selectOption('#recurring-template-form select[name="account_id"]', {
      label: 'Cash',
    });
    await page.selectOption('#recurring-template-form select[name="day_of_month"]', '1');
    await page.fill('#recurring-template-form input[name="start_month"]', nextMonth);

    await page.click('#recurring-template-form button[type="submit"]');
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toHaveCount(0);

    await page.goto(`/recurring?view=list&month=${nextMonth}`);
    const pendingCard = page
      .locator('[data-testid="recurring-pending-card"]')
      .filter({ hasText: templateName })
      .first();

    await expect(pendingCard).toBeVisible();
    await expect(pendingCard.locator('[data-open-confirm-modal]')).toHaveCount(0);
    await expect(pendingCard.locator('[data-open-skip-modal]')).toHaveCount(0);
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
    const nextButton = page.locator('header [data-period-nav="next"]:visible').first();

    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect.poll(() => page.url()).not.toBe(previousUrl);
      await expect(page.locator('[data-recurring-calendar]')).toBeVisible();
    }
  });

  test('changing recurring month after visiting budget does not redirect to /budget', async ({
    page,
  }) => {
    await page.goto('/budget');
    await expect(page.locator('[data-budget-page]')).toBeVisible();

    await page.goto(`/recurring?view=list&month=${currentMonthIso()}`);
    await expect(page.locator('#recurring-page')).toBeVisible();

    const nextButton = page.locator('header [data-period-nav="next"]:visible').first();
    const prevButton = page.locator('header [data-period-nav="prev"]:visible').first();

    if (await nextButton.isEnabled()) {
      await nextButton.click();
    } else if (await prevButton.isEnabled()) {
      await prevButton.click();
    }

    await expect.poll(() => new URL(page.url()).pathname).toBe('/recurring');
    await expect(page.locator('#recurring-page')).toBeVisible();
  });

  test('convert transaction action opens recurring drawer with prefilled values', async ({
    page,
  }) => {
    await page.goto('/transactions');
    await expect(page.locator('#transaction-list')).toBeVisible();

    const actionButtons = page.locator(
      '#transaction-list [aria-label="Transaction actions"]:visible'
    );
    const actionButtonCount = await actionButtons.count();

    let expectedName: string | null = null;
    let foundConvertAction = false;
    const maxAttempts = Math.min(actionButtonCount, 20);

    for (let index = 0; index < maxAttempts; index += 1) {
      await actionButtons.nth(index).click();

      const convertLink = page.locator('[data-convert-recurring]:visible').first();
      if ((await convertLink.count()) > 0) {
        const href = await convertLink.getAttribute('href');
        if (href) {
          const prefill = new URL(href, 'http://localhost');
          expectedName = prefill.searchParams.get('tx_name');
        }

        await convertLink.click();
        foundConvertAction = true;
        break;
      }

      await page.keyboard.press('Escape');
    }

    expect(foundConvertAction).toBe(true);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/recurring');
    await expect(page.locator('#recurring-template-drawer.drawer-open')).toBeVisible();

    if (expectedName) {
      await expect(page.locator('#recurring-template-form input[name="name"]')).toHaveValue(
        expectedName
      );
    }
  });
});
