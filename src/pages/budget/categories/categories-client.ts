// Categories Management Client-side script
import { getCsrfHeaders } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
import { navigate } from 'astro:transitions/client';

// Initialize when DOM is ready
function initCategories() {
  const categoryModal = document.getElementById('category-modal') as HTMLDialogElement;
  const categoryForm = document.querySelector('[data-category-form]') as HTMLFormElement;

  // Create category button handler
  document.querySelectorAll('[data-action="create-category"]').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const currentType = (btn as HTMLElement).dataset.type as 'expense' | 'income' | undefined;
      openCategoryModal('create', undefined, currentType);
    });
  });

  // Bulk add categories handler
  initBulkAddModal();

  // Search form submit handler
  document.getElementById('search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const url = new URL(window.location.href);
    url.searchParams.set('search', (formData.get('search') as string) || '');
    url.searchParams.set('type', (formData.get('type') as string) || '');
    navigate(url.toString());
  });

  // Event delegation for edit buttons
  document.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      const id = (e.currentTarget as HTMLElement).dataset.categoryId;
      if (id) editCategory(id);
    });
  });

  // Event delegation for delete buttons
  document.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      const id = target.dataset.categoryId;
      const name = target.dataset.categoryName || '';
      const icon = target.dataset.categoryIcon || '';
      const color = target.dataset.categoryColor || 'bg-neutral';

      if (id) {
        // Use the global function exposed by CategoryDeleteDialog
        if (typeof (window as any).openDeleteCategoryDialog === 'function') {
          (window as any).openDeleteCategoryDialog(id, name, icon, color);
        }
      }
    });
  });

  // Open category modal
  function openCategoryModal(
    mode: 'create' | 'edit',
    values?: any,
    defaultType?: 'expense' | 'income'
  ) {
    if (!categoryModal || !categoryForm) return;

    // Update modal mode in container
    const container = document.querySelector('[data-category-modal-container]');
    if (container) {
      container.setAttribute('data-mode', mode);
    }

    // Update modal title and subtitle
    const modalTitle = document.querySelector('[data-modal-title]');
    const modalSubtitle = document.querySelector('[data-modal-subtitle]');
    const modalIconContainer = document.querySelector('[data-modal-icon-container]');
    const submitText = document.querySelector('[data-submit-text]');

    if (mode === 'create') {
      if (modalTitle) modalTitle.textContent = 'Add Category';
      if (modalSubtitle) modalSubtitle.textContent = 'Create a new category for your transactions.';
      if (submitText) submitText.textContent = 'Save Category';

      // Reset form
      categoryForm.reset();
      const idInput = categoryForm.querySelector('[name="id"]') as HTMLInputElement;
      if (idInput) idInput.value = '';

      // Auto-select type based on current tab
      if (defaultType) {
        const typeSelect = categoryForm.querySelector('[name="type"]') as HTMLSelectElement;
        if (typeSelect) {
          typeSelect.value = defaultType;
          typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Update icon to Plus
      if (modalIconContainer) {
        modalIconContainer.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-accent" aria-hidden="true">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
        `;
      }
    } else if (mode === 'edit' && values) {
      if (modalTitle) modalTitle.textContent = 'Edit Category';
      if (modalSubtitle) modalSubtitle.textContent = 'Update the category details.';
      if (submitText) submitText.textContent = 'Update Category';

      // Populate form with values
      (categoryForm.querySelector('[name="id"]') as HTMLInputElement).value = values.id || '';
      (categoryForm.querySelector('[name="name"]') as HTMLInputElement).value = values.name || '';
      (categoryForm.querySelector('[name="description"]') as HTMLInputElement).value =
        values.description || '';
      (categoryForm.querySelector('[name="type"]') as HTMLSelectElement).value =
        values.type || 'expense';

      const iconSelect = categoryForm.querySelector('[name="icon"]') as HTMLSelectElement;
      const colorSelect = categoryForm.querySelector('[name="color"]') as HTMLSelectElement;

      iconSelect.value = values.icon || 'tag';
      colorSelect.value = values.color || 'bg-neutral';

      // Trigger change event to update icon preview
      colorSelect.dispatchEvent(new Event('change', { bubbles: true }));

      // Update icon to Pencil
      if (modalIconContainer) {
        modalIconContainer.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-accent" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
            <path d="m15 5 4 4"></path>
          </svg>
        `;
      }
    }

    // Open modal with animation
    categoryModal.showModal();
  }

  // Edit category
  async function editCategory(id: string) {
    try {
      // Fetch category details from API
      const response = await fetch(`/api/categories/${id}`, {
        headers: getCsrfHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to load category details');
        return;
      }

      const result = await response.json();
      const category = result.data;

      if (category) {
        openCategoryModal('edit', {
          id: id,
          name: category.name,
          type: category.type,
          description: category.description,
          icon: category.icon,
          color: category.color,
        });
      }
    } catch (err) {
      console.error('Network error:', err);
    }
  }

  // Bulk Add Modal logic
  function initBulkAddModal() {
    const bulkModal = document.getElementById('bulk-add-modal') as HTMLDialogElement;
    const textarea = document.getElementById('bulk-categories-input') as HTMLTextAreaElement;
    const previewContainer = document.getElementById('bulk-preview');
    const previewTags = document.querySelector('[data-bulk-preview-tags]');
    const countEl = document.querySelector('[data-bulk-count]');
    const errorDiv = document.getElementById('bulk-error');
    const submitBtn = document.querySelector('[data-bulk-submit]') as HTMLButtonElement;
    const submitText = document.querySelector('[data-bulk-submit-text]');
    const cancelBtn = document.querySelector('[data-bulk-cancel]');
    const typeLabel = document.querySelector('[data-bulk-type-label]');

    if (!bulkModal || !textarea) return;

    let bulkType: 'expense' | 'income' = 'expense';

    // Open bulk modal
    document.querySelectorAll('[data-action="bulk-add-categories"]').forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        bulkType = ((btn as HTMLElement).dataset.type as 'expense' | 'income') || 'expense';
        if (typeLabel) typeLabel.textContent = bulkType;
        textarea.value = '';
        if (previewContainer) previewContainer.classList.add('hidden');
        if (errorDiv) {
          errorDiv.textContent = '';
          errorDiv.classList.add('hidden');
        }
        bulkModal.showModal();
      });
    });

    // Update preview on input
    textarea.addEventListener('input', () => {
      const names = textarea.value
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length >= 3);

      if (names.length > 0 && previewContainer && previewTags && countEl) {
        previewContainer.classList.remove('hidden');
        countEl.textContent = String(names.length);
        previewTags.replaceChildren(
          ...names.map((name) => {
            const span = document.createElement('span');
            span.className =
              'px-3 py-1 bg-base-200 rounded-full text-xs font-medium text-base-content';
            span.textContent = name;
            return span;
          })
        );
      } else if (previewContainer) {
        previewContainer.classList.add('hidden');
      }
    });

    // Cancel
    cancelBtn?.addEventListener('click', () => {
      bulkModal.close();
    });

    // Submit
    submitBtn?.addEventListener('click', async () => {
      const names = textarea.value
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length >= 3);

      if (names.length === 0) {
        if (errorDiv) {
          errorDiv.textContent =
            'Please enter at least one category name (min 3 characters per name).';
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
      }

      submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Creating...';

      const defaultIcon = bulkType === 'expense' ? 'tag' : 'banknote';
      let successCount = 0;
      const errors: string[] = [];

      for (const name of names) {
        try {
          const response = await fetch('/api/categories', {
            method: 'POST',
            headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              name,
              type: bulkType,
              icon: defaultIcon,
              color: 'bg-primary',
              description: null,
            }),
          });

          const result = await response.json();
          if (response.ok && result.success) {
            successCount++;
          } else {
            const msg = result.error?.message || `Failed to create "${name}"`;
            errors.push(msg);
          }
        } catch {
          errors.push(`Network error creating "${name}"`);
        }
      }

      submitBtn.disabled = false;
      if (submitText) submitText.textContent = 'Create Categories';

      if (errors.length === 0 && successCount > 0) {
        // Full success — close and reload
        addToast(`${successCount} categories created successfully!`, 'success');
        bulkModal.close();
        const urlParams = new URL(window.location.href);
        navigate(urlParams.pathname + urlParams.search);
      } else if (errors.length > 0) {
        // Partial or full failure — keep modal open so user can retry
        if (successCount > 0) {
          addToast(`${successCount} created, ${errors.length} failed`, 'warning');
        }
        if (errorDiv) {
          errorDiv.textContent = errors.join('; ');
          errorDiv.classList.remove('hidden');
        }
      }
    });
  }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCategories);
} else {
  // DOM is already loaded, run immediately
  initCategories();
}
