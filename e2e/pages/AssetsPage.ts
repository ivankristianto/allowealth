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
    // Try the add asset button (data-testid or data-add-asset-btn)
    const addBtn = this.page
      .locator(this.addAssetBtn)
      .or(this.page.locator('[data-add-asset-btn]'));
    await addBtn.first().click();

    // Wait for modal to be visible
    const modal = this.page.locator(this.assetFormModal).or(this.page.locator('#asset-form-modal'));
    await modal.waitFor({ state: 'visible' });
  }

  /**
   * Fill the asset form with provided data.
   * @param data - The asset form data
   */
  async fillAssetForm(data: AssetFormData): Promise<void> {
    // Fill asset name
    const nameInput = this.getByTestId('asset-name-input').or(
      this.page.locator('[name="name"]').first()
    );
    await nameInput.clear();
    await nameInput.fill(data.name);

    // Select asset type
    const typeSelect = this.getByTestId('asset-type-select').or(this.page.locator('[name="type"]'));
    await typeSelect.selectOption(data.type);

    // Select currency
    const currencySelect = this.getByTestId('asset-currency-select').or(
      this.page.locator('[name="currency"]')
    );
    await currencySelect.selectOption(data.currency);

    // Fill initial balance if provided
    if (data.initialBalance !== undefined) {
      const balanceInput = this.getByTestId('asset-balance-input').or(
        this.page.locator('[name="balance"]')
      );
      await balanceInput.clear();
      await balanceInput.fill(String(data.initialBalance));
    }
  }

  /**
   * Submit the asset form.
   */
  async submitAssetForm(): Promise<void> {
    const submitBtn = this.getByTestId('asset-submit-btn').or(
      this.page.locator('button[type="submit"]').first()
    );
    await submitBtn.click();

    // Wait for form to close
    await this.waitForPageLoad();
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

    // Wait for edit modal to be visible
    const modal = this.page.locator(this.assetFormModal).or(this.page.locator('#asset-form-modal'));
    await modal.waitFor({ state: 'visible' });

    // Update fields
    if (updates.name !== undefined) {
      const nameInput = this.getByTestId('asset-name-input').or(
        this.page.locator('[name="name"]').first()
      );
      await nameInput.clear();
      await nameInput.fill(updates.name);
    }

    if (updates.type !== undefined) {
      const typeSelect = this.getByTestId('asset-type-select').or(
        this.page.locator('[name="type"]')
      );
      await typeSelect.selectOption(updates.type);
    }

    if (updates.currency !== undefined) {
      const currencySelect = this.getByTestId('asset-currency-select').or(
        this.page.locator('[name="currency"]')
      );
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

    // Look for balance within the asset item
    const balanceElement = assetItem
      .locator('[data-testid="asset-balance"]')
      .or(assetItem.locator('.text-success, .text-info').first());
    await expect(balanceElement).toContainText(expectedBalance);
  }

  /**
   * Get the total portfolio value displayed on the page.
   *
   * @returns The portfolio total as a string
   */
  async getPortfolioTotal(): Promise<string> {
    const totalElement = this.page
      .locator(this.portfolioTotal)
      .or(
        this.page
          .locator('[data-summary-cards] [data-testid="portfolio-total"]')
          .or(this.page.locator('.text-success').first())
      );
    const text = await totalElement.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Get the asset ID by its name.
   *
   * @param name - The asset name to search for
   * @returns The asset ID or null if not found
   */
  async getAssetIdByName(name: string): Promise<string | null> {
    const assetItem = this.getAssetItemByName(name);
    const count = await assetItem.count();

    if (count === 0) {
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
