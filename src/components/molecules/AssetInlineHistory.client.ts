import { csrfFetch } from '@/lib/csrf-client';

interface HistoryEntry {
  id: string;
  balance: string;
  notes: string | null;
  recorded_at: string;
}

let activeAssetId: string | null = null;
const initializedButtons = new WeakSet<Element>();
const initializedRows = new WeakSet<Element>();

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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
    const res = await csrfFetch(`/api/assets/${assetId}/history?limit=10`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message);

    const entries: HistoryEntry[] = json.data;
    if (entries.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-base-content/60 text-center py-2">No history entries yet.</p>';
      return;
    }

    // Build table (CategoryIntelligenceTable pattern)
    let html = `<table class="w-full text-left border-collapse">
      <thead><tr class="bg-base-200/50 border-b border-base-300">
        <th class="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest w-1/5">Date</th>
        <th class="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest text-right w-1/4">Balance</th>
        <th class="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest text-right w-1/4">Change</th>
        <th class="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest">Notes</th>
      </tr></thead><tbody class="divide-y divide-base-300">`;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const balance = parseFloat(entry.balance);
      const prevBalance = i < entries.length - 1 ? parseFloat(entries[i + 1].balance) : balance;
      const change = balance - prevBalance;
      const changeClass =
        change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-base-content/50';
      const changePrefix = change > 0 ? '+' : '';
      const date = new Date(entry.recorded_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      html += `<tr class="group hover:bg-base-200/30 transition-colors">
        <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-base-content">${date}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-right font-bold text-base-content">${balance.toLocaleString()}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-right font-bold ${changeClass}">${i < entries.length - 1 ? changePrefix + change.toLocaleString() : '—'}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-base-content/60">${entry.notes ? escapeHtml(entry.notes) : '—'}</td>
      </tr>`;
    }

    html += '</tbody></table>';
    html += `<div class="text-center mt-2"><a href="/assets/history/${encodeURIComponent(assetId)}" class="link link-accent text-sm">View all history</a></div>`;
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

  // Row click to toggle history (skip if clicking buttons/links)
  document.querySelectorAll<HTMLElement>('[data-asset-row]').forEach((row) => {
    if (initializedRows.has(row)) return;
    initializedRows.add(row);

    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking a button, link, or within one
      if (target.closest('button, a, [data-toggle-history]')) return;

      const assetId = row.dataset.assetId;
      if (assetId) toggleHistory(assetId);
    });
  });
}
