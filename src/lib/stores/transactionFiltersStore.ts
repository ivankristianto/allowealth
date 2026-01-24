/**
 * Transaction Filters Store
 *
 * Nano Store for managing transaction filter state with URL persistence.
 * Supports progressive enhancement: URL query params work without JS.
 */

import { atom, map } from 'nanostores';

export type TransactionTypeFilter = 'income' | 'expense';

export interface TransactionFilters {
  type: TransactionTypeFilter;
  search: string;
  category_id: string;
  category_ids: string[]; // Support multiple categories
  payment_method_id: string;
  currency: 'IDR' | 'USD' | '';
  start_date: string;
  end_date: string;
  page: number;
  month: string;
}

// Initial filter state
const initialFilters: TransactionFilters = {
  type: 'expense',
  search: '',
  category_id: '',
  category_ids: [],
  payment_method_id: '',
  currency: '',
  start_date: '',
  end_date: '',
  page: 1,
  month: '',
};

// Filter state map
export const transactionFiltersStore = map<TransactionFilters>(initialFilters);

// Derived state for individual filters
export const typeFilter = atom<TransactionTypeFilter>('expense');

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

  // Parse category_ids from comma-separated string
  const categoryIdsParam = params.category_ids || '';
  const categoryIds = categoryIdsParam ? categoryIdsParam.split(',').filter(Boolean) : [];

  const filters: TransactionFilters = {
    type: (params.type === 'income' ? 'income' : 'expense') as TransactionTypeFilter,
    search: params.search || '',
    category_id: params.category_id || '',
    category_ids: categoryIds,
    payment_method_id: params.payment_method_id || '',
    currency: (params.currency as 'IDR' | 'USD' | '') || '',
    start_date: params.start_date || '',
    end_date: params.end_date || '',
    page: parseInt(params.page || '1', 10),
    month: params.month || '',
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
    // Handle page specially - only show if not page 1
    if (key === 'page') {
      if (value && value !== 1) {
        url.searchParams.set(key, String(value));
      } else {
        url.searchParams.delete(key);
      }
      return;
    }

    // Handle category_ids array - join with comma
    if (key === 'category_ids') {
      const ids = value as string[];
      if (ids && ids.length > 0) {
        url.searchParams.set(key, ids.join(','));
      } else {
        url.searchParams.delete(key);
      }
      return;
    }

    if (value) {
      url.searchParams.set(key, String(value));
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
  const resetState = {
    ...initialFilters,
    category_ids: [] as string[],
  };
  transactionFiltersStore.set(resetState);
  typeFilter.set('expense');
  updateUrlWithFilters(resetState);
}

/**
 * Check if any non-default filters are active
 */
export function hasActiveFilters(): boolean {
  const filters = transactionFiltersStore.get();
  return (
    filters.type !== 'expense' ||
    filters.search !== '' ||
    filters.category_id !== '' ||
    filters.category_ids.length > 0 ||
    filters.payment_method_id !== '' ||
    filters.currency !== '' ||
    filters.start_date !== '' ||
    filters.end_date !== ''
  );
}

/**
 * Set category IDs (multi-select)
 */
export function setCategoryIds(categoryIds: string[]): void {
  transactionFiltersStore.setKey('category_ids', categoryIds);
  // Clear single category_id when using multi-select
  transactionFiltersStore.setKey('category_id', '');
  transactionFiltersStore.setKey('page', 1);
  updateUrlWithFilters(transactionFiltersStore.get());
}

/**
 * Toggle a category in the multi-select
 */
export function toggleCategory(categoryId: string): string[] {
  const currentIds = transactionFiltersStore.get().category_ids;
  const newIds = currentIds.includes(categoryId)
    ? currentIds.filter((id) => id !== categoryId)
    : [...currentIds, categoryId];
  setCategoryIds(newIds);
  return newIds;
}

/**
 * Set page number
 */
export function setPage(page: number): void {
  transactionFiltersStore.setKey('page', page);
  updateUrlWithFilters(transactionFiltersStore.get());
}

/**
 * Go to next page
 */
export function nextPage(): void {
  const currentPage = transactionFiltersStore.get().page;
  setPage(currentPage + 1);
}

/**
 * Go to previous page
 */
export function prevPage(): void {
  const currentPage = transactionFiltersStore.get().page;
  if (currentPage > 1) {
    setPage(currentPage - 1);
  }
}

/**
 * Set selected month
 */
export function setMonth(month: string): void {
  transactionFiltersStore.setKey('month', month);
  // Reset page to 1 when changing month
  transactionFiltersStore.setKey('page', 1);
  updateUrlWithFilters(transactionFiltersStore.get());
}

/**
 * Set a filter value and reset page to 1
 * Use this for filter changes that should reset pagination
 */
export function setFilterAndResetPage<K extends keyof TransactionFilters>(
  key: K,
  value: TransactionFilters[K]
): void {
  transactionFiltersStore.setKey(key, value);
  if (key !== 'page') {
    transactionFiltersStore.setKey('page', 1);
  }
  if (key === 'type') {
    typeFilter.set(value as TransactionTypeFilter);
  }
  updateUrlWithFilters(transactionFiltersStore.get());
}

/**
 * Initialize filters from SSR data
 */
export function initFiltersFromSSR(filters: Partial<TransactionFilters>): void {
  const newFilters: TransactionFilters = {
    ...initialFilters,
    ...filters,
    category_ids: filters.category_ids || [],
  };
  transactionFiltersStore.set(newFilters);
  typeFilter.set(newFilters.type);
}
