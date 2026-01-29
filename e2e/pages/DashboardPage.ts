import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Dashboard page (/).
 * Displays financial summary including expenses, income, and net worth.
 */
export class DashboardPage extends BasePage {
  // Locators
  private readonly totalExpenses = '[data-testid="dashboard-total-expenses"]';
  private readonly totalIncome = '[data-testid="dashboard-total-income"]';
  private readonly netWorth = '[data-testid="dashboard-net-worth"]';

  /**
   * Navigate to the dashboard page.
   */
  async gotoDashboard(): Promise<void> {
    await this.navigateTo('/dashboard');
  }

  /**
   * Get the total expenses amount as a number.
   * @returns Total expenses value parsed from the displayed text
   */
  async getTotalExpenses(): Promise<number> {
    const text = await this.page.locator(this.totalExpenses).textContent();
    return this.parseCurrency(text || '0');
  }

  /**
   * Get the total income amount as a number.
   * @returns Total income value parsed from the displayed text
   */
  async getTotalIncome(): Promise<number> {
    const text = await this.page.locator(this.totalIncome).textContent();
    return this.parseCurrency(text || '0');
  }

  /**
   * Get the net worth amount as a number.
   * @returns Net worth value parsed from the displayed text
   */
  async getNetWorth(): Promise<number> {
    const text = await this.page.locator(this.netWorth).textContent();
    return this.parseCurrency(text || '0');
  }

  /**
   * Assert that total expenses matches the expected amount.
   * @param amount - Expected total expenses value
   */
  async expectTotalExpenses(amount: number) {
    const expenses = this.page.locator(this.totalExpenses);
    await expect(expenses).toContainText(this.formatCurrency(amount));
  }

  /**
   * Assert that total income matches the expected amount.
   * @param amount - Expected total income value
   */
  async expectTotalIncome(amount: number) {
    const income = this.page.locator(this.totalIncome);
    await expect(income).toContainText(this.formatCurrency(amount));
  }

  /**
   * Assert that net worth matches the expected amount.
   * @param amount - Expected net worth value
   */
  async expectNetWorth(amount: number) {
    const worth = this.page.locator(this.netWorth);
    await expect(worth).toContainText(this.formatCurrency(amount));
  }

  /**
   * Assert that the total expenses element is visible.
   */
  async expectTotalExpensesVisible() {
    await expect(this.page.locator(this.totalExpenses)).toBeVisible();
  }

  /**
   * Assert that the total income element is visible.
   */
  async expectTotalIncomeVisible() {
    await expect(this.page.locator(this.totalIncome)).toBeVisible();
  }

  /**
   * Assert that the net worth element is visible.
   */
  async expectNetWorthVisible() {
    await expect(this.page.locator(this.netWorth)).toBeVisible();
  }
}
