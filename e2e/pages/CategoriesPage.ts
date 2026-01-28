import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Categories settings page.
 * Handles category CRUD operations for expense and income categories.
 */
export class CategoriesPage extends BasePage {
  // Locators
  private get createCategoryBtn(): Locator {
    return this.page.locator('[data-testid="create-category-btn"]');
  }

  private get categoryNameInput(): Locator {
    return this.page.locator('[data-testid="category-name-input"]');
  }

  private get categorySubmitBtn(): Locator {
    return this.page.locator('[data-testid="category-submit-btn"]');
  }

  private get expenseTab(): Locator {
    return this.page.locator('[data-testid="type-filter-expense"]');
  }

  private get incomeTab(): Locator {
    return this.page.locator('[data-testid="type-filter-income"]');
  }

  private get confirmDeleteBtn(): Locator {
    return this.page.locator('[data-testid="confirm-delete-btn"]');
  }

  /**
   * Navigate to the categories settings page.
   */
  async gotoCategories(): Promise<void> {
    await this.navigateTo('/categories');
    await expect(this.createCategoryBtn).toBeVisible();
  }

  /**
   * Switch to the expense categories tab.
   */
  async switchToExpenseTab(): Promise<void> {
    await this.expenseTab.click();
    await expect(this.expenseTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Switch to the income categories tab.
   */
  async switchToIncomeTab(): Promise<void> {
    await this.incomeTab.click();
    await expect(this.incomeTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Create a new category.
   * Opens the create modal, fills in the name, and submits.
   *
   * @param name - The category name
   * @param type - The category type ('expense' or 'income')
   */
  async createCategory(name: string, type: 'expense' | 'income'): Promise<void> {
    // Switch to the appropriate tab first
    if (type === 'expense') {
      await this.switchToExpenseTab();
    } else {
      await this.switchToIncomeTab();
    }

    // Click create button to open modal
    await this.createCategoryBtn.click();

    // Wait for modal to be visible
    await expect(this.categoryNameInput).toBeVisible();

    // Fill in the category name
    await this.categoryNameInput.fill(name);

    // Submit the form
    await this.categorySubmitBtn.click();

    // Wait for modal to close (form submission complete)
    await expect(this.categoryNameInput).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Edit an existing category.
   *
   * @param categoryId - The ID of the category to edit
   * @param newName - The new name for the category
   */
  async editCategory(categoryId: string, newName: string): Promise<void> {
    // Find the category item and click edit
    const categoryItem = this.page.locator(
      `[data-testid="category-item"][data-category-id="${categoryId}"]`
    );
    await expect(categoryItem).toBeVisible();

    const editBtn = categoryItem.locator('[data-testid="category-edit-btn"]');
    await editBtn.click();

    // Wait for edit modal to be visible
    await expect(this.categoryNameInput).toBeVisible();

    // Clear and fill new name
    await this.categoryNameInput.clear();
    await this.categoryNameInput.fill(newName);

    // Submit the form
    await this.categorySubmitBtn.click();

    // Wait for modal to close
    await expect(this.categoryNameInput).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete a category with confirmation.
   *
   * @param categoryId - The ID of the category to delete
   */
  async deleteCategory(categoryId: string): Promise<void> {
    // Find the category item and click delete
    const categoryItem = this.page.locator(
      `[data-testid="category-item"][data-category-id="${categoryId}"]`
    );
    await expect(categoryItem).toBeVisible();

    const deleteBtn = categoryItem.locator('[data-testid="category-delete-btn"]');
    await deleteBtn.click();

    // Wait for confirmation dialog and confirm
    await expect(this.confirmDeleteBtn).toBeVisible();
    await this.confirmDeleteBtn.click();

    // Wait for category to be removed from the list
    await expect(categoryItem).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify that a category exists in the list.
   *
   * @param name - The category name to find
   */
  async expectCategoryExists(name: string): Promise<void> {
    const categoryItem = this.page.locator('[data-testid="category-item"]', {
      hasText: name,
    });
    await expect(categoryItem).toBeVisible();
  }

  /**
   * Get the category ID by its name.
   *
   * @param name - The category name to search for
   * @returns The category ID or null if not found
   */
  async getCategoryIdByName(name: string): Promise<string | null> {
    const categoryItem = this.page.locator('[data-testid="category-item"]', {
      hasText: name,
    });

    // Check if the category exists
    const count = await categoryItem.count();
    if (count === 0) {
      return null;
    }

    return categoryItem.getAttribute('data-category-id');
  }
}
