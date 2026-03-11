/**
 * Transactions API Client
 *
 * Client-side API functions for fetching and managing transactions.
 * Includes AbortController support for request cancellation.
 *
 * Supports two response formats:
 * - JSON (default): Returns structured data for client-side rendering
 * - HTML (_render=html): Returns server-rendered HTML fragments (HTMX-style)
 */

import type { TransactionOutput } from '@/lib/types/transaction';
import type { TransactionFilters } from '@/lib/stores/transactionFiltersStore';
import { parseMonthKeyToISO } from '@/lib/utils/date';
import { PAGINATION } from '@/lib/constants/pagination';
import { csrfFetch, getCsrfHeaders } from '@/lib/csrf-client';

const DEFAULT_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

export interface FetchTransactionsResponse {
  transactions: TransactionOutput[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  summary?: {
    income: number;
    expenses: number;
    transactionCount: number;
  };
}

/** HTML response from _render=html requests */
export interface FetchTransactionsHtmlResponse {
  /** Raw HTML string containing rendered partials */
  html: string;
  /** Parsed partial sections (keyed by partial name) */
  partials: {
    summary?: string;
    list?: string;
    pagination?: string;
  };
}

export interface ApiError {
  message: string;
  code?: string;
}

/** Options for fetch requests */
export interface FetchOptions {
  /** Response format: 'json' (default) or 'html' */
  render?: 'json' | 'html';
  /** Which partial(s) to render when using HTML: 'list', 'summary', 'pagination', or 'all' */
  partial?: 'list' | 'summary' | 'pagination' | 'all';
  /** Currency for HTML rendering */
  currency?: Currency;
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
 * Build query string from filters
 */
function buildQueryString(
  filters: Partial<TransactionFilters>,
  pageSize: number,
  options: FetchOptions = {}
): string {
  const params = new URLSearchParams();

  if (filters.type) {
    params.set('type', filters.type);
  }

  if (filters.search) {
    params.set('search', filters.search);
  }

  if (filters.user_id) {
    params.set('user_id', filters.user_id);
  }

  if (filters.category_id) {
    params.set('category_id', filters.category_id);
  }

  // Handle multiple category IDs (array)
  if (filters.category_ids && filters.category_ids.length > 0) {
    params.set('category_ids', filters.category_ids.join(','));
  }

  if (filters.account_id) {
    params.set('account_id', filters.account_id);
  }

  if (filters.account_ids && filters.account_ids.length > 0) {
    params.set('account_ids', filters.account_ids.join(','));
  }

  if (filters.currency) {
    params.set('currency', filters.currency);
  }

  // Convert month filter to start_date/end_date
  // Month filter takes precedence over explicit date filters
  if (filters.month) {
    const dateRange = parseMonthKeyToISO(filters.month);
    if (dateRange) {
      params.set('start_date', dateRange.startDate);
      params.set('end_date', dateRange.endDate);
    }
  } else {
    // Use explicit date filters if no month filter
    if (filters.start_date) {
      params.set('start_date', filters.start_date);
    }

    if (filters.end_date) {
      params.set('end_date', filters.end_date);
    }
  }

  // Pagination
  const page = filters.page || 1;
  const offset = (page - 1) * pageSize;
  params.set('limit', String(pageSize));
  params.set('offset', String(offset));

  // HTML rendering options
  if (options.render === 'html') {
    params.set('_render', 'html');
    if (options.partial) {
      params.set('_partial', options.partial);
    }
    if (options.currency) {
      params.set('_currency', options.currency);
    }
  }

  return params.toString();
}

/**
 * Parse HTML response into partial sections
 */
function parseHtmlPartials(html: string): FetchTransactionsHtmlResponse['partials'] {
  const partials: FetchTransactionsHtmlResponse['partials'] = {};

  // Split by partial markers
  const summaryMatch = html.match(/<!-- PARTIAL:summary -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const listMatch = html.match(/<!-- PARTIAL:list -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  const paginationMatch = html.match(/<!-- PARTIAL:pagination -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);

  if (summaryMatch) partials.summary = summaryMatch[1].trim();
  if (listMatch) partials.list = listMatch[1].trim();
  if (paginationMatch) partials.pagination = paginationMatch[1].trim();

  return partials;
}

/**
 * Fetch transactions from API with current filters (JSON response)
 */
export async function fetchTransactions(
  filters: Partial<TransactionFilters>,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<FetchTransactionsResponse> {
  // Cancel any pending request
  cancelPendingRequest();

  // Create new controller for this request
  activeController = new AbortController();

  const queryString = buildQueryString(filters, pageSize);
  const url = `/api/transactions?${queryString}`;

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
    const data = json.data || json;

    return {
      transactions: data.transactions || [],
      pagination: data.pagination || { total: 0, limit: pageSize, offset: 0 },
      summary: data.summary,
    };
  } catch (error) {
    // Don't throw on abort - it's expected behavior
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        transactions: [],
        pagination: { total: 0, limit: pageSize, offset: 0 },
      };
    }

    activeController = null;
    throw error;
  }
}

/**
 * Fetch transactions as HTML fragments (HTMX-style)
 *
 * Returns server-rendered HTML that can be directly injected into the DOM.
 * This eliminates the need for client-side DOM construction.
 *
 * @param filters - Transaction filters
 * @param options - Fetch options including partial selection and currency
 * @param pageSize - Number of items per page
 */
export async function fetchTransactionsHtml(
  filters: Partial<TransactionFilters>,
  options: Omit<FetchOptions, 'render'> = {},
  pageSize = DEFAULT_PAGE_SIZE
): Promise<FetchTransactionsHtmlResponse> {
  // Cancel any pending request
  cancelPendingRequest();

  // Create new controller for this request
  activeController = new AbortController();

  const queryString = buildQueryString(filters, pageSize, {
    render: 'html',
    partial: options.partial || 'all',
    currency: options.currency,
  });
  const url = `/api/transactions?${queryString}`;

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
 * Delete a transaction by ID
 */
export async function deleteTransaction(id: string): Promise<void> {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'DELETE',
    headers: getCsrfHeaders({
      Accept: 'application/json',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete transaction');
  }
}

export interface BulkActionPayload {
  action: 'update_category' | 'update_account' | 'delete';
  ids: string[];
  payload?: {
    category_id?: string;
    account_id?: string;
  };
}

export interface BulkActionResult {
  updated: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

/**
 * Execute a bulk action on multiple transactions.
 */
export async function bulkTransactionAction(payload: BulkActionPayload): Promise<BulkActionResult> {
  const response = await fetch('/api/transactions/bulk', {
    method: 'POST',
    headers: getCsrfHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.message || 'Bulk operation failed');
  }

  const json = await response.json();
  return json.data || json;
}

/**
 * Check if a request is currently in progress
 */
export function isRequestPending(): boolean {
  return activeController !== null;
}

/**
 * Fetch ALL transactions for a month (no type/category/search filters)
 * Used for caching - stores complete month data, then filters client-side
 */
export async function fetchMonthTransactions(month: string): Promise<FetchTransactionsResponse> {
  // Cancel any pending request
  cancelPendingRequest();

  // Create new controller for this request
  activeController = new AbortController();

  // Parse month to date range
  const dateRange = parseMonthKeyToISO(month);
  if (!dateRange) {
    throw new Error(`Invalid month format: ${month}`);
  }

  const params = new URLSearchParams();
  params.set('start_date', dateRange.startDate);
  params.set('end_date', dateRange.endDate);
  params.set('limit', String(PAGINATION.MAX_MONTH_TRANSACTIONS));
  params.set('_internal', 'true'); // Bypass normal limit cap for caching

  const url = `/api/transactions?${params.toString()}`;

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
    activeController = null;

    const data = json.data || json;

    return {
      transactions: data.transactions || [],
      pagination: data.pagination || {
        total: 0,
        limit: PAGINATION.MAX_MONTH_TRANSACTIONS,
        offset: 0,
      },
      summary: data.summary,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        transactions: [],
        pagination: { total: 0, limit: PAGINATION.MAX_MONTH_TRANSACTIONS, offset: 0 },
      };
    }

    activeController = null;
    throw error;
  }
}
