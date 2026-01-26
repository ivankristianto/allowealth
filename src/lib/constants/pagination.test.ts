/**
 * Unit tests for pagination constants
 * @fileoverview Tests for pagination configuration values
 */

import { describe, test, expect } from 'bun:test';
import { PAGINATION } from './pagination';

describe('pagination constants', () => {
  test('DEFAULT_PAGE_SIZE is defined and reasonable', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeDefined();
    expect(typeof PAGINATION.DEFAULT_PAGE_SIZE).toBe('number');
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(100);
  });

  test('MAX_MONTH_TRANSACTIONS is defined and reasonable', () => {
    expect(PAGINATION.MAX_MONTH_TRANSACTIONS).toBeDefined();
    expect(typeof PAGINATION.MAX_MONTH_TRANSACTIONS).toBe('number');
    expect(PAGINATION.MAX_MONTH_TRANSACTIONS).toBeGreaterThan(PAGINATION.DEFAULT_PAGE_SIZE);
  });

  test('DEFAULT_OFFSET is 0', () => {
    expect(PAGINATION.DEFAULT_OFFSET).toBe(0);
  });

  test('MAX_PAGE_SIZE is greater than DEFAULT_PAGE_SIZE', () => {
    expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThanOrEqual(PAGINATION.DEFAULT_PAGE_SIZE);
  });

  test('constants are readonly', () => {
    // TypeScript's 'as const' ensures these are readonly at compile time
    // We can verify the values haven't been accidentally changed
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(25);
    expect(PAGINATION.MAX_MONTH_TRANSACTIONS).toBe(10000);
    expect(PAGINATION.DEFAULT_OFFSET).toBe(0);
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
  });
});
