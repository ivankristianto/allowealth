/**
 * Shared controller for the overview, expenses and income report pages.
 * Each page passes its containers, partials and copy; the fetch, URL and selector logic lives here.
 */

import {
  parseHtmlPartials,
  renderSelectorHtml,
  showLoadingState,
  hideLoadingState,
  announceToScreenReader,
} from './ReportsRenderer.client';
import { csrfFetch } from '@/lib/csrf-client';
import { buildReportUrl } from '@/lib/reporting/report-state';
import { addToast } from '@/lib/stores/toastStore';
import { isValidCurrency, type Currency } from '@/lib/constants/currency';

export type ReportRange = 'monthly' | 'yearly';
export type ReportPartialName = keyof ReturnType<typeof parseHtmlPartials>;

export interface ReportState {
  range: ReportRange;
  period: string;
  currency: Currency;
}

export interface ReportPartial {
  name: ReportPartialName;
  container: string;
  render: (html: string) => void;
}

export interface ReportRenderMessages {
  /** Appended to "Monthly"/"Yearly" for the screen reader announcement */
  updated: string;
  loadError: string;
}

export interface ReportPageController {
  readonly state: ReportState;
  /** Fetches one `_partial` and renders the given partials from the response */
  fetchAndRender(
    partial: string,
    targets: ReportPartial[],
    messages: { announce: string; loadError: string }
  ): Promise<void>;
}

export interface ReportPageConfig {
  selector: string;
  endpoint: string;
  partials: ReportPartial[];
  messages: ReportRenderMessages;
  /** Adds page-specific query params, such as income history paging */
  extendParams?: (params: URLSearchParams) => void;
  /** Runs whenever range or period changes, and on init */
  onStateReset?: () => void;
  /** Document-level click handlers, attached once per page visit */
  clickHandlers?: Array<(event: MouseEvent, controller: ReportPageController) => void>;
}

function getDefaultPeriod(range: ReportRange, now = new Date()): string {
  const year = now.getFullYear();
  if (range === 'monthly') {
    return `${year}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  return year.toString();
}

export function resolvePeriodLabel(range: ReportRange, period: string): string {
  if (range === 'yearly') return period;
  const [year, month] = period.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return period;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Converts the period to the new range: '2024-02' -> '2024', or '2024' -> '2024-<current month>' */
export function convertPeriodForRange(
  range: ReportRange,
  period: string,
  now = new Date()
): string {
  if (range === 'yearly') return period.split('-')[0];
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${period}-${month}`;
}

function getActiveCurrencyFromCookie(): Currency | null {
  const match = document.cookie.match(/(?:^|;\s*)activeCurrency=([^;]*)/);
  const value = match?.[1];
  return value && isValidCurrency(value) ? value : null;
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

export function createReportPage(config: ReportPageConfig): ReportPageController {
  const state: ReportState = {
    range: 'monthly',
    period: getDefaultPeriod('monthly'),
    currency: 'IDR',
  };
  let endpoint = config.endpoint;
  let listenersAttached = false;

  function buildParams(partial: string): URLSearchParams {
    const params = new URLSearchParams();
    params.set('_render', 'html');
    params.set('_partial', partial);
    params.set('range', state.range);
    params.set('period', state.period);
    params.set('currency', state.currency);
    config.extendParams?.(params);
    return params;
  }

  async function fetchPartials(partial: string): Promise<ReturnType<typeof parseHtmlPartials>> {
    const response = await csrfFetch(`${endpoint}?${buildParams(partial).toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch report data: ${response.statusText}`);
    }
    return parseHtmlPartials(await response.text());
  }

  async function fetchAndRender(
    partial: string,
    targets: ReportPartial[],
    messages: { announce: string; loadError: string }
  ): Promise<void> {
    targets.forEach((target) => showLoadingState(target.container));

    try {
      const partials = await fetchPartials(partial);
      // Each render function clears its own loading state after its animation
      targets.forEach((target) => {
        const html = partials[target.name];
        if (html) {
          target.render(html);
        } else {
          hideLoadingState(target.container);
        }
      });
      announceToScreenReader(messages.announce);
    } catch (error) {
      console.error('Error fetching report data:', error);
      targets.forEach((target) => hideLoadingState(target.container));
      addToast(messages.loadError, 'error');
    }
  }

  function fetchAndRenderAll(): Promise<void> {
    const rangeLabel = state.range === 'monthly' ? 'Monthly' : 'Yearly';
    return fetchAndRender('all', config.partials, {
      announce: `${rangeLabel} ${config.messages.updated}`,
      loadError: config.messages.loadError,
    });
  }

  async function fetchAndRenderSelector(): Promise<void> {
    try {
      const partials = await fetchPartials('selector');
      if (partials.selector) renderSelectorHtml(partials.selector);
    } catch (error) {
      console.error('Error fetching selector:', error);
    }
  }

  function syncUrlAndSubtitle(): void {
    window.history.replaceState(
      {},
      '',
      buildReportUrl(window.location.pathname, { range: state.range, period: state.period })
    );
    const subtitle = document.querySelector('[data-header-subtitle]');
    if (subtitle) subtitle.textContent = resolvePeriodLabel(state.range, state.period);
  }

  const controller: ReportPageController = { state, fetchAndRender };

  function handleRangeChange(event: Event): void {
    state.range = (event as CustomEvent<{ range: ReportRange }>).detail.range;
    state.period = convertPeriodForRange(state.range, state.period);
    config.onStateReset?.();
    syncUrlAndSubtitle();
    void fetchAndRenderSelector().then(() => fetchAndRenderAll());
  }

  function handlePeriodChange(event: Event): void {
    state.period = (event as CustomEvent<{ period: string }>).detail.period;
    config.onStateReset?.();
    syncUrlAndSubtitle();
    void fetchAndRenderAll();
  }

  const clickHandlers = (config.clickHandlers ?? []).map(
    (handler) => (event: MouseEvent) => handler(event, controller)
  );

  function attachListeners(): void {
    window.addEventListener('reportRangeChange', handleRangeChange);
    window.addEventListener('reportPeriodChange', handlePeriodChange);
    clickHandlers.forEach((handler) => document.addEventListener('click', handler));
    listenersAttached = true;
  }

  function detachListeners(): void {
    window.removeEventListener('reportRangeChange', handleRangeChange);
    window.removeEventListener('reportPeriodChange', handlePeriodChange);
    clickHandlers.forEach((handler) => document.removeEventListener('click', handler));
    listenersAttached = false;
  }

  function init(): void {
    const root = document.querySelector<HTMLElement>(config.selector);
    if (!root) return;

    const urlState = readStateFromUrl();

    if (urlState.range) {
      state.range = urlState.range;
    } else {
      document.querySelectorAll('[data-range]').forEach((btn) => {
        if (btn.getAttribute('aria-pressed') === 'true') {
          state.range = btn.getAttribute('data-range') as ReportRange;
        }
      });
    }

    if (urlState.period) {
      state.period = urlState.period;
    } else {
      const periodInput = document.querySelector<HTMLInputElement>('[data-period-input]');
      if (periodInput?.value) state.period = periodInput.value;
    }

    endpoint = root.dataset.apiEndpoint || config.endpoint;

    const cookieCurrency = getActiveCurrencyFromCookie();
    if (cookieCurrency) {
      state.currency = cookieCurrency;
    } else {
      const containerCurrency = document
        .querySelector('[data-current-currency]')
        ?.getAttribute('data-current-currency');
      if (containerCurrency && isValidCurrency(containerCurrency)) {
        state.currency = containerCurrency;
      }
    }

    config.onStateReset?.();
    const subtitle = document.querySelector('[data-header-subtitle]');
    if (subtitle) subtitle.textContent = resolvePeriodLabel(state.range, state.period);

    if (!listenersAttached) attachListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', detachListeners);

  return controller;
}

/** Opens the category drill-down modal for `[data-view-details]` buttons in injected partials. */
export function openCategoryDrillDown(event: MouseEvent, controller: ReportPageController): void {
  const btn = (event.target as HTMLElement).closest('[data-view-details]');
  if (!btn) return;

  const categoryId = btn.getAttribute('data-category-id');
  const categoryName = btn.getAttribute('data-category-name');
  if (!categoryId || !categoryName) return;

  const budgetLimit = btn.getAttribute('data-budget-limit');
  document.dispatchEvent(
    new CustomEvent('open-category-drilldown', {
      detail: {
        categoryId,
        categoryName,
        categoryIcon: btn.getAttribute('data-category-icon'),
        categoryColor: btn.getAttribute('data-category-color'),
        spent: parseFloat(btn.getAttribute('data-spent') || '0'),
        budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null,
        period: controller.state.period,
        currency: controller.state.currency,
      },
    })
  );
}
