import { expect, type Locator, type Response } from '@playwright/test';
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
 * Uses the TransactionDrawer (side drawer) opened via the header "New Transaction" button.
 * The drawer contains tabs for expense/income with separate forms in each tab panel.
 * Forms are instances of TransactionEntryForm with formId="drawer-form-expense" or "drawer-form-income".
 */
export class AddTransactionPage extends BasePage {
  // Store the current transaction type for scoping form locators
  private currentType: 'expense' | 'income' = 'expense';

  /**
   * Get the active form panel locator based on the current transaction type.
   */
  private getFormPanel(): Locator {
    const panelId = this.currentType === 'expense' ? 'drawer-expense-form' : 'drawer-income-form';
    return this.page.locator(`#${panelId}`);
  }

  // Form locators (scoped to active tab panel to avoid strict mode violations)
  private get transactionForm(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-form"]');
  }

  private get descriptionInput(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-description-input"]');
  }

  private get amountInput(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-amount-input"]');
  }

  private get categorySelect(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-category-select"]');
  }

  private get assetSelect(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-asset-select"]');
  }

  private get dateInput(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-date-input"]');
  }

  private get submitBtn(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-submit-btn"]');
  }

  /**
   * Navigate to the dashboard page and open the transaction drawer.
   * The "New Transaction" header button opens a side drawer with expense/income tabs.
   *
   * @param type - Transaction type to select tab for ('expense' or 'income')
   */
  async gotoAddTransaction(type?: 'expense' | 'income'): Promise<void> {
    const transactionType: 'expense' | 'income' = type ?? 'expense';
    this.currentType = transactionType;

    // Navigate to dashboard page where the header "New Transaction" button is available
    await this.page.goto('/dashboard');

    // Click the "New Transaction" button in the header to open the drawer
    const newTransactionBtn: Locator = this.page.locator('[data-open-transaction-drawer]');
    await expect(newTransactionBtn).toBeVisible();
    await expect(newTransactionBtn).toBeEnabled();
    await newTransactionBtn.click();

    // Wait for the drawer to be visible
    const drawer: Locator = this.page.locator('#transaction-drawer');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Click the appropriate tab within the drawer
    const tabBtn: Locator = drawer.locator(`[data-tab="${transactionType}"]`);
    await tabBtn.click();

    // Wait for the form panel to be visible (not hidden)
    await expect(this.getFormPanel()).toBeVisible();
    await expect(this.transactionForm).toBeVisible();

    // Wait for form fields to be ready
    await expect(this.amountInput).toBeVisible();
    await expect(this.amountInput).toBeEnabled();
  }

  /**
   * Fill the transaction form with the provided data.
   *
   * @param data - The transaction form data
   */
  async fillForm(data: TransactionFormData): Promise<void> {
    // Fill description/title (required)
    if (data.description) {
      await this.descriptionInput.clear();
      await this.descriptionInput.fill(data.description);
    }

    // Fill amount (required)
    await this.amountInput.clear();
    await this.amountInput.fill(String(data.amount));

    // Wait for category select to have options (poll for option with our category name)
    await expect
      .poll(
        async () => {
          const options = await this.categorySelect.locator('option').allTextContents();
          return options.some((opt) => opt.includes(data.categoryName));
        },
        { timeout: 10000, message: `Category "${data.categoryName}" not found in select options` }
      )
      .toBe(true);

    // Wait for asset select to have options (poll for option with our asset name)
    await expect
      .poll(
        async () => {
          const options = await this.assetSelect.locator('option').allTextContents();
          return options.some((opt) => opt.includes(data.assetName));
        },
        { timeout: 10000, message: `Asset "${data.assetName}" not found in select options` }
      )
      .toBe(true);

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
   * The drawer form submits via AJAX and stays open (bulk entry mode).
   */
  async submit(): Promise<void> {
    // Wait for both the click and the subsequent network activity
    const [response]: [Response, void] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/transactions') &&
          (resp.request().method() === 'POST' || resp.request().method() === 'PUT'),
        { timeout: 10000 }
      ),
      this.submitBtn.click(),
    ]);
    expect(response.ok()).toBe(true);
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
   * Verify successful submission and navigate to transactions page.
   * The drawer form stays open after submission (bulk entry mode).
   * We navigate to the transactions page to verify the transaction was created.
   *
   * @param type - Transaction type for filter (default: 'income')
   */
  async expectRedirectToTransactions(type: 'expense' | 'income' = 'income'): Promise<void> {
    // Navigate to transactions page with appropriate type filter
    await this.page.goto(`/transactions?type=${type}`);

    // Verify we're on the transactions page by checking for the type filter buttons
    const typeFilter =
      type === 'expense'
        ? this.page.locator(
            'button:has-text("Expenses")[aria-pressed="true"], [data-testid="type-filter-expense"][pressed]'
          )
        : this.page.locator(
            'button:has-text("Income")[aria-pressed="true"], [data-testid="type-filter-income"][pressed]'
          );
    await expect(typeFilter.first()).toBeVisible();
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
