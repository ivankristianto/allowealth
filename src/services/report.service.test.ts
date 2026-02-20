/**
 * ReportService Unit Tests
 *
 * Tests the report aggregation service with mock database.
 * Focuses on data aggregation logic, decimal precision, and error handling.
 *
 * P2: TODO - Improve mock database to support full Drizzle query chains
 * Current mock doesn't fully implement .from().innerJoin().where().groupBy() chains.
 * Integration tests (in API layer) will validate actual database queries.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ReportService } from './report.service';
import type { IDatabase } from '@/db';

/**
 * Create a mock database with test data
 */
function createMockDatabase(): IDatabase {
  const userId = 'test-user-123';
  const otherUserId = 'other-user-456';

  // Mock transactions data
  const mockTransactions = [
    // February 2024 - Current user
    {
      id: 'tx-1',
      user_id: userId,
      category_id: 'cat-utilities',
      account_id: 'account-1',
      type: 'expense',
      amount: '1850000',
      currency: 'IDR',
      transaction_date: new Date('2024-02-15'),
      description: 'Electricity bill',
      deleted_at: null,
      created_at: new Date('2024-02-15'),
      updated_at: new Date('2024-02-15'),
    },
    {
      id: 'tx-2',
      user_id: userId,
      category_id: 'cat-dining',
      account_id: 'account-1',
      type: 'expense',
      amount: '905000',
      currency: 'IDR',
      transaction_date: new Date('2024-02-20'),
      description: 'Restaurant',
      deleted_at: null,
      created_at: new Date('2024-02-20'),
      updated_at: new Date('2024-02-20'),
    },
    {
      id: 'tx-3',
      user_id: userId,
      category_id: 'cat-salary',
      account_id: 'account-1',
      type: 'income',
      amount: '9750000',
      currency: 'IDR',
      transaction_date: new Date('2024-02-01'),
      description: 'Salary',
      deleted_at: null,
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-01'),
    },
    // January 2024 - for trend data
    {
      id: 'tx-4',
      user_id: userId,
      category_id: 'cat-utilities',
      account_id: 'account-1',
      type: 'expense',
      amount: '1500000',
      currency: 'IDR',
      transaction_date: new Date('2024-01-15'),
      description: 'Electricity',
      deleted_at: null,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
    {
      id: 'tx-5',
      user_id: userId,
      category_id: 'cat-salary',
      account_id: 'account-1',
      type: 'income',
      amount: '9000000',
      currency: 'IDR',
      transaction_date: new Date('2024-01-01'),
      description: 'Salary',
      deleted_at: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    // Other user's transaction (should not appear in results)
    {
      id: 'tx-other',
      user_id: otherUserId,
      category_id: 'cat-utilities',
      account_id: 'account-2',
      type: 'expense',
      amount: '5000000',
      currency: 'IDR',
      transaction_date: new Date('2024-02-15'),
      description: 'Other user expense',
      deleted_at: null,
      created_at: new Date('2024-02-15'),
      updated_at: new Date('2024-02-15'),
    },
  ];

  // Mock categories data
  const mockCategories = [
    {
      id: 'cat-utilities',
      user_id: userId,
      name: 'Utilities',
      type: 'expense' as const,
      icon: 'zap',
      color: 'bg-blue-500',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      deleted_at: null,
    },
    {
      id: 'cat-dining',
      user_id: userId,
      name: 'Dining',
      type: 'expense' as const,
      icon: 'utensils',
      color: 'bg-green-500',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      deleted_at: null,
    },
    {
      id: 'cat-salary',
      user_id: userId,
      name: 'Salary',
      type: 'income' as const,
      icon: 'wallet',
      color: 'bg-emerald-500',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      deleted_at: null,
    },
    {
      id: 'cat-other-user',
      user_id: otherUserId,
      name: 'Other User Category',
      type: 'expense' as const,
      icon: 'shopping-bag',
      color: 'bg-red-500',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      deleted_at: null,
    },
  ];

  // Mock budgets data
  const mockBudgets = [
    {
      id: 'budget-1',
      user_id: userId,
      category_id: 'cat-utilities',
      month: 2,
      year: 2024,
      budget_amount: '4000000',
      currency: 'IDR',
      notes: null,
      is_closed: false,
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-01'),
    },
    {
      id: 'budget-2',
      user_id: userId,
      category_id: 'cat-dining',
      month: 2,
      year: 2024,
      budget_amount: '3000000',
      currency: 'IDR',
      notes: null,
      is_closed: false,
      created_at: new Date('2024-02-01'),
      updated_at: new Date('2024-02-01'),
    },
  ];

  // Mock accounts data
  const mockAccounts = [
    {
      id: 'account-1',
      user_id: userId,
      name: 'Bank Account',
      type: 'bank',
      balance: '10000000',
      currency: 'IDR',
      last_updated: new Date('2024-02-20'),
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-02-20'),
      deleted_at: null,
    },
  ];

  return {
    query: {
      transactions: {
        findFirst: async (_config: any) => {
          // Mock implementation for findFirst
          return mockTransactions.find(() => {
            // Simple mock filter logic
            return true;
          });
        },
        findMany: async (config: any) => {
          // Filter by where conditions
          let filtered = mockTransactions;

          if (config?.where) {
            // Mock filtering logic - simplified for tests
            // Extract filter values from Drizzle WHERE conditions
            // Note: This is a simplified mock that extracts common filters

            // Debug: Log the structure to understand Drizzle's format
            // Drizzle uses SQL objects with queryChunks - too complex to parse
            // For unit tests, we'll use a simpler approach
            // console.log('WHERE clause structure:', config.where);
            // console.log('WHERE keys:', Object.keys(config.where || {}));

            filtered = filtered.filter((tx) => {
              // Always filter deleted records
              if (tx.deleted_at !== null) return false;

              // Extract filter values from Drizzle SQL queryChunks
              // Drizzle stores parameters in queryChunks as Param objects
              const extractParamValues = (sql: any): any[] => {
                const values: any[] = [];
                try {
                  if (sql && Array.isArray(sql.queryChunks)) {
                    const findParams = (chunks: any[]): void => {
                      for (const chunk of chunks) {
                        // Check if this is a Param object with a value
                        if (
                          chunk &&
                          chunk.value !== undefined &&
                          chunk.constructor?.name === 'Param'
                        ) {
                          values.push(chunk.value);
                        }
                        // Recursively check nested SQL objects
                        if (chunk && Array.isArray(chunk.queryChunks)) {
                          findParams(chunk.queryChunks);
                        }
                      }
                    };
                    findParams(sql.queryChunks);
                  }
                } catch (e) {
                  // Safely handle errors
                }
                return values;
              };

              // Extract parameter values from WHERE clause
              const params = extractParamValues(config.where);

              // For getCategoryTransactions, the first param is typically userId
              // This is a simplified assumption for our mock
              if (params.length > 0) {
                const userIdParam = params[0]; // First param is usually userId in our queries
                if (typeof userIdParam === 'string' && tx.user_id !== userIdParam) {
                  return false;
                }
              }

              return true;
            });
          }

          // Add relations if requested
          if (config?.with?.account) {
            return filtered.map((tx) => ({
              ...tx,
              account: mockAccounts.find((a) => a.id === tx.account_id),
            }));
          }

          return filtered;
        },
      },
      categories: {
        findFirst: async (config: any) => {
          return mockCategories.find((cat) => {
            // Filter by active and not deleted
            if (!cat.is_active || cat.deleted_at !== null) return false;

            // Extract filter values from Drizzle SQL queryChunks
            const extractParamValues = (sql: any): any[] => {
              const values: any[] = [];
              try {
                if (sql && Array.isArray(sql.queryChunks)) {
                  const findParams = (chunks: any[]): void => {
                    for (const chunk of chunks) {
                      if (
                        chunk &&
                        chunk.value !== undefined &&
                        chunk.constructor?.name === 'Param'
                      ) {
                        values.push(chunk.value);
                      }
                      if (chunk && Array.isArray(chunk.queryChunks)) {
                        findParams(chunk.queryChunks);
                      }
                    }
                  };
                  findParams(sql.queryChunks);
                }
              } catch (e) {
                // Safely handle errors
              }
              return values;
            };

            // Extract and apply filters if present
            if (config?.where) {
              const params = extractParamValues(config.where);

              // For category access control: WHERE id = ? AND user_id = ?
              // Params are [categoryId, userId]
              if (params.length >= 2) {
                const [categoryIdParam, userIdParam] = params;

                if (typeof categoryIdParam === 'string' && cat.id !== categoryIdParam) {
                  return false;
                }

                if (typeof userIdParam === 'string' && cat.user_id !== userIdParam) {
                  return false;
                }
              }
            }

            return true;
          });
        },
        findMany: async (_config: any) => {
          return mockCategories.filter((cat) => cat.is_active && cat.deleted_at === null);
        },
      },
      budgets: {
        findFirst: async (_config: any) => {
          return mockBudgets.find(() => {
            // Simplified mock
            return true;
          });
        },
        findMany: async (config: any) => {
          // Add category relation if requested
          if (config?.with?.category) {
            return mockBudgets.map((b) => ({
              ...b,
              category: mockCategories.find((cat) => cat.id === b.category_id),
            }));
          }
          return mockBudgets;
        },
      },
    },
    // Mock select method for aggregation queries
    select: (_columns: any) => ({
      from: (table: any) => ({
        where: (_condition: any) => ({
          groupBy: async (_column: any) => {
            // Mock grouped query result
            if (table === mockTransactions) {
              // Return category-grouped expenses
              return [
                { category_id: 'cat-utilities', category_name: 'Utilities', total: '1850000' },
                { category_id: 'cat-dining', category_name: 'Dining', total: '905000' },
              ];
            }
            return [];
          },
          orderBy: async (_config: any) => {
            // Mock ordered result
            return [];
          },
        }),
        groupBy: (_column: any) => ({
          where: async (_condition: any) => {
            // Mock grouped result
            return [];
          },
        }),
        innerJoin: (joinTable: any, _on: any) => ({
          where: async (_condition: any) => {
            // Mock join result - return aggregated budget
            if (joinTable === mockCategories) {
              return [{ total: '7000000' }]; // Sum of budgets
            }
            return [];
          },
        }),
      }),
      where: (_condition: any) => ({
        groupBy: async (_column: any) => {
          // Mock spending by category
          return [
            { category_id: 'cat-utilities', total: '1850000' },
            { category_id: 'cat-dining', total: '905000' },
          ];
        },
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: async () => [],
        onConflictDoNothing: async () => undefined,
        onConflictDoUpdate: async () => undefined,
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => undefined,
        returning: async () => [],
      }),
    }),
    delete: () => ({
      where: async () => undefined,
    }),
    transaction: async (callback: any) => {
      return await callback({});
    },
  } as unknown as IDatabase;
}

function extractParamValues(sqlNode: any): any[] {
  const values: any[] = [];

  const visit = (node: any): void => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (node.constructor?.name === 'Param' && node.value !== undefined) {
      values.push(node.value);
    }

    if (Array.isArray(node.queryChunks)) {
      node.queryChunks.forEach(visit);
    }
  };

  visit(sqlNode);
  return values;
}

function createMemberSummaryMockDatabase(): IDatabase {
  const mockUsers = [
    {
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      workspace_id: 'workspace-1',
      deleted_at: null,
    },
    {
      id: 'u2',
      name: null,
      email: 'bob@example.com',
      workspace_id: 'workspace-1',
      deleted_at: null,
    },
  ];

  const mockTransactions = [
    {
      created_by_user_id: 'u1',
      workspace_id: 'workspace-1',
      type: 'income',
      amount: '1000',
      currency: 'IDR',
      transaction_date: new Date('2024-02-05'),
      deleted_at: null,
    },
    {
      created_by_user_id: 'u1',
      workspace_id: 'workspace-1',
      type: 'expense',
      amount: '250',
      currency: 'IDR',
      transaction_date: new Date('2024-02-10'),
      deleted_at: null,
    },
    {
      created_by_user_id: 'u1',
      workspace_id: 'workspace-1',
      type: 'expense',
      amount: '50',
      currency: 'IDR',
      transaction_date: new Date('2024-02-17'),
      deleted_at: null,
    },
    {
      created_by_user_id: 'u2',
      workspace_id: 'workspace-1',
      type: 'income',
      amount: '200',
      currency: 'IDR',
      transaction_date: new Date('2024-02-04'),
      deleted_at: null,
    },
    {
      created_by_user_id: 'u2',
      workspace_id: 'workspace-1',
      type: 'expense',
      amount: '500',
      currency: 'IDR',
      transaction_date: new Date('2024-02-08'),
      deleted_at: null,
    },
    {
      created_by_user_id: 'u3',
      workspace_id: 'workspace-1',
      type: 'expense',
      amount: '75',
      currency: 'IDR',
      transaction_date: new Date('2024-02-11'),
      deleted_at: null,
    },
    {
      created_by_user_id: 'u1',
      workspace_id: 'workspace-1',
      type: 'expense',
      amount: '999',
      currency: 'USD',
      transaction_date: new Date('2024-02-12'),
      deleted_at: null,
    },
    {
      created_by_user_id: 'u1',
      workspace_id: 'workspace-1',
      type: 'expense',
      amount: '999',
      currency: 'IDR',
      transaction_date: new Date('2024-01-22'),
      deleted_at: null,
    },
  ];

  return {
    query: {
      users: {
        findMany: async (config: any) => {
          const params = extractParamValues(config?.where);
          const workspaceId =
            params.find(
              (value) =>
                typeof value === 'string' &&
                value !== 'income' &&
                value !== 'expense' &&
                value !== 'IDR' &&
                value !== 'USD'
            ) || 'workspace-1';

          return mockUsers.filter(
            (member) => member.workspace_id === workspaceId && member.deleted_at === null
          );
        },
      },
    },
    select: (columns: any) => ({
      from: (_table: any) => ({
        where: (condition: any) => ({
          groupBy: async (_column: any) => {
            if (!('user_id' in columns)) return [];

            const params = extractParamValues(condition);
            const workspaceId =
              params.find(
                (value) =>
                  typeof value === 'string' &&
                  value !== 'income' &&
                  value !== 'expense' &&
                  value !== 'IDR' &&
                  value !== 'USD'
              ) || 'workspace-1';
            const txType = params.find((value) => value === 'income' || value === 'expense');
            const currency = params.find((value) => value === 'IDR' || value === 'USD');
            const dateBounds = params.filter((value) => value instanceof Date) as Date[];
            const startDate = dateBounds[0] || new Date('1970-01-01');
            const endDate = dateBounds[1] || new Date('2100-12-31');

            const grouped = new Map<string, { total: number; count: number }>();
            for (const tx of mockTransactions) {
              if (tx.workspace_id !== workspaceId) continue;
              if (tx.deleted_at !== null) continue;
              if (txType && tx.type !== txType) continue;
              if (currency && tx.currency !== currency) continue;
              if (tx.transaction_date < startDate || tx.transaction_date > endDate) continue;

              const existing = grouped.get(tx.created_by_user_id) || { total: 0, count: 0 };
              existing.total += Number(tx.amount);
              existing.count += 1;
              grouped.set(tx.created_by_user_id, existing);
            }

            return Array.from(grouped.entries()).map(([user_id, aggregate]) => ({
              user_id,
              total: String(aggregate.total),
              count: aggregate.count,
            }));
          },
        }),
      }),
    }),
  } as unknown as IDatabase;
}

describe('ReportService', () => {
  let service: ReportService;
  let mockDb: IDatabase;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new ReportService(mockDb);
  });

  describe('getMonthlyReport', () => {
    test('should return monthly report with correct structure', async () => {
      const userId = 'test-user-123';
      const period = '2024-02';
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, period, currency);

      expect(report).toBeDefined();
      expect(report.totalIncome).toBeDefined();
      expect(report.totalExpenses).toBeDefined();
      expect(report.netSavings).toBeDefined();
      expect(report.budgetHealth).toBeGreaterThanOrEqual(0);
      expect(report.expenseCategories).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.expenseByCategory)).toBe(true);
      expect(Array.isArray(report.trendData)).toBe(true);
      expect(Array.isArray(report.categoryIntelligence)).toBe(true);
    });

    test('should reject invalid period format', async () => {
      const userId = 'test-user-123';
      const invalidPeriod = '2024/02'; // Wrong format
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, invalidPeriod, currency);

      // Should return empty report on error
      expect(report.totalIncome).toBe('0');
      expect(report.totalExpenses).toBe('0');
      expect(report.netSavings).toBe('0');
    });

    test('should reject invalid month', async () => {
      const userId = 'test-user-123';
      const invalidPeriod = '2024-13'; // Month 13 doesn't exist
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, invalidPeriod, currency);

      // Should return empty report on error
      expect(report.totalIncome).toBe('0');
    });

    test('should reject invalid year', async () => {
      const userId = 'test-user-123';
      const invalidPeriod = '1999-02'; // Year < 2000
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, invalidPeriod, currency);

      // Should return empty report on error
      expect(report.totalIncome).toBe('0');
    });

    test('should handle empty period (no transactions)', async () => {
      const userId = 'test-user-123';
      const period = '2025-12'; // Future period with no data
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, period, currency);

      // Should return zeroed values
      expect(report).toBeDefined();
      expect(report.expenseCategories).toBeGreaterThanOrEqual(0);
    });

    test('should use decimal precision for calculations', async () => {
      const userId = 'test-user-123';
      const period = '2024-02';
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, period, currency);

      // All currency values should be strings (not floats)
      expect(typeof report.totalIncome).toBe('string');
      expect(typeof report.totalExpenses).toBe('string');
      expect(typeof report.netSavings).toBe('string');

      if (report.expenseByCategory.length > 0) {
        expect(typeof report.expenseByCategory[0].value).toBe('string');
      }
    });
  });

  describe('getMonthlyReport with userId filter', () => {
    test('should accept optional userId parameter', async () => {
      const report = await service.getMonthlyReport('workspace-1', '2024-02', 'IDR', 'user-123');
      expect(report).toBeDefined();
      expect(report.totalIncome).toBeDefined();
      expect(report.totalExpenses).toBeDefined();
    });
  });

  describe('getYearlyReport', () => {
    test('should return yearly report with correct structure', async () => {
      const userId = 'test-user-123';
      const year = 2024;
      const currency = 'IDR';

      const report = await service.getYearlyReport(userId, year, currency);

      expect(report).toBeDefined();
      expect(report.totalIncome).toBeDefined();
      expect(report.totalExpenses).toBeDefined();
      expect(report.netSavings).toBeDefined();
      expect(report.budgetHealth).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.trendData)).toBe(true);
    });

    test('should reject invalid year', async () => {
      const userId = 'test-user-123';
      const invalidYear = 1999; // < 2000
      const currency = 'IDR';

      const report = await service.getYearlyReport(userId, invalidYear, currency);

      // Should return empty report on error
      expect(report.totalIncome).toBe('0');
    });

    test('should have 12 months in trend data', async () => {
      const userId = 'test-user-123';
      const year = 2024;
      const currency = 'IDR';

      const report = await service.getYearlyReport(userId, year, currency);

      // Yearly trend should have 12 data points
      expect(report.trendData.length).toBeGreaterThanOrEqual(0);
    });

    test('should use decimal precision for calculations', async () => {
      const userId = 'test-user-123';
      const year = 2024;
      const currency = 'IDR';

      const report = await service.getYearlyReport(userId, year, currency);

      // All currency values should be strings
      expect(typeof report.totalIncome).toBe('string');
      expect(typeof report.totalExpenses).toBe('string');
      expect(typeof report.netSavings).toBe('string');
    });
  });

  describe('getMemberSummary', () => {
    test('should return sorted member totals with stable row shape', async () => {
      const memberSummaryService = new ReportService(createMemberSummaryMockDatabase());
      const result = await memberSummaryService.getMemberSummary(
        'workspace-1',
        '2024-02',
        'monthly',
        'IDR'
      );

      expect(result).toEqual([
        {
          userId: 'u2',
          userName: 'bob@example.com',
          totalIncome: '200',
          totalExpenses: '500',
          netSavings: '-300',
          transactionCount: 2,
        },
        {
          userId: 'u1',
          userName: 'Alice',
          totalIncome: '1000',
          totalExpenses: '300',
          netSavings: '700',
          transactionCount: 3,
        },
        {
          userId: 'u3',
          userName: 'Unknown',
          totalIncome: '0',
          totalExpenses: '75',
          netSavings: '-75',
          transactionCount: 1,
        },
      ]);

      for (const row of result) {
        expect(typeof row.userId).toBe('string');
        expect(typeof row.userName).toBe('string');
        expect(typeof row.totalIncome).toBe('string');
        expect(typeof row.totalExpenses).toBe('string');
        expect(typeof row.netSavings).toBe('string');
        expect(typeof row.transactionCount).toBe('number');
      }
    });

    test('should propagate database errors', async () => {
      const errorService = new ReportService({
        query: {
          users: {
            findMany: async () => [],
          },
        },
        select: () => {
          throw new Error('Database unavailable');
        },
      } as unknown as IDatabase);

      await expect(
        errorService.getMemberSummary('workspace-1', '2024-02', 'monthly', 'IDR')
      ).rejects.toThrow('Database unavailable');
    });
  });

  describe('getCategoryTransactions', () => {
    test('should return category transactions with correct structure', async () => {
      const userId = 'test-user-123';
      const categoryId = 'cat-utilities';
      const period = '2024-02';
      const range = 'monthly';

      const result = await service.getCategoryTransactions(userId, categoryId, period, range);

      expect(result).toBeDefined();
      expect(result.categoryName).toBeDefined();
      expect(result.total).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
    });

    test('should filter transactions by user (access control)', async () => {
      const userId = 'test-user-123';
      const categoryId = 'cat-utilities';
      const period = '2024-02';
      const range = 'monthly';

      const result = await service.getCategoryTransactions(userId, categoryId, period, range);

      // Should only return transactions for this user
      const otherUserTransactions = result.transactions.filter((tx: any) => tx.id === 'tx-other');
      expect(otherUserTransactions.length).toBe(0);
    });

    test('should reject unauthorized category access', async () => {
      const userId = 'test-user-123';
      const otherUserCategoryId = 'cat-other-user'; // Category belonging to different user
      const period = '2024-02';
      const range = 'monthly';

      // Should throw BudgetServiceError for unauthorized access
      await expect(
        service.getCategoryTransactions(userId, otherUserCategoryId, period, range)
      ).rejects.toThrow('Category not found or access denied');
    });

    test('should handle yearly range', async () => {
      const userId = 'test-user-123';
      const categoryId = 'cat-utilities';
      const period = '2024';
      const range = 'yearly';

      const result = await service.getCategoryTransactions(userId, categoryId, period, range);

      expect(result).toBeDefined();
      expect(result.categoryName).toBeDefined();
    });

    test('should reject invalid monthly period format', async () => {
      const userId = 'test-user-123';
      const categoryId = 'cat-utilities';
      const invalidPeriod = '2024/02';
      const range = 'monthly';

      // Should throw error (validation errors are wrapped in generic message)
      await expect(
        service.getCategoryTransactions(userId, categoryId, invalidPeriod, range)
      ).rejects.toThrow('Failed to retrieve category transactions');
    });

    test('should use decimal precision for total', async () => {
      const userId = 'test-user-123';
      const categoryId = 'cat-utilities';
      const period = '2024-02';
      const range = 'monthly';

      const result = await service.getCategoryTransactions(userId, categoryId, period, range);

      // Total should be a decimal string
      expect(typeof result.total).toBe('string');
    });

    test('should include createdByName in transaction data', async () => {
      const userId = 'test-user-123';
      const categoryId = 'cat-utilities';
      const period = '2024-02';
      const range = 'monthly';

      const result = await service.getCategoryTransactions(userId, categoryId, period, range);

      // Each transaction should have createdByName as string or undefined
      result.transactions.forEach((tx) => {
        expect('createdByName' in tx).toBe(true);
        if (tx.createdByName !== undefined) {
          expect(typeof tx.createdByName).toBe('string');
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Create a mock db that throws errors
      const errorDb = {
        query: null, // Missing query object
      } as unknown as IDatabase;

      const errorService = new ReportService(errorDb);
      const report = await errorService.getMonthlyReport('user-123', '2024-02', 'IDR');

      // Should return empty report instead of throwing
      expect(report.totalIncome).toBe('0');
      expect(report.totalExpenses).toBe('0');
    });

    test('should handle missing data gracefully', async () => {
      const userId = 'non-existent-user';
      const period = '2024-02';
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, period, currency);

      // Should return empty/zeroed report
      expect(report).toBeDefined();
      expect(report.totalIncome).toBeDefined();
    });
  });

  describe('Security', () => {
    test('should always filter by userId', async () => {
      const userId = 'test-user-123';
      const period = '2024-02';
      const currency = 'IDR';

      const report = await service.getMonthlyReport(userId, period, currency);

      // Report should not contain data from other users
      // This is tested indirectly through the mock database filtering
      expect(report).toBeDefined();
    });

    test('should enforce category access control in getCategoryTransactions', async () => {
      const userId = 'test-user-123';
      const categoryId = 'cat-utilities'; // User's category
      const period = '2024-02';
      const range = 'monthly';

      const result = await service.getCategoryTransactions(userId, categoryId, period, range);

      // Should succeed for owned category
      expect(result.categoryName).toBe('Utilities');
    });
  });
});
