/**
 * Budget Overview API Client
 *
 * Client-side API functions for fetching budget overview data.
 * Supports both JSON and HTML response formats for the Interactive Page Architecture.
 *
 * Part of the Interactive Page Architecture pattern.
 * See: docs/architecture/002-interactive-pages.md
 */

import type { BudgetSummary } from '@/services';

/** HTML response from _render=html requests */
export interface FetchBudgetOverviewHtmlResponse {
  /** Raw HTML string containing rendered partials */
  html: string;
  /** Parsed partial sections (keyed by partial name) */
  partials: {
    summary?: string;
    cards?: string;
    table?: string;
    advice?: string;
    meta?: string;
  };
}

/** JSON response from standard requests */
export interface FetchBudgetOverviewJsonResponse {
  success: boolean;
  data: BudgetSummary;
}

/** Options for fetch requests */
export interface BudgetFetchOptions {
  /** Which partial(s) to render when using HTML */
  partial?: 'summary' | 'cards' | 'advice' | 'all';
  /** Currency code */
  currency?: 'IDR' | 'USD';
}

// Track active request for cancellation
let activeController: AbortController | null = null;

/**
 * Cancel any in-flight fetch request
 */
export function cancelPendingRequest(): void {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

/**
 * Build query string from parameters
 */
function buildQueryString(
  year: number,
  month: number,
  options: BudgetFetchOptions & { render?: 'json' | 'html' } = {}
): string {
  const params = new URLSearchParams();

  params.set('year', String(year));
  params.set('month', String(month));

  if (options.currency) {
    params.set('currency', options.currency);
  }

  if (options.render === 'html') {
    params.set('_render', 'html');
    if (options.partial) {
      params.set('_partial', options.partial);
    }
  }

  return params.toString();
}

/**
 * Parse HTML response into partial sections
 */
function parseHtmlPartials(html: string): FetchBudgetOverviewHtmlResponse['partials'] {
  const partials: FetchBudgetOverviewHtmlResponse['partials'] = {};

  // Extract partials using markers
  const summaryMatch = html.match(/<!-- PARTIAL:summary -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const cardsMatch = html.match(/<!-- PARTIAL:cards -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const tableMatch = html.match(/<!-- PARTIAL:table -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const adviceMatch = html.match(/<!-- PARTIAL:advice -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const metaMatch = html.match(/<!-- PARTIAL:meta -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);

  if (summaryMatch) partials.summary = summaryMatch[1].trim();
  if (cardsMatch) partials.cards = cardsMatch[1].trim();
  if (tableMatch) partials.table = tableMatch[1].trim();
  if (adviceMatch) partials.advice = adviceMatch[1].trim();
  if (metaMatch) partials.meta = metaMatch[1].trim();

  return partials;
}

/**
 * Fetch budget overview as HTML fragments (HTMX-style)
 *
 * Returns server-rendered HTML that can be directly injected into the DOM.
 * This eliminates the need for client-side DOM construction.
 *
 * @param year - Year to fetch
 * @param month - Month to fetch (1-12)
 * @param options - Fetch options including partial selection and currency
 */
export async function fetchBudgetOverviewHtml(
  year: number,
  month: number,
  options: BudgetFetchOptions = {}
): Promise<FetchBudgetOverviewHtmlResponse> {
  // Cancel any pending request
  cancelPendingRequest();

  // Create new controller for this request
  activeController = new AbortController();

  const queryString = buildQueryString(year, month, {
    render: 'html',
    partial: options.partial || 'all',
    currency: options.currency,
  });
  const url = `/api/budget/overview?${queryString}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
      },
      signal: activeController.signal,
    });

    // Security: Verify response is from same origin (defense-in-depth for XSS prevention)
    const responseUrl = new URL(response.url);
    if (responseUrl.origin !== window.location.origin) {
      throw new Error('Invalid response origin');
    }

    // Verify content type is HTML
    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('text/html')) {
      throw new Error('Invalid content type - expected text/html');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(errorText || `HTTP error ${response.status}`);
    }

    const html = await response.text();

    // Clear the controller reference on success
    activeController = null;

    return {
      html,
      partials: parseHtmlPartials(html),
    };
  } catch (error) {
    // Don't throw on abort - it's expected behavior
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        html: '',
        partials: {},
      };
    }

    activeController = null;
    throw error;
  }
}

/**
 * Fetch budget overview as JSON
 *
 * @param year - Year to fetch
 * @param month - Month to fetch (1-12)
 * @param currency - Currency code
 */
export async function fetchBudgetOverviewJson(
  year: number,
  month: number,
  currency: 'IDR' | 'USD' = 'IDR'
): Promise<BudgetSummary> {
  // Cancel any pending request
  cancelPendingRequest();

  // Create new controller for this request
  activeController = new AbortController();

  const queryString = buildQueryString(year, month, { currency });
  const url = `/api/budget/overview?${queryString}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: activeController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    const json = await response.json();

    // Clear the controller reference on success
    activeController = null;

    // API wraps response in { success: true, data: {...} }
    return json.data;
  } catch (error) {
    // Don't throw on abort - it's expected behavior
    if (error instanceof Error && error.name === 'AbortError') {
      // Return empty structure for aborted requests
      return {
        total_budget: '0',
        total_spent: '0',
        total_balance: '0',
        categories_warning: 0,
        categories_exceeded: 0,
        categories: [],
      };
    }

    activeController = null;
    throw error;
  }
}

/**
 * Check if a request is currently in progress
 */
export function isRequestPending(): boolean {
  return activeController !== null;
}
