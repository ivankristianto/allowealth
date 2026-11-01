import { BasePage } from './BasePage';

/**
 * Page Object Model for the Reports page (/reports).
 */
export class ReportsPage extends BasePage {
  async goto(): Promise<void> {
    await this.navigateTo('/reports');
  }

  /** The overview's total expenses: the first expense-colored figure in the summary cards. */
  async getTotalExpenses(): Promise<number> {
    const text = await this.page.locator('[data-summary-cards] .text-error').first().textContent();
    return this.parseCurrency(text || '0');
  }
}
