import { expect, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Transaction form data interface.
 */
export interface TransactionFormData {
  type: 'expense' | 'income';
  amount: string | number;
  categoryName: string;
  accountName: string;
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

  private get accountSelect(): Locator {
    return this.getFormPanel().locator('[data-testid="transaction-account-select"]');
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

    // Click the currently visible drawer trigger.
    // Desktop uses the header CTA, while mobile uses the bottom navigation FAB.
    const newTransactionBtn: Locator = this.page
      .locator('[data-open-transaction-drawer]:visible')
      .first();
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
   * Categories use radio button chips (not a visible select dropdown).
   * The hidden select is for form submission only; clicking chips triggers
   * client-side validation that enables the submit button.
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

    // Wait for category chips to load with the target category
    const formPanel: Locator = this.getFormPanel();
    await expect
      .poll(
        async () => {
          const chips: string[] = await formPanel.locator('[data-category-chip]').allTextContents();
          return chips.some((text) => text.trim() === data.categoryName);
        },
        { timeout: 10000, message: `Category "${data.categoryName}" not found in category chips` }
      )
      .toBe(true);

    // Find the category chip by aria-label (matches category name)
    const categoryChip: Locator = formPanel.locator(
      `button[data-category-chip][aria-label="${data.categoryName}"]`
    );

    // If chip is in the overflow section and hidden, expand first
    if (!(await categoryChip.isVisible())) {
      const expandToggle: Locator = formPanel.locator('[data-category-toggle]');
      if (await expandToggle.isVisible()) {
        await expandToggle.click();
      }
    }

    // Click the category chip to trigger validation and enable submit button
    await categoryChip.click();

    // Wait for account select to have options (poll for option with our account name)
    await expect
      .poll(
        async () => {
          const options: string[] = await this.accountSelect.locator('option').allTextContents();
          return options.some((opt) => opt.includes(data.accountName));
        },
        { timeout: 10000, message: `Account "${data.accountName}" not found in select options` }
      )
      .toBe(true);

    // Select account by visible text
    await this.accountSelect.selectOption({ label: data.accountName });

    // Fill optional date
    if (data.date) {
      await this.dateInput.fill(data.date);
    }

    // Wait for submit button to be enabled after all fields are filled
    await expect(this.submitBtn).toBeEnabled({ timeout: 5000 });
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
}
