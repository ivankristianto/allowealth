/**
 * Unit tests for BudgetService
 *
 * These tests use dependency injection and mock database to avoid
 * real database connections, ensuring tests run consistently.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { BudgetService } from './budget.service';
import { MONTH_NAMES } from '@/lib/utils/date';
import {
  createMockDatabase,
  createMockCategory,
  createMockBudget,
  createMockBudgetWithCategory,
  resetMockDatabase,
} from './test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

describe('BudgetService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let budgetService: BudgetService;

  beforeEach(() => {
    // Reset cache manager to prevent stale data across tests
    resetCacheManager();

    // Create fresh mock database and service for each test
    mockDb = createMockDatabase();
    budgetService = new BudgetService(mockDb);
    resetMockDatabase(mockDb);
  });

  describe('exportToCSV', () => {
    it('should export budget overview to CSV format', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '6000000', month, year },
          { id: 'cat-1', name: 'Food & Groceries', type: 'expense', is_active: true }
        ),
        createMockBudgetWithCategory(
          { id: 'budget-2', category_id: 'cat-2', budget_amount: '4000000', month, year },
          { id: 'cat-2', name: 'Transportation', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      const csv = await budgetService.exportToCSV(userId, year, month, currency);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');

      // Check CSV header — re-import template format
      const lines = csv.split('\n');
      expect(lines[0]).toBe('budget_id,budget_name,budget_amount');

      // Check category rows
      expect(lines[1]).toContain('budget-1');
      expect(lines[1]).toContain('Food & Groceries');
      expect(lines[1]).toContain('6000000');
      expect(lines[2]).toContain('budget-2');
      expect(lines[2]).toContain('Transportation');
      expect(lines[2]).toContain('4000000');
    });

    it('should include all budget rows in CSV export', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '5000000', month, year },
          { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
        ),
        createMockBudgetWithCategory(
          { id: 'budget-2', category_id: 'cat-2', budget_amount: '5000000', month, year },
          { id: 'cat-2', name: 'Transport', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      // Header + 2 data rows
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('Food');
      expect(lines[1]).toContain('5000000');
      expect(lines[2]).toContain('Transport');
      expect(lines[2]).toContain('5000000');
    });

    it('should properly escape CSV special characters', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '6000000', month, year },
          { id: 'cat-1', name: 'Food, Drinks & "Snacks"', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '3000000' }])),
          })),
        })),
      });

      const csv = await budgetService.exportToCSV(userId, year, month, currency);

      // Check that category name with special characters is properly quoted and escaped
      expect(csv).toContain('"Food, Drinks & ""Snacks"""');
    });

    it('should handle categories with no special characters', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '8000000', month, year },
          { id: 'cat-1', name: 'Savings', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      expect(lines[1]).toBe('budget-1,Savings,8000000');
    });

    it('should preserve decimal values in budget amounts', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '1000000.50', month, year },
          { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('1000000.50');
    });

    it('should work with USD currency', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'USD';

      const mockBudgets = [
        createMockBudgetWithCategory(
          {
            id: 'budget-1',
            category_id: 'cat-1',
            budget_amount: '500.00',
            currency: 'USD',
            month,
            year,
          },
          { id: 'cat-1', name: 'Groceries', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      const csv = await budgetService.exportToCSV(userId, year, month, currency);

      expect(csv).toContain('Groceries');
      expect(csv).toContain('500.00');
    });

    it('should filter to active expense categories only', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '1000000', month, year },
          { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
        ),
        createMockBudgetWithCategory(
          { id: 'budget-2', category_id: 'cat-2', budget_amount: '500000', month, year },
          { id: 'cat-2', name: 'Salary', type: 'income', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      // Only expense category, not income
      expect(lines).toHaveLength(2); // header + 1 data row
      expect(csv).toContain('Food');
      expect(csv).not.toContain('Salary');
    });
  });

  describe('getMonthlyOverview', () => {
    it('should return budget summary for a month', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '6000000', month, year },
          { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '3000000' }])),
          })),
        })),
      });

      const summary = await budgetService.getMonthlyOverview(userId, year, month, currency);

      expect(summary).toBeDefined();
      expect(summary.categories).toHaveLength(1);
      expect(summary.categories[0].category_name).toBe('Food');
      expect(summary.categories[0].budget_amount).toBe('6000000');
      expect(summary.categories[0].spent_amount).toBe('3000000');
      expect(summary.total_budget).toBe('6000000');
      expect(summary.total_spent).toBe('3000000');
    });

    it('should include category icon and color in budget overview', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '6000000', month, year },
          {
            id: 'cat-1',
            name: 'Food',
            type: 'expense',
            is_active: true,
            icon: 'Utensils',
            color: '#10b981',
          }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '3000000' }])),
          })),
        })),
      });

      const summary = await budgetService.getMonthlyOverview(userId, year, month, currency);

      expect(summary.categories[0].category_icon).toBe('Utensils');
      expect(summary.categories[0].category_color).toBe('#10b981');
    });

    it('should validate year parameter', async () => {
      await expect(budgetService.getMonthlyOverview('user-1', 1999, 1, 'IDR')).rejects.toThrow(
        'Invalid year parameter'
      );

      await expect(budgetService.getMonthlyOverview('user-1', 2101, 1, 'IDR')).rejects.toThrow(
        'Invalid year parameter'
      );
    });

    it('should validate month parameter', async () => {
      await expect(budgetService.getMonthlyOverview('user-1', 2026, 0, 'IDR')).rejects.toThrow(
        'Invalid month parameter'
      );

      await expect(budgetService.getMonthlyOverview('user-1', 2026, 13, 'IDR')).rejects.toThrow(
        'Invalid month parameter'
      );
    });

    it('should calculate status correctly for exceeded budget', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '1000000', month, year },
          { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      // Spent more than budget
      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '1200000' }])),
          })),
        })),
      });

      const summary = await budgetService.getMonthlyOverview(userId, year, month, currency);

      expect(summary.categories[0].status).toBe('exceeded');
      expect(summary.categories_exceeded).toBe(1);
    });

    it('should calculate status correctly for warning budget', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '1000000', month, year },
          { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      // Spent 85% of budget
      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '850000' }])),
          })),
        })),
      });

      const summary = await budgetService.getMonthlyOverview(userId, year, month, currency);

      expect(summary.categories[0].status).toBe('warning');
      expect(summary.categories_warning).toBe(1);
    });

    it('should exclude budgets for inactive categories', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '6000000', month, year },
          { id: 'cat-1', name: 'Active Category', type: 'expense', is_active: true }
        ),
        createMockBudgetWithCategory(
          { id: 'budget-2', category_id: 'cat-2', budget_amount: '4000000', month, year },
          { id: 'cat-2', name: 'Inactive Category', type: 'expense', is_active: false }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([])),
          })),
        })),
      });

      const summary = await budgetService.getMonthlyOverview(userId, year, month, currency);

      expect(summary.categories).toHaveLength(1);
      expect(summary.categories[0].category_name).toBe('Active Category');
    });

    it('should exclude budgets for income categories', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '6000000', month, year },
          { id: 'cat-1', name: 'Food Expense', type: 'expense', is_active: true }
        ),
        createMockBudgetWithCategory(
          { id: 'budget-2', category_id: 'cat-2', budget_amount: '10000000', month, year },
          { id: 'cat-2', name: 'Salary', type: 'income', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([])),
          })),
        })),
      });

      const summary = await budgetService.getMonthlyOverview(userId, year, month, currency);

      expect(summary.categories).toHaveLength(1);
      expect(summary.categories[0].category_name).toBe('Food Expense');
    });
  });

  describe('getAlerts', () => {
    it('should return categories with warning or exceeded status', async () => {
      const userId = 'user-1';
      const currency = 'IDR';
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const mockBudgets = [
        createMockBudgetWithCategory(
          { id: 'budget-1', category_id: 'cat-1', budget_amount: '1000000', month, year },
          { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
        ),
        createMockBudgetWithCategory(
          { id: 'budget-2', category_id: 'cat-2', budget_amount: '500000', month, year },
          { id: 'cat-2', name: 'Transport', type: 'expense', is_active: true }
        ),
      ];

      (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() =>
              Promise.resolve([
                { category_id: 'cat-1', total: '1200000' }, // Exceeded
                { category_id: 'cat-2', total: '450000' }, // Warning (90%)
              ])
            ),
          })),
        })),
      });

      const alerts = await budgetService.getAlerts(userId, currency);

      expect(alerts).toHaveLength(2);
      expect(alerts[0].status).toBe('exceeded');
      expect(alerts[0].overage).toBe('200000');
      expect(alerts[1].status).toBe('warning');
    });
  });

  describe('getBudgetHistory', () => {
    it('should return budget history for multiple months', async () => {
      const userId = 'user-1';
      const currency = 'IDR';
      const now = new Date();

      // Mock budgets for multiple months - using implementation mock that returns same data
      (mockDb.query.budgets.findMany as any).mockImplementation(() => {
        return Promise.resolve([
          createMockBudgetWithCategory(
            { id: 'budget-1', category_id: 'cat-1', budget_amount: '6000000' },
            { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
          ),
        ]);
      });

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '3000000' }])),
          })),
        })),
      });

      const history = await budgetService.getBudgetHistory(userId, currency, 3);

      expect(history).toHaveLength(3);
      // Month name depends on current date
      expect(history[0].month_name).toBe(MONTH_NAMES[now.getMonth()]);
      expect(history[0].total_budget).toBe('6000000');
    });

    it('should validate months parameter', async () => {
      await expect(budgetService.getBudgetHistory('user-1', 'IDR', 0)).rejects.toThrow(
        'Invalid months parameter'
      );

      await expect(budgetService.getBudgetHistory('user-1', 'IDR', 25)).rejects.toThrow(
        'Invalid months parameter'
      );
    });
  });

  describe('getCategoryRemaining', () => {
    it('should return remaining budget for a category', async () => {
      const userId = 'user-1';
      const categoryId = 'cat-1';

      const mockCategory = createMockCategory({
        id: categoryId,
        name: 'Food',
        type: 'expense',
      });

      const mockBudget = createMockBudget({
        id: 'budget-1',
        category_id: categoryId,
        workspace_id: userId, // Using userId as workspaceId for test isolation
        budget_amount: '6000000',
      });

      (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);
      (mockDb.query.budgets.findFirst as any).mockResolvedValue(mockBudget);

      // getCategoryRemaining uses a different query pattern without groupBy
      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: '3000000' }])),
        })),
      });

      const result = await budgetService.getCategoryRemaining(categoryId, userId, 'IDR');

      expect(result.category_name).toBe('Food');
      expect(result.budget_amount).toBe('6000000');
      expect(result.spent_amount).toBe('3000000');
      expect(result.remaining).toBe('3000000');
    });

    it('should return zero budget if no budget set for category', async () => {
      const userId = 'user-1';
      const categoryId = 'cat-1';

      const mockCategory = createMockCategory({
        id: categoryId,
        name: 'Food',
        type: 'expense',
      });

      (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);
      (mockDb.query.budgets.findFirst as any).mockResolvedValue(null); // No budget set

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: '1000000' }])),
        })),
      });

      const result = await budgetService.getCategoryRemaining(categoryId, userId, 'IDR');

      expect(result.category_name).toBe('Food');
      expect(result.budget_amount).toBe('0');
      expect(result.spent_amount).toBe('1000000');
      expect(result.remaining).toBe('-1000000');
    });

    it('should throw error if category not found', async () => {
      (mockDb.query.categories.findFirst as any).mockResolvedValue(undefined);

      await expect(
        budgetService.getCategoryRemaining('non-existent', 'user-1', 'IDR')
      ).rejects.toThrow('Category not found');
    });
  });

  describe('hasBudgetsForMonth', () => {
    it('should return true when budgets exist for the month', async () => {
      const mockBudget = createMockBudget({
        id: 'budget-1',
        month: 2,
        year: 2026,
      });
      (mockDb.query.budgets.findFirst as any).mockResolvedValue(mockBudget);

      const result = await budgetService.hasBudgetsForMonth('user-1', 2026, 2);

      expect(result).toBe(true);
    });

    it('should return false when no budgets exist for the month', async () => {
      (mockDb.query.budgets.findFirst as any).mockResolvedValue(undefined);

      const result = await budgetService.hasBudgetsForMonth('user-1', 2026, 2);

      expect(result).toBe(false);
    });

    it('should filter by currency when provided', async () => {
      (mockDb.query.budgets.findFirst as any).mockResolvedValue(undefined);

      await budgetService.hasBudgetsForMonth('user-1', 2026, 2, 'USD');

      // Verify findFirst was called (currency filter applied internally)
      expect(mockDb.query.budgets.findFirst).toHaveBeenCalled();
    });

    it('should return true when budgets exist with matching currency', async () => {
      const mockBudget = createMockBudget({
        id: 'budget-1',
        month: 2,
        year: 2026,
        currency: 'USD',
      });
      (mockDb.query.budgets.findFirst as any).mockResolvedValue(mockBudget);

      const result = await budgetService.hasBudgetsForMonth('user-1', 2026, 2, 'USD');

      expect(result).toBe(true);
    });

    it('should validate year parameter', async () => {
      await expect(budgetService.hasBudgetsForMonth('user-1', 1999, 1)).rejects.toThrow(
        'Invalid year parameter'
      );

      await expect(budgetService.hasBudgetsForMonth('user-1', 2101, 1)).rejects.toThrow(
        'Invalid year parameter'
      );
    });

    it('should validate month parameter', async () => {
      await expect(budgetService.hasBudgetsForMonth('user-1', 2026, 0)).rejects.toThrow(
        'Invalid month parameter'
      );

      await expect(budgetService.hasBudgetsForMonth('user-1', 2026, 13)).rejects.toThrow(
        'Invalid month parameter'
      );
    });

    it('should reject non-integer year', async () => {
      await expect(budgetService.hasBudgetsForMonth('user-1', 2026.5, 1)).rejects.toThrow(
        'Invalid year parameter'
      );
    });

    it('should reject non-integer month', async () => {
      await expect(budgetService.hasBudgetsForMonth('user-1', 2026, 1.5)).rejects.toThrow(
        'Invalid month parameter'
      );
    });
  });
});
