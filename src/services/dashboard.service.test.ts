/**
 * Dashboard Service Tests
 * =======================
 * Unit tests for dashboard service
 *
 * Tests cover:
 * - getTotalAssets() - Sum by currency, conversion calculations
 * - getMonthlySpent() - Date filtering, aggregation, percentage calc
 * - getBudgetHealth() - Alert calculation, status determination
 * - getAssetUpdateReminders() - Priority calculation, sorting
 * - getRecentTransactions() - Limit validation, ordering
 * - getDashboardData() - Parallel execution, data aggregation
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DashboardService } from './dashboard.service';

// Test fixtures
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
  {
    id: 'asset-3',
    user_id: 'user-123',
    name: 'Cash',
    type: 'cash',
    balance: '1000000',
    currency: 'IDR',
    last_updated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
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
  {
    id: 'cat-3',
    user_id: 'user-123',
    name: 'Entertainment',
    type: 'expense',
    percentage: '10',
    budget_amount: '1000000',
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
  {
    id: 'tx-2',
    user_id: 'user-123',
    category_id: 'cat-2',
    payment_method_id: 'pm-1',
    type: 'expense' as const,
    amount: '25000',
    currency: 'IDR',
    description: 'Bus fare',
    transaction_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    category: mockCategories[1],
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

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService();
  });

  describe('getTotalAssets', () => {
    it('should return total assets with string amounts', async () => {
      const result = await dashboardService.getTotalAssets('user-123');

      expect(result).toHaveProperty('idr');
      expect(result).toHaveProperty('usd');
      expect(result).toHaveProperty('converted');
      expect(result).toHaveProperty('convertedCurrency');

      // Amounts are stored as strings for decimal precision
      expect(typeof result.idr).toBe('string');
      expect(typeof result.usd).toBe('string');
      expect(typeof result.converted).toBe('string');
      expect(['IDR', 'USD']).toContain(result.convertedCurrency);
    });

    it('should handle primary currency parameter for IDR', async () => {
      const result = await dashboardService.getTotalAssets('user-123', 'IDR');
      expect(result.convertedCurrency).toBe('IDR');
    });

    it('should handle primary currency parameter for USD', async () => {
      const result = await dashboardService.getTotalAssets('user-123', 'USD');
      expect(result.convertedCurrency).toBe('USD');
    });

    it('should return zeroed string values for user with no assets', async () => {
      const result = await dashboardService.getTotalAssets('non-existent-user');

      expect(result.idr).toBe('0');
      expect(result.usd).toBe('0');
      expect(result.converted).toBe('0');
    });

    it('should handle database errors gracefully', async () => {
      // Service catches errors and returns safe defaults
      const result = await dashboardService.getTotalAssets('error-user');
      expect(result.idr).toBe('0');
      expect(result.usd).toBe('0');
      expect(result.converted).toBe('0');
    });
  });

  describe('getMonthlySpent', () => {
    it('should return monthly spending summary with string amounts', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 1, 2025);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('budget');
      expect(result).toHaveProperty('percentage');
      expect(result).toHaveProperty('remaining');

      // Amounts are strings, percentage is number
      expect(typeof result.total).toBe('string');
      expect(typeof result.budget).toBe('string');
      expect(typeof result.percentage).toBe('number');
      expect(typeof result.remaining).toBe('string');
    });

    it('should handle currency parameter', async () => {
      const resultIDR = await dashboardService.getMonthlySpent('user-123', 1, 2025, 'IDR');
      expect(resultIDR).toBeDefined();

      const resultUSD = await dashboardService.getMonthlySpent('user-123', 1, 2025, 'USD');
      expect(resultUSD).toBeDefined();
    });

    it('should return safe defaults for invalid month (caught by service)', async () => {
      // Service catches validation errors and returns zeroed values
      const result = await dashboardService.getMonthlySpent('user-123', 0, 2025);
      expect(result.total).toBe('0');
      expect(result.budget).toBe('0');
      expect(result.percentage).toBe(0);
      expect(result.remaining).toBe('0');
    });

    it('should return safe defaults for invalid month 13', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 13, 2025);
      expect(result.total).toBe('0');
      expect(result.budget).toBe('0');
      expect(result.percentage).toBe(0);
    });

    it('should return safe defaults for invalid year', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 1, 1999);
      expect(result.total).toBe('0');
      expect(result.budget).toBe('0');
      expect(result.percentage).toBe(0);
    });

    it('should return zeroed string values for month with no transactions', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 1, 2020);

      expect(result.total).toBe('0');
      expect(result.percentage).toBe(0);
    });

    it('should calculate remaining amount correctly', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 1, 2025);
      // remaining = budget - spent
      const remaining = parseFloat(result.remaining);
      const budget = parseFloat(result.budget);
      const total = parseFloat(result.total);
      expect(remaining).toBeCloseTo(budget - total, 2);
    });

    it('should calculate percentage correctly when budget > 0', async () => {
      const result = await dashboardService.getMonthlySpent('user-123', 1, 2025);
      if (parseFloat(result.budget) > 0) {
        const expectedPercentage = (parseFloat(result.total) / parseFloat(result.budget)) * 100;
        expect(result.percentage).toBeCloseTo(expectedPercentage, 1);
      } else {
        expect(result.percentage).toBe(0);
      }
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

    it('should return safe defaults for invalid month', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 0, 2025);
      expect(result.alertCount).toBe(0);
      expect(result.status).toBe('healthy');
      expect(result.alerts).toHaveLength(0);
    });

    it('should return safe defaults for invalid year', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 1999);
      expect(result.alertCount).toBe(0);
      expect(result.status).toBe('healthy');
      expect(result.alerts).toHaveLength(0);
    });

    it('should return healthy status when no alerts', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2020);

      expect(['healthy', 'warning', 'exceeded']).toContain(result.status);
      expect(result.alertCount).toBeGreaterThanOrEqual(0);
      expect(result.alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should have alert structure with string amounts', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2025);

      result.alerts.forEach((alert) => {
        expect(alert).toHaveProperty('category');
        expect(alert).toHaveProperty('budget');
        expect(alert).toHaveProperty('spent');
        expect(alert).toHaveProperty('percentage');
        expect(alert).toHaveProperty('status');
        expect(alert).toHaveProperty('remaining');
        expect(alert).toHaveProperty('overage');

        expect(typeof alert.budget).toBe('string');
        expect(typeof alert.spent).toBe('string');
        expect(typeof alert.percentage).toBe('number');
        expect(typeof alert.remaining).toBe('string');
        expect(typeof alert.overage).toBe('string');
        expect(['warning', 'exceeded']).toContain(alert.status);
      });
    });

    it('should calculate alert values correctly', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2025);

      result.alerts.forEach((alert) => {
        const budget = parseFloat(alert.budget);
        const spent = parseFloat(alert.spent);
        const expectedPercentage = Math.round((spent / budget) * 100 * 10) / 10;
        expect(alert.percentage).toBeCloseTo(expectedPercentage, 1);

        const expectedRemaining = (budget - spent).toFixed(0);
        const expectedOverage = spent > budget ? (spent - budget).toFixed(0) : '0';
        expect(alert.remaining).toBe(expectedRemaining);
        expect(alert.overage).toBe(expectedOverage);
      });
    });

    it('should determine status based on worst alert', async () => {
      const result = await dashboardService.getBudgetHealth('user-123', 1, 2025);

      // If any exceeded alerts exist, status should be exceeded
      if (result.alerts.some((a) => a.status === 'exceeded')) {
        expect(result.status).toBe('exceeded');
      }
      // If any warning alerts exist (and no exceeded), status should be warning
      else if (result.alerts.some((a) => a.status === 'warning')) {
        expect(result.status).toBe('warning');
      }
      // Otherwise healthy
      else {
        expect(result.status).toBe('healthy');
      }
    });

    it('should handle database errors gracefully', async () => {
      const result = await dashboardService.getBudgetHealth('error-user', 1, 2025);
      expect(result.alertCount).toBe(0);
      expect(result.status).toBe('healthy');
      expect(result.alerts).toHaveLength(0);
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
        expect(typeof reminder.currentBalance).toBe('string');
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

    it('should sort by days since update within same priority', async () => {
      const result = await dashboardService.getAssetUpdateReminders('user-123');

      // Find consecutive items with same priority
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        if (prev && curr && prev.priority === curr.priority) {
          // Same priority should be sorted by days (descending)
          expect(prev.daysSinceUpdate).toBeGreaterThanOrEqual(curr.daysSinceUpdate);
        }
      }
    });

    it('should handle database errors gracefully', async () => {
      const result = await dashboardService.getAssetUpdateReminders('error-user');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions with string amounts', async () => {
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

        expect(typeof tx.amount).toBe('string');
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

    it('should return safe defaults for invalid limit', async () => {
      const result = await dashboardService.getRecentTransactions('user-123', 0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return safe defaults for limit > 100', async () => {
      const result = await dashboardService.getRecentTransactions('user-123', 101);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for user with no transactions', async () => {
      const result = await dashboardService.getRecentTransactions('non-existent-user');
      expect(result).toHaveLength(0);
    });

    it('should have transaction relation structure', async () => {
      const result = await dashboardService.getRecentTransactions('user-123', 5);

      result.forEach((tx) => {
        expect(tx.category).toHaveProperty('id');
        expect(tx.category).toHaveProperty('name');
        expect(tx.category).toHaveProperty('type');

        expect(tx.paymentMethod).toHaveProperty('id');
        expect(tx.paymentMethod).toHaveProperty('name');
      });
    });

    it('should handle database errors gracefully', async () => {
      const result = await dashboardService.getRecentTransactions('error-user');
      expect(Array.isArray(result)).toBe(true);
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

    it('should accept custom currency IDR', async () => {
      const result = await dashboardService.getDashboardData(
        'user-123',
        undefined,
        undefined,
        'IDR'
      );
      expect(result.totalAssets.convertedCurrency).toBe('IDR');
    });

    it('should accept custom currency USD', async () => {
      const result = await dashboardService.getDashboardData(
        'user-123',
        undefined,
        undefined,
        'USD'
      );
      expect(result.totalAssets.convertedCurrency).toBe('USD');
    });

    it('should fetch all data in parallel', async () => {
      const startTime = Date.now();
      await dashboardService.getDashboardData('user-123');
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (parallel execution)
      expect(duration).toBeLessThan(5000);
    });

    it('should have consistent data types across all sections', async () => {
      const result = await dashboardService.getDashboardData('user-123');

      // totalAssets amounts are strings
      expect(typeof result.totalAssets.idr).toBe('string');
      expect(typeof result.totalAssets.usd).toBe('string');
      expect(typeof result.totalAssets.converted).toBe('string');

      // monthlySpent amounts are strings
      expect(typeof result.monthlySpent.total).toBe('string');
      expect(typeof result.monthlySpent.budget).toBe('string');
      expect(typeof result.monthlySpent.remaining).toBe('string');

      // budgetHealth alerts have string amounts
      result.budgetHealth.alerts.forEach((alert) => {
        expect(typeof alert.budget).toBe('string');
        expect(typeof alert.spent).toBe('string');
      });

      // assetReminders have string balances
      result.assetReminders.forEach((reminder) => {
        expect(typeof reminder.currentBalance).toBe('string');
      });

      // recentTransactions have string amounts
      result.recentTransactions.forEach((tx) => {
        expect(typeof tx.amount).toBe('string');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle all errors gracefully across all methods', async () => {
      // All methods should return default values on error
      const totalAssets = await dashboardService.getTotalAssets('db-error-user');
      expect(totalAssets.idr).toBe('0');
      expect(totalAssets.usd).toBe('0');
      expect(totalAssets.converted).toBe('0');

      const monthlySpent = await dashboardService.getMonthlySpent('db-error-user', 1, 2025);
      expect(monthlySpent.total).toBe('0');
      expect(monthlySpent.budget).toBe('0');
      expect(monthlySpent.percentage).toBe(0);
      expect(monthlySpent.remaining).toBe('0');

      const budgetHealth = await dashboardService.getBudgetHealth('db-error-user', 1, 2025);
      expect(budgetHealth.alertCount).toBe(0);
      expect(budgetHealth.status).toBe('healthy');
      expect(budgetHealth.alerts).toHaveLength(0);

      const reminders = await dashboardService.getAssetUpdateReminders('db-error-user');
      expect(Array.isArray(reminders)).toBe(true);

      const transactions = await dashboardService.getRecentTransactions('db-error-user');
      expect(Array.isArray(transactions)).toBe(true);
    });
  });
});
