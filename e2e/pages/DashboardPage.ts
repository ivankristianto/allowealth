import { BasePage } from './BasePage';

/**
 * Page Object Model for the Dashboard page (/).
 * Displays financial summary including expenses and income.
 */
export class DashboardPage extends BasePage {
  // Locators
  private readonly totalExpenses = '[data-testid="dashboard-total-expenses"]';
  /**
   * Navigate to the dashboard page.
   */
  async gotoDashboard(): Promise<void> {
    await this.navigateTo('/dashboard');
  }

  /**
   * Get the total expenses amount as a number.
   * The element contains "spent / budget" (e.g., "Rp36.039.618,12 / Rp48.5M"),
   * so we extract only the spent portion before the "/".
   * @returns Total expenses value parsed from the displayed text
   */
  async getTotalExpenses(): Promise<number> {
    const text = await this.page.locator(this.totalExpenses).textContent();
    // Split on "/" to get just the spent amount (before the budget)
    const spentText = (text || '0').split('/')[0];
    return this.parseCurrency(spentText);
  }
}
