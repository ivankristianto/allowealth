// Categories Management Client-side script
import { getCsrfHeaders } from '@/lib/csrf-client';

document.addEventListener('DOMContentLoaded', () => {
  const categoryModal = document.getElementById('category-modal') as HTMLDialogElement;
  const categoryForm = document.getElementById('category-form') as HTMLFormElement;
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalIconContainer = document.getElementById('modal-icon-container');
  const submitBtnText = document.getElementById('submit-btn-text');
  const formError = document.getElementById('form-error');
  const deleteDialog = document.getElementById('delete-dialog') as HTMLDialogElement;
  const deleteError = document.getElementById('delete-error');
  const deleteCategoryName = document.getElementById('delete-category-name');
  const deleteCategoryType = document.getElementById('delete-category-type');
  const deleteCategoryIconContainer = document.getElementById('delete-category-icon-container');

  let currentCategoryId = '';

  // Show form error
  function showFormError(message: string) {
    if (formError) {
      formError.textContent = message;
      formError.classList.remove('hidden');
    }
  }

  // Clear form error
  function clearFormError() {
    if (formError) {
      formError.textContent = '';
      formError.classList.add('hidden');
    }
  }

  // Show dialog error
  function showDialogError(element: HTMLElement | null, message: string) {
    if (element) {
      element.textContent = message;
      element.classList.remove('hidden');
    }
  }

  // Clear dialog error
  function clearDialogError(element: HTMLElement | null) {
    if (element) {
      element.textContent = '';
      element.classList.add('hidden');
    }
  }

  // Reset form
  function resetForm() {
    categoryForm?.reset();
    const idInput = categoryForm?.querySelector('[name="id"]') as HTMLInputElement;
    if (idInput) idInput.value = '';
    if (modalTitle) modalTitle.textContent = 'Add Category';
    if (modalSubtitle) modalSubtitle.textContent = 'Create a new category for your transactions.';
    if (submitBtnText) submitBtnText.textContent = 'Save';
    if (modalIconContainer) {
      modalIconContainer.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-accent" aria-hidden="true">
          <path d="M5 12h14"></path>
          <path d="M12 5v14"></path>
        </svg>
      `;
      modalIconContainer.className =
        'w-12 h-12 rounded-2xl flex items-center justify-center bg-accent/10';
    }
    clearFormError();
  }

  // Add category button handler
  document.querySelectorAll('[onclick="categoryModal.showModal()"]').forEach((btn) => {
    const button = btn as HTMLButtonElement;
    button.removeAttribute('onclick');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      resetForm();
      categoryModal?.showModal();
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
      const id = (e.currentTarget as HTMLElement).dataset.categoryId;
      if (id) deleteCategory(id);
    });
  });

  // Edit category
  async function editCategory(id: string) {
    currentCategoryId = id;
    if (modalTitle) modalTitle.textContent = 'Edit Category';
    if (modalSubtitle) modalSubtitle.textContent = 'Update the category details.';
    if (submitBtnText) submitBtnText.textContent = 'Update';
    if (modalIconContainer) {
      modalIconContainer.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-accent" aria-hidden="true">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
          <path d="m15 5 4 4"></path>
        </svg>
      `;
      modalIconContainer.className =
        'w-12 h-12 rounded-2xl flex items-center justify-center bg-accent/10';
    }

    try {
      // Fetch category details from API
      const response = await fetch(`/api/categories/${id}`, {
        headers: getCsrfHeaders(),
      });

      if (!response.ok) {
        showFormError('Failed to load category details');
        return;
      }

      const result = await response.json();
      const category = result.data;

      const form = categoryForm;
      if (form && category) {
        (form.querySelector('[name="id"]') as HTMLInputElement).value = id;
        (form.querySelector('[name="name"]') as HTMLInputElement).value = category.name;
        (form.querySelector('[name="type"]') as HTMLSelectElement).value = category.type;
        (form.querySelector('[name="icon"]') as HTMLInputElement).value = category.icon || 'tag';
        (form.querySelector('[name="color"]') as HTMLSelectElement).value =
          category.color || 'bg-neutral';
        (form.querySelector('[name="currency"]') as HTMLSelectElement).value = category.currency;
        (form.querySelector('[name="percentage"]') as HTMLInputElement).value =
          category.percentage || '0';
        (form.querySelector('[name="budget_amount"]') as HTMLInputElement).value =
          category.budget_amount || '0';
      }

      categoryModal?.showModal();
    } catch (err) {
      showFormError('Network error. Please try again.');
    }
  }

  // Delete category
  function deleteCategory(id: string) {
    currentCategoryId = id;
    clearDialogError(deleteError);

    // Get category info from the delete button's data attributes
    const deleteBtn = document.querySelector(`[data-action="delete"][data-category-id="${id}"]`);
    if (deleteBtn) {
      const name = deleteBtn.getAttribute('data-category-name') || '';
      const color = deleteBtn.getAttribute('data-category-color') || 'bg-neutral';
      const type =
        deleteBtn
          .closest('tr')
          ?.querySelector('[class*="uppercase"]')
          ?.textContent?.toLowerCase() || 'expense';

      // Populate delete modal with category info
      if (deleteCategoryName) deleteCategoryName.textContent = name;
      if (deleteCategoryType)
        deleteCategoryType.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      if (deleteCategoryIconContainer) {
        // Create a CategoryIcon-like element
        const colorClass = color.replace('bg-', '');
        deleteCategoryIconContainer.innerHTML = `
          <div class="w-10 h-10 rounded-xl ${color} text-${colorClass}-content flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true">
              <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
              <path d="M7 7h.01"></path>
            </svg>
          </div>
        `;
      }
    }

    deleteDialog?.showModal();
  }

  // Confirm delete
  document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!currentCategoryId) return;

    try {
      const response = await fetch(`/api/categories/${currentCategoryId}`, {
        method: 'DELETE',
        headers: getCsrfHeaders(),
      });

      if (response.ok) {
        // Preserve current filters in URL
        const url = new URL(window.location.href);
        window.location.href = url.pathname + url.search;
      } else {
        const result = await response.json();
        showDialogError(deleteError, result.error?.message || 'Failed to delete category');
      }
    } catch (err) {
      showDialogError(deleteError, 'Network error. Please try again.');
    }
  });

  // Form submission
  categoryForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError();

    const formData = new FormData(categoryForm);
    const id = (formData.get('id') as string) || '';
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
      icon: formData.get('icon'),
      color: formData.get('color'),
      currency: formData.get('currency'),
      percentage: formData.get('percentage') || '0',
      budget_amount: formData.get('budget_amount') || '0',
    };

    // Validate required fields
    if (!data.name || !data.type || !data.icon || !data.color || !data.currency) {
      showFormError('Please fill in all required fields');
      return;
    }

    // Validate budget amount is a number
    if (data.budget_amount && isNaN(parseFloat(data.budget_amount as string))) {
      showFormError('Budget amount must be a valid number');
      return;
    }

    const url = id ? `/api/categories/${id}` : '/api/categories';
    const method = id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.error?.details) {
          showFormError(result.error.details.map((d: { message: string }) => d.message).join(', '));
        } else {
          showFormError(result.error?.message || 'Failed to save category');
        }
      } else {
        // Preserve current filters in URL
        const urlParams = new URL(window.location.href);
        window.location.href = urlParams.pathname + urlParams.search;
      }
    } catch (err) {
      showFormError('Network error. Please try again.');
    }
  });

  // Reset form when modal closes without saving
  categoryModal?.addEventListener('close', (e) => {
    if ((e.target as HTMLDialogElement).returnValue === '') {
      resetForm();
    }
  });
});
