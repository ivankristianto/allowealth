/**
 * Asset Categories Page Client Script
 *
 * Handles page-level interactions including:
 * - Search form submission (full page reload, SSR handles filtering)
 * - Tab toggle filtering with HTML injection
 * - Create/Edit/Delete category actions
 *
 * Pattern: matches budget/categories/categories-client.ts
 * - Event delegation for edit/delete (supports AJAX-injected rows)
 * - Fresh DOM queries at call-time (no stale closure refs)
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

// Prevent duplicate listener attachment
let listenersAttached = false;

/**
 * Get current type filter from URL or default
 */
function getTypeFilter(): 'asset' | 'liability' {
  const url = new URL(window.location.href);
  const type = url.searchParams.get('type');
  return type === 'asset' || type === 'liability' ? type : 'asset';
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
 * Open the category modal for create or edit.
 * Queries DOM elements fresh each time to avoid stale references.
 */
function openCategoryModal(
  mode: 'create' | 'edit',
  values?: { id?: string; name?: string; description?: string; type?: 'asset' | 'liability' }
): void {
  const categoryModal = document.getElementById('asset-category-modal') as HTMLDialogElement | null;
  const modalContainer = document.querySelector('[data-asset-category-modal-container]');

  if (!categoryModal || !modalContainer) return;

  const categoryForm = modalContainer.querySelector(
    '[data-asset-category-form]'
  ) as HTMLFormElement | null;
  if (!categoryForm) return;

  const modalTitle = modalContainer.querySelector('[data-modal-title]');
  const modalSubtitle = modalContainer.querySelector('[data-modal-subtitle]');
  const modalSubmitText = modalContainer.querySelector('[data-submit-text]');
  const modalErrorDiv = modalContainer.querySelector('[data-form-error]') as HTMLElement | null;

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

  const idInput = categoryForm.querySelector('[name="id"]') as HTMLInputElement | null;
  const nameInput = categoryForm.querySelector('[name="name"]') as HTMLInputElement | null;
  const descriptionInput = categoryForm.querySelector(
    '[name="description"]'
  ) as HTMLTextAreaElement | null;
  const typeSelect = categoryForm.querySelector('[name="type"]') as HTMLSelectElement | null;

  if (mode === 'create') {
    categoryForm.reset();
    if (idInput) idInput.value = '';
    if (typeSelect) typeSelect.value = currentTypeFilter;
  } else {
    if (idInput) idInput.value = values?.id || '';
    if (nameInput) nameInput.value = values?.name || '';
    if (descriptionInput) descriptionInput.value = values?.description || '';
    if (typeSelect) typeSelect.value = values?.type || 'asset';
  }

  modalContainer.setAttribute('data-mode', mode);
  modalErrorDiv?.classList.add('hidden');
  if (modalErrorDiv) modalErrorDiv.textContent = '';

  categoryModal.showModal();
}

/**
 * Open the delete confirmation dialog.
 * Queries DOM elements fresh each time to avoid stale references.
 */
function openDeleteDialog(categoryId: string, categoryName: string, categoryMeta: string): void {
  const deleteDialog = document.getElementById(
    'asset-category-delete-dialog'
  ) as HTMLDialogElement | null;
  const deleteContainer = document.querySelector('[data-asset-category-delete-dialog-container]');

  if (!deleteDialog || !deleteContainer) return;

  deleteContainer.setAttribute('data-category-id', categoryId);

  const deleteCategoryName = deleteContainer.querySelector('[data-category-name]');
  const deleteCategoryMeta = deleteContainer.querySelector('[data-category-meta]');
  const deleteErrorDiv = deleteContainer.querySelector(
    '[data-confirm-error]'
  ) as HTMLElement | null;

  if (deleteCategoryName) deleteCategoryName.textContent = categoryName;
  if (deleteCategoryMeta) deleteCategoryMeta.textContent = categoryMeta;
  deleteErrorDiv?.classList.add('hidden');
  if (deleteErrorDiv) deleteErrorDiv.textContent = '';

  deleteDialog.showModal();
}

/**
 * Initialize the categories page
 */
function initAssetCategoriesPage(): void {
  // Always update filter state from URL
  currentTypeFilter = getTypeFilter();

  // All listeners guarded — prevents duplication on astro:page-load re-init
  if (listenersAttached) return;
  listenersAttached = true;

  // Search form — full page reload (API has no search param; SSR handles filtering)
  const searchForm = document.getElementById(
    'asset-category-search-form'
  ) as HTMLFormElement | null;

  searchForm?.addEventListener('submit', (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(searchForm);
    const url = new URL(window.location.href);
    url.searchParams.set('search', (formData.get('search') as string) || '');
    url.searchParams.set('type', currentTypeFilter);
    window.location.href = url.toString();
  });

  // Tab toggle — AJAX fetch (type filter is supported by API)
  document.querySelectorAll('[name="type"][data-tab-toggle]').forEach((toggle) => {
    toggle.addEventListener('change', async (event: Event) => {
      const target = event.currentTarget as HTMLInputElement;
      const newType = target.value as 'asset' | 'liability';

      if (newType !== currentTypeFilter) {
        currentTypeFilter = newType;

        const url = new URL(window.location.href);
        url.searchParams.set('type', currentTypeFilter);
        window.history.replaceState({}, '', url.toString());

        await fetchAndRenderCategories();
      }
    });
  });

  // Create category button
  document.querySelectorAll('[data-action="create-asset-category"]').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      openCategoryModal('create');
    });
  });

  // Edit & delete — event delegation on document
  // (needed because AJAX injection replaces table rows)

  // Edit category
  document.addEventListener('click', (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest(
      '[data-action="edit-asset-category"]'
    ) as HTMLElement | null;
    if (!target) return;
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

  // Delete category
  document.addEventListener('click', (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest(
      '[data-action="delete-asset-category"]'
    ) as HTMLElement | null;
    if (!target) return;
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

// Re-initialize on Astro page navigation (updates filter state from URL)
document.addEventListener('astro:page-load', initAssetCategoriesPage);
