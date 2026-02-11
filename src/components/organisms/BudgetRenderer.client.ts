/**
 * Budget Renderer
 *
 * DOM rendering functions for the budget page.
 * Uses server-rendered HTML fragments (HTMX-style) for consistency
 * between SSR and client-side updates.
 *
 * Part of the Interactive Page Architecture pattern.
 * See: docs/architecture/002-interactive-pages.md
 *
 * Uses Motion for animations and respects prefers-reduced-motion.
 */

import { animate } from 'motion/mini';
import { animationDuration } from '@/lib/tokens';
import type { FetchBudgetOverviewHtmlResponse } from '@/lib/api/budgetApiClient';

// Check if user prefers reduced motion
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animation durations
const ANIMATION_DURATION = prefersReducedMotion() ? 0 : animationDuration.normal;
const STAGGER_DELAY = prefersReducedMotion() ? 0 : 0.05;

// =============================================================================
// SCREEN READER ANNOUNCEMENTS
// =============================================================================

/**
 * Create or get live region for screen reader announcements
 */
function getLiveRegion(): HTMLElement {
  let liveRegion = document.getElementById('budget-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'budget-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

/**
 * Announce a message to screen readers
 */
function announceToScreenReader(message: string): void {
  const liveRegion = getLiveRegion();
  // Clear then set to trigger announcement
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 50);
}

// =============================================================================
// LOADING STATE FUNCTIONS
// =============================================================================

/**
 * Show loading state for the budget page
 */
export function showLoadingState(): void {
  const summaryContainer = document.getElementById('budget-summary-container');
  const cardsContainer = document.getElementById('budget-cards-container');
  const adviceContainer = document.getElementById('budget-advice-container');

  [summaryContainer, cardsContainer, adviceContainer].forEach((container) => {
    if (container) {
      container.classList.add('opacity-50', 'pointer-events-none');
      container.setAttribute('aria-busy', 'true');
    }
  });

  announceToScreenReader('Loading budget data...');
}

/**
 * Hide loading state for the budget page
 */
export function hideLoadingState(): void {
  const summaryContainer = document.getElementById('budget-summary-container');
  const cardsContainer = document.getElementById('budget-cards-container');
  const adviceContainer = document.getElementById('budget-advice-container');

  [summaryContainer, cardsContainer, adviceContainer].forEach((container) => {
    if (container) {
      container.classList.remove('opacity-50', 'pointer-events-none');
      container.removeAttribute('aria-busy');
    }
  });
}

// =============================================================================
// HTML INJECTION FUNCTIONS (Server-rendered HTML)
// =============================================================================

/**
 * Render budget summary section from server-rendered HTML
 */
export function renderSummaryHtml(html: string): void {
  const container = document.getElementById('budget-summary-container');
  if (!container) {
    console.error('[BudgetRenderer] #budget-summary-container not found!');
    return;
  }

  container.innerHTML = html;

  if (!prefersReducedMotion()) {
    animate(container, { opacity: [0.5, 1] }, { duration: ANIMATION_DURATION });
  }

  announceToScreenReader('Budget summary updated');
}

/**
 * Render budget cards grid from server-rendered HTML
 * Injects into the [data-view="card"] sub-container to preserve sibling views.
 */
export function renderCardsHtml(html: string): void {
  const cardView = document.querySelector(
    '#budget-cards-container [data-view="card"]'
  ) as HTMLElement;
  if (!cardView) {
    console.error('[BudgetRenderer] #budget-cards-container [data-view="card"] not found!');
    return;
  }

  cardView.innerHTML = html;

  // Animate cards with stagger effect
  if (!prefersReducedMotion()) {
    const cards = cardView.querySelectorAll('[data-budget-card]');
    cards.forEach((card, index) => {
      animate(
        card as HTMLElement,
        { opacity: [0, 1], y: [10, 0] },
        { duration: ANIMATION_DURATION, delay: index * STAGGER_DELAY }
      );
    });
  }

  const cardCount = cardView.querySelectorAll('[data-budget-card]').length;
  announceToScreenReader(
    cardCount > 0 ? `${cardCount} budget cards loaded` : 'No budget categories found'
  );
}

/**
 * Render budget table from server-rendered HTML
 * Injects into the [data-view="table"] sub-container to preserve sibling views.
 */
export function renderTableHtml(html: string): void {
  const tableView = document.querySelector(
    '#budget-cards-container [data-view="table"]'
  ) as HTMLElement;
  if (!tableView) {
    console.error('[BudgetRenderer] #budget-cards-container [data-view="table"] not found!');
    return;
  }

  tableView.innerHTML = html;
}

/**
 * Render budget advice banner from server-rendered HTML
 */
export function renderAdviceHtml(html: string): void {
  const container = document.getElementById('budget-advice-container');
  if (!container) {
    console.error('[BudgetRenderer] #budget-advice-container not found!');
    return;
  }

  container.innerHTML = html;

  // Animate advice banner with slide-in effect
  if (!prefersReducedMotion() && html.trim()) {
    animate(container, { opacity: [0, 1], x: [-20, 0] }, { duration: ANIMATION_DURATION * 1.2 });
  }
}

/**
 * Render all partials from HTML response
 *
 * Convenience function that handles all partials from an API response.
 */
export function renderFromHtmlResponse(response: FetchBudgetOverviewHtmlResponse): void {
  const { partials } = response;

  if (partials.summary) {
    renderSummaryHtml(partials.summary);
  }

  if (partials.cards) {
    renderCardsHtml(partials.cards);
  }

  if (partials.table) {
    renderTableHtml(partials.table);
  }

  if (partials.advice !== undefined) {
    renderAdviceHtml(partials.advice);
  }

  if (partials.meta) {
    updateCategoryBudgetMeta(partials.meta);
  }
}

/**
 * Update the data-expense-categories attribute on the budget container.
 *
 * After HTML refresh, the container's category-budget mapping is stale.
 * The API includes a meta partial with fresh category/budget ID data
 * so inline editing can look up budget IDs for newly created budgets.
 */
function updateCategoryBudgetMeta(metaJson: string): void {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return;

  try {
    // Validate JSON is parseable before setting attribute
    const meta = JSON.parse(metaJson) as Array<{ id: string; budget_id: string }>;
    if (!Array.isArray(meta)) return;

    // Merge with existing categories to preserve fields not in meta (e.g., name, type)
    const existingJson = container.getAttribute('data-expense-categories');
    if (existingJson) {
      const existing = JSON.parse(existingJson) as Array<Record<string, unknown>>;
      const metaMap = new Map(meta.map((m) => [m.id, m]));

      const merged = existing.map((cat) => {
        const fresh = metaMap.get(cat.id as string);
        return fresh ? { ...cat, budget_id: fresh.budget_id } : cat;
      });

      // Add any categories from meta that weren't in existing (new budgets)
      for (const m of meta) {
        if (!existing.some((cat) => cat.id === m.id)) {
          merged.push(m);
        }
      }

      container.setAttribute('data-expense-categories', JSON.stringify(merged));
    } else {
      container.setAttribute('data-expense-categories', metaJson);
    }
  } catch {
    // Silently ignore parse errors — inline edit will show "refresh page" message
  }
}

/**
 * Re-initialize any event listeners on dynamically loaded content
 *
 * Call this after injecting new HTML to ensure event handlers work.
 */
export function reinitializeEventHandlers(): void {
  // Re-dispatch a custom event that the page can listen to for setting up handlers
  document.dispatchEvent(new CustomEvent('budget-content-updated'));
}
