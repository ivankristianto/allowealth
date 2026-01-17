/**
 * Test helper functions and mock factories for service tests
 *
 * Provides reusable mock database and service instances to avoid
 * real database connections during unit tests.
 */

import { mock } from 'bun:test';
import type { IDatabase } from '@/db';
import type { Category, PaymentMethod, Transaction } from '@/lib/types';

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
      paymentMethods: {
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
export function createMockCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Food & Groceries',
    type: 'expense',
    percentage: '5.00',
    budget_amount: '6000000',
    currency: 'IDR',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/**
 * Creates a mock payment method for testing
 */
export function createMockPaymentMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 'pm-1',
    user_id: 'user-1',
    name: 'Cash',
    type: 'cash',
    is_active: true,
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
    user_id: 'user-1',
    category_id: 'cat-1',
    payment_method_id: 'pm-1',
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
  paymentMethod?: PaymentMethod
): Transaction & { category?: Category; paymentMethod?: PaymentMethod } {
  const mockCategory = category || createMockCategory();
  const mockPaymentMethod = paymentMethod || createMockPaymentMethod();

  return {
    ...createMockTransaction(overrides),
    category: mockCategory,
    paymentMethod: mockPaymentMethod,
  } as Transaction & { category?: Category; paymentMethod?: PaymentMethod };
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
  (mockDb.query.paymentMethods.findFirst as any).mockClear();
  (mockDb.query.paymentMethods.findMany as any).mockClear();
  (mockDb.update as any).mockClear();
  (mockDb.select as any).mockClear();
  (mockDb.delete as any).mockClear();
}
