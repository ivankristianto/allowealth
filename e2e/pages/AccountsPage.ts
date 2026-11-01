import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Account creation/edit form data interface.
 */
export interface AccountFormData {
  name: string;
  type: string;
  currency: Currency;
  initialBalance?: string | number;
}

/**
 * Page Object Model for the Accounts page (/accounts).
 * Handles account management including creating, editing, deleting accounts
 * and viewing portfolio information.
 */
export class AccountsPage extends BasePage {
  // Locators for account page elements
  private readonly addAccountBtn = '[data-testid="add-account-btn"]';
  private readonly accountRow = '[data-account-table-row]';

  /**
   * Navigate to the accounts page.
   */
  async goto(): Promise<void> {
    await this.navigateTo('/accounts');
  }

  /**
   * Get an account table row by account ID.
   * The accounts page renders the table view; the older card view stays in the DOM but hidden.
   */
  private getAccountItem(accountId: string) {
    return this.page.locator(`${this.accountRow}[data-account-id="${accountId}"]`);
  }

  /**
   * Get an account table row by its exact account name.
   */
  getAccountItemByName(name: string): Locator {
    return this.page.locator(this.accountRow).filter({
      has: this.page.getByRole('link', { name, exact: true }),
    });
  }

  /**
   * Open the add account modal.
   */
  async openAddAccountModal(): Promise<void> {
    // Ensure any existing modal is closed first
    const existingModal = this.page.locator('dialog#account-form-modal[open]');
    if ((await existingModal.count()) > 0) {
      await this.page.keyboard.press('Escape');
      await expect(existingModal).not.toBeVisible();
    }

    // Try the add account button (data-testid or data-add-account-btn)
    const addBtn = this.page
      .locator(this.addAccountBtn)
      .or(this.page.locator('[data-add-account-btn]'));

    // Wait for button to be visible and enabled
    await expect(addBtn.first()).toBeVisible();
    await expect(addBtn.first()).toBeEnabled();

    // Click the button and wait for modal
    const modal = this.page.locator('dialog#account-form-modal[open]');
    await addBtn.first().click();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for modal content animation to complete (opacity transitions from 0 to 1)
    const modalContent: Locator = modal.locator('[data-modal-content]');
    await expect(modalContent).toBeVisible({ timeout: 5000 });

    // Wait for form to be ready inside the modal
    const nameInput: Locator = modal
      .locator('[data-testid="account-name-input"]')
      .or(modal.locator('[name="name"]').first());
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fill the account form with provided data.
   * @param data - The account form data
   */
  async fillAccountForm(data: AccountFormData): Promise<void> {
    // Scope all selectors within the account form modal dialog
    const modal = this.page.locator('dialog#account-form-modal');

    // Fill account name
    const nameInput = modal
      .locator('[data-testid="account-name-input"]')
      .or(modal.locator('[name="name"]').first());
    await nameInput.clear();
    await nameInput.fill(data.name);

    // Select account type - scoped within modal
    // Map legacy type values to human-readable labels for the select
    const typeToLabel: Record<string, string> = {
      bank_account: 'Bank Account',
      e_wallet: 'E-Wallet',
      mutual_fund: 'Mutual Fund',
      bond: 'Bond',
      crypto: 'Crypto',
      stock: 'Stock',
      other: 'Other',
      credit_card: 'Credit Card',
      loan: 'Loan',
    };
    const typeLabel = typeToLabel[data.type] || data.type;
    const typeSelect: Locator = modal
      .locator('[data-testid="account-category-select"]')
      .or(modal.locator('select[name="type"]'));

    // Wait for the select to be visible (modal animation may still be in progress)
    await expect(typeSelect).toBeVisible({ timeout: 5000 });
    await typeSelect.selectOption({ label: typeLabel });

    // Select currency - scoped within modal
    const currencySelect = modal
      .locator('[data-testid="account-currency-select"]')
      .or(modal.locator('select[name="currency"]'));
    await currencySelect.selectOption(data.currency);

    // Fill initial balance if provided - scoped within modal
    if (data.initialBalance !== undefined) {
      const balanceInput = modal
        .locator('[data-testid="account-balance-input"]')
        .or(modal.locator('[name="balance"]'));
      await balanceInput.clear();
      await balanceInput.fill(String(data.initialBalance));
    }
  }

  /**
   * Submit the account form.
   * The account form reloads the page after a 500ms delay on success.
   */
  async submitAccountForm(): Promise<void> {
    // Scope within the account form modal dialog
    const modal = this.page.locator('dialog#account-form-modal');
    const submitBtn = modal
      .locator('[data-testid="account-submit-btn"]')
      .or(modal.locator('button[type="submit"]'));

    // Wait for submit button to be visible and enabled
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Click submit and wait for the page to reload (triggered by setTimeout 500ms after success)
    await Promise.all([this.page.waitForNavigation({ timeout: 15000 }), submitBtn.click()]);

    // Wait for the page to be fully loaded after reload
    await this.waitForPageLoad();

    // Wait for the add account button to be visible again (indicates page is ready)
    const addBtn = this.page
      .locator(this.addAccountBtn)
      .or(this.page.locator('[data-add-account-btn]'));
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Create a new account.
   * Opens the modal, fills the form, and submits.
   *
   * @param data - The account data to create
   */
  async createAccount(data: AccountFormData): Promise<void> {
    await this.openAddAccountModal();
    await this.fillAccountForm(data);
    await this.submitAccountForm();
    // submitAccountForm already ensures the page is ready for next operation
  }

  /**
   * Edit an existing account.
   *
   * @param accountId - The ID of the account to edit
   * @param updates - The fields to update
   */
  async editAccount(
    accountId: string,
    updates: Partial<Omit<AccountFormData, 'initialBalance'>>
  ): Promise<void> {
    // Find and click the edit button for this account
    const accountItem = this.getAccountItem(accountId);
    await this.waitForVisible(accountItem);

    const editBtn = accountItem
      .locator('[data-edit-account]')
      .or(accountItem.locator('[data-testid="account-edit-btn"]'));
    await editBtn.click();

    // Wait for edit modal dialog to have the 'open' attribute (native dialog API)
    const modal = this.page.locator('dialog#account-form-modal[open]');
    await modal.waitFor({ state: 'attached', timeout: 10000 });

    // Update fields - scoped within the modal
    if (updates.name !== undefined) {
      const nameInput = modal
        .locator('[data-testid="account-name-input"]')
        .or(modal.locator('[name="name"]').first());
      await nameInput.clear();
      await nameInput.fill(updates.name);
    }

    if (updates.type !== undefined) {
      // Map legacy type values to human-readable labels for the select
      const typeToLabel: Record<string, string> = {
        bank_account: 'Bank Account',
        e_wallet: 'E-Wallet',
        mutual_fund: 'Mutual Fund',
        bond: 'Bond',
        crypto: 'Crypto',
        stock: 'Stock',
        other: 'Other',
        credit_card: 'Credit Card',
        loan: 'Loan',
      };
      const typeLabel = typeToLabel[updates.type] || updates.type;
      const typeSelect: Locator = modal
        .locator('[data-testid="account-category-select"]')
        .or(modal.locator('select[name="type"]'));
      await typeSelect.selectOption({ label: typeLabel });
    }

    if (updates.currency !== undefined) {
      const currencySelect = modal
        .locator('[data-testid="account-currency-select"]')
        .or(modal.locator('select[name="currency"]'));
      await currencySelect.selectOption(updates.currency);
    }

    await this.submitAccountForm();
  }

  /**
   * Verify that an account with the given name exists in the list.
   *
   * @param name - The account name to find
   */
  async expectAccountExists(name: string): Promise<void> {
    const accountItem = this.getAccountItemByName(name);
    await expect(accountItem).toBeVisible({ timeout: 10000 });
  }
}
