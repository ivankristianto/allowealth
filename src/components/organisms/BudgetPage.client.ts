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
import {
  setupInlineEditHandlers,
  cleanupInlineEdit,
  cancelEditMode,
} from './BudgetInlineEdit.client';

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
 * Fired when a budget is created via modal or updated via inline editing.
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
 * Handle budgets-initialized event
 *
 * Fired when all uninitialized budgets are created with amount=0.
 * Reloads the page to refresh button state, modal, and data attributes.
 */
function handleBudgetsInitialized(
  event: CustomEvent<{
    month: number;
    year: number;
    currency: string;
    initializedCount: number;
  }>
): void {
  const { initializedCount } = event.detail;

  if (initializedCount > 0) {
    window.location.reload();
  }
}

/**
 * Re-initialize budget allocations `<details>` elements after DOM replacement.
 * On desktop (lg breakpoint), the allocations section should auto-open.
 * The inline script in BudgetSummary.astro only runs on initial page load,
 * so after innerHTML replacement we must re-apply the open state.
 */
function initBudgetAllocations(): void {
  document.querySelectorAll<HTMLDetailsElement>('[data-budget-allocations]').forEach((details) => {
    const mq = window.matchMedia('(min-width: 1024px)');
    if (mq.matches) details.open = true;
  });
}

/**
 * Handle content-updated event
 *
 * Re-initializes edit button handlers and filter after new content is injected.
 */
function handleContentUpdated(): void {
  // Cancel any active inline edit before re-initializing — DOM was replaced,
  // so the edit UI is gone but module state (activeEditCategoryId) may linger.
  cancelEditMode();
  setupInlineEditHandlers();
  setupFilterHandler();
  setupSortHandler();

  // Re-initialize budget allocations details element (auto-open on desktop).
  // The inline script in BudgetSummary.astro only runs on initial page load,
  // so after innerHTML replacement we must re-apply the open state.
  initBudgetAllocations();

  // Re-apply filter if there's a query in the input
  const filterInput = document.getElementById('budget-filter-input') as HTMLInputElement | null;
  if (filterInput?.value) {
    filterBudgetCards(filterInput.value);
  }

  // Re-apply sort if a sort option is selected
  const sortSelect = document.getElementById('budget-sort-select') as HTMLSelectElement | null;
  if (sortSelect?.value) {
    sortBudgets(sortSelect.value);
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

  // Filter card view
  const cards = document.querySelectorAll('[data-budget-card]');
  cards.forEach((card) => {
    const cardElement = card.closest('[role="listitem"]') || card.parentElement;
    if (!cardElement) return;

    const categoryName = card.querySelector('h3')?.textContent?.toLowerCase() || '';

    if (!normalizedQuery || categoryName.includes(normalizedQuery)) {
      (cardElement as HTMLElement).style.display = '';
      (cardElement as HTMLElement).removeAttribute('aria-hidden');
    } else {
      (cardElement as HTMLElement).style.display = 'none';
      (cardElement as HTMLElement).setAttribute('aria-hidden', 'true');
    }
  });

  // Filter table view
  const tableRows = document.querySelectorAll('[data-budget-table-row]');
  tableRows.forEach((row) => {
    const categoryName = (row.getAttribute('data-category-name') || '').toLowerCase();

    if (!normalizedQuery || categoryName.includes(normalizedQuery)) {
      (row as HTMLElement).style.display = '';
      (row as HTMLElement).removeAttribute('aria-hidden');
    } else {
      (row as HTMLElement).style.display = 'none';
      (row as HTMLElement).setAttribute('aria-hidden', 'true');
    }
  });

  // Update empty state visibility for both views
  updateFilterEmptyState(normalizedQuery, cards.length, tableRows.length);
}

/**
 * Show/hide empty state when all items are filtered out
 *
 * Handles both card and table views. Uses server-rendered "no results"
 * elements (hidden by default) to comply with Interactive Page Architecture.
 */
function updateFilterEmptyState(query: string, totalCards: number, totalTableRows: number): void {
  // Card view empty state
  const cardContainer = document.getElementById('budget-cards-container');
  if (cardContainer) {
    const visibleCards = cardContainer.querySelectorAll(
      '[role="listitem"]:not([style*="display: none"])'
    ).length;
    const noResultsEl = cardContainer.querySelector('[data-filter-no-results]');
    if (noResultsEl) {
      const shouldShow = query && visibleCards === 0 && totalCards > 0;
      noResultsEl.classList.toggle('hidden', !shouldShow);
    }
  }

  // Table view empty state
  const tableContainer = document.querySelector('[data-view="table"]');
  if (tableContainer) {
    const visibleRows = tableContainer.querySelectorAll(
      '[data-budget-table-row]:not([style*="display: none"])'
    ).length;
    const noResultsEl = tableContainer.querySelector('[data-table-filter-no-results]');
    if (noResultsEl) {
      const shouldShow = query && visibleRows === 0 && totalTableRows > 0;
      (noResultsEl as HTMLElement).classList.toggle('hidden', !shouldShow);
    }
  }
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
// CLIENT-SIDE SORTING
// =============================================================================

/**
 * Sort budget cards and table rows based on selected criteria
 */
function sortBudgets(sortKey: string): void {
  // Sort card view
  const cardGrid = document.querySelector('[role="list"][aria-label="Budget categories"]');
  if (cardGrid) {
    const items = Array.from(
      cardGrid.querySelectorAll<HTMLElement>('[role="listitem"][data-sort-title]')
    );
    items.sort((a, b) => {
      if (sortKey === 'title-asc') {
        return (a.dataset.sortTitle || '').localeCompare(b.dataset.sortTitle || '');
      }
      if (sortKey === 'title-desc') {
        return (b.dataset.sortTitle || '').localeCompare(a.dataset.sortTitle || '');
      }
      if (sortKey === 'spent-desc') {
        return parseFloat(b.dataset.sortSpent || '0') - parseFloat(a.dataset.sortSpent || '0');
      }
      // Default: budget-desc
      return parseFloat(b.dataset.sortBudget || '0') - parseFloat(a.dataset.sortBudget || '0');
    });
    for (const item of items) {
      cardGrid.appendChild(item);
    }
  }

  // Sort table view
  const tableBody = document.querySelector('[data-budget-table] tbody');
  if (tableBody) {
    const rows = Array.from(tableBody.querySelectorAll<HTMLElement>('[data-budget-table-row]'));
    rows.sort((a, b) => {
      if (sortKey === 'title-asc') {
        return (a.dataset.sortTitle || '').localeCompare(b.dataset.sortTitle || '');
      }
      if (sortKey === 'title-desc') {
        return (b.dataset.sortTitle || '').localeCompare(a.dataset.sortTitle || '');
      }
      if (sortKey === 'spent-desc') {
        return parseFloat(b.dataset.sortSpent || '0') - parseFloat(a.dataset.sortSpent || '0');
      }
      // budget-desc
      return parseFloat(b.dataset.sortBudget || '0') - parseFloat(a.dataset.sortBudget || '0');
    });
    for (const row of rows) {
      tableBody.appendChild(row);
    }
  }
}

/**
 * Set up sort select handler
 */
function setupSortHandler(): void {
  const sortSelect = document.getElementById('budget-sort-select') as HTMLSelectElement | null;
  if (!sortSelect) return;

  // Remove existing listener by cloning
  const newSelect = sortSelect.cloneNode(true) as HTMLSelectElement;
  sortSelect.parentNode?.replaceChild(newSelect, sortSelect);

  newSelect.addEventListener('change', () => {
    sortBudgets(newSelect.value);
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

  // Set up inline edit handlers for editing existing budgets
  setupInlineEditHandlers();

  // Set up filter input handler
  setupFilterHandler();

  // Set up sort handler
  setupSortHandler();

  // Listen for budget updates
  document.addEventListener('budget-updated', handleBudgetUpdated as EventListener);

  // Listen for budgets copied
  document.addEventListener('budgets-copied', handleBudgetsCopied as EventListener);

  // Listen for budgets initialized
  document.addEventListener('budgets-initialized', handleBudgetsInitialized as EventListener);
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
  cleanupInlineEdit();
  cancelPendingRequest();

  // Clear debounce timer to prevent stale DOM operations after navigation
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = null;
  }

  document.removeEventListener('budget-updated', handleBudgetUpdated as EventListener);
  document.removeEventListener('budgets-copied', handleBudgetsCopied as EventListener);
  document.removeEventListener('budget-content-updated', handleContentUpdated);
  document.removeEventListener('budgets-initialized', handleBudgetsInitialized as EventListener);
  state = null;
}

/**
 * Re-export for use in inline scripts
 */
export { initBudgetPage as init };
