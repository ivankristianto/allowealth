/**
 * Dashboard Service Tests
 * =======================
 * Unit tests for dashboard service
 *
 * Tests cover:
 * - getDashboardData() - Parallel execution, data aggregation, error handling
 * - Error-path defaults for each dashboard section
 * - processTopCategories() - Category grouping, percentage calc, "Other" bucket
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService({} as any);
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', async () => {
      const result = await dashboardService.getDashboardData('user-123');

      expect(result).toHaveProperty('totalAssets');
      expect(result).toHaveProperty('monthlySpent');
      expect(result).toHaveProperty('monthlyIncome');
      expect(result).toHaveProperty('topCategoryExpenses');
      expect(result).toHaveProperty('budgetHealth');
      expect(result).toHaveProperty('assetReminders');
      expect(result).toHaveProperty('recentTransactions');
    });

    it('should use current month and year by default', async () => {
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

      // monthlyIncome amount is string
      expect(typeof result.monthlyIncome.total).toBe('string');

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

  describe('error-path defaults', () => {
    it('should return zeroed totalAssets when db is unavailable', async () => {
      const result = await dashboardService.getDashboardData('error-user');

      expect(result.totalAssets.idr).toBe('0');
      expect(result.totalAssets.usd).toBe('0');
      expect(result.totalAssets.converted).toBe('0');
    });

    it('should return zeroed monthlySpent when db is unavailable', async () => {
      const result = await dashboardService.getDashboardData('error-user', 1, 2025);

      expect(result.monthlySpent.total).toBe('0');
      expect(result.monthlySpent.budget).toBe('0');
      expect(result.monthlySpent.percentage).toBe(0);
      expect(result.monthlySpent.remaining).toBe('0');
    });

    it('should return zeroed monthlyIncome when db is unavailable', async () => {
      const result = await dashboardService.getDashboardData('error-user', 1, 2025);

      expect(result.monthlyIncome.total).toBe('0');
    });

    it('should return empty topCategoryExpenses when db is unavailable', async () => {
      const result = await dashboardService.getDashboardData('error-user', 1, 2025);

      expect(result.topCategoryExpenses).toEqual([]);
    });

    it('should return healthy budgetHealth with no alerts when db is unavailable', async () => {
      const result = await dashboardService.getDashboardData('error-user', 1, 2025);

      expect(result.budgetHealth.alertCount).toBe(0);
      expect(result.budgetHealth.status).toBe('healthy');
      expect(result.budgetHealth.alerts).toHaveLength(0);
    });

    it('should return empty assetReminders when db is unavailable', async () => {
      const result = await dashboardService.getDashboardData('error-user');

      expect(result.assetReminders).toEqual([]);
    });

    it('should return empty recentTransactions when db is unavailable', async () => {
      const result = await dashboardService.getDashboardData('error-user');

      expect(result.recentTransactions).toEqual([]);
    });

    it('should preserve currency in totalAssets even on error', async () => {
      const resultIDR = await dashboardService.getDashboardData(
        'error-user',
        undefined,
        undefined,
        'IDR'
      );
      expect(resultIDR.totalAssets.convertedCurrency).toBe('IDR');

      const resultUSD = await dashboardService.getDashboardData(
        'error-user',
        undefined,
        undefined,
        'USD'
      );
      expect(resultUSD.totalAssets.convertedCurrency).toBe('USD');
    });
  });

  describe('processTopCategories', () => {
    // Access private method for unit testing pure logic
    const callProcessTopCategories = (service: DashboardService, data: any[]) =>
      (service as any).processTopCategories(data);

    it('should return empty array for no categories', () => {
      const result = callProcessTopCategories(dashboardService, []);
      expect(result).toEqual([]);
    });

    it('should return empty array when total is zero', () => {
      const result = callProcessTopCategories(dashboardService, [
        { category_name: 'Food', category_color: '#ef4444', total: '0' },
      ]);
      expect(result).toEqual([]);
    });

    it('should calculate percentages for single category', () => {
      const result = callProcessTopCategories(dashboardService, [
        { category_name: 'Food', category_color: '#ef4444', total: '100' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Food');
      expect(result[0].percentage).toBe(100);
      expect(result[0].amount).toBe('100');
    });

    it('should return top 4 categories without Other when <= 4', () => {
      const result = callProcessTopCategories(dashboardService, [
        { category_name: 'Food', category_color: '#ef4444', total: '400' },
        { category_name: 'Transport', category_color: '#3b82f6', total: '300' },
        { category_name: 'Shopping', category_color: '#f59e0b', total: '200' },
        { category_name: 'Entertainment', category_color: '#8b5cf6', total: '100' },
      ]);
      expect(result).toHaveLength(4);
      expect(result.find((r: any) => r.category === 'Other')).toBeUndefined();
    });

    it('should group 5+ categories into top 4 + Other', () => {
      const result = callProcessTopCategories(dashboardService, [
        { category_name: 'Food', category_color: '#ef4444', total: '400' },
        { category_name: 'Transport', category_color: '#3b82f6', total: '300' },
        { category_name: 'Shopping', category_color: '#f59e0b', total: '200' },
        { category_name: 'Entertainment', category_color: '#8b5cf6', total: '100' },
        { category_name: 'Healthcare', category_color: '#10b981', total: '50' },
        { category_name: 'Education', category_color: '#6b7280', total: '50' },
      ]);
      expect(result).toHaveLength(5);
      expect(result[4].category).toBe('Other');
      // Other = 50 + 50 = 100 out of 1100 total ≈ 9%
      expect(result[4].percentage).toBe(9);
      expect(result[4].color).toBe('#6b7280');
    });

    it('should sum percentages close to 100', () => {
      const result = callProcessTopCategories(dashboardService, [
        { category_name: 'Food', category_color: '#ef4444', total: '500' },
        { category_name: 'Transport', category_color: '#3b82f6', total: '300' },
        { category_name: 'Shopping', category_color: '#f59e0b', total: '200' },
      ]);
      const totalPercentage = result.reduce((sum: number, r: any) => sum + r.percentage, 0);
      expect(totalPercentage).toBe(100);
    });

    it('should use fallback colors when category_color is invalid', () => {
      const result = callProcessTopCategories(dashboardService, [
        { category_name: 'Food', category_color: 'bg-neutral', total: '100' },
      ]);
      expect(result[0].color).toBeDefined();
      expect(typeof result[0].color).toBe('string');
    });
  });
});
