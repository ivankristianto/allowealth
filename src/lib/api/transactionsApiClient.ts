/**
 * Transactions API Client
 *
 * Client-side API functions for fetching and managing transactions.
 * Includes AbortController support for request cancellation.
 */

import type { TransactionOutput } from '@/lib/types/transaction';
import type { TransactionFilters } from '@/lib/stores/transactionFiltersStore';
import { parseMonthKeyToISO } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants/pagination';

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

export interface ApiError {
  message: string;
  code?: string;
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
function buildQueryString(filters: Partial<TransactionFilters>, pageSize: number): string {
  const params = new URLSearchParams();

  if (filters.type) {
    params.set('type', filters.type);
  }

  if (filters.search) {
    params.set('search', filters.search);
  }

  if (filters.category_id) {
    params.set('category_id', filters.category_id);
  }

  // Handle multiple category IDs (array)
  if (filters.category_ids && filters.category_ids.length > 0) {
    params.set('category_ids', filters.category_ids.join(','));
  }

  if (filters.payment_method_id) {
    params.set('payment_method_id', filters.payment_method_id);
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

  return params.toString();
}

/**
 * Fetch transactions from API with current filters
 */
export async function fetchTransactions(
  filters: Partial<TransactionFilters>,
  pageSize = 50
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
 * Delete a transaction by ID
 */
export async function deleteTransaction(id: string): Promise<void> {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete transaction');
  }
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
