/**
 * Budget Page Orchestrator
 *
 * Coordinates fetching, rendering, and event handling for the budget page.
 * Manages budget updates, copy operations, and data refresh.
 *
 * Part of the Interactive Page Architecture pattern.
 * See: docs/architecture/002-interactive-pages.md
 */

import {
  fetchBudgetOverviewHtml,
  cancelPendingRequest,
  type BudgetFetchOptions,
} from '@/lib/api/budgetApiClient';
import {
  showLoadingState,
  hideLoadingState,
  renderFromHtmlResponse,
  reinitializeEventHandlers,
} from './BudgetRenderer.client';
import { addToast } from '@/lib/stores/toastStore';

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

interface PageState {
  year: number;
  month: number;
  currency: 'IDR' | 'USD';
}

let state: PageState | null = null;
let isCleanedUp = false;

/**
 * Validate and parse currency value (P1: runtime validation)
 */
function getValidCurrency(value: string | null): 'IDR' | 'USD' {
  if (value === 'USD') return 'USD';
  return 'IDR'; // Default to IDR for any invalid value
}

/**
 * Get page state from DOM data attributes
 */
function getPageState(): PageState | null {
  const container = document.querySelector('[data-budget-page]');
  if (!container) return null;

  const year = parseInt(container.getAttribute('data-year') || '0', 10);
  const month = parseInt(container.getAttribute('data-month') || '0', 10);
  const currency = getValidCurrency(container.getAttribute('data-currency'));

  if (!year || !month) return null;

  return { year, month, currency };
}

/**
 * Update page state data attributes
 *
 * Used when navigating between months dynamically (future enhancement).
 */
export function updatePageStateAttributes(newState: PageState): void {
  const container = document.querySelector('[data-budget-page]');
  if (!container) return;

  container.setAttribute('data-year', String(newState.year));
  container.setAttribute('data-month', String(newState.month));
  container.setAttribute('data-currency', newState.currency);

  // Update internal state
  state = newState;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Refresh budget data from the server
 *
 * Fetches fresh HTML for all partials and updates the DOM.
 */
export async function refreshBudgetData(options: BudgetFetchOptions = {}): Promise<void> {
  if (!state) {
    console.error('[BudgetPage] Cannot refresh - state not initialized');
    return;
  }

  showLoadingState();

  try {
    const response = await fetchBudgetOverviewHtml(state.year, state.month, {
      partial: options.partial || 'all',
      currency: state.currency,
    });

    // Guard against rendering after cleanup (P1: prevent DOM updates after cleanup)
    if (isCleanedUp) return;

    // Check if response is empty (likely aborted)
    if (!response.html) {
      return;
    }

    renderFromHtmlResponse(response);
    reinitializeEventHandlers();
  } catch (error) {
    // Don't show error if cleaned up (page is being transitioned)
    if (isCleanedUp) return;

    const message = error instanceof Error ? error.message : 'Failed to refresh budget data';
    addToast(message, 'error');
    console.error('[BudgetPage] Refresh error:', error);
  } finally {
    // Only hide loading if not cleaned up
    if (!isCleanedUp) {
      hideLoadingState();
    }
  }
}

/**
 * Refresh only a specific partial
 */
export async function refreshPartial(partial: 'summary' | 'cards' | 'advice'): Promise<void> {
  return refreshBudgetData({ partial });
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle budget-updated event
 *
 * Fired when a budget is created, updated, or deleted via modal.
 * Refreshes the entire budget view to ensure consistency.
 */
async function handleBudgetUpdated(
  _event: CustomEvent<{ categoryId: string; budgetAmount: string; currency: string }>
): Promise<void> {
  // Refresh all data to ensure consistency
  await refreshBudgetData();
}

/**
 * Handle budgets-copied event
 *
 * Fired when budgets are copied from current month to another month.
 * Navigates to the target month if budgets were actually copied.
 */
function handleBudgetsCopied(
  event: CustomEvent<{
    sourceMonth: number;
    sourceYear: number;
    targetMonth: number;
    targetYear: number;
    copiedCount: number;
    skippedCount: number;
  }>
): void {
  const { targetMonth, targetYear, copiedCount } = event.detail;

  // Only navigate if budgets were actually copied
  if (copiedCount > 0 && state) {
    const params = new URLSearchParams();
    params.set('year', targetYear.toString());
    params.set('month', targetMonth.toString());
    params.set('currency', state.currency);
    window.location.href = `/budget?${params.toString()}`;
  }
}

/**
 * Handle content-updated event
 *
 * Re-initializes edit button handlers and filter after new content is injected.
 */
function handleContentUpdated(): void {
  setupEditBudgetHandlers();
  setupFilterHandler();

  // Re-apply filter if there's a query in the input
  const filterInput = document.getElementById('budget-filter-input') as HTMLInputElement | null;
  if (filterInput?.value) {
    filterBudgetCards(filterInput.value);
  }
}

// =============================================================================
// CLIENT-SIDE FILTERING
// =============================================================================

let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Filter budget cards by category name
 *
 * Performs client-side filtering without API calls.
 * Shows/hides cards based on the search query.
 */
function filterBudgetCards(query: string): void {
  const normalizedQuery = query.toLowerCase().trim();
  const cards = document.querySelectorAll('[data-budget-card]');

  cards.forEach((card) => {
    const cardElement = card.closest('[role="listitem"]') || card.parentElement;
    if (!cardElement) return;

    // Get category name from the card
    const categoryName = card.querySelector('h3')?.textContent?.toLowerCase() || '';

    // Show/hide based on match
    if (!normalizedQuery || categoryName.includes(normalizedQuery)) {
      (cardElement as HTMLElement).style.display = '';
      (cardElement as HTMLElement).removeAttribute('aria-hidden');
    } else {
      (cardElement as HTMLElement).style.display = 'none';
      (cardElement as HTMLElement).setAttribute('aria-hidden', 'true');
    }
  });

  // Update empty state visibility
  updateFilterEmptyState(normalizedQuery, cards.length);
}

/**
 * Show/hide empty state when all cards are filtered out
 *
 * Uses server-rendered "no results" element (hidden by default) to comply
 * with Interactive Page Architecture - no client-side DOM construction.
 */
function updateFilterEmptyState(query: string, totalCards: number): void {
  const container = document.getElementById('budget-cards-container');
  if (!container) return;

  // Count visible cards
  const visibleCards = container.querySelectorAll(
    '[role="listitem"]:not([style*="display: none"])'
  ).length;

  // Get the server-rendered "no results" element
  const noResultsEl = container.querySelector('[data-filter-no-results]');
  if (!noResultsEl) return;

  // Toggle visibility based on filter state
  const shouldShow = query && visibleCards === 0 && totalCards > 0;
  noResultsEl.classList.toggle('hidden', !shouldShow);
}

/**
 * Set up filter input handler with debounce
 */
function setupFilterHandler(): void {
  const filterInput = document.getElementById('budget-filter-input') as HTMLInputElement | null;
  if (!filterInput) return;

  // Remove existing listener by cloning
  const newInput = filterInput.cloneNode(true) as HTMLInputElement;
  filterInput.parentNode?.replaceChild(newInput, filterInput);

  newInput.addEventListener('input', (e: Event) => {
    const query = (e.target as HTMLInputElement).value;

    // Debounce for performance (200ms for smoother typing)
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer);
    }

    filterDebounceTimer = setTimeout(() => {
      filterBudgetCards(query);
    }, 200);
  });

  // Handle clear (when user clicks X in search input)
  newInput.addEventListener('search', () => {
    filterBudgetCards(newInput.value);
  });

  // Handle Escape key to clear filter (keyboard accessibility)
  newInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      newInput.value = '';
      filterBudgetCards('');
      newInput.blur();
    }
  });
}

// =============================================================================
// EDIT BUDGET HANDLERS
// =============================================================================

/**
 * Set up edit budget button handlers
 *
 * Handles click events on budget card edit buttons to open the modal.
 */
function setupEditBudgetHandlers(): void {
  document.querySelectorAll('[data-edit-budget]').forEach((btn) => {
    // Remove existing listener to prevent duplicates
    const newBtn = btn.cloneNode(true) as HTMLElement;
    btn.parentNode?.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();

      const categoryId = newBtn.getAttribute('data-edit-budget');
      if (!categoryId) return;

      const container = document.querySelector('[data-budget-container]');
      const categoriesJson = container?.getAttribute('data-expense-categories');
      if (!categoriesJson) return;

      try {
        const categories = JSON.parse(categoriesJson);
        const category = categories.find(
          (c: { id: string; name: string; budget_amount: string }) => c.id === categoryId
        );

        if (!category) return;

        // Use the SetNewBudgetModal
        const modal = document.getElementById('set-new-budget-modal') as HTMLDialogElement;
        const categorySelect = document.getElementById(
          'set-new-budget-modal-category'
        ) as HTMLSelectElement;
        const amountInput = document.getElementById(
          'set-new-budget-modal-amount'
        ) as HTMLInputElement;

        if (!modal || !categorySelect || !amountInput) return;

        // Pre-select the category and set amount
        categorySelect.value = categoryId;
        amountInput.value = category.budget_amount || '';

        modal.showModal();
      } catch (err) {
        console.error('[BudgetPage] Error opening edit modal:', err);
        addToast('Failed to open edit modal. Please refresh the page.', 'error');
      }
    });
  });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the budget page orchestrator
 *
 * Sets up state, event listeners, and prepares for dynamic updates.
 */
export function initBudgetPage(): void {
  // Reset cleanup flag on initialization
  isCleanedUp = false;

  state = getPageState();
  if (!state) {
    console.error('[BudgetPage] Failed to initialize - page state not found');
    return;
  }

  // Set up edit budget button handlers
  setupEditBudgetHandlers();

  // Set up filter input handler
  setupFilterHandler();

  // Listen for budget updates
  document.addEventListener('budget-updated', handleBudgetUpdated as EventListener);

  // Listen for budgets copied
  document.addEventListener('budgets-copied', handleBudgetsCopied as EventListener);

  // Listen for content updates (for re-initializing handlers)
  document.addEventListener('budget-content-updated', handleContentUpdated);
}

/**
 * Cleanup function for page transitions
 *
 * Removes event listeners, cancels pending requests, and clears timers.
 */
export function cleanup(): void {
  isCleanedUp = true;
  cancelPendingRequest();

  // Clear debounce timer to prevent stale DOM operations after navigation
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = null;
  }

  document.removeEventListener('budget-updated', handleBudgetUpdated as EventListener);
  document.removeEventListener('budgets-copied', handleBudgetsCopied as EventListener);
  document.removeEventListener('budget-content-updated', handleContentUpdated);
  state = null;
}

/**
 * Re-export for use in inline scripts
 */
export { initBudgetPage as init };
