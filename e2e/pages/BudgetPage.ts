import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Budget page (/budget).
 * Handles budget management including setting budgets and viewing spending.
 *
 * The budget page uses inline editing for existing budgets:
 * - Budget cards display current budget and spent amounts
 * - Clicking the budget amount opens an inline input with Save/Cancel
 * - New budgets are created via the SetNewBudgetModal
 */
export class BudgetPage extends BasePage {
  /**
   * Navigate to the budget page.
   */
  async gotoBudget(): Promise<void> {
    await this.navigateTo('/budget');
  }

  /**
   * Get the budget card locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the budget card element
   */
  private getBudgetCard(categoryId: string): Locator {
    return this.page.locator(`[data-testid="budget-card"][data-category-id="${categoryId}"]`);
  }

  /**
   * Get the spent amount element locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the spent amount element
   */
  private getSpentElement(categoryId: string): Locator {
    return this.getBudgetCard(categoryId).locator('[data-testid="budget-spent"]');
  }

  /**
   * Get the percentage element locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the percentage element
   */
  private getPercentageElement(categoryId: string): Locator {
    return this.getBudgetCard(categoryId).locator('[data-testid="budget-percentage"]');
  }

  /**
   * Get the budget amount element locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the budget amount element
   */
  private getBudgetAmountElement(categoryId: string): Locator {
    return this.getBudgetCard(categoryId).locator('[data-testid="budget-amount"]');
  }

  /**
   * Set a budget amount for a specific category using inline editing.
   * @param categoryId - The category ID to set budget for
   * @param amount - The budget amount to set
   */
  async setBudget(categoryId: string, amount: number): Promise<void> {
    // Click the budget amount to enter edit mode
    const budgetAmount = this.page.locator(`[data-budget-editable="${categoryId}"]`).first();
    await budgetAmount.click();

    // Wait for input to appear
    const input = this.page.locator('[data-inline-edit-input]');
    await expect(input).toBeVisible();

    // Clear and fill the amount
    await input.clear();
    await input.fill(amount.toString());

    // Click Save
    const saveBtn = this.page.locator('[data-inline-edit-save]');
    await saveBtn.click();

    // Wait for the page to refresh (inline edit disappears)
    await expect(input).toBeHidden({ timeout: 10000 });
    await this.waitForPageLoad();
  }

  /**
   * Get the spent amount for a specific category.
   * @param categoryId - The category ID to get spent amount for
   * @returns The spent amount as a number
   */
  async getCategorySpent(categoryId: string): Promise<number> {
    const text = await this.getSpentElement(categoryId).textContent();
    return this.parseCurrency(text || '0');
  }

  /**
   * Get the budget percentage for a specific category.
   * @param categoryId - The category ID to get percentage for
   * @returns The percentage as a number
   */
  async getCategoryPercentage(categoryId: string): Promise<number> {
    const text = await this.getPercentageElement(categoryId).textContent();
    // Extract percentage number (e.g., "75% Used" -> 75)
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Assert that the spent amount for a category matches expected value.
   * @param categoryId - The category ID to check
   * @param amount - Expected spent amount
   */
  async expectCategorySpent(categoryId: string, amount: number): Promise<void> {
    const spent = this.getSpentElement(categoryId);
    await expect(spent).toContainText(this.formatCurrency(amount));
  }

  /**
   * Assert that the budget percentage for a category matches expected value.
   * @param categoryId - The category ID to check
   * @param percentage - Expected percentage value
   */
  async expectCategoryPercentage(categoryId: string, percentage: number): Promise<void> {
    const percentageElement = this.getPercentageElement(categoryId);
    await expect(percentageElement).toContainText(`${percentage}%`);
  }

  /**
   * Assert that a budget has been set for a category.
   * @param categoryId - The category ID to check
   * @param amount - Expected budget amount
   */
  async expectBudgetSet(categoryId: string, amount: number): Promise<void> {
    const budgetAmount = this.getBudgetAmountElement(categoryId);
    await expect(budgetAmount).toContainText(this.formatCurrency(amount));
  }

  /**
   * Assert that a budget card for a category is visible.
   * @param categoryId - The category ID to check
   */
  async expectBudgetCardVisible(categoryId: string): Promise<void> {
    await expect(this.getBudgetCard(categoryId)).toBeVisible();
  }
}
