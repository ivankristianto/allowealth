import { beforeEach, describe, expect, test } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import {
  FIXTURE_USER,
  FIXTURE_WORKSPACE,
  midMonth,
  seedAccount,
  seedCategory,
  seedTransaction,
} from './test-helpers/money-fixtures';
import { ReportService } from './report.service';

const OTHER_USER = 'user-other';

describe('ReportService on a real database', () => {
  let memory: MemoryDb;
  let service: ReportService;
  const date = midMonth();
  const year = date.getFullYear();
  const period = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    const { raw } = memory;
    seedWorkspaceOwner(raw, FIXTURE_WORKSPACE, FIXTURE_USER);
    raw.run(
      `INSERT INTO users (id, workspace_id, email, name, role) VALUES (?, ?, 'other@example.test', 'Other', 'member')`,
      [OTHER_USER, FIXTURE_WORKSPACE]
    );
    seedAccount(raw, 'acc', { currency: 'IDR' });
    seedCategory(raw, 'food');
    seedCategory(raw, 'salary', 'income');
    seedTransaction(raw, 'inc', {
      amount: '9000000',
      accountId: 'acc',
      date,
      categoryId: 'salary',
      type: 'income',
      currency: 'IDR',
    });
    seedTransaction(raw, 'exp', {
      amount: '2500000',
      accountId: 'acc',
      date,
      categoryId: 'food',
      currency: 'IDR',
    });
    raw.run(`UPDATE transactions SET created_by_user_id = ? WHERE id = 'exp'`, [OTHER_USER]);
    service = new ReportService(memory.db);
  });

  describe('getMonthlyReport', () => {
    test('returns the month totals as strings', async () => {
      const report = await service.getMonthlyReport(FIXTURE_WORKSPACE, period, 'IDR');

      expect(report.totalIncome).toBe('9000000');
      expect(report.totalExpenses).toBe('2500000');
      expect(report.netSavings).toBe('6500000');
      expect(report.expenseByCategory.map((row) => row.value)).toEqual(['2500000']);
    });

    test('filters by member when a userId is given', async () => {
      const report = await service.getMonthlyReport(FIXTURE_WORKSPACE, period, 'IDR', FIXTURE_USER);

      expect(report.totalIncome).toBe('9000000');
      expect(report.totalExpenses).toBe('0');
    });

    test('returns zeros for a month with no transactions', async () => {
      const report = await service.getMonthlyReport(FIXTURE_WORKSPACE, '2001-01', 'IDR');

      expect(report.totalIncome).toBe('0');
      expect(report.totalExpenses).toBe('0');
    });

    for (const badPeriod of ['2024/02', '2024-13', '1999-02']) {
      test(`rejects the period ${badPeriod}`, async () => {
        await expect(
          service.getMonthlyReport(FIXTURE_WORKSPACE, badPeriod, 'IDR')
        ).rejects.toThrow();
      });
    }
  });

  describe('getYearlyReport', () => {
    test('returns the year totals and a 12-month trend', async () => {
      const report = await service.getYearlyReport(FIXTURE_WORKSPACE, year, 'IDR');

      expect(report.totalIncome).toBe('9000000');
      expect(report.totalExpenses).toBe('2500000');
      expect(report.trendData).toHaveLength(12);
    });

    test('rejects a year before 2000', async () => {
      await expect(service.getYearlyReport(FIXTURE_WORKSPACE, 1999, 'IDR')).rejects.toThrow();
    });
  });

  describe('database errors propagate instead of reading as zero', () => {
    beforeEach(() => {
      memory.raw.run('PRAGMA foreign_keys = OFF;');
      memory.raw.run('DROP TABLE transactions');
    });

    test('getMonthlyReport', async () => {
      await expect(service.getMonthlyReport(FIXTURE_WORKSPACE, period, 'IDR')).rejects.toThrow(
        'no such table'
      );
    });

    test('getYearlyReport', async () => {
      await expect(service.getYearlyReport(FIXTURE_WORKSPACE, year, 'IDR')).rejects.toThrow(
        'no such table'
      );
    });

    test('getOverviewReport', async () => {
      await expect(
        service.getOverviewReport(FIXTURE_WORKSPACE, period, 'monthly', 'IDR')
      ).rejects.toThrow('no such table');
    });

    test('getExpenseReport', async () => {
      await expect(
        service.getExpenseReport(FIXTURE_WORKSPACE, period, 'monthly', 'IDR')
      ).rejects.toThrow('no such table');
    });

    test('getIncomeReport', async () => {
      await expect(
        service.getIncomeReport(FIXTURE_WORKSPACE, period, 'monthly', 'IDR')
      ).rejects.toThrow('no such table');
    });
  });
});
