import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Transactions page (/transactions).
 * Handles transaction listing, filtering, and management.
 */
export class TransactionsPage extends BasePage {
  // Locators for transaction page elements
  private readonly transactionList = '[data-testid="transaction-list"]';
  private readonly typeFilterGroup = '[data-testid="transaction-type-filter"]';
  private readonly categoryFilter = '[data-testid="transaction-category-filter"]';
  private readonly monthSelector = '[data-testid="transaction-month-selector"]';
  private readonly deleteModal = '[data-testid="delete-dialog"]';

  /**
   * Navigate to the transactions page.
   */
  async goto(): Promise<void> {
    await this.navigateTo('/transactions');
  }

  /**
   * Get a transaction item locator by transaction ID.
   * @param transactionId - The transaction ID
   */
  private getTransactionItem(transactionId: string) {
    return this.page
      .locator(`[data-testid="transaction-item"][data-transaction-id="${transactionId}"]`)
      .or(this.page.locator(`[data-transaction-card][data-transaction-id="${transactionId}"]`));
  }

  /**
   * Get a transaction item locator by description text.
   * @param description - The transaction description to search for
   */
  private getTransactionItemByDescription(description: string) {
    return this.page.locator('[data-transaction-card]', {
      hasText: description,
    });
  }

  /**
   * Filter transactions by the current month.
   * Clicks on the current month option in the month selector.
   */
  async filterByCurrentMonth(): Promise<void> {
    // Get today's date and format as month key
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Open month dropdown via PeriodNavigator trigger
    const monthTrigger: Locator = this.page
      .locator(this.monthSelector)
      .or(this.page.locator('[data-period-trigger]'))
      .first();
    await monthTrigger.click();

    // Select the current month option
    const monthOption: Locator = this.page.locator(`[data-period-option="${monthKey}"]`);
    if (await monthOption.isVisible()) {
      await monthOption.click();
    } else {
      // Close dropdown if current month not found
      await this.page.keyboard.press('Escape');
    }

    await this.waitForPageLoad();
  }

  /**
   * Filter transactions by category.
   *
   * @param categoryId - The category ID to filter by
   */
  async filterByCategory(categoryId: string): Promise<void> {
    // Open category dropdown
    const categoryTrigger = this.page
      .locator(this.categoryFilter)
      .or(this.page.locator('[data-category-trigger]'));
    await categoryTrigger.click();

    // Select the category option
    const categoryOption = this.page.locator(`[data-category-option="${categoryId}"]`);
    await categoryOption.click();

    await this.waitForPageLoad();
  }

  /**
   * Filter transactions by type (expense, income, or all).
   *
   * Clicking the filter button triggers a client-side AJAX fetch (fetchAndRender).
   * We must wait for the API response before asserting list contents.
   *
   * @param type - The transaction type to filter by
   */
  async filterByType(type: 'expense' | 'income' | 'all'): Promise<void> {
    // Note: Current implementation doesn't have 'all' option
    if (type === 'all') {
      type = 'expense';
    }

    const typeBtn = this.page
      .locator(this.typeFilterGroup)
      .or(this.page.locator('[data-filter-type-group]'))
      .locator(`[data-filter-type="${type}"]`);

    // Wait for both the click and the subsequent AJAX fetch triggered by handleTypeFilterChange
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/transactions') && resp.request().method() === 'GET',
        { timeout: 10000 }
      ),
      typeBtn.click(),
    ]);
  }

  /**
   * Calculate the total expenses by summing all expense amounts on the current page.
   *
   * @returns The total expenses as a number
   */
  async calculateTotalExpenses(): Promise<number> {
    // Get all transaction cards that are expenses
    const expenseItems = this.page.locator(
      '[data-transaction-card][class*="expense"], [data-testid="transaction-item"][data-type="expense"]'
    );

    // If no specific expense selector, get amounts that appear negative (red/error color)
    const amountElements = this.page.locator(
      '[data-transaction-card] .text-error, [data-testid="transaction-amount"]'
    );

    let total = 0;
    const count = await amountElements.count();

    for (let i = 0; i < count; i++) {
      const text = await amountElements.nth(i).textContent();
      if (text) {
        const amount = this.parseCurrency(text);
        if (!isNaN(amount)) {
          total += Math.abs(amount);
        }
      }
    }

    return total;
  }

  /**
   * Calculate the total income by summing all income amounts on the current page.
   *
   * @returns The total income as a number
   */
  async calculateTotalIncome(): Promise<number> {
    // Get all transaction cards that are income
    const incomeItems = this.page.locator(
      '[data-transaction-card][class*="income"], [data-testid="transaction-item"][data-type="income"]'
    );

    // If no specific income selector, get amounts that appear positive (green/success color)
    const amountElements = this.page.locator(
      '[data-transaction-card] .text-success, [data-testid="transaction-amount"]'
    );

    let total = 0;
    const count = await amountElements.count();

    for (let i = 0; i < count; i++) {
      const text = await amountElements.nth(i).textContent();
      if (text) {
        const amount = this.parseCurrency(text);
        if (!isNaN(amount)) {
          total += amount;
        }
      }
    }

    return total;
  }

  /**
   * Verify that a transaction with the given description exists in the list.
   *
   * @param description - The transaction description to find
   */
  async expectTransactionExists(description: string): Promise<void> {
    const transactionItem = this.getTransactionItemByDescription(description);
    await expect(transactionItem).toBeVisible();
  }

  /**
   * Delete a transaction by ID.
   *
   * @param transactionId - The ID of the transaction to delete
   */
  async deleteTransaction(transactionId: string): Promise<void> {
    const transactionItem = this.getTransactionItem(transactionId);
    await this.waitForVisible(transactionItem);

    // Find and click the delete button
    const deleteBtn = transactionItem
      .locator('[data-delete-transaction]')
      .or(transactionItem.locator('[data-testid="transaction-delete-btn"]'));
    await deleteBtn.click();

    // Wait for confirmation modal
    const confirmModal = this.page
      .locator(this.deleteModal)
      .or(this.page.locator('#delete-dialog'));
    await confirmModal.waitFor({ state: 'visible' });

    // Click confirm delete button
    const confirmBtn = this.getByTestId('confirm-delete-btn').or(
      confirmModal.locator('button').filter({ hasText: /delete|confirm/i })
    );
    await confirmBtn.click();

    // Wait for transaction to be removed
    await expect(transactionItem).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Get the transaction ID by its description.
   *
   * @param description - The transaction description to search for
   * @returns The transaction ID or null if not found
   */
  async getTransactionIdByDescription(description: string): Promise<string | null> {
    const transactionItem = this.getTransactionItemByDescription(description);
    const count = await transactionItem.count();

    if (count === 0) {
      return null;
    }

    return transactionItem.getAttribute('data-transaction-id');
  }

  /**
   * Get the number of transactions displayed on the current page.
   *
   * @returns The count of visible transactions
   */
  async getTransactionCount(): Promise<number> {
    const items = this.page.locator('[data-transaction-card]');
    return items.count();
  }

  /**
   * Verify that the transaction list is visible.
   */
  async expectTransactionListVisible(): Promise<void> {
    // Primary ID-based locator
    const list = this.page.locator('#transaction-list');
    await expect(list).toBeVisible();
  }

  /**
   * Get the displayed period label (e.g., "January 2024").
   *
   * @returns The period label text
   */
  async getPeriodLabel(): Promise<string> {
    const label = this.page
      .locator('[data-month-label]')
      .or(this.page.locator('[data-testid="period-label"]'));
    const text = await label.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Navigate to the next month.
   */
  async goToNextMonth(): Promise<void> {
    const nextBtn = this.page.locator('[data-month-nav="next"]');
    await nextBtn.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to the previous month.
   */
  async goToPreviousMonth(): Promise<void> {
    const prevBtn = this.page.locator('[data-month-nav="prev"]');
    await prevBtn.click();
    await this.waitForPageLoad();
  }

  /**
   * Search transactions by text.
   *
   * @param searchText - The text to search for
   */
  async searchTransactions(searchText: string): Promise<void> {
    const searchInput = this.page
      .locator('[data-filter-search]')
      .or(this.page.locator('#search-input'));
    await searchInput.clear();
    await searchInput.fill(searchText);

    // Wait for search results to update
    await this.waitForPageLoad();
  }

  /**
   * Clear all active filters.
   */
  async resetFilters(): Promise<void> {
    const resetBtn = this.page.locator('[data-reset-filters]');

    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await this.waitForPageLoad();
    }
  }
}
