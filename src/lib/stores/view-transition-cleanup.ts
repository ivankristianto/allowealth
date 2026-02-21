/**
 * View transition cleanup for page-scoped nano stores.
 *
 * Keeps global stores (toast, currency, notifications) untouched while
 * resetting transaction/budget page state when soft navigation swaps pages.
 */

import { resetFilters } from './transactionFiltersStore';
import {
  transactionsDataStore,
  isLoading as transactionsLoading,
  invalidateAllCache,
} from './transactionsDataStore';
import {
  selectedYear,
  isLoading as budgetLoading,
  availableYears,
  currency as budgetCurrency,
} from './budgetHistoryStore';

function resetPageStores(): void {
  resetFilters();

  transactionsDataStore.set({
    transactions: [],
    pagination: { total: 0, limit: 50, offset: 0, page: 1, totalPages: 0 },
    summary: { income: 0, expenses: 0, transactionCount: 0 },
    loading: false,
    error: null,
    categories: [],
    availableMonths: [],
    currency: 'IDR',
  });
  transactionsLoading.set(false);
  invalidateAllCache();

  selectedYear.set(new Date().getFullYear());
  budgetLoading.set(false);
  availableYears.set([]);
  budgetCurrency.set('IDR');
}

document.addEventListener('astro:before-swap', resetPageStores);
