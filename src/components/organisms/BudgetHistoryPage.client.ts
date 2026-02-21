/**
 * Budget History Page Orchestrator
 *
 * Handles event coordination and data flow for the budget history page.
 * Manages year selection, view mode switching, data fetching, and rendering.
 */

import {
  initBudgetHistoryStore,
  setSelectedYear,
  setLoading,
  setViewMode,
  setMonthRange,
  selectedYear,
  isLoading,
  viewMode,
  monthRange,
  getState,
} from '@/lib/stores/budgetHistoryStore';
import { fetchBudgetHistoryHtml, fetchCategoryTrendsHtml } from '@/lib/api/budgetHistoryApiClient';
import {
  showLoadingState,
  hideLoadingState,
  renderFromHtmlResponse,
  updateYearToggleState,
} from './BudgetHistoryRenderer.client';
import { addToast } from '@/lib/stores/toastStore';

let controller: AbortController | null = null;
let unsubscribeSelectedYear: (() => void) | null = null;
let unsubscribeLoading: (() => void) | null = null;

// SSR data interface
interface SSRData {
  selectedYear: number;
  availableYears: number[];
  currency: Currency;
  viewMode?: 'monthly' | 'trends';
  monthRange?: 3 | 6 | 12;
}

/**
 * Initialize the budget history page
 */
export function initBudgetHistoryPage(): void {
  cleanupBudgetHistoryPage();
  controller = new AbortController();
  const { signal } = controller;

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
    viewMode: ssrData.viewMode,
    monthRange: ssrData.monthRange,
  });

  // Set up event listeners
  setupYearToggleListeners(signal);
  setupViewTabListeners();
  setupMonthRangeListeners();

  // Subscribe to store changes
  unsubscribeSelectedYear = selectedYear.subscribe((year) => {
    updateYearToggleState(year);
    updateUrlState(year);
  });

  unsubscribeLoading = isLoading.subscribe((loading) => {
    if (loading) {
      showLoadingState();
    } else {
      hideLoadingState();
    }
  });

  viewMode.subscribe((mode) => {
    updateViewMode(mode);
  });

  monthRange.subscribe(() => {
    // Re-fetch trends when month range changes (only if in trends mode)
    if (viewMode.get() === 'trends') {
      const state = getState();
      fetchAndRenderTrends(state.monthRange, state.currency);
    }
  });

  // If initial view mode is trends (from URL ?view=trends), fetch trends data
  if (ssrData.viewMode === 'trends') {
    fetchAndRenderTrends(ssrData.monthRange ?? 6, ssrData.currency);
  }
}

/**
 * Set up event listeners for year toggle buttons
 */
function setupYearToggleListeners(signal: AbortSignal): void {
  const buttons = document.querySelectorAll('[data-year-option]');

  buttons.forEach((btn) => {
    btn.addEventListener(
      'click',
      async (e: Event) => {
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
      },
      { signal }
    );
  });
}

/**
 * Set up event listeners for view mode tab buttons
 */
function setupViewTabListeners(): void {
  const tabs = document.querySelectorAll('[data-view-tab]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const mode = tab.getAttribute('data-view-tab') as 'monthly' | 'trends';
      if (!mode || mode === viewMode.get()) return;
      setViewMode(mode);

      if (mode === 'trends') {
        const state = getState();
        fetchAndRenderTrends(state.monthRange, state.currency);
      } else {
        const state = getState();
        fetchAndRender(state.selectedYear, state.currency);
      }
    });
  });
}

/**
 * Set up event listeners for month range selector buttons
 */
function setupMonthRangeListeners(): void {
  const buttons = document.querySelectorAll('[data-month-range]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const range = parseInt(btn.getAttribute('data-month-range') || '6', 10) as 3 | 6 | 12;
      if (range === monthRange.get()) return;
      setMonthRange(range);
    });
  });
}

/**
 * Update the UI when view mode changes
 */
function updateViewMode(mode: 'monthly' | 'trends'): void {
  const isTrends = mode === 'trends';

  // Update tab visual state
  document.querySelectorAll('[data-view-tab]').forEach((tab) => {
    const isActive = tab.getAttribute('data-view-tab') === mode;
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.classList.toggle('bg-base-100', isActive);
    tab.classList.toggle('shadow', isActive);
    tab.classList.toggle('text-primary', isActive);
    tab.classList.toggle('text-base-content/50', !isActive);
    tab.classList.toggle('hover:text-base-content/70', !isActive);
  });

  // Toggle year toggle vs month range visibility
  const yearToggle = document.querySelector('[data-year-toggle-group]');
  const monthRangeGroup = document.querySelector('[data-month-range-group]');
  const monthlyHeader = document.querySelector('[data-monthly-header]');

  if (yearToggle) yearToggle.classList.toggle('hidden', isTrends);
  if (monthRangeGroup) monthRangeGroup.classList.toggle('hidden', !isTrends);
  if (monthlyHeader) monthlyHeader.classList.toggle('hidden', isTrends);

  // Update URL
  const url = new URL(window.location.href);
  if (isTrends) {
    url.searchParams.set('view', 'trends');
    url.searchParams.delete('year');
  } else {
    url.searchParams.delete('view');
    url.searchParams.set('year', String(selectedYear.get()));
  }
  window.history.replaceState({}, '', url.toString());
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
 * Fetch category trends and render the results
 */
async function fetchAndRenderTrends(
  months: 3 | 6 | 12,
  currencyCode: Currency
): Promise<void> {
  setLoading(true);

  try {
    const response = await fetchCategoryTrendsHtml(months, currencyCode);

    // Don't render if view mode switched during fetch
    if (viewMode.get() !== 'trends') return;

    renderFromHtmlResponse(response);

    // Update month range button states
    document.querySelectorAll('[data-month-range]').forEach((btn) => {
      const range = parseInt(btn.getAttribute('data-month-range') || '0', 10);
      const isActive = range === months;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.classList.toggle('bg-base-100', isActive);
      btn.classList.toggle('shadow', isActive);
      btn.classList.toggle('text-primary', isActive);
      btn.classList.toggle('text-base-content/50', !isActive);
      btn.classList.toggle('hover:text-base-content/70', !isActive);
    });
  } catch (error) {
    if (viewMode.get() === 'trends') {
      const message = error instanceof Error ? error.message : 'Failed to load category trends';
      addToast(message, 'error');
      console.error('[BudgetHistoryPage] Trends fetch error:', error);
    }
  } finally {
    if (viewMode.get() === 'trends') {
      setLoading(false);
    }
  }
}

/**
 * Update URL with current year selection
 */
function updateUrlState(year: number): void {
  // Only update URL with year if in monthly view
  if (viewMode.get() !== 'monthly') return;

  const url = new URL(window.location.href);
  url.searchParams.set('year', String(year));

  // Update URL without page reload
  window.history.replaceState({}, '', url.toString());
}

function cleanupBudgetHistoryPage(): void {
  controller?.abort();
  controller = null;
  unsubscribeSelectedYear?.();
  unsubscribeSelectedYear = null;
  unsubscribeLoading?.();
  unsubscribeLoading = null;
}

/**
 * Re-export for use in inline scripts
 */
export { initBudgetHistoryPage as init };

document.addEventListener('astro:page-load', initBudgetHistoryPage);
document.addEventListener('astro:before-swap', cleanupBudgetHistoryPage);
