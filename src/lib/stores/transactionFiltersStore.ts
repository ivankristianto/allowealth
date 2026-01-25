/**
 * Transaction Filters Store
 *
 * Nano Store for managing transaction filter state with URL persistence.
 * Supports progressive enhancement: URL query params work without JS.
 *
 * Note: Helper functions (setFilter, resetFilters, etc.) were removed as
 * consumers directly use transactionFiltersStore.setKey() for fine-grained control.
 * This follows the principle of keeping the store minimal and letting consumers
 * handle their own state update patterns.
 */

import { map } from 'nanostores';

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

/**
 * Initialize filters from SSR data
 * @param filters - Partial filter values from server-side rendering
 */
export function initFiltersFromSSR(filters: Partial<TransactionFilters>): void {
  const newFilters: TransactionFilters = {
    ...initialFilters,
    ...filters,
    category_ids: filters.category_ids || [],
  };
  transactionFiltersStore.set(newFilters);
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
}

/**
 * Check if any non-default filters are active
 * @returns true if any filter differs from default state
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
