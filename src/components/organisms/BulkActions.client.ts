/**
 * Bulk Actions Client Controller
 *
 * Handles selection UI, select-all behavior, action bar visibility, and bulk API actions.
 */

import {
  selectedTransactionIds,
  selectedCount,
  hasSelection,
  toggleSelection,
  selectAll,
  clearSelection,
  getSelectedIds,
} from '@/lib/stores/transactionSelectionStore';
import { bulkTransactionAction } from '@/lib/api/transactionsApiClient';
import { addToast } from '@/lib/stores/toastStore';
import {
  clearConfirmError,
  closeConfirmationModal,
  setConfirmLoading,
  showConfirmError,
} from '@/components/molecules/ConfirmationModal.client';
import { invalidateAllCache } from '@/lib/stores/transactionsDataStore';

type BulkActionType = 'update_category' | 'update_account' | 'delete';

interface BulkActionRequest {
  action: BulkActionType;
  ids: string[];
  payload?: { category_id?: string; account_id?: string };
}

let onBulkActionComplete: (() => Promise<void>) | null = null;

/**
 * Register callback called after successful bulk actions.
 */
export function setOnBulkActionComplete(callback: () => Promise<void>): void {
  onBulkActionComplete = callback;
}

/**
 * Initialize bulk selection/action listeners.
 */
export function initBulkActions(signal: AbortSignal): void {
  document.addEventListener(
    'change',
    (event) => {
      const target = event.target as HTMLElement;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.matches('[data-bulk-select]')) {
        const id = target.getAttribute('data-bulk-select');
        if (id) {
          toggleSelection(id);
          syncCheckboxUI();
        }
        return;
      }

      if (target.matches('[data-bulk-select-all]')) {
        if (target.checked) {
          const allIds = Array.from(
            document.querySelectorAll<HTMLInputElement>('[data-bulk-select]')
          )
            .map((checkbox) => checkbox.getAttribute('data-bulk-select'))
            .filter((id): id is string => Boolean(id));
          selectAll(Array.from(new Set(allIds)));
        } else {
          clearSelection();
        }
        syncCheckboxUI();
      }
    },
    { signal }
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;

      if (target.closest('[data-bulk-clear]')) {
        clearSelection();
        syncCheckboxUI();
        return;
      }

      const actionButton = target.closest('[data-bulk-action]') as HTMLElement | null;
      if (!actionButton) return;

      const action = actionButton.getAttribute('data-bulk-action') as BulkActionType | null;
      const value = actionButton.getAttribute('data-bulk-value');
      if (!action) return;
      void handleBulkAction(action, value);
    },
    { signal }
  );

  const unsubscribeSelection = hasSelection.subscribe((selected) => {
    const actionBar = document.getElementById('bulk-action-bar');
    if (actionBar) {
      actionBar.classList.toggle('hidden', !selected);
    }
  });

  const unsubscribeCount = selectedCount.subscribe((count) => {
    const selectedCountElement = document.querySelector('[data-bulk-selected-count]');
    if (selectedCountElement) {
      selectedCountElement.textContent = `${count} selected`;
    }

    const selectAllCountElement = document.querySelector('[data-bulk-select-count]');
    if (selectAllCountElement) {
      selectAllCountElement.textContent = count > 0 ? `${count} selected` : 'Select all';
    }
  });

  signal.addEventListener('abort', () => {
    unsubscribeSelection();
    unsubscribeCount();
    clearSelection();
  });

  syncCheckboxUI();
}

/**
 * Initialize bulk delete confirmation behavior.
 */
export function initBulkDeleteConfirmation(signal: AbortSignal): void {
  const dialog = document.getElementById('bulk-delete-dialog') as HTMLDialogElement | null;
  if (!dialog) return;

  const confirmButton = dialog.querySelector('[data-confirm-action]') as HTMLButtonElement | null;
  const cancelButton = dialog.querySelector('[data-confirm-cancel]') as HTMLButtonElement | null;
  const errorElement = dialog.querySelector('[data-confirm-error]') as HTMLElement | null;

  confirmButton?.addEventListener(
    'click',
    async () => {
      const ids = getSelectedIds();
      if (ids.length === 0) return;

      setConfirmLoading(confirmButton, true);
      clearConfirmError(errorElement);

      try {
        await executeBulkAction({ action: 'delete', ids });
        closeConfirmationModal(dialog);
      } catch (error) {
        showConfirmError(
          errorElement,
          error instanceof Error ? error.message : 'Failed to delete transactions'
        );
      } finally {
        setConfirmLoading(confirmButton, false);
      }
    },
    { signal }
  );

  cancelButton?.addEventListener(
    'click',
    () => {
      clearConfirmError(errorElement);
      closeConfirmationModal(dialog);
    },
    { signal }
  );
}

/**
 * Sync checkbox UI state with current store selection.
 */
export function syncCheckboxUI(): void {
  const selected = selectedTransactionIds.get();
  const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('[data-bulk-select]'));

  checkboxes.forEach((checkbox) => {
    const id = checkbox.getAttribute('data-bulk-select');
    checkbox.checked = Boolean(id && selected.has(id));
  });

  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-bulk-select-all]');
  if (!selectAllCheckbox) return;

  const uniqueIds = Array.from(
    new Set(
      checkboxes
        .map((checkbox) => checkbox.getAttribute('data-bulk-select'))
        .filter((id): id is string => Boolean(id))
    )
  );

  if (uniqueIds.length === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    return;
  }

  const selectedUniqueCount = uniqueIds.filter((id) => selected.has(id)).length;
  const allChecked = selectedUniqueCount === uniqueIds.length;
  const someChecked = selectedUniqueCount > 0 && !allChecked;

  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = someChecked;
}

async function handleBulkAction(action: BulkActionType, value: string | null): Promise<void> {
  const ids = getSelectedIds();
  if (ids.length === 0) return;

  if (action === 'delete') {
    showBulkDeleteConfirmation(ids.length);
    return;
  }

  try {
    if (action === 'update_category' && value) {
      await executeBulkAction({
        action: 'update_category',
        ids,
        payload: { category_id: value },
      });
      return;
    }

    if (action === 'update_account' && value) {
      await executeBulkAction({
        action: 'update_account',
        ids,
        payload: { account_id: value },
      });
    }
  } catch {
    // executeBulkAction already handles toast notification.
  }
}

function showBulkDeleteConfirmation(count: number): void {
  const dialog = document.getElementById('bulk-delete-dialog') as HTMLDialogElement | null;
  if (!dialog) return;

  const details = document.getElementById('bulk-delete-dialog-details');
  if (details) {
    details.textContent = `Are you sure you want to delete ${count} transaction${count !== 1 ? 's' : ''}? This action cannot be undone.`;
  }

  const errorElement = dialog.querySelector('[data-confirm-error]') as HTMLElement | null;
  clearConfirmError(errorElement);
  dialog.showModal();
}

async function executeBulkAction(payload: BulkActionRequest): Promise<void> {
  try {
    const result = await bulkTransactionAction(payload);

    const actionLabel =
      payload.action === 'delete'
        ? 'deleted'
        : payload.action === 'update_category'
          ? 'recategorized'
          : 'updated';

    if (result.failed === 0) {
      addToast(
        `${result.updated} transaction${result.updated === 1 ? '' : 's'} ${actionLabel}`,
        'success'
      );
    } else {
      addToast(
        `${result.updated} ${actionLabel}, ${result.failed} failed`,
        result.updated > 0 ? 'warning' : 'error'
      );
    }

    clearSelection();
    syncCheckboxUI();
    invalidateAllCache();

    if (onBulkActionComplete) {
      await onBulkActionComplete();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bulk operation failed';
    addToast(message, 'error');
    throw error instanceof Error ? error : new Error(message);
  }
}
