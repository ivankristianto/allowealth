/**
 * Test data generators for E2E tests.
 * Provides factory functions for creating consistent test data.
 */

/**
 * Generate a unique identifier for test data.
 * Uses timestamp and random string to ensure uniqueness across test runs.
 */
export function generateTestId(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Common test amounts in IDR.
 * Use these for consistent, readable test assertions.
 */
export const TEST_AMOUNTS = {
  SMALL_EXPENSE: 50000, // 50k
  MEDIUM_EXPENSE: 250000, // 250k
  LARGE_EXPENSE: 1000000, // 1M
  SMALL_INCOME: 1000000, // 1M
  MEDIUM_INCOME: 5000000, // 5M
  LARGE_INCOME: 15000000, // 15M
  BUDGET_SMALL: 500000, // 500k
  BUDGET_MEDIUM: 1500000, // 1.5M
  BUDGET_LARGE: 3000000, // 3M
} as const;
