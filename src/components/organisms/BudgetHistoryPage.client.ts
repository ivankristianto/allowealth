/**
 * Budget History Page Orchestrator
 *
 * Handles event coordination and data flow for the budget history page.
 * Manages year selection, data fetching, and rendering.
 */

import {
  initBudgetHistoryStore,
  setSelectedYear,
  setLoading,
  selectedYear,
  isLoading,
  getState,
} from '@/lib/stores/budgetHistoryStore';
import { fetchBudgetHistoryHtml } from '@/lib/api/budgetHistoryApiClient';
import {
  showLoadingState,
  hideLoadingState,
  renderFromHtmlResponse,
  updateYearToggleState,
} from './BudgetHistoryRenderer.client';
import { addToast } from '@/lib/stores/toastStore';

// SSR data interface
interface SSRData {
  selectedYear: number;
  availableYears: number[];
  currency: Currency;
}

/**
 * Initialize the budget history page
 */
export function initBudgetHistoryPage(): void {
  // Get SSR data from the page container
  const pageContainer = document.getElementById('budget-history-page');
  if (!pageContainer) {
    console.error('[BudgetHistoryPage] Page container not found!');
    return;
  }

  const ssrDataAttr = pageContainer.getAttribute('data-ssr-data');
  if (!ssrDataAttr) {
    console.error('[BudgetHistoryPage] SSR data attribute not found!');
    return;
  }

  let ssrData: SSRData;
  try {
    ssrData = JSON.parse(ssrDataAttr);
  } catch (e) {
    console.error('[BudgetHistoryPage] Failed to parse SSR data:', e);
    return;
  }

  // Initialize the store with SSR data
  initBudgetHistoryStore({
    selectedYear: ssrData.selectedYear,
    availableYears: ssrData.availableYears,
    currency: ssrData.currency,
  });

  // Set up event listeners
  setupYearToggleListeners();

  // Subscribe to store changes
  selectedYear.subscribe((year) => {
    updateYearToggleState(year);
    updateUrlState(year);
  });

  isLoading.subscribe((loading) => {
    if (loading) {
      showLoadingState();
    } else {
      hideLoadingState();
    }
  });
}

/**
 * Set up event listeners for year toggle buttons
 */
function setupYearToggleListeners(): void {
  const buttons = document.querySelectorAll('[data-year-option]');

  buttons.forEach((btn) => {
    btn.addEventListener('click', async (e: Event) => {
      e.preventDefault();

      const yearAttr = btn.getAttribute('data-year-option');
      if (!yearAttr) return;

      const year = parseInt(yearAttr, 10);
      const state = getState();

      // Don't fetch if already selected
      if (year === state.selectedYear) return;

      // Update state and fetch new data
      setSelectedYear(year);
      await fetchAndRender(year, state.currency);
    });
  });
}

/**
 * Fetch budget history and render the results
 */
async function fetchAndRender(year: number, currencyCode: Currency): Promise<void> {
  setLoading(true);

  try {
    const response = await fetchBudgetHistoryHtml(year, currencyCode);

    // Don't render if another request was started (this request was superseded)
    if (selectedYear.get() !== year) {
      // Don't reset loading - the newer request will handle it
      return;
    }

    renderFromHtmlResponse(response);
  } catch (error) {
    // Only show error if this is still the active request
    if (selectedYear.get() === year) {
      const message = error instanceof Error ? error.message : 'Failed to load budget history';
      addToast(message, 'error');
      console.error('[BudgetHistoryPage] Fetch error:', error);
    }
  } finally {
    // Only reset loading if this is still the active request
    if (selectedYear.get() === year) {
      setLoading(false);
    }
  }
}

/**
 * Update URL with current year selection
 */
function updateUrlState(year: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set('year', String(year));

  // Update URL without page reload
  window.history.replaceState({}, '', url.toString());
}

/**
 * Re-export for use in inline scripts
 */
export { initBudgetHistoryPage as init };
