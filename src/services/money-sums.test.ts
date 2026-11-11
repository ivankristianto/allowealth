import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { decimalCompare } from '@/lib/utils/decimal';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { BudgetService } from '@/services/budget.service';
import { DashboardService } from '@/services/dashboard.service';
import { ReportService } from '@/services/report.service';
import {
  FIXTURE_USER,
  FIXTURE_WORKSPACE,
  midMonth,
  seedAccount,
  seedBudget,
  seedCategory,
  seedTransaction,
} from '@/services/test-helpers/money-fixtures';

function periodOf(date: Date): { year: number; month: number; period: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return { year, month, period: `${year}-${String(month).padStart(2, '0')}` };
}

function expectExact(actual: unknown, expected: string) {
  expect(String(actual)).not.toContain('e');
  expect(decimalCompare(String(actual), expected)).toBe(0);
}

describe('SQL money sums are exact to the cent', () => {
  let memory: MemoryDb;
  const date = midMonth();
  const { year, month, period } = periodOf(date);

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, FIXTURE_WORKSPACE, FIXTURE_USER);
  });

  function seedPair(currency: string, amounts: [string, string]) {
    const { raw } = memory;
    seedAccount(raw, 'acc', { currency });
    seedCategory(raw, 'food');
    seedCategory(raw, 'salary', 'income');
    seedBudget(raw, 'b-food', 'food', date, '100', currency);
    amounts.forEach((amount, i) => {
      seedTransaction(raw, `exp-${i}`, {
        amount,
        accountId: 'acc',
        date,
        categoryId: 'food',
        currency,
      });
      seedTransaction(raw, `inc-${i}`, {
        amount,
        accountId: 'acc',
        date,
        categoryId: 'salary',
        type: 'income',
        currency,
      });
    });
  }

  it("sums '10.10' + '20.20' to exactly 30.30 in the report", async () => {
    seedPair('USD', ['10.10', '20.20']);

    const report = await new ReportService(memory.db).getMonthlyReport(
      FIXTURE_WORKSPACE,
      period,
      'USD'
    );

    expect(report.totalIncome).toBe('30.3');
    expect(report.totalExpenses).toBe('30.3');
  });

  it("sums '10.10' + '20.20' to exactly 30.30 in the budget overview", async () => {
    seedPair('USD', ['10.10', '20.20']);

    const overview = await new BudgetService(memory.db).getMonthlyOverview(
      FIXTURE_WORKSPACE,
      year,
      month,
      'USD'
    );

    expectExact(overview.categories[0]?.spent_amount, '30.30');
    expectExact(overview.total_spent, '30.30');
  });

  it("sums '10.10' + '20.20' to exactly 30.30 on the dashboard", async () => {
    seedPair('USD', ['10.10', '20.20']);

    const dashboard = await new DashboardService(memory.db).getDashboardData(
      FIXTURE_WORKSPACE,
      month,
      year,
      'USD'
    );

    expectExact(dashboard.monthlySpent.total, '30.30');
    expectExact(dashboard.monthlyIncome.total, '30.30');
    expectExact(dashboard.topCategoryExpenses[0]?.amount, '30.30');
  });

  it('leaves IDR whole-number sums unchanged', async () => {
    seedPair('IDR', ['1500000', '250000']);

    const [report, overview, dashboard] = await Promise.all([
      new ReportService(memory.db).getMonthlyReport(FIXTURE_WORKSPACE, period, 'IDR'),
      new BudgetService(memory.db).getMonthlyOverview(FIXTURE_WORKSPACE, year, month, 'IDR'),
      new DashboardService(memory.db).getDashboardData(FIXTURE_WORKSPACE, month, year, 'IDR'),
    ]);

    expect(report.totalExpenses).toBe('1750000');
    expect(report.totalIncome).toBe('1750000');
    expect(Number(overview.categories[0]?.spent_amount)).toBe(1750000);
    expect(Number(dashboard.monthlySpent.total)).toBe(1750000);
  });
});
