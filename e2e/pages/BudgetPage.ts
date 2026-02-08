import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Budget page (/budget).
 * Handles budget management including setting budgets and viewing spending.
 *
 * The budget page uses a modal-based UI for editing budgets:
 * - Budget cards display current budget and spent amounts
 * - Clicking the edit button on a card opens the SetNewBudgetModal
 * - The modal allows selecting a category and setting the budget amount
 */
export class BudgetPage extends BasePage {
  // Modal selectors
  private readonly modalSelector = '#set-new-budget-modal';
  private readonly modalCategorySelect = '#set-new-budget-modal-category';
  private readonly modalAmountInput = '#set-new-budget-modal-amount';
  private readonly modalSubmitBtn = '#set-new-budget-modal-form button[type="submit"]';
  private readonly modalCancelBtn = '[data-cancel-budget]';

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
   * Get the edit button locator for a specific budget card.
   * @param categoryId - The category ID to locate
   * @returns Locator for the edit button element
   */
  private getEditButton(categoryId: string): Locator {
    return this.page.locator(`[data-edit-budget="${categoryId}"]`);
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
   * Get the SetNewBudgetModal locator.
   */
  private getModal(): Locator {
    return this.page.locator(this.modalSelector);
  }

  /**
   * Open the SetNewBudgetModal by clicking the edit button on a budget card.
   * @param categoryId - The category ID to edit
   */
  async openEditModal(categoryId: string): Promise<void> {
    const editButton = this.getEditButton(categoryId).and(this.page.locator(':visible')).first();
    await editButton.click();
    await expect(this.getModal()).toBeVisible();
  }

  /**
   * Set a budget amount for a specific category using the modal.
   * @param categoryId - The category ID to set budget for
   * @param amount - The budget amount to set
   */
  async setBudget(categoryId: string, amount: number): Promise<void> {
    // Open the modal by clicking the edit button (which pre-selects the category)
    await this.openEditModal(categoryId);

    // Verify the category is pre-selected (edit button handler sets this)
    const categorySelect = this.page.locator(this.modalCategorySelect);
    await expect(categorySelect).toHaveValue(categoryId);

    // Fill in the budget amount
    const amountInput = this.page.locator(this.modalAmountInput);
    await amountInput.clear();
    await amountInput.fill(amount.toString());

    // Submit the form
    const submitBtn = this.page.locator(this.modalSubmitBtn);
    await submitBtn.click();

    // Wait for modal to close and page to update
    await expect(this.getModal()).toBeHidden({ timeout: 10000 });
    await this.waitForPageLoad();
  }

  /**
   * Close the modal without saving.
   */
  async cancelModal(): Promise<void> {
    const cancelBtn = this.page.locator(this.modalCancelBtn);
    await cancelBtn.click();
    await expect(this.getModal()).toBeHidden();
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
