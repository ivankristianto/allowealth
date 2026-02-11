/**
 * Transactions Renderer
 *
 * DOM rendering functions for the transactions page.
 * Uses server-rendered HTML fragments (HTMX-style) for consistency
 * between SSR and client-side updates.
 *
 * Uses Motion for animations and respects prefers-reduced-motion.
 */

import { animate } from 'motion/mini';
import { animationDuration } from '@/lib/tokens';
import type { FetchTransactionsHtmlResponse } from '@/lib/api/transactionsApiClient';

// Check if user prefers reduced motion
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animation durations
const ANIMATION_DURATION = prefersReducedMotion ? 0 : animationDuration.normal;
const STAGGER_DELAY = prefersReducedMotion ? 0 : 0.05;

// =============================================================================
// LOADING STATE FUNCTIONS
// =============================================================================

/**
 * Show loading state for summary cards
 */
export function showSummaryLoadingState(): void {
  const summaryContainer = document.getElementById('summary-cards-container');
  const summarySkeleton = document.getElementById('summary-cards-skeleton');

  if (summaryContainer) {
    summaryContainer.classList.add('hidden');
    summaryContainer.setAttribute('aria-hidden', 'true');
  }
  if (summarySkeleton) {
    summarySkeleton.classList.remove('hidden');
    summarySkeleton.setAttribute('aria-busy', 'true');
    summarySkeleton.setAttribute('aria-label', 'Loading summary data...');
  }
}

/**
 * Hide loading state for summary cards
 */
export function hideSummaryLoadingState(): void {
  const summaryContainer = document.getElementById('summary-cards-container');
  const summarySkeleton = document.getElementById('summary-cards-skeleton');

  if (summarySkeleton) {
    summarySkeleton.classList.add('hidden');
    summarySkeleton.removeAttribute('aria-busy');
    summarySkeleton.removeAttribute('aria-label');
  }
  if (summaryContainer) {
    summaryContainer.classList.remove('hidden');
    summaryContainer.removeAttribute('aria-hidden');
  }
}

/**
 * Show loading state for transaction list
 */
export function showLoadingState(): void {
  const skeleton = document.getElementById('transaction-list-skeleton');
  const list = document.getElementById('transaction-list');

  if (skeleton) skeleton.classList.remove('hidden');
  if (list) list.classList.add('opacity-50', 'pointer-events-none');

  // Show summary cards loading state
  showSummaryLoadingState();

  // Announce to screen readers
  const liveRegion = document.getElementById('transactions-live-region');
  if (liveRegion) {
    liveRegion.textContent = 'Loading transactions...';
  }
}

/**
 * Hide loading state for transaction list
 */
export function hideLoadingState(): void {
  const skeleton = document.getElementById('transaction-list-skeleton');
  const list = document.getElementById('transaction-list');

  if (skeleton) skeleton.classList.add('hidden');
  if (list) list.classList.remove('opacity-50', 'pointer-events-none');

  // Hide summary cards loading state
  hideSummaryLoadingState();
}

// =============================================================================
// ANIMATION HELPERS
// =============================================================================

/**
 * Animate row removal with collapse effect
 */
export async function animateRowRemoval(row: HTMLElement): Promise<void> {
  if (prefersReducedMotion) {
    row.remove();
    return;
  }

  await animate(
    row,
    {
      opacity: [1, 0],
      height: [row.offsetHeight, 0],
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },
    { duration: ANIMATION_DURATION }
  ).finished;

  row.remove();
}

// =============================================================================
// HTML INJECTION FUNCTIONS (Server-rendered HTML)
// =============================================================================

/**
 * Render transaction list from server-rendered HTML
 *
 * Uses server-rendered HTML instead of client-side DOM construction.
 * This ensures consistency between SSR and client-side updates.
 */
export function renderTransactionListHtml(html: string): void {
  const listContainer = document.getElementById('transaction-list');
  if (!listContainer) {
    console.error('[TransactionsRenderer] #transaction-list container not found!');
    return;
  }

  // Inject the HTML
  listContainer.innerHTML = html;

  // Animate new rows
  if (!prefersReducedMotion) {
    const rows = listContainer.querySelectorAll('[data-transaction-card]');
    rows.forEach((row, index) => {
      animate(
        row as HTMLElement,
        { opacity: [0, 1], y: [10, 0] },
        { duration: ANIMATION_DURATION, delay: index * STAGGER_DELAY }
      );
    });
  }

  // Announce to screen readers
  const liveRegion = document.getElementById('transactions-live-region');
  if (liveRegion) {
    const count = listContainer.querySelectorAll('[data-transaction-card]').length;
    liveRegion.textContent = count > 0 ? `Showing ${count} transactions` : 'No transactions found';
  }
}

/**
 * Render summary cards from server-rendered HTML
 */
export function renderSummaryCardsHtml(html: string): void {
  const summaryContainer = document.getElementById('summary-cards-container');
  if (!summaryContainer) {
    // Try to find parent container and replace
    const skeleton = document.getElementById('summary-cards-skeleton');
    if (skeleton && skeleton.parentElement) {
      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const newSummary = temp.firstElementChild;
      if (newSummary) {
        skeleton.parentElement.insertBefore(newSummary, skeleton);
        skeleton.classList.add('hidden');
      }
    }
    return;
  }

  // Replace the summary container's innerHTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const newSummary = temp.firstElementChild;

  if (newSummary && summaryContainer.parentElement) {
    summaryContainer.parentElement.replaceChild(newSummary, summaryContainer);
  }
}

/**
 * Render pagination from server-rendered HTML
 */
export function renderPaginationHtml(html: string): void {
  const paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) {
    console.error('[TransactionsRenderer] #pagination-container not found!');
    return;
  }

  // Replace the entire pagination container
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const newPagination = temp.firstElementChild;

  if (newPagination && paginationContainer.parentElement) {
    paginationContainer.parentElement.replaceChild(newPagination, paginationContainer);
  }
}

/**
 * Render all partials from an HTML response
 *
 * Convenience function that handles all three partials from a single API response.
 */
export function renderFromHtmlResponse(response: FetchTransactionsHtmlResponse): void {
  const { partials } = response;

  if (partials.list) {
    renderTransactionListHtml(partials.list);
  }

  if (partials.summary) {
    renderSummaryCardsHtml(partials.summary);
  }

  if (partials.pagination) {
    renderPaginationHtml(partials.pagination);
  }
}
