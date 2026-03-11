/**
 * Budget History API Client
 *
 * Client-side API functions for fetching budget history data.
 * Supports HTML responses for server-rendered fragments.
 */

import { csrfFetch } from '@/lib/csrf-client';
import type { MonthlyBudgetHistory } from '@/services';

/** HTML response from _render=html requests */
export interface FetchBudgetHistoryHtmlResponse {
  /** Raw HTML string containing rendered partials */
  html: string;
  /** Parsed partial sections (keyed by partial name) */
  partials: {
    table?: string;
  };
}

/** JSON response from standard requests */
export interface FetchBudgetHistoryJsonResponse {
  success: boolean;
  data: MonthlyBudgetHistory[];
}

/** Options for fetch requests */
export interface FetchOptions {
  /** Response format: 'json' (default) or 'html' */
  render?: 'json' | 'html';
  /** Which partial to render when using HTML */
  partial?: 'table' | 'all';
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
function buildQueryString(year: number, currency: Currency, options: FetchOptions = {}): string {
  const params = new URLSearchParams();

  params.set('year', String(year));
  params.set('currency', currency);

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
function parseHtmlPartials(html: string): FetchBudgetHistoryHtmlResponse['partials'] {
  const partials: FetchBudgetHistoryHtmlResponse['partials'] = {};

  // Check for partial marker
  const tableMatch = html.match(/<!-- PARTIAL:table -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  if (tableMatch) {
    partials.table = tableMatch[1].trim();
  } else {
    // If no marker, assume entire response is the table partial
    partials.table = html.trim();
  }

  return partials;
}

/**
 * Fetch budget history as HTML fragments (HTMX-style)
 *
 * Returns server-rendered HTML that can be directly injected into the DOM.
 *
 * @param year - Year to fetch history for
 * @param currency - Currency code
 * @param options - Fetch options
 */
export async function fetchBudgetHistoryHtml(
  year: number,
  currency: Currency,
  options: Omit<FetchOptions, 'render'> = {}
): Promise<FetchBudgetHistoryHtmlResponse> {
  // Cancel any pending request
  cancelPendingRequest();

  // Create new controller for this request
  activeController = new AbortController();

  const queryString = buildQueryString(year, currency, {
    render: 'html',
    partial: options.partial || 'table',
  });
  const url = `/api/budget/history?${queryString}`;

  try {
    const response = await csrfFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
      },
      signal: activeController.signal,
    });

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
 * Fetch budget history as JSON
 *
 * @param year - Year to fetch history for
 * @param currency - Currency code
 */
export async function fetchBudgetHistoryJson(
  year: number,
  currency: Currency
): Promise<MonthlyBudgetHistory[]> {
  // Cancel any pending request
  cancelPendingRequest();

  // Create new controller for this request
  activeController = new AbortController();

  const queryString = buildQueryString(year, currency);
  const url = `/api/budget/history?${queryString}`;

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

    // API wraps response in { success: true, data: [...] }
    return json.data || [];
  } catch (error) {
    // Don't throw on abort - it's expected behavior
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }

    activeController = null;
    throw error;
  }
}

/**
 * Fetch category trends as HTML fragment
 *
 * @param months - Number of months to show (3, 6, or 12)
 * @param currency - Currency code
 */
export async function fetchCategoryTrendsHtml(
  months: 3 | 6 | 12,
  currency: Currency
): Promise<FetchBudgetHistoryHtmlResponse> {
  cancelPendingRequest();
  activeController = new AbortController();

  const params = new URLSearchParams();
  params.set('months', String(months));
  params.set('currency', currency);
  params.set('_render', 'html');

  const url = `/api/budget/category-trends?${params.toString()}`;

  try {
    const response = await csrfFetch(url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      signal: activeController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(errorText || `HTTP error ${response.status}`);
    }

    const html = await response.text();
    activeController = null;

    return {
      html,
      partials: parseHtmlPartials(html),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { html: '', partials: {} };
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
