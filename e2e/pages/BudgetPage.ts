import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Budget page (/budget).
 * Handles budget management including setting budgets and viewing spending.
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
  private getBudgetCard(categoryId: string) {
    return this.page.locator(`[data-testid="budget-card"][data-category-id="${categoryId}"]`);
  }

  /**
   * Get the budget input locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the budget input element
   */
  private getBudgetInput(categoryId: string) {
    return this.page.locator(`[data-testid="budget-input"][data-category-id="${categoryId}"]`);
  }

  /**
   * Get the budget save button locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the save button element
   */
  private getBudgetSaveButton(categoryId: string) {
    return this.page.locator(`[data-testid="budget-save-btn"][data-category-id="${categoryId}"]`);
  }

  /**
   * Get the spent amount element locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the spent amount element
   */
  private getSpentElement(categoryId: string) {
    return this.page.locator(`[data-testid="budget-spent"][data-category-id="${categoryId}"]`);
  }

  /**
   * Get the percentage element locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the percentage element
   */
  private getPercentageElement(categoryId: string) {
    return this.page.locator(`[data-testid="budget-percentage"][data-category-id="${categoryId}"]`);
  }

  /**
   * Get the budget amount element locator for a specific category.
   * @param categoryId - The category ID to locate
   * @returns Locator for the budget amount element
   */
  private getBudgetAmountElement(categoryId: string) {
    return this.page.locator(`[data-testid="budget-amount"][data-category-id="${categoryId}"]`);
  }

  /**
   * Set a budget amount for a specific category.
   * @param categoryId - The category ID to set budget for
   * @param amount - The budget amount to set
   */
  async setBudget(categoryId: string, amount: number) {
    const input = this.getBudgetInput(categoryId);
    const saveButton = this.getBudgetSaveButton(categoryId);

    await input.clear();
    await input.fill(amount.toString());
    await saveButton.click();
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
    // Extract percentage number (e.g., "75%" -> 75)
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Assert that the spent amount for a category matches expected value.
   * @param categoryId - The category ID to check
   * @param amount - Expected spent amount
   */
  async expectCategorySpent(categoryId: string, amount: number) {
    const spent = this.getSpentElement(categoryId);
    await expect(spent).toContainText(this.formatCurrency(amount));
  }

  /**
   * Assert that the budget percentage for a category matches expected value.
   * @param categoryId - The category ID to check
   * @param percentage - Expected percentage value
   */
  async expectCategoryPercentage(categoryId: string, percentage: number) {
    const percentageElement = this.getPercentageElement(categoryId);
    await expect(percentageElement).toContainText(`${percentage}%`);
  }

  /**
   * Assert that a budget has been set for a category.
   * @param categoryId - The category ID to check
   * @param amount - Expected budget amount
   */
  async expectBudgetSet(categoryId: string, amount: number) {
    const budgetAmount = this.getBudgetAmountElement(categoryId);
    await expect(budgetAmount).toContainText(this.formatCurrency(amount));
  }

  /**
   * Assert that a budget card for a category is visible.
   * @param categoryId - The category ID to check
   */
  async expectBudgetCardVisible(categoryId: string) {
    await expect(this.getBudgetCard(categoryId)).toBeVisible();
  }
}
