/**
 * Asset Categories Page Client Script
 *
 * Handles page-level interactions including:
 * - Search form submission with HTML injection
 * - Tab toggle filtering with HTML injection
 * - Create/Edit/Delete category actions
 */

import { fetchAssetCategories } from '@/lib/api/assetCategoryApiClient';
import {
  renderCategoryTableHtml,
  showLoadingState,
  hideLoadingState,
  announceToScreenReader,
} from '@/components/organisms/AssetCategoriesRenderer.client';

// Store current filter state
let currentTypeFilter: 'asset' | 'liability' = 'asset';
let currentSearchQuery = '';

// Flag to prevent duplicate initialization
let isInitialized = false;

/**
 * Get current type filter from URL or default
 */
function getTypeFilter(): 'asset' | 'liability' {
  const url = new URL(window.location.href);
  return (url.searchParams.get('type') as 'asset' | 'liability') || 'asset';
}

/**
 * Get current search query from URL
 */
function getSearchQuery(): string {
  const url = new URL(window.location.href);
  return url.searchParams.get('search') || '';
}

/**
 * Fetch and render categories based on current filters
 */
async function fetchAndRenderCategories(): Promise<void> {
  showLoadingState();

  try {
    const response = (await fetchAssetCategories(
      { type: currentTypeFilter },
      { returnHtml: true }
    )) as { html: string; partials: { table?: string } };

    hideLoadingState();

    if (response.partials.table) {
      renderCategoryTableHtml(response.partials.table);
    }
  } catch (error) {
    hideLoadingState();
    const message = error instanceof Error ? error.message : 'Failed to load categories';
    announceToScreenReader(message);
    console.error('[AssetCategoriesPage] Error fetching categories:', error);
  }
}

/**
 * Initialize the categories page
 */
function initAssetCategoriesPage(): void {
  // Prevent duplicate initialization
  if (isInitialized) {
    // Just update state from URL if re-initializing
    currentTypeFilter = getTypeFilter();
    currentSearchQuery = getSearchQuery();
    return;
  }
  isInitialized = true;

  // Initialize filter state from URL
  currentTypeFilter = getTypeFilter();
  currentSearchQuery = getSearchQuery();

  // Get modal and dialog elements
  const categoryModal = document.getElementById('asset-category-modal') as HTMLDialogElement | null;
  const categoryForm = document.querySelector(
    '[data-asset-category-form]'
  ) as HTMLFormElement | null;
  const deleteDialog = document.getElementById(
    'asset-category-delete-dialog'
  ) as HTMLDialogElement | null;

  // Modal elements
  const modalContainer = document.querySelector('[data-asset-category-modal-container]');
  const modalTitle = modalContainer?.querySelector('[data-modal-title]');
  const modalSubtitle = modalContainer?.querySelector('[data-modal-subtitle]');
  const modalSubmitText = modalContainer?.querySelector('[data-submit-text]');
  const modalErrorDiv = modalContainer?.querySelector('[data-form-error]') as HTMLElement | null;

  // Delete dialog elements
  const deleteContainer = document.querySelector('[data-asset-category-delete-dialog-container]');
  const deleteCategoryName = deleteContainer?.querySelector('[data-category-name]');
  const deleteCategoryMeta = deleteContainer?.querySelector('[data-category-meta]');
  const deleteErrorDiv = deleteContainer?.querySelector(
    '[data-confirm-error]'
  ) as HTMLElement | null;

  /**
   * Open the category modal for create or edit
   */
  function openCategoryModal(
    mode: 'create' | 'edit',
    values?: { id?: string; name?: string; description?: string; type?: 'asset' | 'liability' }
  ) {
    if (!categoryModal || !categoryForm) {
      console.error('[AssetCategoriesPage] Modal or form not found');
      return;
    }

    // Update modal title and subtitle
    if (modalTitle) {
      modalTitle.textContent = mode === 'edit' ? 'Edit Category' : 'Add Category';
    }
    if (modalSubtitle) {
      modalSubtitle.textContent =
        mode === 'edit'
          ? 'Update the category details.'
          : 'Create a new category for your assets or liabilities.';
    }
    if (modalSubmitText) {
      modalSubmitText.textContent = mode === 'edit' ? 'Update Category' : 'Save Category';
    }

    // Populate form fields
    const idInput = categoryForm.querySelector('[name="id"]') as HTMLInputElement | null;
    const nameInput = categoryForm.querySelector('[name="name"]') as HTMLInputElement | null;
    const descriptionInput = categoryForm.querySelector(
      '[name="description"]'
    ) as HTMLTextAreaElement | null;
    const typeSelect = categoryForm.querySelector('[name="type"]') as HTMLSelectElement | null;

    if (idInput) idInput.value = values?.id || '';
    if (nameInput) nameInput.value = values?.name || '';
    if (descriptionInput) descriptionInput.value = values?.description || '';
    if (typeSelect) typeSelect.value = values?.type || 'asset';

    // Update mode
    modalContainer?.setAttribute('data-mode', mode);
    modalErrorDiv?.classList.add('hidden');
    if (modalErrorDiv) modalErrorDiv.textContent = '';

    categoryModal.showModal();
  }

  /**
   * Open the delete confirmation dialog
   */
  function openDeleteDialog(categoryId: string, categoryName: string, categoryMeta: string) {
    if (!deleteDialog || !deleteContainer) {
      console.error('[AssetCategoriesPage] Delete dialog not found');
      return;
    }

    // Store category ID on container for the delete script to read
    deleteContainer.setAttribute('data-category-id', categoryId);

    if (deleteCategoryName) deleteCategoryName.textContent = categoryName;
    if (deleteCategoryMeta) deleteCategoryMeta.textContent = categoryMeta;
    deleteErrorDiv?.classList.add('hidden');
    if (deleteErrorDiv) deleteErrorDiv.textContent = '';

    deleteDialog.showModal();
  }

  // Handle search form submission
  const searchForm = document.getElementById(
    'asset-category-search-form'
  ) as HTMLFormElement | null;

  searchForm?.addEventListener('submit', async (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(searchForm);

    currentSearchQuery = (formData.get('search') as string) || '';

    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('search', currentSearchQuery);
    url.searchParams.set('type', currentTypeFilter);
    window.history.replaceState({}, '', url.toString());

    // Fetch and render with HTML injection
    await fetchAndRenderCategories();
  });

  // Handle TabToggle clicks for type filtering
  document.querySelectorAll('[name="type"][data-tab-toggle]').forEach((toggle) => {
    toggle.addEventListener('change', async (event: Event) => {
      const target = event.currentTarget as HTMLInputElement;
      const newType = target.value as 'asset' | 'liability';

      if (newType !== currentTypeFilter) {
        currentTypeFilter = newType;

        // Update URL without page reload
        const url = new URL(window.location.href);
        url.searchParams.set('type', currentTypeFilter);
        url.searchParams.set('search', currentSearchQuery);
        window.history.replaceState({}, '', url.toString());

        // Fetch and render with HTML injection
        await fetchAndRenderCategories();
      }
    });
  });

  // Create category button
  document.querySelectorAll('[data-action="create-asset-category"]').forEach((button) => {
    button.addEventListener('click', () => {
      openCategoryModal('create');
    });
  });

  // Edit category buttons - event delegation
  document.addEventListener('click', (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      '[data-action="edit-asset-category"]'
    ) as HTMLElement | null;
    if (!target) return;

    // Check if button is disabled
    if ((target as HTMLButtonElement).disabled) return;

    const categoryId = target.dataset.categoryId || '';
    if (!categoryId) return;

    openCategoryModal('edit', {
      id: categoryId,
      name: target.dataset.categoryName || '',
      description: target.dataset.categoryDescription || '',
      type: (target.dataset.categoryType as 'asset' | 'liability') || 'asset',
    });
  });

  // Delete category buttons - event delegation
  document.addEventListener('click', (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      '[data-action="delete-asset-category"]'
    ) as HTMLElement | null;
    if (!target) return;

    // Check if button is disabled
    if ((target as HTMLButtonElement).disabled) return;

    const categoryId = target.dataset.categoryId || '';
    const categoryName = target.dataset.categoryName || '';
    const categoryMeta = target.dataset.categoryMeta || '';

    if (categoryId) {
      openDeleteDialog(categoryId, categoryName, categoryMeta);
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetCategoriesPage);
} else {
  initAssetCategoriesPage();
}

// Re-initialize on Astro page navigation (will skip if already initialized)
document.addEventListener('astro:page-load', initAssetCategoriesPage);

// Export current filter state for modal access
(window as any).assetCategoriesPageState = {
  get typeFilter(): 'asset' | 'liability' {
    return currentTypeFilter;
  },
};
