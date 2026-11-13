/**
 * DashboardService against an in-memory SQLite database. Section failures
 * must reject the whole call and never land in the cache as zeros.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { CacheKeys, getCacheManager, resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import {
  FIXTURE_USER,
  FIXTURE_WORKSPACE,
  midMonth,
  seedAccount,
  seedBudget,
  seedCategory,
  seedTransaction,
} from './test-helpers/money-fixtures';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let memory: MemoryDb;
  const date = midMonth();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const cacheKey = CacheKeys.dashboard(FIXTURE_WORKSPACE, year, month, 'USD');

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, FIXTURE_WORKSPACE, FIXTURE_USER);
    seedAccount(memory.raw, 'acc', { balance: '1000.50' });
    seedCategory(memory.raw, 'food');
    seedBudget(memory.raw, 'b-food', 'food', date, '100');
    seedTransaction(memory.raw, 'tx-1', {
      amount: '90',
      accountId: 'acc',
      date,
      categoryId: 'food',
    });
    dashboardService = new DashboardService(memory.db);
  });

  describe('getDashboardData', () => {
    it('returns every section from the database', async () => {
      const result = await dashboardService.getDashboardData(FIXTURE_WORKSPACE, month, year, 'USD');

      expect(result.totalAccounts.byCurrency).toEqual([{ currency: 'USD', amount: '1000.5' }]);
      expect(result.monthlySpent.total).toBe('90');
      expect(result.monthlySpent.budget).toBe('100');
      expect(result.monthlySpent.remaining).toBe('10');
      expect(result.monthlySpent.percentage).toBe(90);
      expect(result.budgetHealth.status).toBe('warning');
      expect(result.recentTransactions.map((tx) => tx.id)).toEqual(['tx-1']);
    });

    it('returns string amounts in every section', async () => {
      const result = await dashboardService.getDashboardData(FIXTURE_WORKSPACE, month, year, 'USD');

      result.totalAccounts.byCurrency.forEach((row) => expect(typeof row.amount).toBe('string'));
      expect(typeof result.monthlySpent.total).toBe('string');
      expect(typeof result.monthlySpent.budget).toBe('string');
      expect(typeof result.monthlySpent.remaining).toBe('string');
      expect(typeof result.monthlyIncome.total).toBe('string');
      result.topCategoryExpenses.forEach((cat) => expect(typeof cat.amount).toBe('string'));
      result.budgetHealth.alerts.forEach((alert) => {
        expect(typeof alert.budget).toBe('string');
        expect(typeof alert.spent).toBe('string');
      });
      result.recentTransactions.forEach((tx) => expect(typeof tx.amount).toBe('string'));
    });

    it('caches a successful result', async () => {
      await dashboardService.getDashboardData(FIXTURE_WORKSPACE, month, year, 'USD');

      expect(await getCacheManager().get(cacheKey)).not.toBeNull();
    });
  });

  describe('account reminders', () => {
    it('skips closed accounts', async () => {
      seedAccount(memory.raw, 'acc-closed', { status: 'closed' });
      const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
      memory.raw.run('UPDATE accounts SET last_updated = ?', [ninetyDaysAgo]);

      const result = await dashboardService.getDashboardData(FIXTURE_WORKSPACE, month, year, 'USD');

      expect(result.accountReminders.map((r) => r.accountId)).toEqual(['acc']);
    });
  });

  describe('section failures', () => {
    for (const table of ['budgets', 'accounts', 'transactions']) {
      it(`rejects and caches nothing when the ${table} query fails`, async () => {
        memory.raw.run('PRAGMA foreign_keys = OFF;');
        memory.raw.run(`DROP TABLE ${table}`);

        await expect(
          dashboardService.getDashboardData(FIXTURE_WORKSPACE, month, year, 'USD')
        ).rejects.toThrow('no such table');

        expect(await getCacheManager().get(cacheKey)).toBeNull();
      });
    }

    it('rejects an invalid month instead of reporting a healthy budget', async () => {
      await expect(
        dashboardService.getDashboardData(FIXTURE_WORKSPACE, 13, year, 'USD')
      ).rejects.toThrow('Invalid month');
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
