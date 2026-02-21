import { csrfFetch } from '@/lib/csrf-client';

let activeAccountId: string | null = null;
const initializedRows = new WeakSet<Element>();

function setExpandedState(accountId: string, expanded: boolean) {
  document
    .querySelectorAll<HTMLElement>(`[data-expand-chevron="${CSS.escape(accountId)}"]`)
    .forEach((chevron) => {
      chevron.classList.toggle('rotate-180', expanded);
    });
  const row = document.querySelector<HTMLElement>(`[data-account-row="${CSS.escape(accountId)}"]`);
  if (row) row.setAttribute('aria-expanded', String(expanded));
}

async function toggleHistory(accountId: string) {
  const container = document.querySelector(
    `[data-history-container][data-account-id="${CSS.escape(accountId)}"]`
  ) as HTMLElement;
  if (!container) return;

  // Toggle: collapse if same account clicked again
  if (activeAccountId === accountId) {
    container.classList.add('hidden');
    setExpandedState(accountId, false);
    activeAccountId = null;
    return;
  }

  // Collapse previous
  if (activeAccountId) {
    const prev = document.querySelector(
      `[data-history-container][data-account-id="${CSS.escape(activeAccountId)}"]`
    ) as HTMLElement;
    if (prev) prev.classList.add('hidden');
    setExpandedState(activeAccountId, false);
  }

  // Show loading skeleton
  container.innerHTML =
    '<div class="flex justify-center py-4"><span class="loading loading-spinner loading-md"></span></div>';
  container.classList.remove('hidden');
  setExpandedState(accountId, true);
  activeAccountId = accountId;

  try {
    // Fetch server-rendered HTML
    const res = await csrfFetch(`/api/accounts/${accountId}/history?limit=10&_render=html`);
    const html = await res.text();

    // Inject server-rendered HTML directly
    container.innerHTML = html;
  } catch {
    container.innerHTML =
      '<p class="text-sm text-error text-center py-2">Failed to load history.</p>';
  }
}

export function initInlineHistory() {
  // Reset stale state from previous page navigations
  if (activeAccountId) {
    setExpandedState(activeAccountId, false);
  }
  activeAccountId = null;

  // Row click/keyboard to toggle history (skip if clicking buttons/links/dropdown menus)
  document.querySelectorAll<HTMLElement>('[data-account-row]').forEach((row) => {
    if (initializedRows.has(row)) return;
    initializedRows.add(row);

    const accountId = row.dataset.accountId;
    const historyContainerId = accountId ? `account-history-${accountId}` : undefined;

    row.classList.add('cursor-pointer');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', `Toggle ${row.dataset.accountName || 'account'} history`);
    if (historyContainerId) {
      row.setAttribute('aria-controls', historyContainerId);
      // Set matching id on the history container
      const container = document.querySelector(
        `[data-history-container][data-account-id="${CSS.escape(accountId!)}"]`
      );
      if (container) container.id = historyContainerId;
    }

    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking a button, link, dropdown menu, or within one
      if (target.closest('button, a, [data-dropdown-menu]')) return;

      if (accountId) toggleHistory(accountId);
    });

    row.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if key event originated from a child interactive element
      if (
        target !== row &&
        target.closest('button, a, input, select, textarea, [data-dropdown-menu]')
      )
        return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (accountId) toggleHistory(accountId);
      } else if (e.key === 'Escape') {
        if (accountId && activeAccountId === accountId) toggleHistory(accountId);
      }
    });
  });
}

function cleanupInlineHistoryState(): void {
  if (activeAccountId) {
    setExpandedState(activeAccountId, false);
  }
  activeAccountId = null;
}

document.addEventListener('astro:page-load', initInlineHistory);
document.addEventListener('astro:before-swap', cleanupInlineHistoryState);
