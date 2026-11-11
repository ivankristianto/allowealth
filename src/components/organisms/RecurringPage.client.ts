import { PERIOD_CHANGE_EVENT } from '@/lib/constants/events';
import { csrfFetch, getCsrfHeaders } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
import { getCurrentDateISO } from '@/lib/utils/date';
import {
  clearConfirmError,
  closeConfirmationModal,
  setConfirmLoading,
  showConfirmError,
} from '@/components/molecules/ConfirmationModal.client';
import {
  getActionInboxTitle,
  getOccurrenceActionWarning,
  getOccurrenceDateLabel,
} from '@/components/organisms/recurring-ui';
import { replaceWithSanitizedHtml } from '@/lib/dom/sanitize-fragment';
import { bindOccurrenceActions, parseApiError } from './recurring-occurrence-actions.client';

interface RecurringTemplatePrefill {
  name: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category_id: string;
  account_id: string;
  day_of_month: number;
  start_month: string;
  description?: string;
}

let controller: AbortController | null = null;
let currentView: 'list' | 'calendar' = 'list';
let currentMonth = '';
let loadedCalendarMonth: string | null = null;
let pendingTypeFilter: 'all' | 'income' | 'expense' = 'all';

let pendingCancelTemplateId: string | null = null;

let templateType: string = 'all';
let templateSearch: string = '';
let templatePage: number = 1;
const TEMPLATE_LIMIT = 10;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

function getCurrentMonthHeadingLabel(): string {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatMonthLabelFromPeriod(period: string): string {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return getCurrentMonthHeadingLabel();
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function updateActionInboxTitle(monthLabel: string): void {
  const heading = document.querySelector<HTMLElement>('[data-action-inbox-title]');
  if (!heading) return;
  heading.textContent = getActionInboxTitle(monthLabel, getCurrentMonthHeadingLabel());
}

function updateUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('view', currentView);
  url.searchParams.set('month', currentMonth);
  window.history.replaceState({}, '', url.toString());
}

async function fetchHtml(path: string, signal: AbortSignal): Promise<string> {
  const response = await csrfFetch(path, {
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

  const params = new URLSearchParams({ status: 'all', _render: 'html' });
  if (templateType !== 'all') params.set('type', templateType);
  if (templateSearch) params.set('search', templateSearch);
  params.set('page', String(templatePage));
  params.set('limit', String(TEMPLATE_LIMIT));

  const html = await fetchHtml(`/api/recurring?${params}`, signal);
  replaceWithSanitizedHtml(container, html);

  const currentPage = Number(
    container.querySelector('[data-pagination]')?.getAttribute('data-current-page')
  );
  if (Number.isFinite(currentPage) && currentPage > 0) {
    templatePage = currentPage;
  }
}

async function refreshPendingList(signal: AbortSignal): Promise<void> {
  const container = document.getElementById('recurring-pending-list-container');
  if (!container) return;

  const month = currentMonth || getCurrentDateISO().slice(0, 7);
  const html = await fetchHtml(
    `/api/recurring/occurrences?month=${encodeURIComponent(month)}&status=pending&_render=html`,
    signal
  );
  replaceWithSanitizedHtml(container, html);
  bindPendingFilterButtons(signal);
  applyPendingQueueFilter();
}

async function refreshStats(signal: AbortSignal): Promise<void> {
  const container = document.getElementById('recurring-stats-container');
  if (!container) return;

  const month = currentMonth || getCurrentDateISO().slice(0, 7);
  const html = await fetchHtml(
    `/api/recurring/stats?month=${encodeURIComponent(month)}&_render=html`,
    signal
  );
  replaceWithSanitizedHtml(container, html);
}

async function refreshCalendar(signal: AbortSignal): Promise<void> {
  const container = document.getElementById('recurring-calendar-container');
  if (!container) return;

  const parts = monthToYearMonthParts(currentMonth);
  const html = await fetchHtml(
    `/api/recurring/calendar?year=${parts.year}&month=${parts.month}&_render=html`,
    signal
  );
  replaceWithSanitizedHtml(container, html);
  loadedCalendarMonth = currentMonth;
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

function syncPendingFilterButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-pending-filter]').forEach((button) => {
    const filter = button.dataset.pendingFilter === 'income' ? 'income' : 'expense';
    const isActive = pendingTypeFilter === filter;

    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('btn-active', isActive);
    button.classList.toggle('btn-outline', !isActive);
  });
}

function applyPendingQueueFilter(): void {
  document.querySelectorAll<HTMLElement>('[data-occurrence-type]').forEach((item) => {
    const itemType = item.dataset.occurrenceType;
    const matchesFilter =
      pendingTypeFilter === 'all' ||
      (pendingTypeFilter === 'income' && itemType === 'income') ||
      (pendingTypeFilter === 'expense' && itemType === 'expense');

    item.classList.toggle('hidden', !matchesFilter);
    item.setAttribute('aria-hidden', String(!matchesFilter));
  });

  syncPendingFilterButtons();
}

function bindPendingFilterButtons(signal: AbortSignal): void {
  document.querySelectorAll<HTMLButtonElement>('[data-pending-filter]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const requestedFilter = button.dataset.pendingFilter;
        if (requestedFilter !== 'income' && requestedFilter !== 'expense') return;

        pendingTypeFilter = pendingTypeFilter === requestedFilter ? 'all' : requestedFilter;
        applyPendingQueueFilter();
      },
      { signal }
    );
  });
}

function setView(view: 'list' | 'calendar', signal: AbortSignal): void {
  currentView = view;

  const listPanel = document.getElementById('recurring-list-view');
  const calendarPanel = document.getElementById('recurring-calendar-view');

  if (listPanel) {
    const isHidden = view !== 'list';
    listPanel.classList.toggle('hidden', isHidden);
    listPanel.setAttribute('aria-hidden', String(isHidden));
  }
  if (calendarPanel) {
    const isHidden = view !== 'calendar';
    calendarPanel.classList.toggle('hidden', isHidden);
    calendarPanel.setAttribute('aria-hidden', String(isHidden));
  }

  document.querySelectorAll<HTMLElement>('[data-recurring-view]').forEach((button) => {
    const isActive = button.dataset.recurringView === view;
    button.classList.toggle('btn-active', isActive);
    button.classList.toggle('tab-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    button.setAttribute('aria-selected', String(isActive));
  });

  updateUrl();

  if (view === 'calendar' && loadedCalendarMonth !== currentMonth) {
    void refreshCalendar(signal).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      addToast(error instanceof Error ? error.message : 'Failed to load calendar', 'error');
    });
  }
}

function parseTemplatePrefill(root: HTMLElement): RecurringTemplatePrefill | null {
  const raw = root.dataset.convertPrefill;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RecurringTemplatePrefill>;
    if (
      !parsed ||
      (parsed.type !== 'expense' && parsed.type !== 'income') ||
      typeof parsed.name !== 'string' ||
      typeof parsed.amount !== 'string' ||
      typeof parsed.currency !== 'string' ||
      typeof parsed.category_id !== 'string' ||
      typeof parsed.account_id !== 'string' ||
      typeof parsed.start_month !== 'string'
    ) {
      return null;
    }

    const day = Number(parsed.day_of_month);
    if (!Number.isFinite(day) || day < 1 || day > 31) return null;

    return {
      name: parsed.name,
      type: parsed.type,
      amount: parsed.amount,
      currency: parsed.currency,
      category_id: parsed.category_id,
      account_id: parsed.account_id,
      day_of_month: day,
      start_month: parsed.start_month,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
    };
  } catch {
    return null;
  }
}

function clearConversionQueryParams(): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of [
    'convert',
    'tx_name',
    'tx_type',
    'tx_amount',
    'tx_currency',
    'tx_category_id',
    'tx_account_id',
    'tx_day',
    'tx_start_month',
    'tx_description',
  ]) {
    if (url.searchParams.has(key)) {
      changed = true;
      url.searchParams.delete(key);
    }
  }

  if (changed) {
    window.history.replaceState({}, '', url.toString());
  }
}

function showDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
}

function openCancelModal(templateId: string, templateName: string): void {
  const modal = document.getElementById('recurring-cancel-modal') as HTMLDialogElement | null;
  if (!modal) return;

  pendingCancelTemplateId = templateId;
  const subtitle = modal.querySelector('[data-modal-subtitle]') as HTMLElement | null;
  if (subtitle) {
    subtitle.textContent = `Cancel "${templateName}"?`;
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
  addToast(`Recurring transaction ${action}d`, 'success');
}

function initRecurringPage(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const pageRoot = document.getElementById('recurring-page');
  if (!pageRoot) return;

  currentView = pageRoot.dataset.initialView === 'calendar' ? 'calendar' : 'list';
  currentMonth = pageRoot.dataset.initialMonth || new Date().toISOString().slice(0, 7);
  loadedCalendarMonth = null;
  updateActionInboxTitle(
    pageRoot.dataset.initialMonthLabel || formatMonthLabelFromPeriod(currentMonth)
  );

  const cancelModal = document.getElementById('recurring-cancel-modal') as HTMLDialogElement | null;

  setView(currentView, signal);
  bindPendingFilterButtons(signal);
  applyPendingQueueFilter();
  bindOccurrenceActions({
    signal,
    onMutated: async (successMessage) => {
      await refreshAfterMutation(signal);
      addToast(successMessage, 'success');
    },
    dateLabel: (occurrence, formattedDate) =>
      getOccurrenceDateLabel(occurrence.templateType ?? 'expense', formattedDate),
    notDueWarning: (action, occurrence) =>
      getOccurrenceActionWarning(action, occurrence.templateType ?? 'expense'),
  });

  const templatePrefill = parseTemplatePrefill(pageRoot);
  if (templatePrefill) {
    window.requestAnimationFrame(() => {
      document.dispatchEvent(
        new CustomEvent('open-recurring-template-drawer', {
          detail: { prefill: templatePrefill, source: 'transaction' },
        })
      );
      addToast('Review the pre-filled recurring transaction and save when ready.', 'info');
      clearConversionQueryParams();
    });
  }

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

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const newTemplateTrigger = target.closest(
        '[data-open-recurring-template]'
      ) as HTMLElement | null;
      if (!newTemplateTrigger) return;

      event.preventDefault();
      document.dispatchEvent(new CustomEvent('open-recurring-template-drawer'));
    },
    { signal }
  );

  window.addEventListener(
    PERIOD_CHANGE_EVENT,
    ((event: Event) => {
      const detail = (event as CustomEvent<{ period: string; label?: string }>).detail;
      if (!detail?.period) return;

      const nextMonth = parseMonthToYearMonth(detail.period);
      if (!nextMonth || nextMonth === currentMonth) return;

      currentMonth = nextMonth;
      loadedCalendarMonth = null;
      const nextLabel = detail.label || formatMonthLabelFromPeriod(nextMonth);
      updateActionInboxTitle(nextLabel);
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
            addToast('Invalid data', 'error');
          }
          return;
        }

        const templateId = templateActionButton.getAttribute('data-template-id');
        if (!templateId) return;

        if (action === 'pause' || action === 'resume') {
          void runTemplateAction(action, templateId, signal).catch((error) => {
            if (error instanceof Error && error.name === 'AbortError') return;
            addToast(error instanceof Error ? error.message : 'Action failed', 'error');
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
        addToast('Recurring transaction cancelled', 'success');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        showConfirmError(
          cancelModalError,
          error instanceof Error ? error.message : 'Failed to cancel recurring transaction'
        );
        addToast(
          error instanceof Error ? error.message : 'Failed to cancel recurring transaction',
          'error'
        );
      } finally {
        setConfirmLoading(cancelModalConfirmButton, false);
      }
    },
    { signal }
  );

  // Template filter type tabs
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const filterButton = target.closest('[data-filter-type]') as HTMLElement | null;
      if (!filterButton) return;

      const newType = filterButton.getAttribute('data-filter-type') || 'all';
      if (newType === templateType) return;

      templateType = newType;
      templatePage = 1;
      void refreshTemplateList(signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        addToast(
          error instanceof Error ? error.message : 'Failed to filter recurring transactions',
          'error'
        );
      });
    },
    { signal }
  );

  // Template search input with debounce
  document.addEventListener(
    'input',
    (event) => {
      const target = event.target as HTMLElement;
      if (!target.matches('[data-template-search]')) return;

      const input = target as HTMLInputElement;
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

      searchDebounceTimer = setTimeout(() => {
        templateSearch = input.value.trim();
        templatePage = 1;
        void refreshTemplateList(signal).catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          addToast(
            error instanceof Error ? error.message : 'Failed to search recurring transactions',
            'error'
          );
        });
      }, 300);
    },
    { signal }
  );

  // Template pagination
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const templateListContainer = document.getElementById('recurring-template-list-container');
      if (!templateListContainer) return;

      const clickedInsideTemplateList = target.closest('#recurring-template-list-container');
      if (!clickedInsideTemplateList) return;

      const legacyPageButton = target.closest('[data-template-page]') as HTMLElement | null;
      const paginationButton = target.closest(
        '[data-pagination-prev], [data-pagination-next]'
      ) as HTMLElement | null;

      let newPage: number | null = null;

      if (legacyPageButton) {
        newPage = Number(legacyPageButton.getAttribute('data-template-page'));
      } else if (paginationButton) {
        const currentPage = Number(
          templateListContainer
            .querySelector('[data-pagination]')
            ?.getAttribute('data-current-page')
        );
        if (!Number.isFinite(currentPage) || currentPage < 1) return;
        newPage = paginationButton.hasAttribute('data-pagination-prev')
          ? currentPage - 1
          : currentPage + 1;
      } else {
        return;
      }

      if (newPage === null || !Number.isFinite(newPage) || newPage < 1 || newPage === templatePage)
        return;

      templatePage = newPage;
      void refreshTemplateList(signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        addToast(error instanceof Error ? error.message : 'Failed to load page', 'error');
      });
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
