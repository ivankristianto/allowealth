import { csrfFetch } from '@/lib/csrf-client';

let activeAssetId: string | null = null;
const initializedButtons = new WeakSet<Element>();
const initializedRows = new WeakSet<Element>();

async function toggleHistory(assetId: string) {
  const container = document.querySelector(
    `[data-history-container][data-asset-id="${CSS.escape(assetId)}"]`
  ) as HTMLElement;
  if (!container) return;

  // Toggle: collapse if same asset clicked again
  if (activeAssetId === assetId) {
    container.classList.add('hidden');
    activeAssetId = null;
    return;
  }

  // Collapse previous
  if (activeAssetId) {
    const prev = document.querySelector(
      `[data-history-container][data-asset-id="${CSS.escape(activeAssetId)}"]`
    ) as HTMLElement;
    if (prev) prev.classList.add('hidden');
  }

  // Show loading skeleton
  container.innerHTML =
    '<div class="flex justify-center py-4"><span class="loading loading-spinner loading-md"></span></div>';
  container.classList.remove('hidden');
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
  activeAssetId = null;

  // Toggle history button handlers
  document.querySelectorAll<HTMLElement>('[data-toggle-history]').forEach((btn) => {
    if (initializedButtons.has(btn)) return;
    initializedButtons.add(btn);

    btn.addEventListener('click', () => {
      const assetId = btn.dataset.assetId;
      if (assetId) toggleHistory(assetId);
    });
  });

  // Row click/keyboard to toggle history (skip if clicking buttons/links)
  document.querySelectorAll<HTMLElement>('[data-asset-row]').forEach((row) => {
    if (initializedRows.has(row)) return;
    initializedRows.add(row);

    row.classList.add('cursor-pointer');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Toggle ${row.dataset.assetName || 'asset'} history`);

    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking a button, link, or within one
      if (target.closest('button, a, [data-toggle-history]')) return;

      const assetId = row.dataset.assetId;
      if (assetId) toggleHistory(assetId);
    });

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const assetId = row.dataset.assetId;
        if (assetId) toggleHistory(assetId);
      } else if (e.key === 'Escape') {
        const assetId = row.dataset.assetId;
        if (assetId && activeAssetId === assetId) toggleHistory(assetId);
      }
    });
  });
}
