import { getCsrfHeaders } from '@/lib/csrf-client';

document.addEventListener('DOMContentLoaded', () => {
  // Delete transaction handler using dialog
  let transactionToDelete: string | null = null;
  let rowToDelete: HTMLElement | null = null;

  const dialog = document.getElementById('delete-dialog') as HTMLDialogElement | null;
  const confirmDeleteBtn = document.getElementById(
    'confirm-delete-btn'
  ) as HTMLButtonElement | null;
  const detailsDiv = document.getElementById('delete-dialog-details');
  const errorDiv = document.getElementById('delete-error');

  if (!dialog || !confirmDeleteBtn || !detailsDiv || !errorDiv) return;

  // Helper function to show inline error
  function showDialogError(element: HTMLElement, message: string) {
    element.textContent = message;
    element.classList.remove('hidden');
  }

  function hideDialogError(element: HTMLElement) {
    element.classList.add('hidden');
    element.textContent = '';
  }

  // Add click handlers to delete buttons
  document.querySelectorAll<HTMLButtonElement>('[data-delete-transaction]').forEach((button) => {
    button.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const transactionId = target.getAttribute('data-delete-transaction');
      const row = target.closest('[data-transaction-row]') as HTMLElement;
      const transactionData = target.getAttribute('data-transaction-details');

      if (!transactionId || !row || !transactionData) return;

      // Parse transaction data
      let transaction: any;
      try {
        transaction = JSON.parse(transactionData);
      } catch (err) {
        console.error('Failed to parse transaction data', err);
        return;
      }

      transactionToDelete = transactionId;
      rowToDelete = row;

      // Hide any previous errors
      hideDialogError(errorDiv);

      // Populate dialog with transaction details
      const amount = parseFloat(transaction.amount) || 0;
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: transaction.currency,
      }).format(amount);

      detailsDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
          <div class="text-base-content/70">Category:</div>
          <div class="font-medium">${transaction.category.name}</div>
          <div class="text-base-content/70">Amount:</div>
          <div class="font-medium">${formattedAmount}</div>
          <div class="text-base-content/70">Date:</div>
          <div class="font-medium">${new Date(transaction.transaction_date).toLocaleDateString()}</div>
          ${
            transaction.description
              ? `
            <div class="text-base-content/70">Description:</div>
            <div class="font-medium">${transaction.description}</div>
          `
              : ''
          }
        </div>
      `;

      // Show dialog
      dialog.showModal();
    });
  });

  // Handle confirm delete button
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!transactionToDelete) return;

    // Hide any previous errors
    hideDialogError(errorDiv);

    // Disable button during request
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerHTML = '<span class="loading loading-spinner"></span> Deleting...';

    try {
      const response = await fetch(`/api/transactions/${transactionToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getCsrfHeaders(),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success toast
        if ((window as any).showToast) {
          (window as any).showToast('Transaction deleted successfully', 'success');
        }

        // Remove row from DOM with animation
        if (rowToDelete) {
          rowToDelete.style.transition = 'opacity 0.3s, transform 0.3s';
          rowToDelete.style.opacity = '0';
          rowToDelete.style.transform = 'translateX(-100%)';

          setTimeout(() => {
            if (rowToDelete) rowToDelete.remove();

            // Check if list is empty and reload if needed
            const remainingRows = document.querySelectorAll('[data-transaction-row]');
            if (remainingRows.length === 0) {
              window.location.reload();
            }
          }, 300);
        }

        // Close dialog
        dialog.close();
      } else {
        // Show inline error
        showDialogError(errorDiv, data.error?.message || 'Failed to delete transaction');
      }
    } catch (error) {
      // Show inline error
      showDialogError(errorDiv, 'Failed to delete transaction. Please try again.');
    } finally {
      // Re-enable button
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.innerHTML = 'Delete Transaction';
      transactionToDelete = null;
      rowToDelete = null;
    }
  });
});
