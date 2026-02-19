import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Account creation/edit form data interface.
 */
export interface AccountFormData {
  name: string;
  type: string;
  currency: 'IDR' | 'USD';
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
  private readonly portfolioTotal = '[data-testid="portfolio-total"]';
  private readonly accountFormModal = '[data-testid="account-form-modal"]';
  private readonly accountDeleteModal = '[data-testid="account-delete-modal"]';

  /**
   * Navigate to the accounts page.
   */
  async goto(): Promise<void> {
    await this.navigateTo('/accounts');
  }

  /**
   * Get an account item locator by account ID.
   * @param accountId - The account ID
   */
  private getAccountItem(accountId: string) {
    return this.page.locator(`[data-testid="account-item"][data-account-id="${accountId}"]`);
  }

  /**
   * Get an account item locator by account name.
   * Uses a heading element for more precise matching to avoid cross-test interference.
   * @param name - The account name to search for
   */
  private getAccountItemByName(name: string) {
    // Use heading with exact text for more precise matching
    // This prevents finding accounts from parallel test runs with similar names
    return this.page.locator('[data-testid="account-item"]').filter({
      has: this.page.locator('h4', { hasText: name }),
    });
  }

  /**
   * Get the account balance element within an account item.
   * Uses .first() because AccountItemRow has dual mobile/desktop layouts.
   * @param accountId - The account ID
   */
  private getAccountBalance(accountId: string) {
    return this.getAccountItem(accountId).locator('[data-testid="account-balance"]').first();
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
   * Delete an account with confirmation.
   *
   * @param accountId - The ID of the account to delete
   */
  async deleteAccount(accountId: string): Promise<void> {
    // Find and click the delete button for this account
    const accountItem = this.getAccountItem(accountId);
    await this.waitForVisible(accountItem);

    const deleteBtn = accountItem
      .locator('[data-delete-account]')
      .or(accountItem.locator('[data-testid="account-delete-btn"]'));
    await deleteBtn.click();

    // Wait for confirmation modal
    const confirmModal = this.page
      .locator(this.accountDeleteModal)
      .or(this.page.locator('#account-delete-modal'));
    await confirmModal.waitFor({ state: 'visible' });

    // Click confirm delete button
    const confirmBtn = this.getByTestId('confirm-delete-btn').or(
      confirmModal.locator('button').filter({ hasText: /delete|confirm/i })
    );
    await confirmBtn.click();

    // Wait for modal to close and account to be removed
    await expect(accountItem).not.toBeVisible({ timeout: 5000 });
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

  /**
   * Verify that an account has the expected balance.
   * Uses .first() because AccountItemRow has dual mobile/desktop layouts
   * with separate balance elements sharing the same data-testid.
   *
   * @param name - The account name
   * @param expectedBalance - The expected balance string (formatted)
   */
  async expectAccountBalance(name: string, expectedBalance: string): Promise<void> {
    const accountItem = this.getAccountItemByName(name);
    await expect(accountItem).toBeVisible();

    // Use .first() to avoid strict mode violation from dual mobile/desktop layouts
    const balanceElement = accountItem.locator('[data-testid="account-balance"]').first();
    await expect(balanceElement).toContainText(expectedBalance);
  }

  /**
   * Get the total portfolio value displayed on the page.
   * Returns the IDR total value from the portfolio summary.
   *
   * @returns The portfolio total as a string
   */
  async getPortfolioTotal(): Promise<string> {
    // Wait for portfolio summary section to be visible
    const portfolioSection = this.page
      .locator('[aria-label*="Portfolio"]')
      .or(this.page.locator('section:has-text("Total Value")'));

    try {
      await portfolioSection.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // No portfolio section found
      return '0';
    }

    // Look for IDR total value - it appears after "Total Value (IDR)" text
    // Try multiple selectors for robustness
    const idrValueLocators = [
      // Direct data-testid
      this.page.locator('[data-testid="portfolio-total-accounts"] p'),
      // Text containing "Total Value (IDR)" followed by a paragraph
      this.page.locator('text=Total Value (IDR) >> xpath=following-sibling::p'),
      // Paragraph containing "Rp" currency format in portfolio section
      portfolioSection.locator('p:has-text("Rp")').first(),
    ];

    for (const locator of idrValueLocators) {
      const count = await locator.count();
      if (count > 0) {
        const text = await locator.first().textContent();
        if (text && text.includes('Rp')) {
          return text.trim();
        }
      }
    }

    // Final fallback: Get the full portfolio section text
    const portfolioText = await portfolioSection.first().textContent();
    return portfolioText?.trim() ?? '0';
  }

  /**
   * Get the account ID by its name.
   *
   * @param name - The account name to search for
   * @returns The account ID or null if not found
   */
  async getAccountIdByName(name: string): Promise<string | null> {
    // Wait for at least one account item to exist
    const accountItem = this.getAccountItemByName(name).first();

    // Wait for the element to be visible (with a reasonable timeout)
    try {
      await accountItem.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Element not found or not visible
      return null;
    }

    // Try to get from data-account-id attribute
    const accountId = await accountItem.getAttribute('data-account-id');
    if (accountId) {
      return accountId;
    }

    // Fallback: try data-account-row attribute
    const rowId = await accountItem.getAttribute('data-account-row');
    return rowId;
  }

  /**
   * Verify that the add account button is visible.
   */
  async expectAddAccountButtonVisible(): Promise<void> {
    const addBtn = this.page
      .locator(this.addAccountBtn)
      .or(this.page.locator('[data-add-account-btn]'));
    await expect(addBtn.first()).toBeVisible();
  }
}
