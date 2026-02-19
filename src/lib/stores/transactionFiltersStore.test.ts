import { describe, expect, it, beforeEach } from 'bun:test';
import {
  transactionFiltersStore,
  initFiltersFromSSR,
  resetFilters,
  hasActiveFilters,
  type TransactionFilters,
} from './transactionFiltersStore';

describe('transactionFiltersStore', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    resetFilters();
  });

  describe('initial state', () => {
    it('should have default filter values', () => {
      const filters = transactionFiltersStore.get();

      expect(filters.type).toBe('expense');
      expect(filters.search).toBe('');
      expect(filters.category_id).toBe('');
      expect(filters.category_ids).toEqual([]);
      expect(filters.account_id).toBe('');
      expect(filters.currency).toBe('');
      expect(filters.start_date).toBe('');
      expect(filters.end_date).toBe('');
      expect(filters.page).toBe(1);
      expect(filters.month).toBe('');
    });
  });

  describe('initFiltersFromSSR', () => {
    it('should initialize filters from SSR data', () => {
      const ssrFilters: Partial<TransactionFilters> = {
        type: 'income',
        search: 'groceries',
        month: '2024-01',
        page: 2,
      };

      initFiltersFromSSR(ssrFilters);
      const filters = transactionFiltersStore.get();

      expect(filters.type).toBe('income');
      expect(filters.search).toBe('groceries');
      expect(filters.month).toBe('2024-01');
      expect(filters.page).toBe(2);
      // Should keep default values for unspecified fields
      expect(filters.category_id).toBe('');
      expect(filters.currency).toBe('');
    });

    it('should handle empty category_ids', () => {
      initFiltersFromSSR({ category_ids: undefined });
      const filters = transactionFiltersStore.get();

      expect(filters.category_ids).toEqual([]);
    });

    it('should preserve category_ids array from SSR', () => {
      initFiltersFromSSR({ category_ids: ['cat-1', 'cat-2'] });
      const filters = transactionFiltersStore.get();

      expect(filters.category_ids).toEqual(['cat-1', 'cat-2']);
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters to default values', () => {
      // Set some non-default values
      transactionFiltersStore.setKey('type', 'income');
      transactionFiltersStore.setKey('search', 'test');
      transactionFiltersStore.setKey('category_ids', ['cat-1']);
      transactionFiltersStore.setKey('page', 5);

      // Reset
      resetFilters();
      const filters = transactionFiltersStore.get();

      expect(filters.type).toBe('expense');
      expect(filters.search).toBe('');
      expect(filters.category_ids).toEqual([]);
      expect(filters.page).toBe(1);
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when all filters are at default values', () => {
      expect(hasActiveFilters()).toBe(false);
    });

    it('should return true when type is not expense', () => {
      transactionFiltersStore.setKey('type', 'income');
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when search has a value', () => {
      transactionFiltersStore.setKey('search', 'test');
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when category_id has a value', () => {
      transactionFiltersStore.setKey('category_id', 'cat-1');
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when category_ids has values', () => {
      transactionFiltersStore.setKey('category_ids', ['cat-1', 'cat-2']);
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when account_id has a value', () => {
      transactionFiltersStore.setKey('account_id', 'account-1');
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when currency has a value', () => {
      transactionFiltersStore.setKey('currency', 'IDR');
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when start_date has a value', () => {
      transactionFiltersStore.setKey('start_date', '2024-01-01');
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when end_date has a value', () => {
      transactionFiltersStore.setKey('end_date', '2024-12-31');
      expect(hasActiveFilters()).toBe(true);
    });

    it('should return false when only page or month changes (non-filter state)', () => {
      transactionFiltersStore.setKey('page', 5);
      transactionFiltersStore.setKey('month', '2024-01');
      // These are not considered "filters" as they don't filter the data set
      expect(hasActiveFilters()).toBe(false);
    });
  });

  describe('direct store manipulation', () => {
    it('should allow setting individual keys with setKey', () => {
      transactionFiltersStore.setKey('type', 'income');
      transactionFiltersStore.setKey('page', 3);

      const filters = transactionFiltersStore.get();
      expect(filters.type).toBe('income');
      expect(filters.page).toBe(3);
    });

    it('should allow setting entire state with set', () => {
      const newState: TransactionFilters = {
        type: 'income',
        search: 'test',
        category_id: 'cat-1',
        category_ids: ['cat-2'],
        account_id: 'account-1',
        currency: 'USD',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        page: 2,
        month: '2024-06',
      };

      transactionFiltersStore.set(newState);
      const filters = transactionFiltersStore.get();

      expect(filters).toEqual(newState);
    });
  });
});
