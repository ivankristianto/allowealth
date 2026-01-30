// Categories Management Client-side script
import { getCsrfHeaders } from '@/lib/csrf-client';

// Initialize when DOM is ready
function initCategories() {
  const categoryModal = document.getElementById('category-modal') as HTMLDialogElement;
  const categoryForm = document.querySelector('[data-category-form]') as HTMLFormElement;

  // Create category button handler
  document.querySelectorAll('[data-action="create-category"]').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      openCategoryModal('create');
    });
  });

  // Search form submit handler
  document.getElementById('search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const url = new URL(window.location.href);
    url.searchParams.set('search', (formData.get('search') as string) || '');
    url.searchParams.set('type', (formData.get('type') as string) || '');
    window.location.href = url.toString();
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
  function openCategoryModal(mode: 'create' | 'edit', values?: any) {
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
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCategories);
} else {
  // DOM is already loaded, run immediately
  initCategories();
}
