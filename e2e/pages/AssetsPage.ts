import { expect } from '@playwright/test';
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
   * @param name - The asset name to search for
   */
  private getAssetItemByName(name: string) {
    return this.page.locator('[data-testid="asset-item"]', { hasText: name });
  }

  /**
   * Get the asset balance element within an asset item.
   * @param assetId - The asset ID
   */
  private getAssetBalance(assetId: string) {
    return this.getAssetItem(assetId).locator('[data-testid="asset-balance"]');
  }

  /**
   * Open the add asset modal.
   */
  async openAddAssetModal(): Promise<void> {
    // Ensure page is fully loaded before interacting
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');

    // Ensure any existing modal is closed first
    const existingModal = this.page.locator('dialog#asset-form-modal[open]');
    const isModalOpen = await existingModal.count();
    if (isModalOpen > 0) {
      // Close any open modal first
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
    }

    // Try the add asset button (data-testid or data-add-asset-btn)
    const addBtn = this.page
      .locator(this.addAssetBtn)
      .or(this.page.locator('[data-add-asset-btn]'));

    // Wait for button to be ready and stable
    await addBtn.first().waitFor({ state: 'visible', timeout: 10000 });

    // Retry logic for clicking button and opening modal
    const modal = this.page.locator('dialog#asset-form-modal[open]');
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Small delay to ensure page is stable
      await this.page.waitForTimeout(200);

      // Click the button
      await addBtn.first().click();

      // Wait for modal to be visible with shorter timeout for retries
      try {
        await modal.waitFor({ state: 'visible', timeout: 5000 });
        break; // Modal opened successfully
      } catch {
        if (attempt === maxRetries) {
          throw new Error(`Failed to open asset modal after ${maxRetries} attempts`);
        }
        // Modal didn't open, wait a bit and retry
        await this.page.waitForTimeout(300);
      }
    }

    // Wait for form to be ready inside the modal
    const nameInput = modal
      .locator('[data-testid="asset-name-input"]')
      .or(modal.locator('[name="name"]').first());
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
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
      cash: 'Cash',
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
    const typeSelect = modal
      .locator('[data-testid="asset-category-select"]')
      .or(modal.locator('select[name="type"]'));
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
   */
  async submitAssetForm(): Promise<void> {
    // Scope within the asset form modal dialog
    const modal = this.page.locator('dialog#asset-form-modal');
    const submitBtn = modal
      .locator('[data-testid="asset-submit-btn"]')
      .or(modal.locator('button[type="submit"]'));

    // Wait for submit button to be visible and stable before clicking
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Use Promise.all to handle navigation that happens after form submission
    await Promise.all([
      // Wait for navigation/reload to start
      this.page.waitForURL(/.*\/assets.*/, { timeout: 15000 }),
      submitBtn.click(),
    ]);

    // Wait for page to fully load after reload
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');

    // Ensure modal is truly closed
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
      // Modal may already be detached after reload, which is fine
    });
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

    // Wait for page to be fully stable after submission (important for sequential operations)
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
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
        cash: 'Cash',
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
      const typeSelect = modal
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
    await expect(assetItem).toBeVisible();
  }

  /**
   * Verify that an asset has the expected balance.
   *
   * @param name - The asset name
   * @param expectedBalance - The expected balance string (formatted)
   */
  async expectAssetBalance(name: string, expectedBalance: string): Promise<void> {
    const assetItem = this.getAssetItemByName(name);
    await expect(assetItem).toBeVisible();

    // Look for balance within the asset item using the data-testid
    const balanceElement = assetItem.locator('[data-testid="asset-balance"]');
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
