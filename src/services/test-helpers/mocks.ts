/**
 * Test helper functions and mock factories for service tests
 *
 * Provides reusable mock database and service instances to avoid
 * real database connections during unit tests.
 */

import { mock } from 'bun:test';
import type { IDatabase } from '@/db';
import type { Category, Transaction } from '@/lib/types';
import type { Asset } from '@/lib/types/asset';
import type { Budget, BudgetWithCategory } from '@/lib/types/budget';

/**
 * Creates a mock database object for testing services
 *
 * The mock database implements the IDatabase interface and provides
 * controllable return values for all database operations.
 *
 * @example
 * ```ts
 * const mockDb = createMockDatabase();
 * const service = new TransactionService(mockDb);
 *
 * // Set return value for a query
 * mockDb.query.transactions.findFirst.mockResolvedValueOnce(mockTransaction);
 * ```
 */
export function createMockDatabase(): IDatabase {
  return {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([])),
        onConflictDoNothing: mock(() => Promise.resolve()),
        onConflictDoUpdate: mock(() => Promise.resolve()),
      })),
    })) as any,

    query: {
      transactions: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      categories: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      users: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      sessions: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      budgets: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      assets: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      apiKeys: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
    } as any,

    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => Promise.resolve(undefined)),
        returning: mock(() => Promise.resolve([])),
      })),
    })) as any,

    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => Promise.resolve([])),
        groupBy: mock(() => Promise.resolve([])),
        orderBy: mock(() => Promise.resolve([])),
      })),
    })) as any,

    delete: mock(() => ({
      where: mock(() => Promise.resolve(undefined)),
    })) as any,

    transaction: mock(<T>(callback: (tx: any) => Promise<T>) => callback({})) as any,
  };
}

/**
 * Creates a mock category for testing
 */
export function createMockCategory(
  overrides: Partial<Category> & { icon?: string; color?: string } = {}
): Category {
  return {
    id: 'cat-1',
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    name: 'Food & Groceries',
    type: 'expense',
    description: 'Daily food and grocery purchases',
    icon: 'utensils',
    color: 'bg-primary',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/**
 * Creates a mock budget for testing
 */
export function createMockBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'budget-1',
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    category_id: 'cat-1',
    month: 1,
    year: 2026,
    budget_amount: '6000000',
    currency: 'IDR',
    is_closed: false,
    notes: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/**
 * Creates a mock budget with category relation for testing
 * Note: icon and color can be passed in categoryOverrides even though they're not in Category type
 */
export function createMockBudgetWithCategory(
  budgetOverrides: Partial<Budget> = {},
  categoryOverrides: Partial<Category> & { icon?: string; color?: string } = {}
): BudgetWithCategory {
  const category = createMockCategory(categoryOverrides);
  const budget = createMockBudget({
    category_id: category.id,
    ...budgetOverrides,
  });

  return {
    ...budget,
    category: {
      id: category.id,
      name: category.name,
      type: category.type,
      icon: categoryOverrides.icon ?? 'tag',
      color: categoryOverrides.color ?? 'bg-neutral',
      is_active: category.is_active,
    },
  };
}

/**
 * Creates a mock asset for testing
 */
export function createMockAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    name: 'BCA Savings',
    type: 'bank_account',
    currency: 'IDR',
    balance: '1000000',
    initial_balance: null,
    credit_limit: null,
    is_cash_account: false,
    status: 'active' as const,
    closed_at: null,
    closed_by_user_id: null,
    last_updated: new Date('2026-01-01'),
    deleted_at: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/**
 * Creates a mock transaction for testing
 */
export function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    category_id: 'cat-1',
    asset_id: 'asset-1',
    to_asset_id: null,
    type: 'expense',
    amount: '50000',
    currency: 'IDR',
    description: 'Lunch',
    transaction_date: new Date('2026-01-05'),
    deleted_at: null,
    created_at: new Date('2026-01-05'),
    updated_at: new Date('2026-01-05'),
    ...overrides,
  };
}

/**
 * Creates a mock transaction with relations for testing
 */
export function createMockTransactionWithRelations(
  overrides: Partial<Transaction> = {},
  category?: Category,
  asset?: Asset
): Transaction & { category?: Category; asset?: Asset } {
  const mockCategory = category || createMockCategory();
  const mockAsset = asset || createMockAsset();

  return {
    ...createMockTransaction(overrides),
    category: mockCategory,
    asset: mockAsset,
  } as Transaction & { category?: Category; asset?: Asset };
}

/**
 * Reset all mocks on a mock database
 *
 * Call this in beforeEach or afterEach to ensure test isolation.
 */
export function resetMockDatabase(mockDb: IDatabase): void {
  (mockDb.insert as any).mockClear();
  (mockDb.query.transactions.findFirst as any).mockClear();
  (mockDb.query.transactions.findMany as any).mockClear();
  (mockDb.query.categories.findFirst as any).mockClear();
  (mockDb.query.categories.findMany as any).mockClear();
  (mockDb.query.budgets.findFirst as any).mockClear();
  (mockDb.query.budgets.findMany as any).mockClear();
  (mockDb.query.assets.findFirst as any).mockClear();
  (mockDb.query.assets.findMany as any).mockClear();
  (mockDb.query.apiKeys.findFirst as any).mockClear();
  (mockDb.query.apiKeys.findMany as any).mockClear();
  (mockDb.update as any).mockClear();
  (mockDb.select as any).mockClear();
  (mockDb.delete as any).mockClear();
}
