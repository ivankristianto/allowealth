import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Reports page (/reports).
 * Handles financial reports viewing including monthly and yearly ranges.
 */
export class ReportsPage extends BasePage {
  // Locators for reports page elements
  private readonly reportsPage = '[data-testid="reports-page"]';
  private readonly rangeMonthly = '[data-testid="report-range-monthly"]';
  private readonly rangeYearly = '[data-testid="report-range-yearly"]';
  private readonly metricIncome = '[data-testid="report-metric-income"]';
  private readonly metricExpenses = '[data-testid="report-metric-expenses"]';
  private readonly metricSavings = '[data-testid="report-metric-savings"]';
  private readonly periodSelector = '[data-testid="report-period-selector"]';

  /**
   * Navigate to the reports page.
   */
  async goto(): Promise<void> {
    await this.navigateTo('/reports');
  }

  /**
   * Select monthly report range.
   */
  async selectMonthlyRange(): Promise<void> {
    const monthlyBtn = this.page
      .locator(this.rangeMonthly)
      .or(this.page.locator('[data-range="monthly"]'));
    await monthlyBtn.click();

    // Verify selection
    await expect(monthlyBtn).toHaveAttribute('aria-pressed', 'true');
    await this.waitForPageLoad();
  }

  /**
   * Select yearly report range.
   */
  async selectYearlyRange(): Promise<void> {
    const yearlyBtn = this.page
      .locator(this.rangeYearly)
      .or(this.page.locator('[data-range="yearly"]'));
    await yearlyBtn.click();

    // Verify selection
    await expect(yearlyBtn).toHaveAttribute('aria-pressed', 'true');
    await this.waitForPageLoad();
  }

  /**
   * Select a specific period from the period dropdown.
   *
   * @param period - The period key to select (e.g., "2024-02" for monthly, "2024" for yearly)
   */
  async selectPeriod(period: string): Promise<void> {
    // Open period dropdown
    const periodTrigger = this.page
      .locator(this.periodSelector)
      .or(this.page.locator('[data-period-trigger]'));
    await periodTrigger.click();

    // Select the period option
    const periodOption = this.page.locator(`[data-period-option="${period}"]`);
    await periodOption.click();

    await this.waitForPageLoad();
  }

  /**
   * Get the total income value displayed.
   *
   * @returns The total income as a number
   */
  async getTotalIncome(): Promise<number> {
    const incomeElement = this.page
      .locator(this.metricIncome)
      .or(
        this.page
          .locator('[data-summary-cards]')
          .locator('text=TOTAL INCOME')
          .locator('..')
          .locator('.text-success')
      );

    // Try to find the value element
    let text: string | null = null;

    // First try direct selector
    const directElement = this.page.locator(this.metricIncome);
    if ((await directElement.count()) > 0) {
      text = await directElement.textContent();
    }

    // Fallback: find by text pattern
    if (!text) {
      const summaryCards = this.page.locator('[data-summary-cards] .text-success').first();
      text = await summaryCards.textContent();
    }

    return this.parseCurrency(text || '0');
  }

  /**
   * Get the total expenses value displayed.
   *
   * @returns The total expenses as a number
   */
  async getTotalExpenses(): Promise<number> {
    const expensesElement = this.page
      .locator(this.metricExpenses)
      .or(this.page.locator('[data-summary-cards]').locator('.text-error').first());

    let text: string | null = null;

    // First try direct selector
    const directElement = this.page.locator(this.metricExpenses);
    if ((await directElement.count()) > 0) {
      text = await directElement.textContent();
    }

    // Fallback: find by color pattern
    if (!text) {
      const summaryCards = this.page.locator('[data-summary-cards] .text-error').first();
      text = await summaryCards.textContent();
    }

    return this.parseCurrency(text || '0');
  }

  /**
   * Get the net savings value displayed.
   *
   * @returns The net savings as a number
   */
  async getSavings(): Promise<number> {
    const savingsElement = this.page
      .locator(this.metricSavings)
      .or(this.page.locator('[data-summary-cards]').locator('.text-accent').first());

    let text: string | null = null;

    // First try direct selector
    const directElement = this.page.locator(this.metricSavings);
    if ((await directElement.count()) > 0) {
      text = await directElement.textContent();
    }

    // Fallback: find by text/color pattern
    if (!text) {
      const summaryCards = this.page.locator('[data-summary-cards] .text-accent').first();
      text = await summaryCards.textContent();
    }

    return this.parseCurrency(text || '0');
  }

  /**
   * Verify that a specific metric has the expected value.
   *
   * @param metric - The metric name ('income', 'expenses', 'savings', 'budget-health')
   * @param value - The expected value string (formatted)
   */
  async expectMetricValue(metric: string, value: string): Promise<void> {
    let locator;

    switch (metric.toLowerCase()) {
      case 'income':
        locator = this.page
          .locator(this.metricIncome)
          .or(this.page.locator('[data-summary-cards]').locator('text=TOTAL INCOME').locator('..'));
        break;
      case 'expenses':
        locator = this.page
          .locator(this.metricExpenses)
          .or(
            this.page.locator('[data-summary-cards]').locator('text=TOTAL EXPENSES').locator('..')
          );
        break;
      case 'savings':
        locator = this.page
          .locator(this.metricSavings)
          .or(this.page.locator('[data-summary-cards]').locator('text=NET SAVINGS').locator('..'));
        break;
      case 'budget-health':
        locator = this.page
          .locator('[data-testid="report-metric-budget-health"]')
          .or(
            this.page.locator('[data-summary-cards]').locator('text=BUDGET HEALTH').locator('..')
          );
        break;
      default:
        locator = this.page.locator(`[data-testid="report-metric-${metric}"]`);
    }

    await expect(locator).toContainText(value);
  }

  /**
   * Get the currently selected range.
   *
   * @returns 'monthly' or 'yearly'
   */
  async getCurrentRange(): Promise<'monthly' | 'yearly'> {
    const monthlyBtn = this.page
      .locator(this.rangeMonthly)
      .or(this.page.locator('[data-range="monthly"]'));
    const isMonthly = await monthlyBtn.getAttribute('aria-pressed');

    return isMonthly === 'true' ? 'monthly' : 'yearly';
  }

  /**
   * Get the currently selected period label.
   *
   * @returns The period label text (e.g., "February 2024" or "2024")
   */
  async getCurrentPeriodLabel(): Promise<string> {
    const labelElement = this.page.locator('[data-period-label]');
    const text = await labelElement.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Verify that the reports page is visible.
   */
  async expectReportsPageVisible(): Promise<void> {
    // Check for report selector - use first() to avoid strict mode issues
    const reportSelector = this.page.locator('[data-report-selector]').first();
    await expect(reportSelector).toBeVisible();
  }

  /**
   * Verify that the summary cards section is visible.
   */
  async expectSummaryCardsVisible(): Promise<void> {
    // Use first() to avoid strict mode issues when multiple elements match
    const summaryCards = this.page.locator('[data-summary-cards]').first();
    await expect(summaryCards).toBeVisible();
  }

  /**
   * Verify that the charts section is visible.
   */
  async expectChartsVisible(): Promise<void> {
    const charts = this.page.locator('[data-charts-container]');
    await expect(charts).toBeVisible();
  }

  /**
   * Verify that the category table is visible.
   */
  async expectCategoryTableVisible(): Promise<void> {
    const table = this.page.locator('[data-table-container]');
    await expect(table).toBeVisible();
  }

  /**
   * Get the budget health percentage.
   *
   * @returns The budget health percentage as a number
   */
  async getBudgetHealth(): Promise<number> {
    const healthElement = this.page
      .locator('[data-testid="report-metric-budget-health"]')
      .or(
        this.page
          .locator('[data-summary-cards]')
          .locator('text=BUDGET HEALTH')
          .locator('..')
          .locator('..')
      );

    const text = await healthElement.textContent();

    // Extract percentage number
    const match = text?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get the number of expense categories displayed.
   *
   * @returns The number of expense categories
   */
  async getExpenseCategoryCount(): Promise<number> {
    // Look for category intelligence table rows
    const categoryRows = this.page.locator('[data-table-container] tr, [data-category-row]');
    return categoryRows.count();
  }
}
