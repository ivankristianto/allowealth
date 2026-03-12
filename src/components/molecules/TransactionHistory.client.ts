/**
 * Transaction History Toggle
 *
 * Shared client-side module for toggling inline transaction history panels.
 * Used wherever TransactionCard is rendered (Transactions page, Dashboard,
 * CategoryDrilldown modal, etc.).
 *
 * Uses document-level event delegation so it works with dynamically injected
 * HTML (e.g. server-rendered partials, modal content).
 */

import { addToast } from '@/lib/stores/toastStore';
import { csrfFetch } from '@/lib/csrf-client';
let controller: AbortController | null = null;

/**
 * Toggle transaction history timeline.
 * Fetches history HTML on first expand, shows/hides on subsequent toggles.
 */
async function toggleHistory(transactionId: string, showAll = false): Promise<void> {
  const container = document.querySelector(
    `[data-history-container="${transactionId}"]`
  ) as HTMLElement | null;
  if (!container) return;

  const isVisible = !container.classList.contains('hidden');
  const hasLoaded = container.dataset.historyLoaded === 'true';
  const hasLoadedAll = container.dataset.historyAllLoaded === 'true';

  // If already visible and not requesting "show all", just hide
  if (isVisible && !showAll) {
    container.classList.add('hidden');
    return;
  }

  // Reuse cached HTML when possible
  if (!showAll && hasLoaded) {
    container.classList.remove('hidden');
    return;
  }

  if (showAll && hasLoadedAll) {
    container.classList.remove('hidden');
    return;
  }

  // Fetch history HTML
  try {
    const allParam = showAll ? '&all=true' : '';
    const response = await csrfFetch(
      `/api/transactions/${transactionId}/history?_render=html${allParam}`,
      {
        method: 'GET',
        headers: { Accept: 'text/html' },
      }
    );

    if (!response.ok) {
      addToast('Failed to load transaction history', 'error');
      return;
    }

    const html = await response.text();
    container.innerHTML = html;
    container.classList.remove('hidden');
    container.dataset.historyLoaded = 'true';
    if (showAll) {
      container.dataset.historyAllLoaded = 'true';
    }
  } catch {
    addToast('Failed to load transaction history', 'error');
  }
}

let initialized = false;

function handleHistoryToggleClick(e: Event): void {
  const target = e.target as HTMLElement;

  const historyBtn = target.closest('[data-toggle-history]');
  if (historyBtn) {
    e.preventDefault();
    const transactionId = historyBtn.getAttribute('data-toggle-history');
    if (transactionId) {
      toggleHistory(transactionId);
    }
    return;
  }

  const showAllBtn = target.closest('[data-show-all-history]');
  if (showAllBtn) {
    e.preventDefault();
    const transactionId = showAllBtn.getAttribute('data-show-all-history');
    if (transactionId) {
      toggleHistory(transactionId, true);
    }
  }
}

/**
 * Initialize document-level click delegation for history toggle buttons.
 * Safe to call multiple times — only attaches listener once.
 */
export function initTransactionHistory(): void {
  if (initialized) return;
  initialized = true;
  controller = new AbortController();
  const { signal } = controller;
  document.addEventListener('click', handleHistoryToggleClick, { signal });
}

function cleanupTransactionHistory(): void {
  controller?.abort();
  controller = null;
  initialized = false;
}

document.addEventListener('astro:page-load', initTransactionHistory);
document.addEventListener('astro:before-swap', cleanupTransactionHistory);
