/**
 * Overview Reports Page Orchestrator
 *
 * Lighter version of ReportsPage.client.ts for the overview page.
 * Manages summary, charts, wealth, and previews containers.
 */

import {
  parseHtmlPartials,
  renderSummaryHtml,
  renderChartsHtml,
  renderPreviewsHtml,
  renderWealthHtml,
  renderSelectorHtml,
  showLoadingState,
  hideLoadingState,
  announceToScreenReader,
} from './ReportsRenderer.client';
import { buildReportUrl } from '@/lib/reporting/report-state';
import { addToast } from '@/lib/stores/toastStore';
import { isValidCurrency, type Currency } from '@/lib/constants/currency';

interface ReportState {
  range: 'monthly' | 'yearly';
  period: string;
  currency: Currency;
}

let listenersAttached = false;
const OVERVIEW_PAGE_SELECTOR = '[data-report-page="overview"]';

function getOverviewPageRoot(): HTMLElement | null {
  return document.querySelector(OVERVIEW_PAGE_SELECTOR) as HTMLElement | null;
}

function getDefaultPeriod(range: 'monthly' | 'yearly'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (range === 'monthly') {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }
  return year.toString();
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

function getActiveCurrencyFromCookie(): Currency | null {
  const match = document.cookie.match(/(?:^|;\s*)activeCurrency=([^;]*)/);
  const value = match?.[1];
  return value && isValidCurrency(value) ? value : null;
}

function updateUrl(range: 'monthly' | 'yearly', period: string): void {
  const url = buildReportUrl(window.location.pathname, { range, period });
  window.history.replaceState({}, '', url);
}

function readStateFromUrl(): Partial<ReportState> {
  const url = new URL(window.location.href);
  const range = url.searchParams.get('range');
  const period = url.searchParams.get('period');
  const state: Partial<ReportState> = {};
  if (range === 'monthly' || range === 'yearly') state.range = range;
  if (period) state.period = period;
  return state;
}

async function fetchOverviewHtml(
  range: 'monthly' | 'yearly',
  period: string,
  currency: Currency
): Promise<{ summary?: string; charts?: string; previews?: string; wealth?: string }> {
  const params = new URLSearchParams();
  params.set('_render', 'html');
  params.set('_partial', 'all');
  params.set('range', range);
  params.set('period', period);
  params.set('currency', currency);

  const response = await fetch(`/api/reports?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch overview data: ${response.statusText}`);
  }
  const html = await response.text();
  return parseHtmlPartials(html);
}

async function fetchAndRenderOverview(): Promise<void> {
  showLoadingState('[data-summary-container]');
  showLoadingState('[data-charts-container]');
  showLoadingState('[data-wealth-container]');
  showLoadingState('[data-previews-container]');

  try {
    const partials = await fetchOverviewHtml(
      currentState.range,
      currentState.period,
      currentState.currency
    );

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
    if (partials.wealth) {
      renderWealthHtml(partials.wealth);
    } else {
      hideLoadingState('[data-wealth-container]');
    }
    if (partials.previews) {
      renderPreviewsHtml(partials.previews);
    } else {
      hideLoadingState('[data-previews-container]');
    }

    const rangeLabel = currentState.range === 'monthly' ? 'Monthly' : 'Yearly';
    announceToScreenReader(`${rangeLabel} overview data updated`);
  } catch (error) {
    console.error('Error fetching overview data:', error);
    hideLoadingState('[data-summary-container]');
    hideLoadingState('[data-charts-container]');
    hideLoadingState('[data-wealth-container]');
    hideLoadingState('[data-previews-container]');
    addToast('Failed to load overview data. Please try again.', 'error');
  }
}

async function fetchAndRenderSelector(): Promise<void> {
  try {
    const params = new URLSearchParams();
    params.set('_render', 'html');
    params.set('_partial', 'selector');
    params.set('range', currentState.range);
    params.set('period', currentState.period);
    params.set('currency', currentState.currency);

    const response = await fetch(`/api/reports?${params.toString()}`);
    if (!response.ok) throw new Error(`Failed to fetch selector: ${response.statusText}`);

    const html = await response.text();
    const partials = parseHtmlPartials(html);
    if (partials.selector) renderSelectorHtml(partials.selector);
  } catch (error) {
    console.error('Error fetching selector:', error);
  }
}

function handleRangeChange(event: CustomEvent<{ range: 'monthly' | 'yearly' }>): void {
  currentState.range = event.detail.range;
  if (currentState.range === 'yearly') {
    currentState.period = currentState.period.split('-')[0];
  } else {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    currentState.period = `${currentState.period}-${month}`;
  }
  updateUrl(currentState.range, currentState.period);
  syncHeaderSubtitle();
  fetchAndRenderSelector().then(() => fetchAndRenderOverview());
}

function handlePeriodChange(event: CustomEvent<{ period: string; label: string }>): void {
  currentState.period = event.detail.period;
  updateUrl(currentState.range, currentState.period);
  syncHeaderSubtitle();
  fetchAndRenderOverview();
}

export function initOverviewReportsPage(): void {
  if (!getOverviewPageRoot()) return;

  const urlState = readStateFromUrl();

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
    const periodInput = document.querySelector('[data-period-input]') as HTMLInputElement;
    if (periodInput?.value) currentState.period = periodInput.value;
  }

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

  if (!listenersAttached) {
    window.addEventListener('reportRangeChange', handleRangeChange as EventListener);
    window.addEventListener('reportPeriodChange', handlePeriodChange as EventListener);
    listenersAttached = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOverviewReportsPage);
} else {
  initOverviewReportsPage();
}

document.addEventListener('astro:page-load', initOverviewReportsPage);

document.addEventListener('astro:before-swap', () => {
  window.removeEventListener('reportRangeChange', handleRangeChange as EventListener);
  window.removeEventListener('reportPeriodChange', handlePeriodChange as EventListener);
  listenersAttached = false;
});
