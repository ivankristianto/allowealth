/**
 * AccountSearch Client Script
 *
 * Debounced client-side search that filters account rows by name.
 * Hides non-matching [data-account-row] elements while keeping
 * all group cards visible. Shows a "no results" message when
 * zero rows match across all groups.
 */

const DEBOUNCE_MS = 150;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let controller: AbortController | null = null;

function findViewScope(input: HTMLElement): ParentNode {
  let current: HTMLElement | null = input;

  while (current) {
    const hasCardView = !!current.querySelector('[data-view="card"]');
    const hasTableView = !!current.querySelector('[data-view="table"]');

    if (hasCardView && hasTableView) {
      return current;
    }

    current = current.parentElement;
  }

  return document;
}

function getActiveView(scope: ParentNode): HTMLElement | null {
  const views = Array.from(scope.querySelectorAll<HTMLElement>('[data-view]'));
  return views.find((view) => !view.classList.contains('hidden')) || null;
}

function getHistoryWrapperForRow(row: HTMLElement): HTMLElement | null {
  // Table rows: history wrapper is the next sibling <tr data-history-wrapper>
  if (row.hasAttribute('data-account-table-row')) {
    const nextRow = row.nextElementSibling as HTMLElement | null;
    if (nextRow?.matches('[data-history-wrapper]')) {
      return nextRow;
    }
  }

  const accountId =
    row.getAttribute('data-account-row') || row.getAttribute('data-account-id') || null;
  if (!accountId) return null;

  // Card rows: history container is a sibling element, not a child
  const nextSibling = row.nextElementSibling as HTMLElement | null;
  if (
    nextSibling?.matches(`[data-history-container][data-account-id="${CSS.escape(accountId)}"]`)
  ) {
    return nextSibling;
  }

  return null;
}

function filterAccounts(query: string, input: HTMLInputElement): void {
  const normalizedQuery = query.trim().toLowerCase();
  const scope = findViewScope(input);
  const activeView = getActiveView(scope) || document;
  const rows = activeView.querySelectorAll<HTMLElement>(
    '[data-account-row], [data-account-table-row]'
  );
  let visibleCount = 0;

  rows.forEach((row) => {
    const name = (row.getAttribute('data-account-name') || '').toLowerCase();
    const matches = !normalizedQuery || name.includes(normalizedQuery);

    row.classList.toggle('hidden', !matches);

    // Hide any paired inline-history row when the account is filtered out.
    // Matching rows keep their existing hidden state so the toggle remains authoritative.
    if (!matches) {
      const historyWrapper = getHistoryWrapperForRow(row);
      historyWrapper?.classList.add('hidden');
    }

    if (matches) visibleCount++;
  });

  // Toggle "no results" message
  const noResultsEl = scope.querySelector<HTMLElement>('[data-account-search-no-results]');
  if (noResultsEl) {
    noResultsEl.classList.toggle('hidden', !(visibleCount === 0 && normalizedQuery));
  }
}

function initAccountSearch(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const input = document.querySelector<HTMLInputElement>('[data-account-search]');
  if (!input) return;

  input.addEventListener(
    'input',
    () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterAccounts(input.value, input);
      }, DEBOUNCE_MS);
    },
    { signal }
  );

  // Support clearing via Escape key
  input.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        input.value = '';
        filterAccounts('', input);
      }
    },
    { signal }
  );
}

function cleanupAccountSearch(): void {
  controller?.abort();
  controller = null;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
}

export { initAccountSearch };
document.addEventListener('astro:page-load', initAccountSearch);
document.addEventListener('astro:before-swap', cleanupAccountSearch);
