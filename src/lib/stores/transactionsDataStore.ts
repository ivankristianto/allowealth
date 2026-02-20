/**
 * Transactions Data Store
 *
 * Nano Store for managing transaction data and loading state.
 * Works with SSR hydration - initial data comes from server, then client takes over.
 * Includes client-side caching by month to reduce API calls.
 */

import { atom, map } from 'nanostores';
import type { TransactionOutput } from '@/lib/types/transaction';

/**
 * Cache entry for a month's transactions
 */
interface MonthCacheEntry {
  transactions: TransactionOutput[];
  summary: SummaryState;
  timestamp: number;
}

export interface Category {
  id: string;
  name: string;
  type: string;
}

export interface AvailableMonth {
  key: string; // MM-YYYY format (e.g., "01-2026")
  label: string; // "January 2026" format
}

export interface PaginationState {
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
}

export interface SummaryState {
  income: number;
  expenses: number;
  transactionCount: number;
  periodLabel?: string;
}

export interface TransactionsState {
  transactions: TransactionOutput[];
  pagination: PaginationState;
  summary: SummaryState;
  loading: boolean;
  error: string | null;
  categories: Category[];
  availableMonths: AvailableMonth[];
  currency: Currency;
}

// Initial state
const initialState: TransactionsState = {
  transactions: [],
  pagination: {
    total: 0,
    limit: 50,
    offset: 0,
    page: 1,
    totalPages: 0,
  },
  summary: {
    income: 0,
    expenses: 0,
    transactionCount: 0,
  },
  loading: false,
  error: null,
  categories: [],
  availableMonths: [],
  currency: 'IDR',
};

// Main data store
export const transactionsDataStore = map<TransactionsState>(initialState);

// Loading state atom for quick checks
export const isLoading = atom<boolean>(false);

// Client-side cache for month data (keyed by month: "MM-YYYY")
const monthCache = new Map<string, MonthCacheEntry>();

// Cache TTL in milliseconds (15 minutes)
const CACHE_TTL = 15 * 60 * 1000;

// Sync loading state
isLoading.subscribe((value) => {
  transactionsDataStore.setKey('loading', value);
});

/**
 * Initialize store from SSR data
 */
export function initializeFromSSR(data: {
  transactions: TransactionOutput[];
  pagination: PaginationState;
  summary: SummaryState;
  categories: Category[];
  availableMonths: AvailableMonth[];
  currency: Currency;
}): void {
  transactionsDataStore.set({
    transactions: data.transactions,
    pagination: data.pagination,
    summary: data.summary,
    loading: false,
    error: null,
    categories: data.categories,
    availableMonths: data.availableMonths,
    currency: data.currency,
  });
}

/**
 * Set loading state
 */
export function setLoading(loading: boolean): void {
  isLoading.set(loading);
}

/**
 * Set error state
 */
export function setError(error: string | null): void {
  transactionsDataStore.setKey('error', error);
  if (error) {
    setLoading(false);
  }
}

/**
 * Update transactions and related state from API response
 * Summary is NOT updated here - it only changes when month changes
 */
export function updateTransactions(data: {
  transactions: TransactionOutput[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}): void {
  const { pagination } = data;
  const page = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  transactionsDataStore.set({
    ...transactionsDataStore.get(),
    transactions: data.transactions,
    pagination: {
      ...pagination,
      page,
      totalPages,
    },
    loading: false,
    error: null,
  });
}

/**
 * Update summary state (only called when month changes)
 */
export function updateSummary(summary: SummaryState): void {
  transactionsDataStore.setKey('summary', summary);
}

/**
 * Remove a transaction from the store (optimistic update)
 */
export function removeTransaction(id: string): void {
  const current = transactionsDataStore.get();
  const transaction = current.transactions.find((t) => t.id === id);

  if (!transaction) return;

  const amount = parseFloat(transaction.amount);
  const newTransactions = current.transactions.filter((t) => t.id !== id);

  // Update summary
  const newSummary = { ...current.summary };
  if (transaction.type === 'income') {
    newSummary.income -= amount;
  } else {
    newSummary.expenses -= Math.abs(amount);
    newSummary.transactionCount--;
  }

  // Update pagination
  const newPagination = {
    ...current.pagination,
    total: current.pagination.total - 1,
    totalPages: Math.ceil((current.pagination.total - 1) / current.pagination.limit),
  };

  transactionsDataStore.set({
    ...current,
    transactions: newTransactions,
    summary: newSummary,
    pagination: newPagination,
  });
}

/**
 * Get current state
 */
export function getState(): TransactionsState {
  return transactionsDataStore.get();
}

/**
 * Clear error state
 */
export function clearError(): void {
  transactionsDataStore.setKey('error', null);
}

// ============================================
// Cache Management Functions
// ============================================

/**
 * Get cached data for a month if it exists and is not stale
 */
export function getCachedMonth(month: string): MonthCacheEntry | null {
  const entry = monthCache.get(month);
  if (!entry) return null;

  // Check if cache is stale
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    monthCache.delete(month);
    return null;
  }

  return entry;
}

/**
 * Store transactions for a month in cache
 */
export function setCachedMonth(
  month: string,
  transactions: TransactionOutput[],
  summary: SummaryState
): void {
  monthCache.set(month, {
    transactions,
    summary,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cache for a specific month
 */
export function invalidateMonth(month: string): void {
  monthCache.delete(month);
}

/**
 * Invalidate all cached data
 * Called when transactions are added/edited/deleted
 */
export function invalidateAllCache(): void {
  monthCache.clear();
}

/**
 * Check if a month is cached
 */
export function isMonthCached(month: string): boolean {
  const entry = monthCache.get(month);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    monthCache.delete(month);
    return false;
  }
  return true;
}

/**
 * Filter cached transactions client-side
 * Applies type, category, and search filters to cached data
 */
export function filterCachedTransactions(
  transactions: TransactionOutput[],
  filters: {
    type?: 'income' | 'expense';
    category_ids?: string[];
    search?: string;
  }
): TransactionOutput[] {
  let filtered = transactions;

  // Filter by type
  if (filters.type) {
    filtered = filtered.filter((t) => t.type === filters.type);
  }

  // Filter by category IDs
  if (filters.category_ids && filters.category_ids.length > 0) {
    filtered = filtered.filter((t) => filters.category_ids!.includes(t.category.id));
  }

  // Filter by search term (searches description and category name)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        (t.description && t.description.toLowerCase().includes(searchLower)) ||
        t.category.name.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

/**
 * Paginate a list of transactions client-side
 */
export function paginateTransactions(
  transactions: TransactionOutput[],
  page: number,
  pageSize: number
): { transactions: TransactionOutput[]; total: number; totalPages: number } {
  const total = transactions.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const paginated = transactions.slice(offset, offset + pageSize);

  return { transactions: paginated, total, totalPages };
}
