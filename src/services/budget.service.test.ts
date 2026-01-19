/**
 * Unit tests for BudgetService
 *
 * These tests use dependency injection and mock database to avoid
 * real database connections, ensuring tests run consistently.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { BudgetService } from './budget.service';
import { createMockDatabase, createMockCategory, resetMockDatabase } from './test-helpers/mocks';

describe('BudgetService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let budgetService: BudgetService;

  beforeEach(() => {
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

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food & Groceries',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '6000000',
          currency: 'IDR',
        }),
        createMockCategory({
          id: 'cat-2',
          name: 'Transportation',
          type: 'expense',
          percentage: '10.00',
          budget_amount: '4000000',
          currency: 'IDR',
        }),
      ];

      // Mock category query
      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

      // Mock transaction query for spent amounts
      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() =>
              Promise.resolve([
                { category_id: 'cat-1', total: '3000000' },
                { category_id: 'cat-2', total: '2000000' },
              ])
            ),
          })),
        })),
      });

      const csv = await budgetService.exportToCSV(userId, year, month, currency);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');

      // Check CSV header
      const lines = csv.split('\n');
      expect(lines[0]).toBe(
        'category,percentage,budget_amount,spent_amount,balance,status,percentage_used'
      );

      // Check category rows
      expect(lines[1]).toContain('Food & Groceries');
      expect(lines[1]).toContain('60.00');
      expect(lines[1]).toContain('6000000');
      expect(lines[1]).toContain('3000000');

      // Check totals row
      expect(lines[lines.length - 1]).toContain('TOTAL');
    });

    it('should include totals row in CSV export', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '50.00',
          budget_amount: '5000000',
          currency: 'IDR',
        }),
        createMockCategory({
          id: 'cat-2',
          name: 'Transport',
          type: 'expense',
          percentage: '50.00',
          budget_amount: '5000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() =>
              Promise.resolve([
                { category_id: 'cat-1', total: '2500000' },
                { category_id: 'cat-2', total: '3000000' },
              ])
            ),
          })),
        })),
      });

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      // Last line should be totals
      const totalsLine = lines[lines.length - 1];
      expect(totalsLine).toContain('TOTAL');
      expect(totalsLine).toContain('10000000'); // Total budget
      expect(totalsLine).toContain('5500000'); // Total spent
    });

    it('should properly escape CSV special characters', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food, Drinks & "Snacks"',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '6000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

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

    it('should handle categories with no spending', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Savings',
          type: 'expense',
          percentage: '20.00',
          budget_amount: '8000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([])), // No transactions
          })),
        })),
      });

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('Savings');
      expect(lines[1]).toContain('8000000'); // Budget
      expect(lines[1]).toContain('0'); // No spending
    });

    it('should use correct decimal values for balance calculation', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '1000000.50',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '500000.25' }])),
          })),
        })),
      });

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      // Balance should be budget - spent = 1000000.50 - 500000.25 = 500000.25
      expect(lines[1]).toContain('1000000.50'); // Budget
      expect(lines[1]).toContain('500000.25'); // Spent
      expect(lines[1]).toContain('500000.25'); // Balance
    });

    it('should work with USD currency', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'USD';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Groceries',
          type: 'expense',
          percentage: '20.00',
          budget_amount: '500.00',
          currency: 'USD',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '250.00' }])),
          })),
        })),
      });

      const csv = await budgetService.exportToCSV(userId, year, month, currency);

      expect(csv).toContain('Groceries');
      expect(csv).toContain('500.00');
      expect(csv).toContain('250.00');
    });

    it('should include percentage_used in CSV', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '1000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

      // 80% spent
      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '800000' }])),
          })),
        })),
      });

      const csv = await budgetService.exportToCSV(userId, year, month, currency);
      const lines = csv.split('\n');

      // percentage_used should be 80
      expect(lines[1]).toContain('80');
    });
  });

  describe('getMonthlyOverview', () => {
    it('should return budget summary for a month', async () => {
      const userId = 'user-1';
      const year = 2026;
      const month = 1;
      const currency = 'IDR';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '6000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

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

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '1000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

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

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '1000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

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
  });

  describe('getAlerts', () => {
    it('should return categories with warning or exceeded status', async () => {
      const userId = 'user-1';
      const currency = 'IDR';

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '1000000',
          currency: 'IDR',
        }),
        createMockCategory({
          id: 'cat-2',
          name: 'Transport',
          type: 'expense',
          percentage: '10.00',
          budget_amount: '500000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

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

      const mockCategories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Food',
          type: 'expense',
          percentage: '15.00',
          budget_amount: '6000000',
          currency: 'IDR',
        }),
      ];

      (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => Promise.resolve([{ category_id: 'cat-1', total: '3000000' }])),
          })),
        })),
      });

      const history = await budgetService.getBudgetHistory(userId, currency, 3);

      expect(history).toHaveLength(3);
      expect(history[0].month_name).toBe('January');
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
        percentage: '15.00',
        budget_amount: '6000000',
        currency: 'IDR',
      });

      (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);

      // getCategoryRemaining uses a different query pattern without groupBy
      (mockDb.select as any).mockReturnValue({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ total: '3000000' }])),
        })),
      });

      const result = await budgetService.getCategoryRemaining(categoryId, userId);

      expect(result.category_name).toBe('Food');
      expect(result.budget_amount).toBe('6000000');
      expect(result.spent_amount).toBe('3000000');
      expect(result.remaining).toBe('3000000');
    });

    it('should throw error if category not found', async () => {
      (mockDb.query.categories.findFirst as any).mockResolvedValue(undefined);

      await expect(budgetService.getCategoryRemaining('non-existent', 'user-1')).rejects.toThrow(
        'Category not found'
      );
    });
  });
});
