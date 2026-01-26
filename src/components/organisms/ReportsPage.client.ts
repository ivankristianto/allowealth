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
  showLoadingState,
  hideLoadingState,
  announceToScreenReader,
} from './ReportsRenderer.client';
import { addToast } from '@/lib/stores/toastStore';

// Current report state
interface ReportState {
  range: 'monthly' | 'yearly';
  period: string;
}

let currentState: ReportState = {
  range: 'monthly',
  period: '2024-02', // Default to February 2024
};

/**
 * Update URL query params without page reload
 */
function updateUrl(range: 'monthly' | 'yearly', period: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('range', range);
  url.searchParams.set('period', period);
  window.history.replaceState({}, '', url.toString());
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
  period: string
): Promise<{ summary?: string; charts?: string; table?: string }> {
  const params = new URLSearchParams();
  params.set('_render', 'html');
  params.set('_partial', 'all');
  params.set('range', range);
  params.set('period', period);

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

  try {
    // Fetch HTML fragments
    const partials = await fetchReportHtml(currentState.range, currentState.period);

    // Render partials
    if (partials.summary) {
      renderSummaryHtml(partials.summary);
    }
    if (partials.charts) {
      renderChartsHtml(partials.charts);
    }
    if (partials.table) {
      renderTableHtml(partials.table);
    }

    // Hide loading states
    hideLoadingState('[data-summary-container]');
    hideLoadingState('[data-charts-container]');
    hideLoadingState('[data-table-container]');

    // Accessibility announcement
    const rangeLabel = currentState.range === 'monthly' ? 'Monthly' : 'Yearly';
    announceToScreenReader(`${rangeLabel} report data updated`);

    // Re-initialize drill-down button event handlers
    // @TODO: This might need to be revisited if drill-down is moved to a separate module
    reinitializeDrillDownHandlers();
  } catch (error) {
    console.error('Error fetching report data:', error);

    // Hide loading states
    hideLoadingState('[data-summary-container]');
    hideLoadingState('[data-charts-container]');
    hideLoadingState('[data-table-container]');

    // Show error toast
    addToast('Failed to load report data. Please try again.', 'error');
  }
}

/**
 * Handle report range change (monthly/yearly)
 */
function handleRangeChange(
  event: CustomEvent<{ range: 'monthly' | 'yearly'; newPeriod?: string | null }>
): void {
  currentState.range = event.detail.range;

  // Use the new period from the event if provided (when dropdown was updated)
  if (event.detail.newPeriod) {
    currentState.period = event.detail.newPeriod;
  } else if (currentState.range === 'yearly') {
    // Fallback: extract year from period (e.g., '2024-02' -> '2024')
    currentState.period = currentState.period.split('-')[0];
  }

  // Update URL with new state
  updateUrl(currentState.range, currentState.period);

  // Fetch and render new data
  fetchAndRenderReports();
}

/**
 * Handle report period change
 */
function handlePeriodChange(event: CustomEvent<{ period: string; label: string }>): void {
  currentState.period = event.detail.period;

  // Update URL with new state
  updateUrl(currentState.range, currentState.period);

  // Fetch and render new data
  fetchAndRenderReports();
}

/**
 * Re-initialize drill-down button handlers after HTML injection
 * This is needed because the buttons are replaced when HTML is injected
 */
function reinitializeDrillDownHandlers(): void {
  // Find all drill-down buttons and re-attach event listeners
  document.querySelectorAll('.category-drill-down-btn').forEach((btn) => {
    const buttonEl = btn as HTMLElement;

    // Remove existing listeners by cloning the node
    const newBtn = buttonEl.cloneNode(true) as HTMLElement;
    buttonEl.parentNode?.replaceChild(newBtn, buttonEl);

    // Add fresh listener
    newBtn.addEventListener('click', () => {
      const categoryId = newBtn.getAttribute('data-category-id');
      const categoryName = newBtn.getAttribute('data-category-name');
      const categoryIcon = newBtn.getAttribute('data-category-icon');
      const categoryColor = newBtn.getAttribute('data-category-color');
      const spent = parseFloat(newBtn.getAttribute('data-spent') || '0');
      const budgetLimit = newBtn.getAttribute('data-budget-limit');

      if (categoryId && categoryName) {
        // Dispatch custom event to open modal
        const event = new CustomEvent('open-category-drilldown', {
          detail: {
            categoryId,
            categoryName,
            categoryIcon,
            categoryColor,
            spent,
            budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null,
            period: currentState.period, // Use current period
          },
        });
        document.dispatchEvent(event);
      }
    });
  });
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
    const periodInput = document.getElementById('period-filter') as HTMLInputElement;
    if (periodInput && periodInput.value) {
      currentState.period = periodInput.value;
    }
  }

  // Listen for range change events from ReportSelector
  window.addEventListener('reportRangeChange', handleRangeChange as EventListener);

  // Listen for period change events from ReportSelector
  window.addEventListener('reportPeriodChange', handlePeriodChange as EventListener);

  // Initialize drill-down handlers for SSR content
  reinitializeDrillDownHandlers();
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
});
