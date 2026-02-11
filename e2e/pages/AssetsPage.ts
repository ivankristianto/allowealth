import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Asset creation/edit form data interface.
 */
export interface AssetFormData {
  name: string;
  type: string;
  currency: 'IDR' | 'USD';
  initialBalance?: string | number;
}

/**
 * Page Object Model for the Assets page (/assets).
 * Handles asset management including creating, editing, deleting assets
 * and viewing portfolio information.
 */
export class AssetsPage extends BasePage {
  // Locators for asset page elements
  private readonly addAssetBtn = '[data-testid="add-asset-btn"]';
  private readonly portfolioTotal = '[data-testid="portfolio-total"]';
  private readonly assetFormModal = '[data-testid="asset-form-modal"]';
  private readonly assetDeleteModal = '[data-testid="asset-delete-modal"]';

  /**
   * Navigate to the assets page.
   */
  async goto(): Promise<void> {
    await this.navigateTo('/assets');
  }

  /**
   * Get an asset item locator by asset ID.
   * @param assetId - The asset ID
   */
  private getAssetItem(assetId: string) {
    return this.page.locator(`[data-testid="asset-item"][data-asset-id="${assetId}"]`);
  }

  /**
   * Get an asset item locator by asset name.
   * Uses a heading element for more precise matching to avoid cross-test interference.
   * @param name - The asset name to search for
   */
  private getAssetItemByName(name: string) {
    // Use heading with exact text for more precise matching
    // This prevents finding assets from parallel test runs with similar names
    return this.page.locator('[data-testid="asset-item"]').filter({
      has: this.page.locator('h4', { hasText: name }),
    });
  }

  /**
   * Get the asset balance element within an asset item.
   * Uses .first() because AssetItemRow has dual mobile/desktop layouts.
   * @param assetId - The asset ID
   */
  private getAssetBalance(assetId: string) {
    return this.getAssetItem(assetId).locator('[data-testid="asset-balance"]').first();
  }

  /**
   * Open the add asset modal.
   */
  async openAddAssetModal(): Promise<void> {
    // Ensure any existing modal is closed first
    const existingModal = this.page.locator('dialog#asset-form-modal[open]');
    if ((await existingModal.count()) > 0) {
      await this.page.keyboard.press('Escape');
      await expect(existingModal).not.toBeVisible();
    }

    // Try the add asset button (data-testid or data-add-asset-btn)
    const addBtn = this.page
      .locator(this.addAssetBtn)
      .or(this.page.locator('[data-add-asset-btn]'));

    // Wait for button to be visible and enabled
    await expect(addBtn.first()).toBeVisible();
    await expect(addBtn.first()).toBeEnabled();

    // Click the button and wait for modal
    const modal = this.page.locator('dialog#asset-form-modal[open]');
    await addBtn.first().click();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for modal content animation to complete (opacity transitions from 0 to 1)
    const modalContent: Locator = modal.locator('[data-modal-content]');
    await expect(modalContent).toBeVisible({ timeout: 5000 });

    // Wait for form to be ready inside the modal
    const nameInput: Locator = modal
      .locator('[data-testid="asset-name-input"]')
      .or(modal.locator('[name="name"]').first());
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fill the asset form with provided data.
   * @param data - The asset form data
   */
  async fillAssetForm(data: AssetFormData): Promise<void> {
    // Scope all selectors within the asset form modal dialog
    const modal = this.page.locator('dialog#asset-form-modal');

    // Fill asset name
    const nameInput = modal
      .locator('[data-testid="asset-name-input"]')
      .or(modal.locator('[name="name"]').first());
    await nameInput.clear();
    await nameInput.fill(data.name);

    // Select asset type - scoped within modal
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
      .locator('[data-testid="asset-category-select"]')
      .or(modal.locator('select[name="type"]'));

    // Wait for the select to be visible (modal animation may still be in progress)
    await expect(typeSelect).toBeVisible({ timeout: 5000 });
    await typeSelect.selectOption({ label: typeLabel });

    // Select currency - scoped within modal
    const currencySelect = modal
      .locator('[data-testid="asset-currency-select"]')
      .or(modal.locator('select[name="currency"]'));
    await currencySelect.selectOption(data.currency);

    // Fill initial balance if provided - scoped within modal
    if (data.initialBalance !== undefined) {
      const balanceInput = modal
        .locator('[data-testid="asset-balance-input"]')
        .or(modal.locator('[name="balance"]'));
      await balanceInput.clear();
      await balanceInput.fill(String(data.initialBalance));
    }
  }

  /**
   * Submit the asset form.
   * The asset form reloads the page after a 500ms delay on success.
   */
  async submitAssetForm(): Promise<void> {
    // Scope within the asset form modal dialog
    const modal = this.page.locator('dialog#asset-form-modal');
    const submitBtn = modal
      .locator('[data-testid="asset-submit-btn"]')
      .or(modal.locator('button[type="submit"]'));

    // Wait for submit button to be visible and enabled
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Click submit and wait for the page to reload (triggered by setTimeout 500ms after success)
    await Promise.all([this.page.waitForNavigation({ timeout: 15000 }), submitBtn.click()]);

    // Wait for the page to be fully loaded after reload
    await this.waitForPageLoad();

    // Wait for the add asset button to be visible again (indicates page is ready)
    const addBtn = this.page
      .locator(this.addAssetBtn)
      .or(this.page.locator('[data-add-asset-btn]'));
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Create a new asset.
   * Opens the modal, fills the form, and submits.
   *
   * @param data - The asset data to create
   */
  async createAsset(data: AssetFormData): Promise<void> {
    await this.openAddAssetModal();
    await this.fillAssetForm(data);
    await this.submitAssetForm();
    // submitAssetForm already ensures the page is ready for next operation
  }

  /**
   * Edit an existing asset.
   *
   * @param assetId - The ID of the asset to edit
   * @param updates - The fields to update
   */
  async editAsset(
    assetId: string,
    updates: Partial<Omit<AssetFormData, 'initialBalance'>>
  ): Promise<void> {
    // Find and click the edit button for this asset
    const assetItem = this.getAssetItem(assetId);
    await this.waitForVisible(assetItem);

    const editBtn = assetItem
      .locator('[data-edit-asset]')
      .or(assetItem.locator('[data-testid="asset-edit-btn"]'));
    await editBtn.click();

    // Wait for edit modal dialog to have the 'open' attribute (native dialog API)
    const modal = this.page.locator('dialog#asset-form-modal[open]');
    await modal.waitFor({ state: 'attached', timeout: 10000 });

    // Update fields - scoped within the modal
    if (updates.name !== undefined) {
      const nameInput = modal
        .locator('[data-testid="asset-name-input"]')
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
        .locator('[data-testid="asset-category-select"]')
        .or(modal.locator('select[name="type"]'));
      await typeSelect.selectOption({ label: typeLabel });
    }

    if (updates.currency !== undefined) {
      const currencySelect = modal
        .locator('[data-testid="asset-currency-select"]')
        .or(modal.locator('select[name="currency"]'));
      await currencySelect.selectOption(updates.currency);
    }

    await this.submitAssetForm();
  }

  /**
   * Delete an asset with confirmation.
   *
   * @param assetId - The ID of the asset to delete
   */
  async deleteAsset(assetId: string): Promise<void> {
    // Find and click the delete button for this asset
    const assetItem = this.getAssetItem(assetId);
    await this.waitForVisible(assetItem);

    const deleteBtn = assetItem
      .locator('[data-delete-asset]')
      .or(assetItem.locator('[data-testid="asset-delete-btn"]'));
    await deleteBtn.click();

    // Wait for confirmation modal
    const confirmModal = this.page
      .locator(this.assetDeleteModal)
      .or(this.page.locator('#asset-delete-modal'));
    await confirmModal.waitFor({ state: 'visible' });

    // Click confirm delete button
    const confirmBtn = this.getByTestId('confirm-delete-btn').or(
      confirmModal.locator('button').filter({ hasText: /delete|confirm/i })
    );
    await confirmBtn.click();

    // Wait for modal to close and asset to be removed
    await expect(assetItem).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify that an asset with the given name exists in the list.
   *
   * @param name - The asset name to find
   */
  async expectAssetExists(name: string): Promise<void> {
    const assetItem = this.getAssetItemByName(name);
    await expect(assetItem).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify that an asset has the expected balance.
   * Uses .first() because AssetItemRow has dual mobile/desktop layouts
   * with separate balance elements sharing the same data-testid.
   *
   * @param name - The asset name
   * @param expectedBalance - The expected balance string (formatted)
   */
  async expectAssetBalance(name: string, expectedBalance: string): Promise<void> {
    const assetItem = this.getAssetItemByName(name);
    await expect(assetItem).toBeVisible();

    // Use .first() to avoid strict mode violation from dual mobile/desktop layouts
    const balanceElement = assetItem.locator('[data-testid="asset-balance"]').first();
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
      this.page.locator('[data-testid="portfolio-total-idr"] p'),
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
   * Get the asset ID by its name.
   *
   * @param name - The asset name to search for
   * @returns The asset ID or null if not found
   */
  async getAssetIdByName(name: string): Promise<string | null> {
    // Wait for at least one asset item to exist
    const assetItem = this.getAssetItemByName(name).first();

    // Wait for the element to be visible (with a reasonable timeout)
    try {
      await assetItem.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Element not found or not visible
      return null;
    }

    // Try to get from data-asset-id attribute
    const assetId = await assetItem.getAttribute('data-asset-id');
    if (assetId) {
      return assetId;
    }

    // Fallback: try data-asset-row attribute
    const rowId = await assetItem.getAttribute('data-asset-row');
    return rowId;
  }

  /**
   * Verify that the add asset button is visible.
   */
  async expectAddAssetButtonVisible(): Promise<void> {
    const addBtn = this.page
      .locator(this.addAssetBtn)
      .or(this.page.locator('[data-add-asset-btn]'));
    await expect(addBtn.first()).toBeVisible();
  }
}
