/**
 * Transaction Filters Store
 *
 * Nano Store for managing transaction filter state with URL persistence.
 * Supports progressive enhancement: URL query params work without JS.
 */

import { atom, map } from 'nanostores';

export type TransactionTypeFilter = 'all' | 'income' | 'expense';

export interface TransactionFilters {
  type: TransactionTypeFilter;
  search: string;
  category_id: string;
  payment_method_id: string;
  currency: 'IDR' | 'USD' | '';
  start_date: string;
  end_date: string;
}

// Initial filter state
const initialFilters: TransactionFilters = {
  type: 'all',
  search: '',
  category_id: '',
  payment_method_id: '',
  currency: '',
  start_date: '',
  end_date: '',
};

// Filter state map
export const transactionFiltersStore = map<TransactionFilters>(initialFilters);

// Derived state for individual filters
export const typeFilter = atom<TransactionTypeFilter>('all');

// Sync type filter with main store
typeFilter.subscribe((value) => {
  transactionFiltersStore.setKey('type', value);
});

/**
 * Initialize filters from URL query parameters
 * Call this on page load to restore filter state from URL
 */
export function initFiltersFromUrl(): TransactionFilters {
  if (typeof window === 'undefined') {
    return initialFilters;
  }

  const url = new URL(window.location.href);
  const params = Object.fromEntries(url.searchParams.entries());

  const filters: TransactionFilters = {
    type: (params.type || 'all') as TransactionTypeFilter,
    search: params.search || '',
    category_id: params.category_id || '',
    payment_method_id: params.payment_method_id || '',
    currency: (params.currency as 'IDR' | 'USD' | '') || '',
    start_date: params.start_date || '',
    end_date: params.end_date || '',
  };

  transactionFiltersStore.set(filters);
  typeFilter.set(filters.type);

  return filters;
}

/**
 * Update URL with current filter state
 * Call this after changing filters to update the URL
 */
export function updateUrlWithFilters(filters: TransactionFilters): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);

  // Set or remove query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });

  // Update URL without triggering page reload
  const newUrl = url.toString();
  window.history.replaceState({}, '', newUrl);
}

/**
 * Set a single filter value and update URL
 */
export function setFilter<K extends keyof TransactionFilters>(
  key: K,
  value: TransactionFilters[K]
): void {
  transactionFiltersStore.setKey(key, value);

  if (key === 'type') {
    typeFilter.set(value as TransactionTypeFilter);
  }

  // Update URL after state change
  const currentFilters = transactionFiltersStore.get();
  updateUrlWithFilters(currentFilters);
}

/**
 * Reset all filters to initial values
 */
export function resetFilters(): void {
  transactionFiltersStore.set(initialFilters);
  typeFilter.set('all');
  updateUrlWithFilters(initialFilters);
}

/**
 * Check if any non-default filters are active
 */
export function hasActiveFilters(): boolean {
  const filters = transactionFiltersStore.get();
  return (
    filters.type !== 'all' ||
    filters.search !== '' ||
    filters.category_id !== '' ||
    filters.payment_method_id !== '' ||
    filters.currency !== '' ||
    filters.start_date !== '' ||
    filters.end_date !== ''
  );
}
