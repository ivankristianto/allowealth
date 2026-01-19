// Budget Overview Client-side script

const TOAST_DURATION_MS = 3000;

interface BudgetCategory {
  id: string;
  name: string;
  type?: string;
  percentage: string;
  budget_amount: string;
  currency: string;
  is_active?: boolean;
}

interface UpdateBudgetResponse {
  success: boolean;
  data?: BudgetCategory;
  error?: {
    message: string;
    code?: string;
    details?: Array<{ message: string }>;
    issues?: Array<{ message: string }>;
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return;

  const expenseCategoriesRaw = container.getAttribute('data-expense-categories');
  const expenseCategories: BudgetCategory[] = expenseCategoriesRaw
    ? JSON.parse(expenseCategoriesRaw)
    : [];

  const quickEditModal = document.getElementById('quick-edit-budget-modal') as HTMLDialogElement;
  const quickEditForm = document.getElementById('quick-edit-budget-form') as HTMLFormElement;
  const quickEditFormError = document.getElementById('quick-edit-form-error');
  const quickEditCancelBtn = document.getElementById('quick-edit-cancel-btn');
  const submitButton = quickEditForm?.querySelector('button[type="submit"]') as HTMLButtonElement;

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

  // Show loading state
  function setLoading(isLoading: boolean) {
    if (submitButton) {
      submitButton.disabled = isLoading;
      submitButton.innerHTML = isLoading
        ? '<span class="loading loading-spinner loading-sm"></span> Saving...'
        : 'Save Changes';
    }
  }

  // Update category in local data cache
  function updateCategoryInCache(updatedCategory: BudgetCategory) {
    const index = expenseCategories.findIndex((c) => c.id === updatedCategory.id);
    if (index !== -1) {
      expenseCategories[index] = updatedCategory;
      // Update the data attribute for future edits
      container?.setAttribute('data-expense-categories', JSON.stringify(expenseCategories));
    }
  }

  // Refresh the budget table by reloading the page
  function refreshBudgetData() {
    window.location.reload();
  }

  // Show toast notification
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} shadow-lg fixed top-4 right-4 z-50 max-w-sm`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        ${
          type === 'success'
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />'
        }
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Auto-remove after configured duration
    setTimeout(() => {
      toast.remove();
    }, TOAST_DURATION_MS);
  }

  // Global function to open quick edit modal
  window.quickEditBudget = (categoryId: string) => {
    const category = expenseCategories.find((c) => c.id === categoryId);
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

    setLoading(true);

    try {
      const response = await fetch(`/api/budget/category/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as UpdateBudgetResponse;

      if (!response.ok || !result.success) {
        // Handle both service error details and Zod validation issues
        if (result.error?.details) {
          showFormError(result.error.details.map((d) => d.message).join(', '));
        } else if (result.error?.issues) {
          // Handle Zod validation errors
          showFormError(result.error.issues.map((i) => i.message).join(', '));
        } else {
          showFormError(result.error?.message || 'Failed to update budget');
        }
      } else {
        // Update local cache with new data
        if (result.data) {
          updateCategoryInCache(result.data);
        }

        // Show success message
        showToast('Budget updated successfully', 'success');

        // Close modal
        resetForm();
        quickEditModal?.close();

        // Brief delay to allow toast to be visible before reload
        setTimeout(() => refreshBudgetData(), 500);
      }
    } catch (err) {
      showFormError('Network error. Please try again.');
    } finally {
      setLoading(false);
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
