import { expect, Locator, Page } from '@playwright/test';

/**
 * Custom assertion helpers for E2E tests.
 * Provides domain-specific assertions for financial data verification.
 */

/**
 * Assert that an element contains a formatted currency amount.
 * Handles Indonesian currency formatting (e.g., "1.500.000").
 *
 * @param locator - Element locator to check
 * @param amount - Expected numeric amount
 * @param options - Optional assertion options
 */
export async function expectCurrencyAmount(
  locator: Locator,
  amount: number,
  options: { timeout?: number; exact?: boolean } = {}
): Promise<void> {
  const formatted = new Intl.NumberFormat('id-ID').format(amount);

  if (options.exact) {
    await expect(locator).toHaveText(formatted, { timeout: options.timeout });
  } else {
    await expect(locator).toContainText(formatted, {
      timeout: options.timeout,
    });
  }
}

/**
 * Assert that a percentage value is displayed correctly.
 *
 * @param locator - Element locator to check
 * @param percentage - Expected percentage value (0-100)
 * @param options - Optional assertion options
 */
export async function expectPercentage(
  locator: Locator,
  percentage: number,
  options: { timeout?: number } = {}
): Promise<void> {
  await expect(locator).toContainText(`${percentage}%`, {
    timeout: options.timeout,
  });
}

/**
 * Assert that a toast notification appears with the expected message.
 *
 * @param page - Playwright page
 * @param message - Expected message content (string or regex)
 * @param type - Toast type (success or error)
 */
export async function expectToast(
  page: Page,
  message: string | RegExp,
  type: 'success' | 'error' = 'success'
): Promise<void> {
  const toast = page.locator(`[data-testid="toast-${type}"]`);
  await expect(toast).toContainText(message, { timeout: 5000 });
}

/**
 * Assert that a success toast appears.
 *
 * @param page - Playwright page
 * @param message - Expected message content (string or regex)
 */
export async function expectSuccessToast(page: Page, message: string | RegExp): Promise<void> {
  await expectToast(page, message, 'success');
}

/**
 * Assert that an error toast appears.
 *
 * @param page - Playwright page
 * @param message - Expected message content (string or regex)
 */
export async function expectErrorToast(page: Page, message: string | RegExp): Promise<void> {
  await expectToast(page, message, 'error');
}

/**
 * Assert that the page URL matches the expected path.
 *
 * @param page - Playwright page
 * @param path - Expected URL path (e.g., '/transactions')
 */
export async function expectPagePath(page: Page, path: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

/**
 * Assert that an element is visible and enabled (not disabled).
 *
 * @param locator - Element locator to check
 */
export async function expectEnabled(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
}

/**
 * Assert that an element is visible but disabled.
 *
 * @param locator - Element locator to check
 */
export async function expectDisabled(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeDisabled();
}

/**
 * Assert that a form field has a validation error.
 *
 * @param field - Form field locator
 */
export async function expectFieldError(field: Locator): Promise<void> {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
}

/**
 * Assert that a list has the expected number of items.
 *
 * @param locator - Locator for list items
 * @param count - Expected number of items
 */
export async function expectItemCount(locator: Locator, count: number): Promise<void> {
  await expect(locator).toHaveCount(count);
}

/**
 * Assert that a budget card shows the expected spent and total amounts.
 *
 * @param card - Budget card locator
 * @param spent - Expected spent amount
 * @param budget - Expected budget amount
 */
export async function expectBudgetCard(
  card: Locator,
  spent: number,
  budget: number
): Promise<void> {
  const spentFormatted = new Intl.NumberFormat('id-ID').format(spent);
  const budgetFormatted = new Intl.NumberFormat('id-ID').format(budget);

  await expect(card).toContainText(spentFormatted);
  await expect(card).toContainText(budgetFormatted);
}

/**
 * Assert that a transaction row displays correctly.
 *
 * @param row - Transaction row locator
 * @param expected - Expected transaction details
 */
export async function expectTransactionRow(
  row: Locator,
  expected: {
    description?: string;
    amount?: number;
    type?: 'income' | 'expense';
  }
): Promise<void> {
  if (expected.description) {
    await expect(row).toContainText(expected.description);
  }

  if (expected.amount) {
    const formatted = new Intl.NumberFormat('id-ID').format(expected.amount);
    await expect(row).toContainText(formatted);
  }

  if (expected.type) {
    // Income is typically shown in green, expense in red
    // Check for type indicator via data attribute or class
    await expect(row.locator(`[data-transaction-type="${expected.type}"]`)).toBeVisible();
  }
}

/**
 * Assert that net worth calculation is correct.
 *
 * @param page - Playwright page
 * @param totalIncome - Total income amount
 * @param totalExpense - Total expense amount
 */
export async function expectNetWorthCorrect(
  page: Page,
  totalIncome: number,
  totalExpense: number
): Promise<void> {
  const expectedNetWorth = totalIncome - totalExpense;
  const netWorthElement = page.locator('[data-testid="dashboard-net-worth"]');

  await expectCurrencyAmount(netWorthElement, expectedNetWorth);
}

/**
 * Wait for loading state to complete.
 *
 * @param page - Playwright page
 * @param timeout - Maximum wait time
 */
export async function waitForLoadingComplete(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for any loading spinners to disappear
  await page.locator('[data-loading="true"], .loading').waitFor({ state: 'hidden', timeout });

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout });
}
