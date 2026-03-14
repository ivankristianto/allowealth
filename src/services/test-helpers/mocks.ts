/**
 * Test helper functions and mock factories for service tests
 *
 * Provides reusable mock database and service instances to avoid
 * real database connections during unit tests.
 */

import { mock } from 'bun:test';
import type { IDatabase } from '@/db';
import type { Category, Transaction } from '@/lib/types';
import type { Account } from '@/lib/types/account';
import type { Budget, BudgetWithCategory } from '@/lib/types/budget';
import type { RecurringTemplate, RecurringOccurrence } from '@/lib/types/recurring';

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
  const db: any = {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([])),
        onConflictDoNothing: mock(() => Promise.resolve()),
        onConflictDoUpdate: mock(() => Promise.resolve()),
      })),
    })),

    query: {
      transactions: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      recurringTemplates: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      recurringOccurrences: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      auditLogs: {
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
      accounts: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      accountHistory: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      accountCategories: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      workspaceMeta: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
      workspaces: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      },
    },

    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => Promise.resolve(undefined)),
        returning: mock(() => Promise.resolve([])),
      })),
    })),

    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => {
          const promise = Promise.resolve([]);
          (promise as any).groupBy = mock(() => Promise.resolve([]));
          (promise as any).orderBy = mock(() => Promise.resolve([]));
          return promise;
        }),
        groupBy: mock(() => {
          const promise = Promise.resolve([]);
          (promise as any).where = mock(() => Promise.resolve([]));
          return promise;
        }),
        orderBy: mock(() => Promise.resolve([])),
        innerJoin: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([])),
            orderBy: mock(() => Promise.resolve([])),
          })),
        })),
      })),
    })),

    delete: mock(() => ({
      where: mock(() => Promise.resolve(undefined)),
    })),

    // Pass db itself as tx so mocked queries work inside runTransaction
    transaction: mock(<T>(callback: (tx: any) => Promise<T>) => callback(db)),
  };
  return db as IDatabase;
}

export interface MockDatabaseWithQueryCounter extends IDatabase {
  counter: (key: string) => number;
}

/**
 * Creates a mock database that counts query method usage.
 * Useful for asserting query-shape/performance regressions.
 */
export function createMockDatabaseWithQueryCounter(): MockDatabaseWithQueryCounter {
  const db = createMockDatabase() as any;
  const counters = new Map<string, number>();

  const increment = (key: string): void => {
    counters.set(key, (counters.get(key) ?? 0) + 1);
  };

  const originalSelect = db.select;
  db.select = mock((...args: unknown[]) => {
    increment('db.select');
    return originalSelect(...args);
  });

  db.counter = (key: string) => counters.get(key) ?? 0;

  return db as MockDatabaseWithQueryCounter;
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
 * Creates a mock account for testing
 */
export function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'account-1',
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    name: 'BCA Savings',
    type: 'bank_account',
    account_class: 'liquid',
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
    account_id: 'account-1',
    to_account_id: null,
    type: 'expense',
    amount: '50000',
    currency: 'IDR',
    description: 'Lunch',
    transaction_date: new Date('2026-01-05'),
    updated_by_user_id: null,
    deleted_by_user_id: null,
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
  account?: Account
): Transaction & { category?: Category; account?: Account } {
  const mockCategory = category || createMockCategory();
  const mockAccount = account || createMockAccount();

  return {
    ...createMockTransaction(overrides),
    category: mockCategory,
    account: mockAccount,
  } as Transaction & { category?: Category; account?: Account };
}

export function createMockRecurringTemplate(
  overrides: Partial<RecurringTemplate> = {}
): RecurringTemplate {
  return {
    id: 'rt-1',
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    name: 'Rent',
    type: 'expense',
    amount: '5000000',
    currency: 'IDR',
    category_id: 'cat-1',
    account_id: 'account-1',
    day_of_month: 1,
    frequency: 'monthly',
    interval_count: 1,
    start_date: '2026-01-01',
    end_date: null,
    total_occurrences: 12,
    is_installment: false,
    installment_label: null,
    starting_occurrence_number: 1,
    description: 'Monthly rent',
    status: 'active',
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockRecurringOccurrence(
  overrides: Partial<RecurringOccurrence> = {}
): RecurringOccurrence {
  return {
    id: 'ro-1',
    template_id: 'rt-1',
    workspace_id: 'workspace-1',
    due_date: '2026-01-01',
    occurrence_number: 1,
    status: 'pending',
    transaction_id: null,
    confirmed_amount: null,
    skip_reason: null,
    confirmed_at: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
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
  (mockDb.query.recurringTemplates.findFirst as any).mockClear();
  (mockDb.query.recurringTemplates.findMany as any).mockClear();
  (mockDb.query.recurringOccurrences.findFirst as any).mockClear();
  (mockDb.query.recurringOccurrences.findMany as any).mockClear();
  (mockDb.query.auditLogs.findFirst as any).mockClear();
  (mockDb.query.auditLogs.findMany as any).mockClear();
  (mockDb.query.categories.findFirst as any).mockClear();
  (mockDb.query.categories.findMany as any).mockClear();
  (mockDb.query.budgets.findFirst as any).mockClear();
  (mockDb.query.budgets.findMany as any).mockClear();
  (mockDb.query.accounts.findFirst as any).mockClear();
  (mockDb.query.accounts.findMany as any).mockClear();
  (mockDb.query.accountHistory as any).findFirst.mockClear();
  (mockDb.query.accountHistory as any).findMany.mockClear();
  (mockDb.query.accountCategories as any).findFirst.mockClear();
  (mockDb.query.accountCategories as any).findMany.mockClear();
  (mockDb.query.workspaceMeta.findFirst as any).mockClear();
  (mockDb.query.workspaceMeta.findMany as any).mockClear();
  (mockDb.query.workspaces.findFirst as any).mockClear();
  (mockDb.query.workspaces.findMany as any).mockClear();
  (mockDb.update as any).mockClear();
  (mockDb.select as any).mockClear();
  (mockDb.delete as any).mockClear();
}
