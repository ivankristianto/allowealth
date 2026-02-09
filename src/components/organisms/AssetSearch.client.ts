/**
 * AssetSearch Client Script
 *
 * Debounced client-side search that filters asset rows by name.
 * Hides non-matching [data-asset-row] elements while keeping
 * all group cards visible. Shows a "no results" message when
 * zero rows match across all groups.
 */

const DEBOUNCE_MS = 150;

function filterAssets(query: string): void {
  const normalizedQuery = query.trim().toLowerCase();
  const rows = document.querySelectorAll<HTMLElement>('[data-asset-row]');
  let visibleCount = 0;

  rows.forEach((row) => {
    const name = (row.getAttribute('data-asset-name') || '').toLowerCase();
    const matches = !normalizedQuery || name.includes(normalizedQuery);

    row.style.display = matches ? '' : 'none';

    // Also hide/show the inline history container that follows the row
    const assetId = row.getAttribute('data-asset-row');
    if (assetId) {
      const historyContainer = row.parentElement?.querySelector<HTMLElement>(
        `[data-history-container][data-asset-id="${CSS.escape(assetId)}"]`
      );
      if (historyContainer) {
        historyContainer.style.display = matches ? '' : 'none';
      }
    }

    if (matches) visibleCount++;
  });

  // Toggle "no results" message
  const noResultsEl = document.querySelector<HTMLElement>('[data-asset-search-no-results]');
  if (noResultsEl) {
    noResultsEl.style.display = visibleCount === 0 && normalizedQuery ? '' : 'none';
  }
}

function initAssetSearch(): void {
  const input = document.querySelector<HTMLInputElement>('[data-asset-search]');
  if (!input) return;

  // Prevent duplicate listeners
  if (input.dataset.initialized === 'true') return;
  input.dataset.initialized = 'true';

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  input.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterAssets(input.value);
    }, DEBOUNCE_MS);
  });

  // Support clearing via Escape key
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      input.value = '';
      filterAssets('');
    }
  });
}

export { initAssetSearch };
