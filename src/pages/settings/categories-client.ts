// Categories Management Client-side script

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-categories-container]');
  if (!container) return;

  const allCategoriesRaw = container.getAttribute('data-categories');
  const categories = allCategoriesRaw ? JSON.parse(allCategoriesRaw) : [];

  // Handle hash-based deep linking for editing
  function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#edit-')) {
      const categoryId = hash.replace('#edit-', '');
      const category = categories.find((c: any) => c.id === categoryId);
      if (category && (window as any).editCategory) {
        (window as any).editCategory(categoryId);
      }
    }
  }

  const categoryModal = document.getElementById('category-modal') as HTMLDialogElement;
  const categoryForm = document.getElementById('category-form') as HTMLFormElement;
  const modalTitle = document.getElementById('modal-title');
  const formError = document.getElementById('form-error');
  const deactivateDialog = document.getElementById('deactivate-dialog') as HTMLDialogElement;
  const deactivateError = document.getElementById('deactivate-error');
  const activateDialog = document.getElementById('activate-dialog') as HTMLDialogElement;
  const activateError = document.getElementById('activate-error');

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
    clearFormError();
  }

  // Add category button handler - use event delegation or direct selection
  document.querySelectorAll('[onclick="categoryModal.showModal()"]').forEach((btn) => {
    const button = btn as HTMLButtonElement;
    // Remove the onclick attribute to use our listener
    button.removeAttribute('onclick');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      resetForm();
      categoryModal?.showModal();
    });
  });

  // Edit category
  (window as any).editCategory = (id: string) => {
    const category = categories.find((c: any) => c.id === id);
    if (!category) return;

    currentCategoryId = id;
    if (modalTitle) modalTitle.textContent = 'Edit Category';

    const form = categoryForm;
    if (form) {
      (form.querySelector('[name="id"]') as HTMLInputElement).value = id;
      (form.querySelector('[name="name"]') as HTMLInputElement).value = category.name;
      (form.querySelector('[name="type"]') as HTMLSelectElement).value = category.type;
      (form.querySelector('[name="currency"]') as HTMLSelectElement).value = category.currency;
      (form.querySelector('[name="percentage"]') as HTMLInputElement).value = category.percentage;
      (form.querySelector('[name="budget_amount"]') as HTMLInputElement).value =
        category.budget_amount;
    }

    categoryModal?.showModal();
  };

  // Deactivate category
  (window as any).deactivateCategory = (id: string) => {
    currentCategoryId = id;
    clearDialogError(deactivateError);
    deactivateDialog?.showModal();
  };

  // Activate category
  (window as any).activateCategory = (id: string) => {
    currentCategoryId = id;
    clearDialogError(activateError);
    activateDialog?.showModal();
  };

  // Confirm deactivate
  document.getElementById('confirm-deactivate-btn')?.addEventListener('click', async () => {
    if (!currentCategoryId) return;

    try {
      const response = await fetch(`/api/categories/${currentCategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      if (response.ok) {
        window.location.href = '/settings/categories';
      } else {
        const result = await response.json();
        showDialogError(deactivateError, result.error?.message || 'Failed to deactivate category');
      }
    } catch (err) {
      showDialogError(deactivateError, 'Network error. Please try again.');
    }
  });

  // Confirm activate
  document.getElementById('confirm-activate-btn')?.addEventListener('click', async () => {
    if (!currentCategoryId) return;

    try {
      const response = await fetch(`/api/categories/${currentCategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });

      if (response.ok) {
        window.location.href = '/settings/categories';
      } else {
        const result = await response.json();
        showDialogError(activateError, result.error?.message || 'Failed to activate category');
      }
    } catch (err) {
      showDialogError(activateError, 'Network error. Please try again.');
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
      currency: formData.get('currency'),
      percentage: parseFloat(formData.get('percentage') as string),
      budget_amount: formData.get('budget_amount'),
    };

    // Validate budget amount is a number
    if (isNaN(parseFloat(data.budget_amount as string))) {
      showFormError('Budget amount must be a valid number');
      return;
    }

    const url = id ? `/api/categories/${id}` : '/api/categories';
    const method = id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
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
        window.location.href = '/settings/categories';
      }
    } catch (err) {
      showFormError('Network error. Please try again.');
    }
  });

  // Reset form when modal closes without saving
  categoryModal?.addEventListener('close', (e) => {
    // Only reset if the close was triggered by the backdrop or cancel button
    if ((e.target as HTMLDialogElement).returnValue === '') {
      resetForm();
    }
  });

  // Check for hash on page load for deep linking
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
});
