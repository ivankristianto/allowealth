/**
 * Account Categories Renderer
 *
 * DOM rendering functions for the account categories page.
 * Uses server-rendered HTML fragments (HTMX-style) for consistency
 * between SSR and client-side updates.
 *
 * Uses Motion for animations and respects prefers-reduced-motion.
 */

import { animate } from 'motion/mini';
import { animationDuration } from '@/lib/tokens';
import type { AccountCategoryHtmlResponse } from '@/lib/api/accountCategoryApiClient';

// Check if user prefers reduced motion
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animation durations
const ANIMATION_DURATION = prefersReducedMotion ? 0 : animationDuration.normal;
const STAGGER_DELAY = prefersReducedMotion ? 0 : 0.03;

// =============================================================================
// LOADING STATE FUNCTIONS
// =============================================================================

/**
 * Show loading state for categories table
 */
export function showLoadingState(): void {
  const table = document.querySelector('[data-testid="account-categories-table"]');
  if (table) {
    table.classList.add('opacity-50', 'pointer-events-none');
  }

  // Announce to screen readers
  const liveRegion = document.getElementById('categories-live-region');
  if (liveRegion) {
    liveRegion.textContent = 'Loading categories...';
  }
}

/**
 * Hide loading state for categories table
 */
export function hideLoadingState(): void {
  const table = document.querySelector('[data-testid="account-categories-table"]');
  if (table) {
    table.classList.remove('opacity-50', 'pointer-events-none');
  }
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
 * Render category table body from server-rendered HTML
 *
 * Uses server-rendered HTML instead of client-side DOM construction.
 * This ensures consistency between SSR and client-side updates.
 *
 * NOTE: Event delegation in the page script handles button clicks,
 * so we don't need to re-attach listeners here.
 */
export function renderCategoryTableHtml(html: string): void {
  const tableBody = document.querySelector('[data-category-table-body]') as HTMLElement;
  if (!tableBody) {
    console.error('[AccountCategoriesRenderer] [data-category-table-body] not found!');
    return;
  }

  // Find the parent table element
  const table = tableBody.closest('table');
  if (!table) {
    console.error('[AccountCategoriesRenderer] Parent table not found!');
    return;
  }

  // Store the current scroll position
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  // Inject the HTML - replace the tbody content
  tableBody.innerHTML = html;

  // Restore scroll position
  window.scrollTo(scrollX, scrollY);

  // Animate new rows
  if (!prefersReducedMotion) {
    const rows = tableBody.querySelectorAll('[data-category-row]');
    rows.forEach((row, index) => {
      animate(
        row as HTMLElement,
        { opacity: [0, 1], y: [10, 0] },
        { duration: ANIMATION_DURATION, delay: index * STAGGER_DELAY }
      );
    });
  }

  // Announce to screen readers
  const liveRegion = document.getElementById('categories-live-region');
  if (liveRegion) {
    const count = tableBody.querySelectorAll('[data-category-row]').length;
    liveRegion.textContent = count > 0 ? `Showing ${count} categories` : 'No categories found';
  }
}

/**
 * Render all partials from an HTML response
 *
 * Convenience function that handles partials from a single API response.
 */
export function renderFromHtmlResponse(response: AccountCategoryHtmlResponse): void {
  const { partials } = response;

  if (partials.table) {
    renderCategoryTableHtml(partials.table);
  }
}

// =============================================================================
// ACCESSIBILITY: Screen Reader Announcements
// =============================================================================

/**
 * Announce a message to screen readers
 *
 * Uses a live region for accessibility announcements.
 */
export function announceToScreenReader(message: string): void {
  const liveRegion = document.getElementById('categories-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
  }
}
