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

  private get categoryModal(): Locator {
    return this.page.locator('#category-modal');
  }

  private get deleteDialog(): Locator {
    return this.page.locator('#delete-dialog');
  }

  /**
   * Navigate to the categories settings page.
   */
  async gotoCategories(): Promise<void> {
    await this.navigateTo('/budget/categories');
    await expect(this.createCategoryBtn).toBeVisible();
    // Wait for JavaScript to be fully initialized
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Switch to the expense categories tab.
   * Note: Tab switching triggers a full page navigation (URL change).
   */
  async switchToExpenseTab(): Promise<void> {
    // Check if already on expense tab to avoid unnecessary navigation
    const isActive = await this.expenseTab.getAttribute('data-active');
    if (isActive === 'true') {
      return;
    }

    // Navigate directly via URL to avoid relying on click event handlers
    const currentUrl = new URL(this.page.url());
    currentUrl.searchParams.set('type', 'expense');
    await this.page.goto(currentUrl.toString());
    await this.waitForPageLoad();

    // TabToggle component uses data-active attribute for active state
    await expect(this.expenseTab).toHaveAttribute('data-active', 'true');
  }

  /**
   * Switch to the income categories tab.
   * Note: Tab switching triggers a full page navigation (URL change).
   */
  async switchToIncomeTab(): Promise<void> {
    // Check if already on income tab to avoid unnecessary navigation
    const isActive = await this.incomeTab.getAttribute('data-active');
    if (isActive === 'true') {
      return;
    }

    // Navigate directly via URL to avoid relying on click event handlers
    const currentUrl = new URL(this.page.url());
    currentUrl.searchParams.set('type', 'income');
    await this.page.goto(currentUrl.toString());
    await this.waitForPageLoad();

    // TabToggle component uses data-active attribute for active state
    await expect(this.incomeTab).toHaveAttribute('data-active', 'true');
  }

  /**
   * Create a new category.
   * Opens the create modal, fills in the name, and submits.
   * Note: Form submission triggers a full page reload.
   *
   * @param name - The category name
   * @param type - The category type ('expense' or 'income')
   */
  async createCategory(name: string, type: 'expense' | 'income'): Promise<void> {
    // Switch to the appropriate tab first (this may trigger navigation)
    if (type === 'expense') {
      await this.switchToExpenseTab();
    } else {
      await this.switchToIncomeTab();
    }

    // Click create button to open modal
    // Ensure the button is ready before clicking
    await expect(this.createCategoryBtn).toBeEnabled();
    await this.createCategoryBtn.click();

    // Wait for modal dialog to be visible (showModal() makes it visible)
    // If modal doesn't open, retry the click
    try {
      await expect(this.categoryModal).toBeVisible({ timeout: 3000 });
    } catch {
      // Retry click if modal didn't open
      await this.createCategoryBtn.click();
      await expect(this.categoryModal).toBeVisible({ timeout: 5000 });
    }

    // Wait for modal input to be visible and interactable
    await expect(this.categoryNameInput).toBeVisible({ timeout: 5000 });

    // Fill in the category name
    await this.categoryNameInput.fill(name);

    // Submit the form - this triggers a page reload after success
    await Promise.all([
      this.page.waitForURL(/.*\/budget\/categories.*/),
      this.categorySubmitBtn.click(),
    ]);
    await this.waitForPageLoad();
  }

  /**
   * Edit an existing category.
   * Note: Form submission triggers a full page reload.
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
    await expect(editBtn).toBeEnabled();
    await editBtn.click();

    // Wait for modal dialog to be visible
    // If modal doesn't open, retry the click
    try {
      await expect(this.categoryModal).toBeVisible({ timeout: 3000 });
    } catch {
      // Retry click if modal didn't open
      await editBtn.click();
      await expect(this.categoryModal).toBeVisible({ timeout: 5000 });
    }

    // Wait for edit modal input to be visible
    await expect(this.categoryNameInput).toBeVisible({ timeout: 5000 });

    // Clear and fill new name
    await this.categoryNameInput.clear();
    await this.categoryNameInput.fill(newName);

    // Submit the form - this triggers a page reload after success
    await Promise.all([
      this.page.waitForURL(/.*\/budget\/categories.*/),
      this.categorySubmitBtn.click(),
    ]);
    await this.waitForPageLoad();
  }

  /**
   * Delete a category with confirmation.
   * Note: Delete triggers a page reload after success.
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
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();

    // Wait for delete confirmation dialog to be visible
    // If dialog doesn't open, retry the click
    try {
      await expect(this.deleteDialog).toBeVisible({ timeout: 3000 });
    } catch {
      // Retry click if dialog didn't open
      await deleteBtn.click();
      await expect(this.deleteDialog).toBeVisible({ timeout: 5000 });
    }

    // Wait for confirmation button and click
    await expect(this.confirmDeleteBtn).toBeVisible({ timeout: 5000 });

    // Click confirm - this triggers a page reload after success
    // We need to wait for actual navigation (not just URL match since it's the same URL)
    await this.confirmDeleteBtn.click();

    // Wait for category item to disappear (delete success indicator)
    await expect(categoryItem).not.toBeVisible({ timeout: 10000 });
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
    await expect(categoryItem).toBeVisible({ timeout: 10000 });
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
