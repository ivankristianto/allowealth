/**
 * WealthTrajectory Client Script
 *
 * Handles user input changes, fetches updated forecast data from API,
 * and updates the chart dynamically with debouncing for performance.
 */

import { addToast } from '@/lib/stores/toastStore';
import { formatCurrencyCompact } from '@/lib/formatting/currency-client';
import { attachAmountFormatter, stripAmountFormatting } from '@/lib/formatting/amount-input';
import type { ForecastResult } from '@/lib/forecast';

// Track in-flight requests per chart ID to prevent race conditions
const requestControllers = new Map<string, AbortController>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Initialize wealth trajectory input handlers
 */
export function initWealthTrajectoryInputs(): void {
  const controlContainers = document.querySelectorAll('[data-wealth-trajectory-controls]');

  controlContainers.forEach((container) => {
    if ((container as HTMLElement).dataset.initialized === 'true') return;
    (container as HTMLElement).dataset.initialized = 'true';

    const topupInput = container.querySelector('input[name="monthlyTopup"]') as HTMLInputElement;
    const apyInput = container.querySelector('input[name="annualRate"]') as HTMLInputElement;

    if (!topupInput || !apyInput) return;

    attachAmountFormatter(topupInput, 'IDR');

    // Get the chart container to find the chart ID
    const chartContainer = container
      .closest('[role="region"]')
      ?.querySelector('[data-chart-id]') as HTMLElement;
    if (!chartContainer) return;

    const chartId = chartContainer.getAttribute('data-chart-id');
    if (!chartId) return;

    const scheduleForecastFetch = () => {
      const existingTimer = debounceTimers.get(chartId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(async () => {
        const monthlyTopup = parseFloat(stripAmountFormatting(topupInput.value, 'IDR')) || 0;
        const annualRate = parseFloat(apyInput.value) || 0;

        // Validate inputs
        if (monthlyTopup < 0 || annualRate < 0 || annualRate > 100) {
          return;
        }

        await fetchAndUpdateForecast(chartId, monthlyTopup, annualRate);
      }, 500);

      debounceTimers.set(chartId, timer);
    };

    // Attach input event listeners
    topupInput.addEventListener('input', scheduleForecastFetch);
    apyInput.addEventListener('input', scheduleForecastFetch);
  });
}

/**
 * Fetch updated forecast data from API and update chart
 */
async function fetchAndUpdateForecast(
  chartId: string,
  monthlyTopup: number,
  annualRate: number
): Promise<void> {
  try {
    // Cancel previous request for this chart if exists
    if (requestControllers.has(chartId)) {
      requestControllers.get(chartId)?.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    requestControllers.set(chartId, controller);

    // Show loading state
    // @TODO: P2 - UX: Add loading spinner overlay instead of just opacity change for better visibility
    const chartContainer = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (chartContainer) {
      chartContainer.classList.add('opacity-50', 'pointer-events-none');
    }

    // Fetch new forecast data with abort signal
    const response = await fetch(
      `/api/forecast?monthlyTopup=${monthlyTopup}&annualRate=${annualRate}&years=10`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch forecast data');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response format');
    }

    const forecastData: ForecastResult = result.data;

    // Update chart data
    updateChart(chartId, forecastData);

    // Update summary cards
    updateSummaryCards(chartId, forecastData.summary, forecastData.input);

    // Remove loading state
    if (chartContainer) {
      chartContainer.classList.remove('opacity-50', 'pointer-events-none');
    }

    // Clean up request controller
    requestControllers.delete(chartId);
  } catch (error) {
    // Don't show error if request was aborted (normal behavior)
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    console.error('Error fetching forecast:', error);

    // Remove loading state
    const chartContainer = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (chartContainer) {
      chartContainer.classList.remove('opacity-50', 'pointer-events-none');
    }

    // Show user-friendly error toast notification
    addToast('Failed to update forecast. Please try again.', 'error');

    // Clean up request controller
    requestControllers.delete(chartId);
  }
}

/**
 * Update chart with new forecast data
 */
function updateChart(chartId: string, forecastData: ForecastResult): void {
  // Access the global charts object from the Astro script
  const charts = (window as any).wealthTrajectoryCharts || {};
  const chartInstance = charts[chartId];

  if (!chartInstance?.chart) {
    console.warn('Chart instance not found:', chartId);
    return;
  }

  const chart = chartInstance.chart;
  const data = forecastData.dataPoints;

  // Update chart data
  chart.data.labels = data.map((d) => d.dateLabel);
  chart.data.datasets[0].data = data.map((d) => d.forecastBalance);
  chart.data.datasets[1].data = data.map((d) => d.realBalance);

  // Update chart with animation
  chart.update('active');

  // Store updated data
  chartInstance.data = data;
}

/**
 * Update summary cards with new statistics
 */
function updateSummaryCards(
  chartId: string,
  summary: {
    year10Target: number;
    totalInterest: number;
    growthMultiple: number;
    currentTotal: number;
  },
  input: { monthlyTopup: number; annualRate: number; years: number }
): void {
  // Find the chart container's parent region
  const chartContainer = document.querySelector(`[data-chart-id="${chartId}"]`);
  const region = chartContainer?.closest('[role="region"]');
  if (!region) return;

  // Find summary card containers (they have the stat labels)
  const summaryCards = region.querySelectorAll('.grid > div');

  if (summaryCards.length >= 3) {
    // Update Year 10 Target
    const year10TargetCard = summaryCards[0];
    const year10TargetValue = year10TargetCard.querySelector('h3');
    if (year10TargetValue) {
      year10TargetValue.textContent = formatCurrencyCompact(summary.year10Target);
    }
    // Update label with correct year
    const year10Label = year10TargetCard.querySelector('[class*="StatLabel"]');
    if (year10Label) {
      year10Label.textContent = `YEAR ${input.years} TARGET`;
    }

    // Update Total Interest Earned
    const totalInterestCard = summaryCards[1];
    const totalInterestValue = totalInterestCard.querySelector('h3');
    if (totalInterestValue) {
      totalInterestValue.textContent = formatCurrencyCompact(summary.totalInterest);
    }

    // Update Growth Multiple
    const growthMultipleCard = summaryCards[2];
    const growthMultipleValue = growthMultipleCard.querySelector('h3');
    if (growthMultipleValue) {
      growthMultipleValue.textContent = `${summary.growthMultiple.toFixed(2)}x`;
    }
  }
}

function cleanupWealthTrajectory(): void {
  debounceTimers.forEach((timer) => clearTimeout(timer));
  debounceTimers.clear();

  requestControllers.forEach((controller) => controller.abort());
  requestControllers.clear();
}

initWealthTrajectoryInputs();
document.addEventListener('astro:page-load', initWealthTrajectoryInputs);
document.addEventListener('astro:before-swap', cleanupWealthTrajectory);
