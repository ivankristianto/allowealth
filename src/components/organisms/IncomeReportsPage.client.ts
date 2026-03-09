/**
 * Income Reports Page Orchestrator
 *
 * Client-side orchestration for the income report page.
 * Manages summary, sources, members, and history containers.
 * Handles history pagination and drill-down clicks.
 */

import {
  parseHtmlPartials,
  renderSummaryHtml,
  renderSourcesHtml,
  renderHistoryHtml,
  renderMembersHtml,
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

interface HistoryState {
  page: number;
  pageSize: number;
  sourceType?: string;
  categoryId?: string;
}

let listenersAttached = false;
let apiEndpoint = '/api/reports/income';
const INCOME_PAGE_SELECTOR = '[data-report-page="income"]';

function getIncomePageRoot(): HTMLElement | null {
  return document.querySelector(INCOME_PAGE_SELECTOR) as HTMLElement | null;
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

let historyState: HistoryState = {
  page: 1,
  pageSize: 25,
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

function buildFetchParams(partial: string = 'all'): URLSearchParams {
  const params = new URLSearchParams();
  params.set('_render', 'html');
  params.set('_partial', partial);
  params.set('range', currentState.range);
  params.set('period', currentState.period);
  params.set('currency', currentState.currency);
  params.set('page', historyState.page.toString());
  params.set('pageSize', historyState.pageSize.toString());
  if (historyState.sourceType) params.set('source_type', historyState.sourceType);
  if (historyState.categoryId) params.set('category_id', historyState.categoryId);
  return params;
}

async function fetchIncomeHtml(
  partial: string = 'all'
): Promise<ReturnType<typeof parseHtmlPartials>> {
  const params = buildFetchParams(partial);
  const response = await fetch(`${apiEndpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch income data: ${response.statusText}`);
  }
  const html = await response.text();
  return parseHtmlPartials(html);
}

async function fetchAndRenderAll(): Promise<void> {
  showLoadingState('[data-summary-container]');
  showLoadingState('[data-sources-container]');
  showLoadingState('[data-member-table-container]');
  showLoadingState('[data-history-container]');

  try {
    const partials = await fetchIncomeHtml('all');

    if (partials.summary) {
      renderSummaryHtml(partials.summary);
    } else {
      hideLoadingState('[data-summary-container]');
    }
    if (partials.sources) {
      renderSourcesHtml(partials.sources);
    } else {
      hideLoadingState('[data-sources-container]');
    }
    if (partials.members) {
      renderMembersHtml(partials.members);
    } else {
      hideLoadingState('[data-member-table-container]');
    }
    if (partials.history) {
      renderHistoryHtml(partials.history);
    } else {
      hideLoadingState('[data-history-container]');
    }

    const rangeLabel = currentState.range === 'monthly' ? 'Monthly' : 'Yearly';
    announceToScreenReader(`${rangeLabel} income report updated`);
  } catch (error) {
    console.error('Error fetching income data:', error);
    hideLoadingState('[data-summary-container]');
    hideLoadingState('[data-sources-container]');
    hideLoadingState('[data-member-table-container]');
    hideLoadingState('[data-history-container]');
    addToast('Failed to load income data. Please try again.', 'error');
  }
}

async function fetchAndRenderHistory(): Promise<void> {
  showLoadingState('[data-history-container]');

  try {
    const partials = await fetchIncomeHtml('history');

    if (partials.history) {
      renderHistoryHtml(partials.history);
    } else {
      hideLoadingState('[data-history-container]');
    }

    announceToScreenReader(`Transaction history page ${historyState.page} loaded`);
  } catch (error) {
    console.error('Error fetching history:', error);
    hideLoadingState('[data-history-container]');
    addToast('Failed to load transaction history.', 'error');
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

    const response = await fetch(`${apiEndpoint}?${params.toString()}`);
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
  historyState.page = 1;
  updateUrl(currentState.range, currentState.period);
  syncHeaderSubtitle();
  fetchAndRenderSelector().then(() => fetchAndRenderAll());
}

function handlePeriodChange(event: CustomEvent<{ period: string; label: string }>): void {
  currentState.period = event.detail.period;
  historyState.page = 1;
  updateUrl(currentState.range, currentState.period);
  syncHeaderSubtitle();
  fetchAndRenderAll();
}

function handleHistoryPageClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const btn = target.closest('[data-history-page]') as HTMLElement;
  if (!btn || btn.hasAttribute('disabled')) return;

  const direction = btn.getAttribute('data-history-page');
  if (direction === 'next') {
    historyState.page++;
  } else if (direction === 'prev' && historyState.page > 1) {
    historyState.page--;
  }

  fetchAndRenderHistory();
}

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
    const customEvent = new CustomEvent('open-category-drilldown', {
      detail: {
        categoryId,
        categoryName,
        categoryIcon,
        categoryColor,
        spent,
        budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null,
        period: currentState.period,
        currency: currentState.currency,
      },
    });
    document.dispatchEvent(customEvent);
  }
}

export function initIncomeReportsPage(): void {
  if (!getIncomePageRoot()) return;

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

  apiEndpoint =
    document.querySelector('[data-api-endpoint]')?.getAttribute('data-api-endpoint') ||
    '/api/reports/income';

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

  historyState.page = 1;

  syncHeaderSubtitle();

  if (!listenersAttached) {
    window.addEventListener('reportRangeChange', handleRangeChange as EventListener);
    window.addEventListener('reportPeriodChange', handlePeriodChange as EventListener);
    document.addEventListener('click', handleHistoryPageClick);
    document.addEventListener('click', handleDrillDownClick);
    listenersAttached = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIncomeReportsPage);
} else {
  initIncomeReportsPage();
}

document.addEventListener('astro:page-load', initIncomeReportsPage);

document.addEventListener('astro:before-swap', () => {
  window.removeEventListener('reportRangeChange', handleRangeChange as EventListener);
  window.removeEventListener('reportPeriodChange', handlePeriodChange as EventListener);
  document.removeEventListener('click', handleHistoryPageClick);
  document.removeEventListener('click', handleDrillDownClick);
  listenersAttached = false;
});
