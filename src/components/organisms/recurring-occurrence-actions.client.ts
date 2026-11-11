/**
 * Confirm and skip flows for recurring occurrences, shared by the recurring page and the
 * dashboard widget. Both render RecurringConfirmModal and RecurringSkipModal.
 */

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
import type { RecurringActionType, RecurringOccurrenceType } from './recurring-ui';

export interface RecurringOccurrenceLike {
  id: string;
  due_date: string;
  templateName: string;
  templateType?: RecurringOccurrenceType;
  templateAmount: string;
  currency: string;
  category: { id: string; name: string };
  account: { id: string; name: string };
}

export interface OccurrenceActionsOptions {
  signal: AbortSignal;
  /** Runs after a confirm or skip succeeds and its modal has closed */
  onMutated: (successMessage: string) => Promise<void> | void;
  /** Subtitle of the confirm modal, given the formatted due date */
  dateLabel: (occurrence: RecurringOccurrenceLike, formattedDate: string) => string;
  /** Toast shown when the occurrence is not due yet */
  notDueWarning: (action: RecurringActionType, occurrence: RecurringOccurrenceLike) => string;
  /** Stop trigger clicks from reaching window-level listeners */
  isolateTriggerClicks?: boolean;
}

export function isOccurrenceActionable(
  occurrence: Pick<RecurringOccurrenceLike, 'due_date'>,
  today = getCurrentDateISO()
): boolean {
  return occurrence.due_date <= today;
}

export function formatDueDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message || data?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function showDialog(dialog: HTMLDialogElement | null): void {
  if (dialog && !dialog.open) dialog.showModal();
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Wires the occurrence triggers and both modals; every listener is removed when `signal` aborts. */
export function bindOccurrenceActions(options: OccurrenceActionsOptions): void {
  const { signal } = options;
  const confirmModal = document.getElementById(
    'recurring-confirm-modal'
  ) as HTMLDialogElement | null;
  const confirmForm = document.getElementById('recurring-confirm-form') as HTMLFormElement | null;
  const skipModal = document.getElementById('recurring-skip-modal') as HTMLDialogElement | null;

  let lastFocusedElement: HTMLElement | null = null;
  let pendingSkipOccurrence: RecurringOccurrenceLike | null = null;
  let confirmCurrency: Currency = DEFAULT_CURRENCY;
  let amountFormatter: ReturnType<typeof attachAmountFormatter> | null = null;
  let amountChangeListener: AbortController | null = null;

  signal.addEventListener('abort', () => {
    amountFormatter?.cleanup();
    amountChangeListener?.abort();
  });

  function openConfirmModal(occurrence: RecurringOccurrenceLike, trigger: HTMLElement): void {
    if (!confirmModal || !confirmForm) return;
    const form = confirmForm;

    lastFocusedElement = trigger;

    const title = form.querySelector('[data-modal-title]') as HTMLElement | null;
    const subtitle = form.querySelector('[data-modal-subtitle]') as HTMLElement | null;
    const idInput = form.querySelector('input[name="occurrence_id"]') as HTMLInputElement | null;
    const amountInput = form.querySelector('input[name="amount"]') as HTMLInputElement | null;
    const dateInput = form.querySelector(
      'input[name="transaction_date"]'
    ) as HTMLInputElement | null;
    const categorySelect = form.querySelector(
      'select[name="category_id"]'
    ) as HTMLSelectElement | null;
    const accountSelect = form.querySelector(
      'select[name="account_id"]'
    ) as HTMLSelectElement | null;
    const originalAmount = form.querySelector('[data-original-amount]') as HTMLElement | null;

    if (title) title.textContent = `Confirm ${occurrence.templateName}`;
    if (subtitle) {
      subtitle.textContent = options.dateLabel(occurrence, formatDueDateLabel(occurrence.due_date));
    }
    if (idInput) idInput.value = occurrence.id;
    if (dateInput) {
      dateInput.value = occurrence.due_date;
      dateInput.max = getCurrentDateISO();
    }
    if (categorySelect) categorySelect.value = occurrence.category.id;
    if (accountSelect) accountSelect.value = occurrence.account.id;

    confirmCurrency = isValidCurrency(occurrence.currency) ? occurrence.currency : DEFAULT_CURRENCY;
    if (amountInput) {
      amountFormatter?.cleanup();
      amountFormatter = attachAmountFormatter(amountInput, confirmCurrency);
      amountInput.value = formatAmountForDisplay(occurrence.templateAmount, confirmCurrency);
      amountInput.setAttribute('data-amount-currency', confirmCurrency);
    }

    if (originalAmount) {
      originalAmount.textContent = `Original: ${formatCurrency(parseFloat(occurrence.templateAmount) || 0, confirmCurrency)}`;
      originalAmount.classList.add('hidden');
    }

    clearConfirmError(form.querySelector('[data-confirm-error]') as HTMLElement | null);
    setConfirmLoading(
      form.querySelector('[data-confirm-submit]') as HTMLButtonElement | null,
      false
    );

    showDialog(confirmModal);
    amountInput?.focus();

    amountChangeListener?.abort();
    if (amountInput) {
      amountChangeListener = new AbortController();
      const originalRaw = stripAmountFormatting(occurrence.templateAmount, confirmCurrency);
      amountInput.addEventListener(
        'input',
        () => {
          if (!originalAmount) return;
          const currentRaw = stripAmountFormatting(amountInput.value, confirmCurrency);
          originalAmount.classList.toggle('hidden', currentRaw === originalRaw);
        },
        { signal: amountChangeListener.signal }
      );
    }
  }

  function openSkipModal(occurrence: RecurringOccurrenceLike, trigger: HTMLElement): void {
    if (!skipModal) return;

    lastFocusedElement = trigger;
    pendingSkipOccurrence = occurrence;

    const nameEl = skipModal.querySelector('[data-skip-template-name]') as HTMLElement | null;
    const reasonInput = skipModal.querySelector('[data-skip-reason]') as HTMLTextAreaElement | null;
    const counter = skipModal.querySelector('[data-skip-counter]') as HTMLElement | null;

    if (nameEl) nameEl.textContent = `Skip ${occurrence.templateName}?`;
    if (reasonInput) {
      reasonInput.value = '';
      reasonInput.focus();
    }
    if (counter) counter.textContent = '0 / 200 characters';

    clearConfirmError(skipModal.querySelector('[data-confirm-error]') as HTMLElement | null);
    setConfirmLoading(
      skipModal.querySelector('[data-confirm-action]') as HTMLButtonElement | null,
      false
    );

    showDialog(skipModal);
  }

  function handleTrigger(
    event: MouseEvent,
    trigger: HTMLElement,
    action: RecurringActionType
  ): void {
    if (options.isolateTriggerClicks) {
      event.preventDefault();
      event.stopPropagation();
    }

    const raw = trigger.getAttribute('data-occurrence');
    if (!raw) return;

    try {
      const occurrence = JSON.parse(raw) as RecurringOccurrenceLike;
      if (!isOccurrenceActionable(occurrence)) {
        addToast(options.notDueWarning(action, occurrence), 'warning');
        return;
      }
      if (action === 'confirm') {
        openConfirmModal(occurrence, trigger);
      } else {
        openSkipModal(occurrence, trigger);
      }
    } catch {
      addToast('Invalid occurrence data', 'error');
    }
  }

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const confirmTrigger = target.closest<HTMLElement>('[data-open-confirm-modal]');
      if (confirmTrigger) {
        handleTrigger(event, confirmTrigger, 'confirm');
        return;
      }
      const skipTrigger = target.closest<HTMLElement>('[data-open-skip-modal]');
      if (skipTrigger) handleTrigger(event, skipTrigger, 'skip');
    },
    { signal }
  );

  confirmForm?.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const field = (name: string) =>
        (form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null)
          ?.value;

      const id = field('occurrence_id');
      const rawAmount = field('amount');
      const amount = rawAmount ? stripAmountFormatting(rawAmount, confirmCurrency) : '';
      const transactionDate = field('transaction_date');
      const categoryId = field('category_id');
      const accountId = field('account_id');

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
        await options.onMutated('Occurrence confirmed');
      } catch (error) {
        if (isAbort(error)) return;
        const message = errorMessage(error, 'Failed to confirm occurrence');
        showConfirmError(errorElement, message);
        addToast(message, 'error');
      } finally {
        setConfirmLoading(submitButton, false);
      }
    },
    { signal }
  );

  (
    confirmForm?.querySelector('[data-confirm-cancel]') as HTMLButtonElement | null
  )?.addEventListener('click', () => closeConfirmationModal(confirmModal), { signal });

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

  (skipModal?.querySelector('[data-confirm-cancel]') as HTMLButtonElement | null)?.addEventListener(
    'click',
    () => closeConfirmationModal(skipModal),
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
        await options.onMutated('Occurrence skipped');
      } catch (error) {
        if (isAbort(error)) return;
        const message = errorMessage(error, 'Failed to skip occurrence');
        showConfirmError(skipError, message);
        addToast(message, 'error');
      } finally {
        setConfirmLoading(skipConfirmButton, false);
      }
    },
    { signal }
  );

  const restoreFocus = () => {
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
  };

  confirmModal?.addEventListener('close', restoreFocus, { signal });
  skipModal?.addEventListener(
    'close',
    () => {
      restoreFocus();
      pendingSkipOccurrence = null;
    },
    { signal }
  );
}
