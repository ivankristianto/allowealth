import { getCsrfHeaders } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';

document.addEventListener('DOMContentLoaded', () => {
  // Delete transaction handler using DeleteConfirmationModal
  let transactionToDelete: string | null = null;
  let rowToDelete: HTMLElement | null = null;

  const modalContainer = document.querySelector(
    '[data-delete-confirmation-modal][data-id="delete-transaction-modal"]'
  );
  const modal = document.getElementById('delete-transaction-modal') as HTMLDialogElement | null;
  const confirmDeleteBtn = modalContainer?.querySelector(
    '[data-confirm-delete]'
  ) as HTMLButtonElement | null;
  const detailsDiv = modalContainer?.querySelector('[data-delete-details]') as HTMLElement | null;
  const errorDiv = modalContainer?.querySelector('[data-delete-error]') as HTMLElement | null;

  if (!modal || !confirmDeleteBtn) return;

  // Helper function to show inline error
  function showDialogError(element: HTMLElement | null, message: string) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('hidden');
  }

  function hideDialogError(element: HTMLElement | null) {
    if (!element) return;
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

      // Populate details section with transaction info (using DOM methods to prevent XSS)
      if (detailsDiv) {
        const amount = parseFloat(transaction.amount) || 0;
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: transaction.currency,
        }).format(amount);

        // Clear existing content
        detailsDiv.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-2';

        // Helper to add rows safely using textContent
        const addRow = (label: string, value: string) => {
          const labelDiv = document.createElement('div');
          labelDiv.className = 'text-base-content/70';
          labelDiv.textContent = label;
          grid.appendChild(labelDiv);

          const valueDiv = document.createElement('div');
          valueDiv.className = 'font-medium';
          valueDiv.textContent = value;
          grid.appendChild(valueDiv);
        };

        addRow('Category:', transaction.category?.name || 'Unknown');
        addRow('Amount:', formattedAmount);
        addRow('Date:', new Date(transaction.transaction_date).toLocaleDateString());
        if (transaction.description) {
          addRow('Description:', transaction.description);
        }

        detailsDiv.appendChild(grid);
        detailsDiv.classList.remove('hidden');
      }

      // Show modal using modal-open class (triggers animations)
      modal.classList.add('modal-open');
    });
  });

  // Handle confirm delete button
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!transactionToDelete) return;

    // Hide any previous errors
    hideDialogError(errorDiv);

    // Disable button during request
    confirmDeleteBtn.disabled = true;
    const originalText = confirmDeleteBtn.textContent || 'Delete';
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
        addToast('Transaction deleted successfully', 'success');

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

        // Close modal using CSS class for consistency with Modal.astro pattern
        modal.classList.remove('modal-open');
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
      confirmDeleteBtn.textContent = originalText;
      transactionToDelete = null;
      rowToDelete = null;
    }
  });
});
