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

import { animate } from 'motion';
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
 */
export function renderCardsHtml(html: string): void {
  const container = document.getElementById('budget-cards-container');
  if (!container) {
    console.error('[BudgetRenderer] #budget-cards-container not found!');
    return;
  }

  container.innerHTML = html;

  // Animate cards with stagger effect
  if (!prefersReducedMotion()) {
    const cards = container.querySelectorAll('[data-budget-card]');
    cards.forEach((card, index) => {
      animate(
        card as HTMLElement,
        { opacity: [0, 1], y: [10, 0] },
        { duration: ANIMATION_DURATION, delay: index * STAGGER_DELAY }
      );
    });
  }

  const cardCount = container.querySelectorAll('[data-budget-card]').length;
  announceToScreenReader(
    cardCount > 0 ? `${cardCount} budget cards loaded` : 'No budget categories found'
  );
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

  if (partials.advice !== undefined) {
    renderAdviceHtml(partials.advice);
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
