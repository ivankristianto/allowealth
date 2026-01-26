// Payment Methods Management Client-side script
import { getCsrfHeaders } from '@/lib/csrf-client';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-methods-container]');
  if (!container) return;

  const allMethodsRaw = container.getAttribute('data-methods');
  const methods = allMethodsRaw ? JSON.parse(allMethodsRaw) : [];

  const methodModal = document.getElementById('method-modal') as HTMLDialogElement;
  const methodForm = document.getElementById('method-form') as HTMLFormElement;
  const modalTitle = document.getElementById('modal-title');
  const formError = document.getElementById('form-error');
  const deactivateDialog = document.getElementById('deactivate-dialog') as HTMLDialogElement;
  const deactivateError = document.getElementById('deactivate-error');
  const activateDialog = document.getElementById('activate-dialog') as HTMLDialogElement;
  const activateError = document.getElementById('activate-error');

  let currentMethodId = '';

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
    methodForm?.reset();
    const idInput = methodForm?.querySelector('[name="id"]') as HTMLInputElement;
    if (idInput) idInput.value = '';
    if (modalTitle) modalTitle.textContent = 'Add Payment Method';
    clearFormError();
  }

  // Add method button handler
  document.querySelectorAll('[onclick="methodModal.showModal()"]').forEach((btn) => {
    const button = btn as HTMLButtonElement;
    button.removeAttribute('onclick');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      resetForm();
      methodModal?.showModal();
    });
  });

  // Edit method
  (window as any).editMethod = (id: string) => {
    const method = methods.find((m: any) => m.id === id);
    if (!method) return;

    currentMethodId = id;
    if (modalTitle) modalTitle.textContent = 'Edit Payment Method';

    const form = methodForm;
    if (form) {
      (form.querySelector('[name="id"]') as HTMLInputElement).value = id;
      (form.querySelector('[name="name"]') as HTMLInputElement).value = method.name;
      (form.querySelector('[name="type"]') as HTMLSelectElement).value = method.type;
    }

    methodModal?.showModal();
  };

  // Deactivate method
  (window as any).deactivateMethod = (id: string) => {
    currentMethodId = id;
    clearDialogError(deactivateError);
    deactivateDialog?.showModal();
  };

  // Activate method
  (window as any).activateMethod = (id: string) => {
    currentMethodId = id;
    clearDialogError(activateError);
    activateDialog?.showModal();
  };

  // Confirm deactivate
  document.getElementById('confirm-deactivate-btn')?.addEventListener('click', async () => {
    if (!currentMethodId) return;

    try {
      const response = await fetch(`/api/payment-methods/${currentMethodId}`, {
        method: 'PUT',
        headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_active: false }),
      });

      if (response.ok) {
        window.location.href = '/settings/payment-methods';
      } else {
        const result = await response.json();
        showDialogError(
          deactivateError,
          result.error?.message || 'Failed to deactivate payment method'
        );
      }
    } catch (err) {
      showDialogError(deactivateError, 'Network error. Please try again.');
    }
  });

  // Confirm activate
  document.getElementById('confirm-activate-btn')?.addEventListener('click', async () => {
    if (!currentMethodId) return;

    try {
      const response = await fetch(`/api/payment-methods/${currentMethodId}`, {
        method: 'PUT',
        headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_active: true }),
      });

      if (response.ok) {
        window.location.href = '/settings/payment-methods';
      } else {
        const result = await response.json();
        showDialogError(
          activateError,
          result.error?.message || 'Failed to activate payment method'
        );
      }
    } catch (err) {
      showDialogError(activateError, 'Network error. Please try again.');
    }
  });

  // Form submission
  methodForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError();

    const formData = new FormData(methodForm);
    const id = (formData.get('id') as string) || '';
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
    };

    const url = id ? `/api/payment-methods/${id}` : '/api/payment-methods';
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
          showFormError(result.error?.message || 'Failed to save payment method');
        }
      } else {
        window.location.href = '/settings/payment-methods';
      }
    } catch (err) {
      showFormError('Network error. Please try again.');
    }
  });

  // Reset form when modal closes without saving
  methodModal?.addEventListener('close', (e) => {
    // Only reset if the close was triggered by the backdrop or cancel button
    if ((e.target as HTMLDialogElement).returnValue === '') {
      resetForm();
    }
  });
});
