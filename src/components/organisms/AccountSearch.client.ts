/**
 * AccountSearch Client Script
 *
 * Debounced client-side search that filters account rows by name.
 * Hides non-matching [data-account-row] elements while keeping
 * all group cards visible. Shows a "no results" message when
 * zero rows match across all groups.
 */

const DEBOUNCE_MS = 150;

function filterAccounts(query: string): void {
  const normalizedQuery = query.trim().toLowerCase();
  const rows = document.querySelectorAll<HTMLElement>('[data-account-row]');
  let visibleCount = 0;

  rows.forEach((row) => {
    const name = (row.getAttribute('data-account-name') || '').toLowerCase();
    const matches = !normalizedQuery || name.includes(normalizedQuery);

    row.classList.toggle('hidden', !matches);

    // Also hide/show the inline history container that follows the row
    const accountId = row.getAttribute('data-account-row');
    if (accountId) {
      const historyContainer = row.parentElement?.querySelector<HTMLElement>(
        `[data-history-container][data-account-id="${CSS.escape(accountId)}"]`
      );
      if (historyContainer) {
        historyContainer.classList.toggle('hidden', !matches);
      }
    }

    if (matches) visibleCount++;
  });

  // Toggle "no results" message
  const noResultsEl = document.querySelector<HTMLElement>('[data-account-search-no-results]');
  if (noResultsEl) {
    noResultsEl.classList.toggle('hidden', !(visibleCount === 0 && normalizedQuery));
  }
}

function initAccountSearch(): void {
  const input = document.querySelector<HTMLInputElement>('[data-account-search]');
  if (!input) return;

  // Prevent duplicate listeners
  if (input.dataset.initialized === 'true') return;
  input.dataset.initialized = 'true';

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  input.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterAccounts(input.value);
    }, DEBOUNCE_MS);
  });

  // Support clearing via Escape key
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      input.value = '';
      filterAccounts('');
    }
  });
}

export { initAccountSearch };
