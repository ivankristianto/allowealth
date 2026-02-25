import { PERIOD_CHANGE_EVENT } from '@/lib/constants/events';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
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
let currentView: 'list' | 'calendar' = 'list';
let currentMonth = '';
let calendarLoaded = false;
let lastFocusedElement: HTMLElement | null = null;

let pendingSkipOccurrence: RecurringOccurrenceLike | null = null;
let pendingCancelTemplateId: string | null = null;

const parseApiError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data?.error?.message || data?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

function parseMonthToYearMonth(period: string): string {
  // Converts MM-YYYY to YYYY-MM
  const match = period.match(/^(\d{2})-(\d{4})$/);
  if (!match) return currentMonth;
  return `${match[2]}-${match[1]}`;
}

function monthToYearMonthParts(month: string): { year: number; month: number } {
  const [yearRaw, monthRaw] = month.split('-').map(Number);
  const now = new Date();
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();
  const monthNum = Number.isFinite(monthRaw) ? monthRaw : now.getMonth() + 1;
  return { year, month: monthNum };
}

function updateUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('view', currentView);
  url.searchParams.set('month', currentMonth);
  window.history.replaceState({}, '', url.toString());
}

async function fetchHtml(path: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(path, {
    headers: { Accept: 'text/html' },
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.text();
}

async function refreshTemplateList(signal: AbortSignal): Promise<void> {
  const container = document.getElementById('recurring-template-list-container');
  if (!container) return;

  const html = await fetchHtml('/api/recurring?status=all&_render=html', signal);
  container.innerHTML = html;
}

async function refreshPendingList(signal: AbortSignal): Promise<void> {
  const container = document.getElementById('recurring-pending-list-container');
  if (!container) return;

  const month = currentMonth || new Date().toISOString().slice(0, 7);
  const html = await fetchHtml(
    `/api/recurring/occurrences?month=${encodeURIComponent(month)}&status=pending&_render=html`,
    signal
  );
  container.innerHTML = html;
}

async function refreshStats(signal: AbortSignal): Promise<void> {
  const container = document.getElementById('recurring-stats-container');
  if (!container) return;

  const html = await fetchHtml('/api/recurring/stats?_render=html', signal);
  container.innerHTML = html;
}

async function refreshCalendar(signal: AbortSignal): Promise<void> {
  const container = document.getElementById('recurring-calendar-container');
  if (!container) return;

  const parts = monthToYearMonthParts(currentMonth);
  const html = await fetchHtml(
    `/api/recurring/calendar?year=${parts.year}&month=${parts.month}&_render=html`,
    signal
  );
  container.innerHTML = html;
  calendarLoaded = true;
}

async function refreshListView(signal: AbortSignal): Promise<void> {
  await Promise.all([
    refreshPendingList(signal),
    refreshTemplateList(signal),
    refreshStats(signal),
  ]);
}

async function refreshAfterMutation(signal: AbortSignal): Promise<void> {
  await refreshListView(signal);
  if (currentView === 'calendar') {
    await refreshCalendar(signal);
  }
}

function setView(view: 'list' | 'calendar', signal: AbortSignal): void {
  currentView = view;

  const listPanel = document.getElementById('recurring-list-view');
  const calendarPanel = document.getElementById('recurring-calendar-view');

  if (listPanel) listPanel.classList.toggle('hidden', view !== 'list');
  if (calendarPanel) calendarPanel.classList.toggle('hidden', view !== 'calendar');

  document.querySelectorAll<HTMLElement>('[data-recurring-view]').forEach((button) => {
    const isActive = button.dataset.recurringView === view;
    button.classList.toggle('btn-primary', isActive);
    button.classList.toggle('btn-ghost', !isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  updateUrl();

  if (view === 'calendar' && !calendarLoaded) {
    void refreshCalendar(signal).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      addToast(error instanceof Error ? error.message : 'Failed to load calendar', 'error');
    });
  }
}

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
  if (subtitle) subtitle.textContent = `Due on ${occurrence.due_date}`;
  if (idInput) idInput.value = occurrence.id;
  if (amountInput) amountInput.value = occurrence.templateAmount;
  if (dateInput) dateInput.value = occurrence.due_date;
  if (categorySelect) categorySelect.value = occurrence.category.id;
  if (accountSelect) accountSelect.value = occurrence.account.id;

  if (originalAmount) {
    originalAmount.textContent = `Original: ${occurrence.templateAmount} ${occurrence.currency}`;
    originalAmount.classList.add('hidden');
  }

  clearConfirmError(form.querySelector('[data-confirm-error]') as HTMLElement | null);
  setConfirmLoading(form.querySelector('[data-confirm-submit]') as HTMLButtonElement | null, false);

  showDialog(modal);
  amountInput?.focus();

  amountInput?.addEventListener(
    'input',
    () => {
      if (!originalAmount) return;
      const changed = amountInput.value !== occurrence.templateAmount;
      originalAmount.classList.toggle('hidden', !changed);
    },
    { once: true }
  );
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

function openCancelModal(templateId: string, templateName: string): void {
  const modal = document.getElementById('recurring-cancel-modal') as HTMLDialogElement | null;
  if (!modal) return;

  pendingCancelTemplateId = templateId;
  const subtitle = modal.querySelector('[data-modal-subtitle]') as HTMLElement | null;
  if (subtitle) {
    subtitle.textContent = `Cancel template \"${templateName}\"?`;
  }

  clearConfirmError(modal.querySelector('[data-confirm-error]') as HTMLElement | null);
  setConfirmLoading(
    modal.querySelector('[data-confirm-action]') as HTMLButtonElement | null,
    false
  );
  showDialog(modal);
}

async function runTemplateAction(
  action: 'pause' | 'resume',
  templateId: string,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(`/api/recurring/${templateId}/${action}`, {
    method: 'POST',
    headers: getCsrfHeaders({ Accept: 'application/json' }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  await refreshAfterMutation(signal);
  addToast(`Template ${action}d`, 'success');
}

function initRecurringPage(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const pageRoot = document.getElementById('recurring-page');
  if (!pageRoot) return;

  currentView = pageRoot.dataset.initialView === 'calendar' ? 'calendar' : 'list';
  currentMonth = pageRoot.dataset.initialMonth || new Date().toISOString().slice(0, 7);
  calendarLoaded = false;

  const confirmModal = document.getElementById(
    'recurring-confirm-modal'
  ) as HTMLDialogElement | null;
  const confirmForm = document.getElementById('recurring-confirm-form') as HTMLFormElement | null;
  const skipModal = document.getElementById('recurring-skip-modal') as HTMLDialogElement | null;
  const cancelModal = document.getElementById('recurring-cancel-modal') as HTMLDialogElement | null;

  setView(currentView, signal);

  document.querySelectorAll<HTMLElement>('[data-recurring-view]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const requested = button.dataset.recurringView === 'calendar' ? 'calendar' : 'list';
        setView(requested, signal);
      },
      { signal }
    );
  });

  const newTemplateBtn = document.querySelector('[data-open-recurring-template]');
  newTemplateBtn?.addEventListener(
    'click',
    () => {
      document.dispatchEvent(new CustomEvent('open-recurring-template-drawer'));
    },
    { signal }
  );

  window.addEventListener(
    PERIOD_CHANGE_EVENT,
    ((event: Event) => {
      const detail = (event as CustomEvent<{ period: string }>).detail;
      if (!detail?.period) return;

      const nextMonth = parseMonthToYearMonth(detail.period);
      if (!nextMonth || nextMonth === currentMonth) return;

      currentMonth = nextMonth;
      updateUrl();

      void refreshPendingList(signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        addToast(
          error instanceof Error ? error.message : 'Failed to refresh pending list',
          'error'
        );
      });

      void refreshStats(signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        addToast(error instanceof Error ? error.message : 'Failed to refresh stats', 'error');
      });

      if (currentView === 'calendar') {
        void refreshCalendar(signal).catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          addToast(error instanceof Error ? error.message : 'Failed to refresh calendar', 'error');
        });
      }
    }) as EventListener,
    { signal }
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;

      const confirmTrigger = target.closest('[data-open-confirm-modal]') as HTMLElement | null;
      if (confirmTrigger) {
        const raw = confirmTrigger.getAttribute('data-occurrence');
        if (!raw) return;

        try {
          const occurrence = JSON.parse(raw) as RecurringOccurrenceLike;
          openConfirmModal(occurrence, confirmTrigger);
        } catch {
          addToast('Invalid occurrence data', 'error');
        }
        return;
      }

      const skipTrigger = target.closest('[data-open-skip-modal]') as HTMLElement | null;
      if (skipTrigger) {
        const raw = skipTrigger.getAttribute('data-occurrence');
        if (!raw) return;

        try {
          const occurrence = JSON.parse(raw) as RecurringOccurrenceLike;
          openSkipModal(occurrence, skipTrigger);
        } catch {
          addToast('Invalid occurrence data', 'error');
        }
        return;
      }

      const templateActionButton = target.closest('[data-template-action]') as HTMLElement | null;
      if (templateActionButton) {
        const action = templateActionButton.getAttribute('data-template-action');

        if (action === 'edit') {
          const raw = templateActionButton.getAttribute('data-template');
          if (!raw) return;

          try {
            const template = JSON.parse(raw);
            document.dispatchEvent(
              new CustomEvent('edit-recurring-template-drawer', { detail: template })
            );
          } catch {
            addToast('Invalid template data', 'error');
          }
          return;
        }

        const templateId = templateActionButton.getAttribute('data-template-id');
        if (!templateId) return;

        if (action === 'pause' || action === 'resume') {
          void runTemplateAction(action, templateId, signal).catch((error) => {
            if (error instanceof Error && error.name === 'AbortError') return;
            addToast(error instanceof Error ? error.message : 'Template action failed', 'error');
          });
          return;
        }

        if (action === 'cancel') {
          const templateName =
            templateActionButton.getAttribute('data-template-name') || 'this template';
          openCancelModal(templateId, templateName);
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
      const amount = (form.querySelector('input[name="amount"]') as HTMLInputElement | null)?.value;
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
        await refreshAfterMutation(signal);
        addToast('Occurrence confirmed', 'success');
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
        await refreshAfterMutation(signal);
        addToast('Occurrence skipped', 'success');
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

  const cancelModalCancelButton = cancelModal?.querySelector(
    '[data-confirm-cancel]'
  ) as HTMLButtonElement | null;
  cancelModalCancelButton?.addEventListener(
    'click',
    () => {
      closeConfirmationModal(cancelModal);
      pendingCancelTemplateId = null;
    },
    { signal }
  );

  const cancelModalConfirmButton = cancelModal?.querySelector(
    '[data-confirm-action]'
  ) as HTMLButtonElement | null;
  const cancelModalError = cancelModal?.querySelector('[data-confirm-error]') as HTMLElement | null;

  cancelModalConfirmButton?.addEventListener(
    'click',
    async () => {
      if (!pendingCancelTemplateId) return;

      setConfirmLoading(cancelModalConfirmButton, true);
      clearConfirmError(cancelModalError);

      try {
        const response = await fetch(`/api/recurring/${pendingCancelTemplateId}/cancel`, {
          method: 'POST',
          headers: getCsrfHeaders({ Accept: 'application/json' }),
          signal,
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        closeConfirmationModal(cancelModal);
        pendingCancelTemplateId = null;
        await refreshAfterMutation(signal);
        addToast('Template cancelled', 'success');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        showConfirmError(
          cancelModalError,
          error instanceof Error ? error.message : 'Failed to cancel template'
        );
        addToast(error instanceof Error ? error.message : 'Failed to cancel template', 'error');
      } finally {
        setConfirmLoading(cancelModalConfirmButton, false);
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
    },
    { signal }
  );

  window.addEventListener(
    'recurring:templates-updated',
    () => {
      void refreshAfterMutation(signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        addToast(
          error instanceof Error ? error.message : 'Failed to refresh recurring data',
          'error'
        );
      });
    },
    { signal }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecurringPage);
} else {
  initRecurringPage();
}

document.addEventListener('astro:page-load', initRecurringPage);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  controller = null;
});
