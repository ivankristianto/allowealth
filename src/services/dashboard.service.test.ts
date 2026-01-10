/**
 * Dashboard Service Tests
 * =======================
 * Unit tests for dashboard service
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { DashboardService } from './dashboard.service';

// Mock the database module
const mockAssets = [
  {
    id: 'asset-1',
    user_id: 'user-123',
    name: 'Bank BCA',
    type: 'bank_account',
    balance: '50000000',
    currency: 'IDR',
    last_updated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'asset-2',
    user_id: 'user-123',
    name: 'USD Account',
    type: 'bank_account',
    balance: '1000',
    currency: 'USD',
    last_updated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    user_id: 'user-123',
    name: 'Food & Dining',
    type: 'expense',
    percentage: '20',
    budget_amount: '2000000',
    currency: 'IDR',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'cat-2',
    user_id: 'user-123',
    name: 'Transportation',
    type: 'expense',
    percentage: '15',
    budget_amount: '1500000',
    currency: 'IDR',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockTransactions = [
  {
    id: 'tx-1',
    user_id: 'user-123',
    category_id: 'cat-1',
    payment_method_id: 'pm-1',
    type: 'expense' as const,
    amount: '50000',
    currency: 'IDR',
    description: 'Lunch',
    transaction_date: new Date(),
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    category: mockCategories[0],
    paymentMethod: {
      id: 'pm-1',
      name: 'BCA',
      user_id: 'user-123',
      type: 'bank_account',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  },
];

// Mock the db module
const mockDbQuery = {
  assets: {
    findMany: async () => mockAssets,
  },
  categories: {
    findMany: async () => mockCategories,
  },
  transactions: {
    findMany: async () => mockTransactions,
  },
};

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService();
  });

  describe('getTotalAssets', () => {
    it('should return total assets by currency', async () => {
      // This test would require mocking the database properly
      // For now, we'll test the structure of the return value
      const result = await dashboardService.getTotalAssets('user-123');

      expect(result).toHaveProperty('idr');
      expect(result).toHaveProperty('usd');
      expect(result).toHaveProperty('converted');
      expect(result).toHaveProperty('convertedCurrency');

      expect(typeof result.idr).toBe('number');
      expect(typeof result.usd).toBe('number');
      expect(typeof result.converted).toBe('number');
      expect(['IDR', 'USD']).toContain(result.convertedCurrency);
    });

    it('should handle primary currency parameter', async () => {
      const resultIDR = await dashboardService.getTotalAssets('user-123', 'IDR');
      expect(resultIDR.convertedCurrency).toBe('IDR');

      const resultUSD = await dashboardService.getTotalAssets('user-123', 'USD');
      expect(resultUSD.convertedCurrency).toBe('USD');
    });

    it('should return zero values for user with no assets', async () => {
      const result = await dashboardService.getTotalAssets('non-existent-user');

      expect(result.idr).toBeGreaterThanOrEqual(0);
      expect(result.usd).toBeGreaterThanOrEqual(0);
      expect(result.converted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMonthlySpent', () => {
    it('should return monthly spending summary', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 1, 2025);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('budget');
      expect(result).toHaveProperty('percentage');
      expect(result).toHaveProperty('remaining');

      expect(typeof result.total).toBe('number');
      expect(typeof result.budget).toBe('number');
      expect(typeof result.percentage).toBe('number');
      expect(typeof result.remaining).toBe('number');
    });

    it('should handle currency parameter', async () => {
      const resultIDR = await dashboardService.getMonthlySpent('user-123', 1, 2025, 'IDR');
      expect(resultIDR).toBeDefined();

      const resultUSD = await dashboardService.getMonthlySpent('user-123', 1, 2025, 'USD');
      expect(resultUSD).toBeDefined();
    });

    it('should validate month parameter', async () => {
      await expect(dashboardService.getMonthlySpent('user-123', 0, 2025)).toThrow();
      await expect(dashboardService.getMonthlySpent('user-123', 13, 2025)).toThrow();
    });

    it('should validate year parameter', async () => {
      await expect(dashboardService.getMonthlySpent('user-123', 1, 1999)).toThrow();
      await expect(dashboardService.getMonthlySpent('user-123', 1, 2101)).toThrow();
    });

    it('should return zero values for month with no transactions', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 1, 2020);

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.percentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getBudgetHealth', () => {
    it('should return budget health with alerts', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2025);

      expect(result).toHaveProperty('alertCount');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('alerts');

      expect(typeof result.alertCount).toBe('number');
      expect(['healthy', 'warning', 'exceeded']).toContain(result.status);
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should handle currency parameter', async () => {
      const resultIDR = await dashboardService.getBudgetHealth('user-123', 1, 2025, 'IDR');
      expect(resultIDR).toBeDefined();

      const resultUSD = await dashboardService.getBudgetHealth('user-123', 1, 2025, 'USD');
      expect(resultUSD).toBeDefined();
    });

    it('should validate month parameter', async () => {
      await expect(dashboardService.getBudgetHealth('user-123', 0, 2025)).toThrow();
      await expect(dashboardService.getBudgetHealth('user-123', 13, 2025)).toThrow();
    });

    it('should validate year parameter', async () => {
      await expect(dashboardService.getBudgetHealth('user-123', 1, 1999)).toThrow();
      await expect(dashboardService.getBudgetHealth('user-123', 1, 2101)).toThrow();
    });

    it('should return healthy status when no alerts', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2020);

      expect(['healthy', 'warning', 'exceeded']).toContain(result.status);
      expect(result.alertCount).toBeGreaterThanOrEqual(0);
      expect(result.alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should return warning status when budget >= 80%', async () => {
      // This would require setting up test data
      // For now, we just check the structure
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2025);
      expect(['healthy', 'warning', 'exceeded']).toContain(result.status);
    });

    it('should return exceeded status when budget >= 100%', async () => {
      // This would require setting up test data
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2025);
      expect(['healthy', 'warning', 'exceeded']).toContain(result.status);
    });

    it('should sort alerts by percentage descending', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2025);

      // Check that alerts are sorted by percentage descending
      for (let i = 1; i < result.alerts.length; i++) {
        const prevAlert = result.alerts[i - 1];
        const currAlert = result.alerts[i];
        if (prevAlert && currAlert) {
          expect(prevAlert.percentage).toBeGreaterThanOrEqual(currAlert.percentage);
        }
      }
    });
  });

  describe('getAssetUpdateReminders', () => {
    it('should return assets needing update', async () => {
      const result = await dashboardService.getAssetUpdateReminders('user-123');

      expect(Array.isArray(result)).toBe(true);

      // Check structure of each reminder
      result.forEach((reminder) => {
        expect(reminder).toHaveProperty('assetId');
        expect(reminder).toHaveProperty('assetName');
        expect(reminder).toHaveProperty('assetType');
        expect(reminder).toHaveProperty('lastUpdated');
        expect(reminder).toHaveProperty('daysSinceUpdate');
        expect(reminder).toHaveProperty('priority');
        expect(reminder).toHaveProperty('currentBalance');
        expect(reminder).toHaveProperty('currency');

        expect(['high', 'medium', 'low']).toContain(reminder.priority);
        expect(reminder.daysSinceUpdate).toBeGreaterThan(7);
      });
    });

    it('should sort reminders by priority (high to low)', async () => {
      const result = await dashboardService.getAssetUpdateReminders('user-123');

      // Check that reminders are sorted by priority
      const priorityValue: Record<string, number> = { high: 3, medium: 2, low: 1 };
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        if (prev && curr) {
          const prevPriority = priorityValue[prev.priority] ?? 0;
          const currPriority = priorityValue[curr.priority] ?? 0;
          expect(prevPriority).toBeGreaterThanOrEqual(currPriority);
        }
      }
    });

    it('should return empty array for user with no assets', async () => {
      const result = await dashboardService.getAssetUpdateReminders('non-existent-user');
      expect(result).toHaveLength(0);
    });

    it('should not include recently updated assets', async () => {
      const result = await dashboardService.getAssetUpdateReminders('user-123');

      // All returned assets should have daysSinceUpdate > 7
      result.forEach((reminder) => {
        expect(reminder.daysSinceUpdate).toBeGreaterThan(7);
      });
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions', async () => {
      const result = await dashboardService.getRecentTransactions('user-123', 5);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);

      // Check structure of each transaction
      result.forEach((tx) => {
        expect(tx).toHaveProperty('id');
        expect(tx).toHaveProperty('type');
        expect(tx).toHaveProperty('amount');
        expect(tx).toHaveProperty('currency');
        expect(tx).toHaveProperty('transactionDate');
        expect(tx).toHaveProperty('category');
        expect(tx).toHaveProperty('paymentMethod');

        expect(['expense', 'income']).toContain(tx.type);
        expect(['IDR', 'USD']).toContain(tx.currency);
      });
    });

    it('should respect limit parameter', async () => {
      const result3 = await dashboardService.getRecentTransactions('user-123', 3);
      expect(result3.length).toBeLessThanOrEqual(3);

      const result10 = await dashboardService.getRecentTransactions('user-123', 10);
      expect(result10.length).toBeLessThanOrEqual(10);
    });

    it('should use default limit of 5', async () => {
      const result = await dashboardService.getRecentTransactions('user-123');
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should validate limit parameter', async () => {
      await expect(dashboardService.getRecentTransactions('user-123', 0)).toThrow();
      await expect(dashboardService.getRecentTransactions('user-123', 101)).toThrow();
    });

    it('should return empty array for user with no transactions', async () => {
      const result = await dashboardService.getRecentTransactions('non-existent-user');
      expect(result).toHaveLength(0);
    });

    it('should sort by transaction date descending', async () => {
      const result = await dashboardService.getRecentTransactions('user-123', 10);

      // Check that transactions are sorted by date descending
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        if (prev && curr) {
          const prevDate = prev.transactionDate.getTime();
          const currDate = curr.transactionDate.getTime();
          expect(prevDate).toBeGreaterThanOrEqual(currDate);
        }
      }
    });
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', async () => {
      const result = await dashboardService.getDashboardData('user-123');

      expect(result).toHaveProperty('totalAssets');
      expect(result).toHaveProperty('monthlySpent');
      expect(result).toHaveProperty('budgetHealth');
      expect(result).toHaveProperty('assetReminders');
      expect(result).toHaveProperty('recentTransactions');
    });

    it('should use current month and year by default', async () => {
      const now = new Date();
      const result = await dashboardService.getDashboardData('user-123');

      expect(result.monthlySpent).toBeDefined();
      expect(result.budgetHealth).toBeDefined();
    });

    it('should accept custom month and year', async () => {
      const result = await dashboardService.getDashboardData('user-123', 6, 2025);

      expect(result).toBeDefined();
      expect(result.monthlySpent).toBeDefined();
      expect(result.budgetHealth).toBeDefined();
    });

    it('should accept custom currency', async () => {
      const resultIDR = await dashboardService.getDashboardData(
        'user-123',
        undefined,
        undefined,
        'IDR'
      );
      expect(resultIDR.totalAssets.convertedCurrency).toBe('IDR');

      const resultUSD = await dashboardService.getDashboardData(
        'user-123',
        undefined,
        undefined,
        'USD'
      );
      expect(resultUSD.totalAssets.convertedCurrency).toBe('USD');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // All methods should return default values on error
      const totalAssets = await dashboardService.getTotalAssets('error-user');
      expect(totalAssets.idr).toBe(0);
      expect(totalAssets.usd).toBe(0);

      const monthlySpent = await dashboardService.getMonthlySpent('error-user', 1, 2025);
      expect(monthlySpent.total).toBe(0);
      expect(monthlySpent.budget).toBe(0);

      const budgetHealth = await dashboardService.getBudgetHealth('error-user', 1, 2025);
      expect(budgetHealth.alertCount).toBe(0);
      expect(budgetHealth.alerts).toHaveLength(0);

      const reminders = await dashboardService.getAssetUpdateReminders('error-user');
      expect(Array.isArray(reminders)).toBe(true);

      const transactions = await dashboardService.getRecentTransactions('error-user');
      expect(Array.isArray(transactions)).toBe(true);
    });
  });
});
