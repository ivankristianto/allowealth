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
 *
 * Hides ALL summary containers (mobile + desktop) and shows skeletons.
 */
export function showSummaryLoadingState(): void {
  const summaryContainers = document.querySelectorAll<HTMLElement>('[data-summary-container]');
  const summarySkeleton = document.getElementById('summary-cards-skeleton');

  summaryContainers.forEach((container) => {
    container.classList.add('hidden');
    container.setAttribute('aria-hidden', 'true');
  });
  if (summarySkeleton) {
    summarySkeleton.classList.remove('hidden');
    summarySkeleton.setAttribute('aria-busy', 'true');
    summarySkeleton.setAttribute('aria-label', 'Loading summary data...');
  }
}

/**
 * Hide loading state for summary cards
 *
 * Shows ALL summary containers (mobile + desktop) and hides skeletons.
 */
export function hideSummaryLoadingState(): void {
  const summaryContainers = document.querySelectorAll<HTMLElement>('[data-summary-container]');
  const summarySkeleton = document.getElementById('summary-cards-skeleton');

  if (summarySkeleton) {
    summarySkeleton.classList.add('hidden');
    summarySkeleton.removeAttribute('aria-busy');
    summarySkeleton.removeAttribute('aria-label');
  }
  summaryContainers.forEach((container) => {
    container.classList.remove('hidden');
    container.removeAttribute('aria-hidden');
  });
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
 *
 * The partial renders both mobile and desktop containers. This function
 * replaces each existing [data-summary-container] with its matching
 * replacement from the new HTML (matched by ID).
 */
export function renderSummaryCardsHtml(html: string): void {
  const existingContainers = document.querySelectorAll<HTMLElement>('[data-summary-container]');

  // Parse the new HTML from the server partial
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const newContainers = temp.querySelectorAll<HTMLElement>('[data-summary-container]');

  if (existingContainers.length > 0 && newContainers.length > 0) {
    // Replace each existing container with its matching new container by ID
    existingContainers.forEach((existing) => {
      const matchId = existing.id;
      let replacement: HTMLElement | null = null;

      if (matchId) {
        replacement = temp.querySelector<HTMLElement>(`#${matchId}`);
      }

      // If no ID match, use order-based fallback (first new replaces first old, etc.)
      if (!replacement && newContainers.length === 1) {
        replacement = newContainers[0];
      }

      if (replacement && existing.parentElement) {
        existing.parentElement.replaceChild(replacement, existing);
      }
    });
    return;
  }

  // Fallback: no existing containers found, insert near skeleton
  const skeleton = document.getElementById('summary-cards-skeleton');
  if (skeleton && skeleton.parentElement) {
    // Insert all new containers before the skeleton
    newContainers.forEach((newContainer) => {
      skeleton.parentElement!.insertBefore(newContainer, skeleton);
    });
    skeleton.classList.add('hidden');
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
