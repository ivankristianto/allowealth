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
 * Transaction test data factory.
 */
export interface TransactionTestData {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
}

/**
 * Generate expense transaction test data.
 * @param overrides - Optional overrides for default values
 */
export function generateExpenseData(
  overrides: Partial<TransactionTestData> = {}
): TransactionTestData {
  return {
    type: 'expense',
    amount: Math.floor(Math.random() * 500000) + 50000, // 50k-550k IDR
    description: `E2E Expense ${generateTestId()}`,
    date: new Date().toISOString().split('T')[0],
    ...overrides,
  };
}

/**
 * Generate income transaction test data.
 * @param overrides - Optional overrides for default values
 */
export function generateIncomeData(
  overrides: Partial<TransactionTestData> = {}
): TransactionTestData {
  return {
    type: 'income',
    amount: Math.floor(Math.random() * 5000000) + 1000000, // 1M-6M IDR
    description: `E2E Income ${generateTestId()}`,
    date: new Date().toISOString().split('T')[0],
    ...overrides,
  };
}

/**
 * Category test data factory.
 */
export interface CategoryTestData {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

/**
 * Generate expense category test data.
 * @param overrides - Optional overrides for default values
 */
export function generateExpenseCategoryData(
  overrides: Partial<CategoryTestData> = {}
): CategoryTestData {
  return {
    name: `E2E Category ${generateTestId()}`,
    type: 'expense',
    icon: 'shopping-cart',
    color: '#ef4444',
    ...overrides,
  };
}

/**
 * Generate income category test data.
 * @param overrides - Optional overrides for default values
 */
export function generateIncomeCategoryData(
  overrides: Partial<CategoryTestData> = {}
): CategoryTestData {
  return {
    name: `E2E Category ${generateTestId()}`,
    type: 'income',
    icon: 'briefcase',
    color: '#22c55e',
    ...overrides,
  };
}

/**
 * Valid asset types matching the database schema.
 * These are the actual values used in the asset form.
 */
export type ValidAssetType =
  | 'cash'
  | 'bank_account'
  | 'e_wallet'
  | 'mutual_fund'
  | 'bond'
  | 'crypto'
  | 'stock'
  | 'other'
  | 'credit_card'
  | 'loan';

/**
 * Asset test data factory.
 */
export interface AssetTestData {
  name: string;
  type: ValidAssetType;
  balance: number;
  currency: string;
}

/**
 * Generate asset test data.
 * @param overrides - Optional overrides for default values
 */
export function generateAssetData(overrides: Partial<AssetTestData> = {}): AssetTestData {
  return {
    name: `E2E Asset ${generateTestId()}`,
    type: 'bank_account',
    balance: Math.floor(Math.random() * 10000000) + 1000000, // 1M-11M IDR
    currency: 'IDR',
    ...overrides,
  };
}

/**
 * Budget test data factory.
 */
export interface BudgetTestData {
  categoryId: string;
  amount: number;
  month: string;
}

/**
 * Generate budget test data for the current month.
 * @param categoryId - Category ID to set budget for
 * @param overrides - Optional overrides for default values
 */
export function generateBudgetData(
  categoryId: string,
  overrides: Partial<Omit<BudgetTestData, 'categoryId'>> = {}
): BudgetTestData {
  return {
    categoryId,
    amount: Math.floor(Math.random() * 2000000) + 500000, // 500k-2.5M IDR
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    ...overrides,
  };
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

/**
 * Get the current month in YYYY-MM format.
 */
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get a date N days ago in YYYY-MM-DD format.
 * @param days - Number of days ago
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Get a date N months ago in YYYY-MM-DD format.
 * @param months - Number of months ago
 */
export function getMonthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

/**
 * Format number as Indonesian currency string (without symbol).
 * @param amount - Number to format
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}
