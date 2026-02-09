import { csrfFetch } from '@/lib/csrf-client';

let activeAssetId: string | null = null;
const initializedRows = new WeakSet<Element>();

function setExpandedState(assetId: string, expanded: boolean) {
  document
    .querySelectorAll<HTMLElement>(`[data-expand-chevron="${CSS.escape(assetId)}"]`)
    .forEach((chevron) => {
      chevron.classList.toggle('rotate-180', expanded);
    });
  const row = document.querySelector<HTMLElement>(`[data-asset-row="${CSS.escape(assetId)}"]`);
  if (row) row.setAttribute('aria-expanded', String(expanded));
}

async function toggleHistory(assetId: string) {
  const container = document.querySelector(
    `[data-history-container][data-asset-id="${CSS.escape(assetId)}"]`
  ) as HTMLElement;
  if (!container) return;

  // Toggle: collapse if same asset clicked again
  if (activeAssetId === assetId) {
    container.classList.add('hidden');
    setExpandedState(assetId, false);
    activeAssetId = null;
    return;
  }

  // Collapse previous
  if (activeAssetId) {
    const prev = document.querySelector(
      `[data-history-container][data-asset-id="${CSS.escape(activeAssetId)}"]`
    ) as HTMLElement;
    if (prev) prev.classList.add('hidden');
    setExpandedState(activeAssetId, false);
  }

  // Show loading skeleton
  container.innerHTML =
    '<div class="flex justify-center py-4"><span class="loading loading-spinner loading-md"></span></div>';
  container.classList.remove('hidden');
  setExpandedState(assetId, true);
  activeAssetId = assetId;

  try {
    // Fetch server-rendered HTML
    const res = await csrfFetch(`/api/assets/${assetId}/history?limit=10&_render=html`);
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
  if (activeAssetId) {
    setExpandedState(activeAssetId, false);
  }
  activeAssetId = null;

  // Row click/keyboard to toggle history (skip if clicking buttons/links/dropdown menus)
  document.querySelectorAll<HTMLElement>('[data-asset-row]').forEach((row) => {
    if (initializedRows.has(row)) return;
    initializedRows.add(row);

    const assetId = row.dataset.assetId;
    const historyContainerId = assetId ? `asset-history-${assetId}` : undefined;

    row.classList.add('cursor-pointer');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', `Toggle ${row.dataset.assetName || 'asset'} history`);
    if (historyContainerId) {
      row.setAttribute('aria-controls', historyContainerId);
      // Set matching id on the history container
      const container = document.querySelector(
        `[data-history-container][data-asset-id="${CSS.escape(assetId!)}"]`
      );
      if (container) container.id = historyContainerId;
    }

    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking a button, link, dropdown menu, or within one
      if (target.closest('button, a, [data-dropdown-menu]')) return;

      if (assetId) toggleHistory(assetId);
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
        if (assetId) toggleHistory(assetId);
      } else if (e.key === 'Escape') {
        if (assetId && activeAssetId === assetId) toggleHistory(assetId);
      }
    });
  });
}
