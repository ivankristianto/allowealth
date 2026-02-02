import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model class.
 * All page objects should extend this class for common functionality.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a URL path.
   * Protected method for use by subclasses in their specific goto methods.
   * @param path - The URL path to navigate to (e.g., '/assets')
   */
  protected async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load (DOM content loaded).
   * Note: We use 'domcontentloaded' instead of 'networkidle' for better performance.
   * For specific elements, prefer explicit waits (toBeVisible, etc.).
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get a locator by data-testid attribute.
   * Uses Playwright's built-in getByTestId for proper escaping.
   * @param testId - The data-testid value
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get a locator by data attribute.
   * @param attr - The data attribute name (without 'data-' prefix)
   * @param value - Optional value for the attribute
   */
  getByDataAttr(attr: string, value?: string): Locator {
    if (value !== undefined) {
      return this.page.locator(`[data-${attr}="${value}"]`);
    }
    return this.page.locator(`[data-${attr}]`);
  }

  /**
   * Wait for an element to be visible.
   * @param locator - The element locator
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForVisible(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for an element to be hidden.
   * @param locator - The element locator
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForHidden(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for navigation to a URL matching the pattern.
   * @param urlPattern - URL string or regex pattern
   */
  async waitForNavigation(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern);
  }

  /**
   * Get the current page path (without origin).
   */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  /**
   * Assert that a toast notification appears with the expected message and type.
   * @param message - Expected text content of the toast
   * @param type - Toast type: 'success' or 'error'
   */
  async expectToastMessage(message: string, type: 'success' | 'error' = 'success'): Promise<void> {
    const toast = this.page.locator(`[data-testid="toast-${type}"]`);
    await expect(toast).toContainText(message);
  }

  /**
   * Format a number as Indonesian currency string (without currency symbol).
   * @param amount - Number to format
   * @returns Formatted string (e.g., "1.500.000")
   */
  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID').format(amount);
  }

  /**
   * Parse a currency string back to a number.
   * Removes all non-digit characters before parsing.
   * @param text - Currency string to parse
   * @returns Parsed number (0 if parsing fails)
   */
  protected parseCurrency(text: string): number {
    const digits = text.replace(/[^\d]/g, '');
    if (!digits) {
      return 0;
    }
    const parsed = parseInt(digits, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}
