/**
 * Pagination constants
 *
 * Centralized configuration for pagination across the application.
 */

export const PAGINATION = {
  /** Default page size for transaction lists */
  DEFAULT_PAGE_SIZE: 50,

  /** Maximum limit for fetching all transactions in a month (for caching/summary) */
  MAX_MONTH_TRANSACTIONS: 10000,

  /** Default offset */
  DEFAULT_OFFSET: 0,

  /** Maximum allowed page size from API requests */
  MAX_PAGE_SIZE: 100,
} as const;

export type PaginationConfig = typeof PAGINATION;
