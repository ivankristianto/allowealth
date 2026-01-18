// Budget Overview Client-side script

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return;

  const expenseCategoriesRaw = container.getAttribute('data-expense-categories');
  const expenseCategories = expenseCategoriesRaw ? JSON.parse(expenseCategoriesRaw) : [];

  const quickEditModal = document.getElementById('quick-edit-budget-modal') as HTMLDialogElement;
  const quickEditForm = document.getElementById('quick-edit-budget-form') as HTMLFormElement;
  const quickEditFormError = document.getElementById('quick-edit-form-error');
  const quickEditCancelBtn = document.getElementById('quick-edit-cancel-btn');

  // Show form error
  function showFormError(message: string) {
    if (quickEditFormError) {
      quickEditFormError.textContent = message;
      quickEditFormError.classList.remove('hidden');
    }
  }

  // Clear form error
  function clearFormError() {
    if (quickEditFormError) {
      quickEditFormError.textContent = '';
      quickEditFormError.classList.add('hidden');
    }
  }

  // Reset form
  function resetForm() {
    quickEditForm?.reset();
    const categoryIdInput = quickEditForm?.querySelector(
      '[name="category_id"]'
    ) as HTMLInputElement;
    if (categoryIdInput) categoryIdInput.value = '';
    clearFormError();
  }

  // Global function to open quick edit modal
  (window as any).quickEditBudget = (categoryId: string) => {
    const category = expenseCategories.find((c: any) => c.id === categoryId);
    if (!category) {
      console.error('Category not found:', categoryId);
      return;
    }

    const form = quickEditForm;
    if (form) {
      (form.querySelector('[name="category_id"]') as HTMLInputElement).value = category.id;
      (form.querySelector('[name="category-name"]') as HTMLInputElement).value = category.name;
      (form.querySelector('[name="percentage"]') as HTMLInputElement).value = category.percentage;
      (form.querySelector('[name="budget_amount"]') as HTMLInputElement).value =
        category.budget_amount;
      (form.querySelector('[name="currency"]') as HTMLInputElement).value = category.currency;
    }

    clearFormError();
    quickEditModal?.showModal();
  };

  // Form submission
  quickEditForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError();

    const formData = new FormData(quickEditForm);
    const categoryId = formData.get('category_id') as string;

    if (!categoryId) {
      showFormError('Category ID is missing');
      return;
    }

    // Get values as strings (API expects strings for decimal precision)
    const percentageStr = formData.get('percentage') as string;
    const budgetAmountStr = formData.get('budget_amount') as string;

    // Validate percentage (parse as number for validation, but send as string)
    const percentageNum = parseFloat(percentageStr);
    if (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100) {
      showFormError('Percentage must be between 0 and 100');
      return;
    }

    // Validate budget amount (parse as number for validation, but send as string)
    const budgetAmountNum = parseFloat(budgetAmountStr);
    if (isNaN(budgetAmountNum) || budgetAmountNum < 0) {
      showFormError('Budget amount must be a valid positive number');
      return;
    }

    const data = {
      percentage: percentageStr,
      budget_amount: budgetAmountStr,
    };

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.error?.details) {
          showFormError(result.error.details.map((d: { message: string }) => d.message).join(', '));
        } else {
          showFormError(result.error?.message || 'Failed to update budget');
        }
      } else {
        // Refresh the page to show updated budget
        window.location.reload();
      }
    } catch (err) {
      showFormError('Network error. Please try again.');
    }
  });

  // Cancel button handler
  quickEditCancelBtn?.addEventListener('click', () => {
    resetForm();
    quickEditModal?.close();
  });

  // Reset form when modal closes without saving
  quickEditModal?.addEventListener('close', (e) => {
    // Only reset if the close was triggered by the backdrop or cancel button
    if ((e.target as HTMLDialogElement).returnValue === '') {
      resetForm();
    }
  });
});
