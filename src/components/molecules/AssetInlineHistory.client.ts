import { csrfFetch } from '@/lib/csrf-client';

interface HistoryEntry {
  id: string;
  balance: string;
  notes: string | null;
  recorded_at: string;
}

let activeAssetId: string | null = null;
const initializedButtons = new WeakSet<Element>();

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function initInlineHistory() {
  // Reset stale state from previous page navigations
  activeAssetId = null;

  document.querySelectorAll<HTMLElement>('[data-toggle-history]').forEach((btn) => {
    if (initializedButtons.has(btn)) return;
    initializedButtons.add(btn);

    btn.addEventListener('click', async () => {
      const assetId = btn.dataset.assetId;
      if (!assetId) return;

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

        // Build table
        let html = `<table class="table table-sm w-full">
          <thead><tr>
            <th>Date</th><th class="text-right">Balance</th><th class="text-right">Change</th><th>Notes</th>
          </tr></thead><tbody>`;

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

          html += `<tr>
            <td class="text-sm">${date}</td>
            <td class="text-sm text-right font-mono">${balance.toLocaleString()}</td>
            <td class="text-sm text-right font-mono ${changeClass}">${i < entries.length - 1 ? changePrefix + change.toLocaleString() : '—'}</td>
            <td class="text-sm text-base-content/60 truncate max-w-32">${entry.notes ? escapeHtml(entry.notes) : '—'}</td>
          </tr>`;
        }

        html += '</tbody></table>';
        html += `<div class="text-center mt-2"><a href="/assets/history/${encodeURIComponent(assetId)}" class="link link-accent text-sm">View all history</a></div>`;
        container.innerHTML = html;
      } catch {
        container.innerHTML =
          '<p class="text-sm text-error text-center py-2">Failed to load history.</p>';
      }
    });
  });
}
