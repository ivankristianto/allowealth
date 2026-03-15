import { getCsrfHeaders } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
import {
  attachAmountFormatter,
  stripAmountFormatting,
  formatAmountForDisplay,
} from '@/lib/formatting/amount-input';
import { formatCurrency } from '@/lib/formatting/currency-client';
import { DEFAULT_CURRENCY, isValidCurrency, type Currency } from '@/lib/constants/currency';
import { getCurrentDateISO } from '@/lib/utils/date';
import {
  clearConfirmError,
  closeConfirmationModal,
  setConfirmLoading,
  showConfirmError,
} from '@/components/molecules/ConfirmationModal.client';

interface RecurringOccurrenceLike {
  id: string;
  due_date: string;
  templateName: string;
  templateAmount: string;
  currency: string;
  category: { id: string; name: string };
  account: { id: string; name: string };
}

let controller: AbortController | null = null;
let lastFocusedElement: HTMLElement | null = null;
let pendingSkipOccurrence: RecurringOccurrenceLike | null = null;
let confirmAmountFormatter: ReturnType<typeof attachAmountFormatter> | null = null;
let confirmAmountInput: HTMLInputElement | null = null;
let confirmAmountInputHandler: ((event: Event) => void) | null = null;
let confirmCurrency: Currency = DEFAULT_CURRENCY;

function currentDateIso(): string {
  return getCurrentDateISO();
}

function isOccurrenceActionable(occurrence: RecurringOccurrenceLike): boolean {
  return occurrence.due_date <= currentDateIso();
}

function formatDueDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const parseApiError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data?.error?.message || data?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

function showDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
}

function openConfirmModal(occurrence: RecurringOccurrenceLike, trigger?: HTMLElement | null): void {
  const modal = document.getElementById('recurring-confirm-modal') as HTMLDialogElement | null;
  const form = document.getElementById('recurring-confirm-form') as HTMLFormElement | null;
  if (!modal || !form) return;

  lastFocusedElement = trigger ?? (document.activeElement as HTMLElement | null);

  const title = form.querySelector('[data-modal-title]') as HTMLElement | null;
  const subtitle = form.querySelector('[data-modal-subtitle]') as HTMLElement | null;
  const idInput = form.querySelector('input[name="occurrence_id"]') as HTMLInputElement | null;
  const amountInput = form.querySelector('input[name="amount"]') as HTMLInputElement | null;
  const dateInput = form.querySelector('input[name="transaction_date"]') as HTMLInputElement | null;
  const categorySelect = form.querySelector(
    'select[name="category_id"]'
  ) as HTMLSelectElement | null;
  const accountSelect = form.querySelector('select[name="account_id"]') as HTMLSelectElement | null;
  const originalAmount = form.querySelector('[data-original-amount]') as HTMLElement | null;

  if (title) title.textContent = `Confirm ${occurrence.templateName}`;
  if (subtitle) subtitle.textContent = `Due on ${formatDueDateLabel(occurrence.due_date)}`;
  if (idInput) idInput.value = occurrence.id;
  if (dateInput) {
    dateInput.value = occurrence.due_date;
    dateInput.max = currentDateIso();
  }
  if (categorySelect) categorySelect.value = occurrence.category.id;
  if (accountSelect) accountSelect.value = occurrence.account.id;

  confirmCurrency = isValidCurrency(occurrence.currency) ? occurrence.currency : DEFAULT_CURRENCY;
  if (amountInput) {
    confirmAmountFormatter?.cleanup();
    confirmAmountFormatter = attachAmountFormatter(amountInput, confirmCurrency);
    amountInput.value = formatAmountForDisplay(occurrence.templateAmount, confirmCurrency);
    amountInput.setAttribute('data-amount-currency', confirmCurrency);
  }

  if (originalAmount) {
    originalAmount.textContent = `Original: ${formatCurrency(parseFloat(occurrence.templateAmount) || 0, confirmCurrency)}`;
    originalAmount.classList.add('hidden');
  }

  clearConfirmError(form.querySelector('[data-confirm-error]') as HTMLElement | null);
  setConfirmLoading(form.querySelector('[data-confirm-submit]') as HTMLButtonElement | null, false);

  showDialog(modal);
  amountInput?.focus();

  if (confirmAmountInput && confirmAmountInputHandler) {
    confirmAmountInput.removeEventListener('input', confirmAmountInputHandler);
  }

  if (amountInput) {
    confirmAmountInput = amountInput;
    confirmAmountInputHandler = () => {
      if (!originalAmount) return;
      const currentRaw = stripAmountFormatting(amountInput.value, confirmCurrency);
      const originalRaw = stripAmountFormatting(occurrence.templateAmount, confirmCurrency);
      originalAmount.classList.toggle('hidden', currentRaw === originalRaw);
    };
    amountInput.addEventListener('input', confirmAmountInputHandler);
  }
}

function openSkipModal(occurrence: RecurringOccurrenceLike, trigger?: HTMLElement | null): void {
  const modal = document.getElementById('recurring-skip-modal') as HTMLDialogElement | null;
  if (!modal) return;

  lastFocusedElement = trigger ?? (document.activeElement as HTMLElement | null);
  pendingSkipOccurrence = occurrence;

  const nameEl = modal.querySelector('[data-skip-template-name]') as HTMLElement | null;
  const reasonInput = modal.querySelector('[data-skip-reason]') as HTMLTextAreaElement | null;
  const counter = modal.querySelector('[data-skip-counter]') as HTMLElement | null;

  if (nameEl) {
    nameEl.textContent = `Skip ${occurrence.templateName}?`;
  }

  if (reasonInput) {
    reasonInput.value = '';
    reasonInput.focus();
  }

  if (counter) {
    counter.textContent = '0 / 200 characters';
  }

  clearConfirmError(modal.querySelector('[data-confirm-error]') as HTMLElement | null);
  setConfirmLoading(
    modal.querySelector('[data-confirm-action]') as HTMLButtonElement | null,
    false
  );

  showDialog(modal);
}

function initRecurringBillsWidget(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const widgetRoot = document.querySelector(
    '[data-dashboard-recurring-widget]'
  ) as HTMLElement | null;
  if (!widgetRoot) return;

  const confirmModal = document.getElementById(
    'recurring-confirm-modal'
  ) as HTMLDialogElement | null;
  const confirmForm = document.getElementById('recurring-confirm-form') as HTMLFormElement | null;
  const skipModal = document.getElementById('recurring-skip-modal') as HTMLDialogElement | null;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;

      const confirmTrigger = target.closest('[data-open-confirm-modal]') as HTMLElement | null;
      if (confirmTrigger) {
        event.preventDefault();
        event.stopPropagation();
        const raw = confirmTrigger.getAttribute('data-occurrence');
        if (!raw) return;

        try {
          const occurrence = JSON.parse(raw) as RecurringOccurrenceLike;
          if (!isOccurrenceActionable(occurrence)) {
            addToast('You can only confirm occurrences on or after the due date', 'warning');
            return;
          }
          openConfirmModal(occurrence, confirmTrigger);
        } catch {
          addToast('Invalid occurrence data', 'error');
        }
        return;
      }

      const skipTrigger = target.closest('[data-open-skip-modal]') as HTMLElement | null;
      if (skipTrigger) {
        event.preventDefault();
        event.stopPropagation();
        const raw = skipTrigger.getAttribute('data-occurrence');
        if (!raw) return;

        try {
          const occurrence = JSON.parse(raw) as RecurringOccurrenceLike;
          if (!isOccurrenceActionable(occurrence)) {
            addToast('You can only skip occurrences on or after the due date', 'warning');
            return;
          }
          openSkipModal(occurrence, skipTrigger);
        } catch {
          addToast('Invalid occurrence data', 'error');
        }
      }
    },
    { signal }
  );

  confirmForm?.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;

      const id = (form.querySelector('input[name="occurrence_id"]') as HTMLInputElement | null)
        ?.value;
      const rawAmount = (form.querySelector('input[name="amount"]') as HTMLInputElement | null)
        ?.value;
      const amount = rawAmount ? stripAmountFormatting(rawAmount, confirmCurrency) : '';
      const transactionDate = (
        form.querySelector('input[name="transaction_date"]') as HTMLInputElement | null
      )?.value;
      const categoryId = (
        form.querySelector('select[name="category_id"]') as HTMLSelectElement | null
      )?.value;
      const accountId = (
        form.querySelector('select[name="account_id"]') as HTMLSelectElement | null
      )?.value;

      const errorElement = form.querySelector('[data-confirm-error]') as HTMLElement | null;
      const submitButton = form.querySelector('[data-confirm-submit]') as HTMLButtonElement | null;

      clearConfirmError(errorElement);

      if (!id || !amount || !transactionDate || !categoryId || !accountId) {
        showConfirmError(errorElement, 'Please complete all fields.');
        return;
      }

      setConfirmLoading(submitButton, true);

      try {
        const response = await fetch(`/api/recurring/occurrences/${id}/confirm`, {
          method: 'POST',
          headers: getCsrfHeaders({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
          body: JSON.stringify({
            amount,
            transaction_date: transactionDate,
            category_id: categoryId,
            account_id: accountId,
          }),
          signal,
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        closeConfirmationModal(confirmModal);
        addToast('Occurrence confirmed', 'success');
        window.location.reload();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        showConfirmError(
          errorElement,
          error instanceof Error ? error.message : 'Failed to confirm occurrence'
        );
        addToast(error instanceof Error ? error.message : 'Failed to confirm occurrence', 'error');
      } finally {
        setConfirmLoading(submitButton, false);
      }
    },
    { signal }
  );

  const confirmCancelButton = confirmForm?.querySelector(
    '[data-confirm-cancel]'
  ) as HTMLButtonElement | null;
  confirmCancelButton?.addEventListener(
    'click',
    () => {
      closeConfirmationModal(confirmModal);
    },
    { signal }
  );

  const skipReasonInput = skipModal?.querySelector(
    '[data-skip-reason]'
  ) as HTMLTextAreaElement | null;
  const skipCounter = skipModal?.querySelector('[data-skip-counter]') as HTMLElement | null;

  skipReasonInput?.addEventListener(
    'input',
    () => {
      if (!skipCounter) return;
      skipCounter.textContent = `${skipReasonInput.value.length} / 200 characters`;
    },
    { signal }
  );

  const skipCancelButton = skipModal?.querySelector(
    '[data-confirm-cancel]'
  ) as HTMLButtonElement | null;
  skipCancelButton?.addEventListener(
    'click',
    () => {
      closeConfirmationModal(skipModal);
      pendingSkipOccurrence = null;
    },
    { signal }
  );

  const skipConfirmButton = skipModal?.querySelector(
    '[data-confirm-action]'
  ) as HTMLButtonElement | null;
  const skipError = skipModal?.querySelector('[data-confirm-error]') as HTMLElement | null;

  skipConfirmButton?.addEventListener(
    'click',
    async () => {
      if (!pendingSkipOccurrence) return;

      setConfirmLoading(skipConfirmButton, true);
      clearConfirmError(skipError);

      try {
        const response = await fetch(
          `/api/recurring/occurrences/${pendingSkipOccurrence.id}/skip`,
          {
            method: 'POST',
            headers: getCsrfHeaders({
              'Content-Type': 'application/json',
              Accept: 'application/json',
            }),
            body: JSON.stringify({
              skip_reason: skipReasonInput?.value.trim() || undefined,
            }),
            signal,
          }
        );

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        closeConfirmationModal(skipModal);
        pendingSkipOccurrence = null;
        addToast('Occurrence skipped', 'success');
        window.location.reload();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        showConfirmError(
          skipError,
          error instanceof Error ? error.message : 'Failed to skip occurrence'
        );
        addToast(error instanceof Error ? error.message : 'Failed to skip occurrence', 'error');
      } finally {
        setConfirmLoading(skipConfirmButton, false);
      }
    },
    { signal }
  );

  confirmModal?.addEventListener(
    'close',
    () => {
      if (lastFocusedElement && document.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
      }
    },
    { signal }
  );

  skipModal?.addEventListener(
    'close',
    () => {
      if (lastFocusedElement && document.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
      }
      pendingSkipOccurrence = null;
    },
    { signal }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecurringBillsWidget);
} else {
  initRecurringBillsWidget();
}

document.addEventListener('astro:page-load', initRecurringBillsWidget);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  controller = null;
});
