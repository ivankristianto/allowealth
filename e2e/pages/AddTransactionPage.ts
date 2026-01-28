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
 * Page Object Model for the Add Transaction page.
 * Handles creating new expense and income transactions.
 */
export class AddTransactionPage extends BasePage {
  // Locators
  private get transactionForm(): Locator {
    return this.page.locator('[data-testid="transaction-form"]');
  }

  private get typeExpenseBtn(): Locator {
    return this.page.locator('[data-testid="transaction-type-expense"]');
  }

  private get typeIncomeBtn(): Locator {
    return this.page.locator('[data-testid="transaction-type-income"]');
  }

  private get amountInput(): Locator {
    return this.page.locator('[data-testid="transaction-amount-input"]');
  }

  private get categorySelect(): Locator {
    return this.page.locator('[data-testid="transaction-category-select"]');
  }

  private get assetSelect(): Locator {
    return this.page.locator('[data-testid="transaction-asset-select"]');
  }

  private get dateInput(): Locator {
    return this.page.locator('[data-testid="transaction-date-input"]');
  }

  private get descriptionInput(): Locator {
    return this.page.locator('[data-testid="transaction-description-input"]');
  }

  private get submitBtn(): Locator {
    return this.page.locator('[data-testid="transaction-submit-btn"]');
  }

  /**
   * Navigate to the add transaction page.
   *
   * @param type - Optional transaction type to pre-select ('expense' or 'income')
   */
  async gotoAddTransaction(type?: 'expense' | 'income'): Promise<void> {
    const url = type ? `/transactions/add?type=${type}` : '/transactions/add';
    await this.page.goto(url);
    await expect(this.transactionForm).toBeVisible();
  }

  /**
   * Fill the transaction form with the provided data.
   *
   * @param data - The transaction form data
   */
  async fillForm(data: TransactionFormData): Promise<void> {
    // Select transaction type
    if (data.type === 'expense') {
      await this.typeExpenseBtn.click();
    } else {
      await this.typeIncomeBtn.click();
    }

    // Fill amount
    await this.amountInput.clear();
    await this.amountInput.fill(String(data.amount));

    // Select category
    await this.categorySelect.selectOption({ label: data.categoryName });

    // Select asset
    await this.assetSelect.selectOption({ label: data.assetName });

    // Fill optional description
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }

    // Fill optional date
    if (data.date) {
      await this.dateInput.fill(data.date);
    }
  }

  /**
   * Submit the transaction form.
   */
  async submit(): Promise<void> {
    await this.submitBtn.click();
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
   * Verify redirect to the transactions list page after successful submission.
   */
  async expectRedirectToTransactions(): Promise<void> {
    await this.page.waitForURL(/\/transactions(?:\?|$)/);
    const currentPath = new URL(this.page.url()).pathname;
    expect(currentPath).toBe('/transactions');
  }

  /**
   * Verify that a validation error is displayed for a specific field.
   *
   * @param field - The field name (e.g., 'amount', 'category')
   * @param message - The expected error message
   */
  async expectValidationError(field: string, message: string): Promise<void> {
    const errorLocator = this.page.locator(`[data-testid="transaction-${field}-error"]`);
    await expect(errorLocator).toBeVisible();
    await expect(errorLocator).toHaveText(message);
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
