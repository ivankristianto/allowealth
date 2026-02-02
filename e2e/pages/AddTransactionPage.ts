import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Transaction form data interface.
 */
export interface TransactionFormData {
  type: 'expense' | 'income';
  amount: string | number;
  categoryName: string;
  assetName: string;
  description?: string;
  date?: string;
}

/**
 * Page Object Model for the Add Transaction functionality.
 * Uses TransactionModal instead of dedicated pages.
 * Modals are globally available in ProtectedLayout (expense-modal, income-modal).
 *
 * @TODO P2: Extract modal IDs to shared constants to prevent typos (e2e/constants/modals.ts)
 */
export class AddTransactionPage extends BasePage {
  // Modal locators
  // @TODO P2: Consider extracting 'expense-modal' and 'income-modal' to constants
  private getModal(type: 'expense' | 'income'): Locator {
    const modalId = type === 'expense' ? 'expense-modal' : 'income-modal';
    return this.page.locator(`dialog#${modalId}`);
  }

  // Store the current modal type for scoping form locators
  private currentModalType: 'expense' | 'income' = 'income';

  // Form locators (scoped to active modal to avoid strict mode violations)
  private get transactionForm(): Locator {
    const modal = this.getModal(this.currentModalType);
    return modal.locator('[data-testid="transaction-form"]');
  }

  private get descriptionInput(): Locator {
    const modal = this.getModal(this.currentModalType);
    return modal.locator('[data-testid="transaction-description-input"]');
  }

  private get amountInput(): Locator {
    const modal = this.getModal(this.currentModalType);
    return modal.locator('[data-testid="transaction-amount-input"]');
  }

  private get categorySelect(): Locator {
    const modal = this.getModal(this.currentModalType);
    return modal.locator('[data-testid="transaction-category-select"]');
  }

  private get assetSelect(): Locator {
    const modal = this.getModal(this.currentModalType);
    return modal.locator('[data-testid="transaction-asset-select"]');
  }

  private get dateInput(): Locator {
    const modal = this.getModal(this.currentModalType);
    return modal.locator('[data-testid="transaction-date-input"]');
  }

  private get submitBtn(): Locator {
    const modal = this.getModal(this.currentModalType);
    return modal.locator('[data-testid="transaction-submit-btn"]');
  }

  /**
   * Navigate to the dashboard page and open the transaction modal.
   * Quick action buttons are available on the dashboard page.
   *
   * @param type - Transaction type to open ('expense' or 'income')
   */
  async gotoAddTransaction(type?: 'expense' | 'income'): Promise<void> {
    const transactionType = type || 'expense';

    // Store the modal type for form locator scoping
    this.currentModalType = transactionType;

    // Navigate to dashboard page where quick actions are available
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');

    // Open the appropriate modal via quick action button
    const quickActionButton =
      transactionType === 'expense'
        ? this.page.locator('[data-testid="quick-action-expense"]')
        : this.page.locator('[data-testid="quick-action-income"]');

    // Wait for the quick action button to be visible and clickable
    await quickActionButton.waitFor({ state: 'visible', timeout: 10000 });

    // Click the quick action button to open modal
    await quickActionButton.click();

    // Wait for modal to be visible with timeout for animation
    const modal = this.getModal(transactionType);
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for form to be fully rendered and interactive (now scoped to specific modal)
    await this.transactionForm.waitFor({ state: 'visible', timeout: 3000 });

    // Wait for animations to complete (QuickActions transition: 200ms)
    await this.page.waitForTimeout(250);
  }

  /**
   * Fill the transaction form with the provided data.
   *
   * @param data - The transaction form data
   */
  async fillForm(data: TransactionFormData): Promise<void> {
    // Fill description/title (required)
    if (data.description) {
      await this.descriptionInput.fill(''); // Clear first
      await this.descriptionInput.fill(data.description);
    }

    // Fill amount (required)
    await this.amountInput.fill(''); // Clear first
    await this.amountInput.fill(String(data.amount));

    // Wait for selects to be enabled and have options loaded
    await this.categorySelect.waitFor({ state: 'attached', timeout: 5000 });
    await this.assetSelect.waitFor({ state: 'attached', timeout: 5000 });

    // Wait for category options to be populated (more than just the placeholder)
    await this.page.waitForFunction(
      (selector: string) => {
        const select = document.querySelector(selector) as HTMLSelectElement;
        return select && select.options.length > 1;
      },
      `dialog#${this.currentModalType === 'expense' ? 'expense-modal' : 'income-modal'} [data-testid="transaction-category-select"]`,
      { timeout: 10000 }
    );

    // Wait for asset options to be populated
    await this.page.waitForFunction(
      (selector: string) => {
        const select = document.querySelector(selector) as HTMLSelectElement;
        return select && select.options.length > 1;
      },
      `dialog#${this.currentModalType === 'expense' ? 'expense-modal' : 'income-modal'} [data-testid="transaction-asset-select"]`,
      { timeout: 10000 }
    );

    // Select category by visible text
    await this.categorySelect.selectOption({ label: data.categoryName });

    // Select asset by visible text
    await this.assetSelect.selectOption({ label: data.assetName });

    // Fill optional date
    if (data.date) {
      await this.dateInput.fill(data.date);
    }
  }

  /**
   * Submit the transaction form and wait for network response.
   */
  async submit(): Promise<void> {
    // Wait for both the click and the subsequent network activity
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/transactions') &&
          (resp.request().method() === 'POST' || resp.request().method() === 'PUT'),
        { timeout: 10000 }
      ),
      this.submitBtn.click(),
    ]);
  }

  /**
   * Fill and submit the transaction form in one step.
   *
   * @param data - The transaction form data
   */
  async fillAndSubmit(data: TransactionFormData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  /**
   * Verify that modal closes after submission.
   *
   * @param type - Transaction type ('expense' or 'income')
   */
  async expectModalClosed(type: 'expense' | 'income'): Promise<void> {
    const modal = this.getModal(type);

    // Wait for modal to be hidden/closed
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify modal is actually closed (not just hidden with CSS)
    await expect(modal).not.toHaveAttribute('open');
  }

  /**
   * Verify successful submission and navigate to transactions page.
   * Note: After modal submission, the page reloads (stays on dashboard).
   * We navigate to transactions page to verify the transaction was created.
   *
   * @param type - Transaction type for modal close verification and filter (default: 'income')
   */
  async expectRedirectToTransactions(type: 'expense' | 'income' = 'income'): Promise<void> {
    // First verify modal closes after submission
    await this.expectModalClosed(type);

    // Wait for page reload (modal closes and page reloads)
    await this.page.waitForLoadState('networkidle');

    // Navigate to transactions page with appropriate type filter
    // Transactions page defaults to 'expense', so we need to specify type=income for income transactions
    await this.page.goto(`/transactions?type=${type}`);
    await this.page.waitForLoadState('networkidle');

    // Verify we're on the transactions page
    const currentPath = new URL(this.page.url()).pathname;
    expect(currentPath).toBe('/transactions');
  }

  /**
   * Verify that a validation error is displayed for a specific field.
   *
   * @param field - The field name (e.g., 'amount', 'category_id')
   * @param message - The expected error message
   */
  async expectValidationError(field: string, message: string): Promise<void> {
    // Find the field input element
    const fieldInput = this.page.locator(`[name="${field}"]`);

    // Find the form-control container (parent of the field)
    const formControl = fieldInput.locator('xpath=ancestor::div[contains(@class, "form-control")]');

    // Find error within that specific field's container
    const errorLocator = formControl.locator('.field-error');

    await expect(errorLocator).toBeVisible();
    await expect(errorLocator).toHaveText(message);

    // Verify aria-invalid is set for accessibility
    await expect(fieldInput).toHaveAttribute('aria-invalid', 'true');
  }

  /**
   * Get the current value of the amount input.
   */
  async getAmountValue(): Promise<string> {
    return this.amountInput.inputValue();
  }

  /**
   * Get the currently selected category.
   */
  async getSelectedCategory(): Promise<string> {
    return this.categorySelect.inputValue();
  }

  /**
   * Get the currently selected asset.
   */
  async getSelectedAsset(): Promise<string> {
    return this.assetSelect.inputValue();
  }

  /**
   * Check if the submit button is enabled.
   */
  async isSubmitEnabled(): Promise<boolean> {
    return this.submitBtn.isEnabled();
  }
}
