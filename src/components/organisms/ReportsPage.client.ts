/**
 * Reports Page Orchestrator
 *
 * Client-side orchestration for interactive reports page.
 * Handles event listening, data fetching, and rendering coordination.
 *
 * Following the pattern from docs/architecture/002-interactive-pages.md
 */

import {
  parseHtmlPartials,
  renderSummaryHtml,
  renderChartsHtml,
  renderTableHtml,
  renderMembersHtml,
  renderSelectorHtml,
  showLoadingState,
  hideLoadingState,
  announceToScreenReader,
} from './ReportsRenderer.client';
import { buildReportUrl } from '@/lib/reporting/report-state';
import { addToast } from '@/lib/stores/toastStore';
import { navigate } from 'astro:transitions/client';
import { isValidCurrency } from '@/lib/constants/currency';

// Current report state
interface ReportState {
  range: 'monthly' | 'yearly';
  period: string;
  currency: Currency;
}

// Track if listeners are already attached to prevent duplicates
let listenersAttached = false;

/**
 * Generate default period based on current date
 * This is only used as a fallback if URL params and DOM elements don't provide values
 */
function getDefaultPeriod(range: 'monthly' | 'yearly'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-indexed to 1-indexed

  if (range === 'monthly') {
    const monthStr = month.toString().padStart(2, '0');
    return `${year}-${monthStr}`;
  } else {
    return year.toString();
  }
}

let currentState: ReportState = {
  range: 'monthly',
  period: getDefaultPeriod('monthly'),
  currency: 'IDR',
};

function resolvePeriodLabel(range: 'monthly' | 'yearly', period: string): string {
  if (range === 'yearly') return period;

  const [year, month] = period.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return period;

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function syncHeaderSubtitle(): void {
  const subtitle = document.querySelector('[data-header-subtitle]');
  if (!subtitle) return;
  subtitle.textContent = resolvePeriodLabel(currentState.range, currentState.period);
}

/**
 * Read active currency from cookie
 */
function getActiveCurrencyFromCookie(): Currency | null {
  const match = document.cookie.match(/(?:^|;\s*)activeCurrency=([^;]*)/);
  const value = match?.[1];
  return value && isValidCurrency(value) ? value : null;
}

/**
 * Update URL query params without page reload
 */
function updateUrl(range: 'monthly' | 'yearly', period: string): void {
  const url = buildReportUrl(window.location.pathname, {
    range,
    period,
  });
  window.history.replaceState({}, '', url);
}

/**
 * Read state from URL query params
 */
function readStateFromUrl(): Partial<ReportState> {
  const url = new URL(window.location.href);
  const range = url.searchParams.get('range');
  const period = url.searchParams.get('period');

  const state: Partial<ReportState> = {};

  if (range === 'monthly' || range === 'yearly') {
    state.range = range;
  }

  if (period) {
    state.period = period;
  }

  return state;
}

/**
 * Fetch report data as HTML fragments
 */
async function fetchReportHtml(
  range: 'monthly' | 'yearly',
  period: string,
  currency: Currency
): Promise<{ summary?: string; charts?: string; table?: string; members?: string }> {
  const params = new URLSearchParams();
  params.set('_render', 'html');
  params.set('_partial', 'all');
  params.set('range', range);
  params.set('period', period);
  params.set('currency', currency);

  const response = await fetch(`/api/reports?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch report data: ${response.statusText}`);
  }

  const html = await response.text();
  return parseHtmlPartials(html);
}

/**
 * Fetch and render all report sections
 */
async function fetchAndRenderReports(): Promise<void> {
  // Show loading states
  showLoadingState('[data-summary-container]');
  showLoadingState('[data-charts-container]');
  showLoadingState('[data-table-container]');
  showLoadingState('[data-member-table-container]');

  try {
    // Fetch HTML fragments
    const partials = await fetchReportHtml(
      currentState.range,
      currentState.period,
      currentState.currency
    );

    // Render partials — each render function clears its own loading state
    // after animation completes. Only call hideLoadingState as fallback
    // when no render function runs for that container.
    if (partials.summary) {
      renderSummaryHtml(partials.summary);
    } else {
      hideLoadingState('[data-summary-container]');
    }
    if (partials.charts) {
      renderChartsHtml(partials.charts);
    } else {
      hideLoadingState('[data-charts-container]');
    }
    if (partials.table) {
      renderTableHtml(partials.table);
    } else {
      hideLoadingState('[data-table-container]');
    }
    if (partials.members) {
      renderMembersHtml(partials.members);
    } else {
      hideLoadingState('[data-member-table-container]');
    }

    // Accessibility announcement
    const rangeLabel = currentState.range === 'monthly' ? 'Monthly' : 'Yearly';
    announceToScreenReader(`${rangeLabel} report data updated`);
  } catch (error) {
    console.error('Error fetching report data:', error);

    // Hide loading states on error
    hideLoadingState('[data-summary-container]');
    hideLoadingState('[data-charts-container]');
    hideLoadingState('[data-table-container]');
    hideLoadingState('[data-member-table-container]');

    // Show error toast
    addToast('Failed to load report data. Please try again.', 'error');
  }
}

/**
 * Fetch and render selector HTML
 */
async function fetchAndRenderSelector(): Promise<void> {
  try {
    const params = new URLSearchParams();
    params.set('_render', 'html');
    params.set('_partial', 'selector');
    params.set('range', currentState.range);
    params.set('period', currentState.period);
    params.set('currency', currentState.currency);

    const response = await fetch(`/api/reports?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch selector: ${response.statusText}`);
    }

    const html = await response.text();
    const partials = parseHtmlPartials(html);

    if (partials.selector) {
      renderSelectorHtml(partials.selector);
    }
  } catch (error) {
    console.error('Error fetching selector:', error);
  }
}

/**
 * Handle report range change (monthly/yearly)
 */
function handleRangeChange(event: CustomEvent<{ range: 'monthly' | 'yearly' }>): void {
  currentState.range = event.detail.range;

  // Fallback: convert period format to match new range
  if (currentState.range === 'yearly') {
    // Extract year from monthly period (e.g., '2024-02' -> '2024')
    currentState.period = currentState.period.split('-')[0];
  } else {
    // Convert yearly to monthly: append current month (e.g., '2024' -> '2024-01')
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    currentState.period = `${currentState.period}-${month}`;
  }

  // Update URL with new state
  updateUrl(currentState.range, currentState.period);
  syncHeaderSubtitle();

  // Fetch and render selector first, then data
  fetchAndRenderSelector().then(() => {
    fetchAndRenderReports();
  });
}

/**
 * Handle report period change
 */
function handlePeriodChange(event: CustomEvent<{ period: string; label: string }>): void {
  currentState.period = event.detail.period;

  // Update URL with new state
  updateUrl(currentState.range, currentState.period);
  syncHeaderSubtitle();

  // Fetch and render new data
  fetchAndRenderReports();
}

/**
 * Handle clickable table row navigation using event delegation
 * Supports rows with data-href attribute (e.g., member spending table)
 */
function handleRowClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  // Don't navigate if clicking an interactive element within the row
  if (target.closest('a, button')) return;
  const row = target.closest('tr[data-href]') as HTMLElement;
  if (!row) return;
  const href = row.dataset.href;
  if (href) navigate(href);
}

/**
 * Handle drill-down button clicks using event delegation
 * This eliminates memory leaks from re-attaching listeners after HTML injection
 * P1 fix: Use delegation pattern instead of per-button listeners (Issue #3 from code review)
 */
function handleDrillDownClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const btn = target.closest('[data-view-details]') as HTMLElement;

  if (!btn) return;

  const categoryId = btn.getAttribute('data-category-id');
  const categoryName = btn.getAttribute('data-category-name');
  const categoryIcon = btn.getAttribute('data-category-icon');
  const categoryColor = btn.getAttribute('data-category-color');
  const spent = parseFloat(btn.getAttribute('data-spent') || '0');
  const budgetLimit = btn.getAttribute('data-budget-limit');

  if (categoryId && categoryName) {
    // Dispatch custom event to open modal
    const customEvent = new CustomEvent('open-category-drilldown', {
      detail: {
        categoryId,
        categoryName,
        categoryIcon,
        categoryColor,
        spent,
        budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null,
        period: currentState.period, // Use current period
        currency: currentState.currency,
      },
    });
    document.dispatchEvent(customEvent);
  }
}

/**
 * Initialize reports page interactivity
 */
export function initReportsPage(): void {
  // First, read state from URL params (takes precedence)
  const urlState = readStateFromUrl();

  // Initialize state from URL or fall back to page elements
  if (urlState.range) {
    currentState.range = urlState.range;
  } else {
    const rangeButtons = document.querySelectorAll('[data-range]');
    rangeButtons.forEach((btn) => {
      if (btn.getAttribute('aria-pressed') === 'true') {
        currentState.range = btn.getAttribute('data-range') as 'monthly' | 'yearly';
      }
    });
  }

  if (urlState.period) {
    currentState.period = urlState.period;
  } else {
    // Try to read from PeriodNavigator
    const periodInput = document.querySelector('[data-period-input]') as HTMLInputElement;

    if (periodInput && periodInput.value) {
      currentState.period = periodInput.value;
    }
  }

  // Read currency from cookie (header-level switcher manages this)
  const cookieCurrency = getActiveCurrencyFromCookie();
  if (cookieCurrency) {
    currentState.currency = cookieCurrency;
  } else {
    const containerCurrency = document
      .querySelector('[data-current-currency]')
      ?.getAttribute('data-current-currency');
    if (containerCurrency && isValidCurrency(containerCurrency)) {
      currentState.currency = containerCurrency;
    }
  }

  syncHeaderSubtitle();

  // Only attach event listeners once to prevent duplicates
  if (!listenersAttached) {
    // Listen for range change events from ReportSelector
    window.addEventListener('reportRangeChange', handleRangeChange as EventListener);

    // Listen for period change events from ReportSelector
    window.addEventListener('reportPeriodChange', handlePeriodChange as EventListener);

    // Set up drill-down click delegation (once, at document level)
    document.addEventListener('click', handleDrillDownClick);

    // Clickable member table rows via event delegation (handles dynamic content)
    document.addEventListener('click', handleRowClick);

    listenersAttached = true;
  }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReportsPage);
} else {
  initReportsPage();
}

// Re-initialize on Astro page transitions
document.addEventListener('astro:page-load', initReportsPage);

// Cleanup on page transitions
document.addEventListener('astro:before-swap', () => {
  window.removeEventListener('reportRangeChange', handleRangeChange as EventListener);
  window.removeEventListener('reportPeriodChange', handlePeriodChange as EventListener);
  document.removeEventListener('click', handleDrillDownClick);
  document.removeEventListener('click', handleRowClick);
  listenersAttached = false;
});
