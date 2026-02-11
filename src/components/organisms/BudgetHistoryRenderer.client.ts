/**
 * Budget History Renderer
 *
 * DOM rendering functions for the budget history page.
 * Uses server-rendered HTML fragments (HTMX-style) for consistency
 * between SSR and client-side updates.
 *
 * Uses Motion for animations and respects prefers-reduced-motion.
 */

import { animate } from 'motion/mini';
import { animationDuration } from '@/lib/tokens';
import type { FetchBudgetHistoryHtmlResponse } from '@/lib/api/budgetHistoryApiClient';

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
 * Show loading state for the budget history table
 */
export function showLoadingState(): void {
  const tableBody = document.getElementById('budget-history-table-body');
  const spinner = document.querySelector('[data-loading-spinner]');
  const historyIcon = document.querySelector('[data-history-icon]');

  if (tableBody) {
    tableBody.classList.add('opacity-50', 'pointer-events-none');
    tableBody.setAttribute('aria-busy', 'true');
  }

  if (spinner) {
    spinner.classList.remove('hidden');
  }

  if (historyIcon) {
    historyIcon.classList.add('hidden');
  }

  // Announce to screen readers
  const liveRegion = document.getElementById('budget-history-live-region');
  if (liveRegion) {
    liveRegion.textContent = 'Loading budget history...';
  }
}

/**
 * Hide loading state for the budget history table
 */
export function hideLoadingState(): void {
  const tableBody = document.getElementById('budget-history-table-body');
  const spinner = document.querySelector('[data-loading-spinner]');
  const historyIcon = document.querySelector('[data-history-icon]');

  if (tableBody) {
    tableBody.classList.remove('opacity-50', 'pointer-events-none');
    tableBody.removeAttribute('aria-busy');
  }

  if (spinner) {
    spinner.classList.add('hidden');
  }

  if (historyIcon) {
    historyIcon.classList.remove('hidden');
  }
}

// =============================================================================
// HTML INJECTION FUNCTIONS (Server-rendered HTML)
// =============================================================================

/**
 * Render budget history table from server-rendered HTML
 *
 * Uses server-rendered HTML instead of client-side DOM construction.
 * This ensures consistency between SSR and client-side updates.
 */
export function renderTableHtml(html: string): void {
  const tableBody = document.getElementById('budget-history-table-body');
  if (!tableBody) {
    console.error('[BudgetHistoryRenderer] #budget-history-table-body container not found!');
    return;
  }

  // Inject the HTML
  tableBody.innerHTML = html;

  // Animate new rows
  if (!prefersReducedMotion) {
    const rows = tableBody.querySelectorAll('[data-history-row]');
    rows.forEach((row, index) => {
      animate(
        row as HTMLElement,
        { opacity: [0, 1], y: [10, 0] },
        { duration: ANIMATION_DURATION, delay: index * STAGGER_DELAY }
      );
    });
  }

  // Announce to screen readers
  const liveRegion = document.getElementById('budget-history-live-region');
  if (liveRegion) {
    const count = tableBody.querySelectorAll('[data-history-row]').length;
    liveRegion.textContent =
      count > 0 ? `Showing ${count} months of budget history` : 'No budget history available';
  }
}

/**
 * Render from HTML response
 *
 * Convenience function that handles the table partial from an API response.
 */
export function renderFromHtmlResponse(response: FetchBudgetHistoryHtmlResponse): void {
  const { partials } = response;

  if (partials.table) {
    renderTableHtml(partials.table);
  }
}

// =============================================================================
// YEAR TOGGLE FUNCTIONS
// =============================================================================

/**
 * Update year toggle button states
 */
export function updateYearToggleState(selectedYear: number): void {
  const buttons = document.querySelectorAll('[data-year-option]');

  buttons.forEach((btn) => {
    const year = parseInt(btn.getAttribute('data-year-option') || '0', 10);
    const isActive = year === selectedYear;

    // Update aria-pressed
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

    // Update visual styles
    btn.classList.toggle('bg-base-100', isActive);
    btn.classList.toggle('shadow', isActive);
    btn.classList.toggle('text-primary', isActive);
    btn.classList.toggle('text-base-content/50', !isActive);
  });
}
