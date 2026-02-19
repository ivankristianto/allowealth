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
   * @param path - The URL path to navigate to (e.g., '/accounts')
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
   * Handles both IDR format (dot=thousands, comma=decimal: "Rp480.000,00")
   * and USD format (comma=thousands, dot=decimal: "$2,500.00").
   * @param text - Currency string to parse
   * @returns Parsed number (0 if parsing fails)
   */
  protected parseCurrency(text: string): number {
    // Strip currency symbols and whitespace, keep digits, dots, commas, minus
    let cleaned = text.replace(/[^0-9.,\-]/g, '');
    if (!cleaned) return 0;

    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    if (lastComma > lastDot) {
      // IDR format: dot = thousands separator, comma = decimal
      // "480.000,00" → "480000.00"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // USD format: comma = thousands separator, dot = decimal
      // "2,500.00" → "2500.00"
      cleaned = cleaned.replace(/,/g, '');
    }

    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}
