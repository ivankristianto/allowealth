import { beforeEach, describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as sqliteSchema from '@/db/schema/sqlite';
import { resetCacheManager } from '@/lib/cache';
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
import { MONTH_NAMES } from '@/lib/utils/date';
import { BudgetService } from './budget.service';

function monthStart(monthsAgo: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1, 0, 0, 0);
}

function monthEnd(monthsAgo: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59);
}

describe('budget history and category trends', () => {
  let memory: MemoryDb;
  let queries: string[];
  let service: BudgetService;

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    const { raw } = memory;
    seedWorkspaceOwner(raw, FIXTURE_WORKSPACE, FIXTURE_USER);
    seedAccount(raw, 'acc');
    for (const id of ['food', 'rent', 'fun', 'old']) seedCategory(raw, id);
    seedCategory(raw, 'salary', 'income');
    raw.run(`UPDATE budget_categories SET is_active = 0 WHERE id = 'old'`);

    // Budgets in some months only, so trends must fill gaps with zeros.
    seedBudget(raw, 'b0-food', 'food', midMonth(0), '400');
    seedBudget(raw, 'b0-rent', 'rent', midMonth(0), '1000');
    seedBudget(raw, 'b1-food', 'food', midMonth(1), '350.50');
    seedBudget(raw, 'b1-fun', 'fun', midMonth(1), '100');
    seedBudget(raw, 'b1-old', 'old', midMonth(1), '75');
    seedBudget(raw, 'b3-rent', 'rent', midMonth(3), '1000');
    seedBudget(raw, 'b3-salary', 'salary', midMonth(3), '5000');
    seedBudget(raw, 'b0-food-idr', 'food', midMonth(0), '900000', 'IDR');

    let n = 0;
    const tx = (date: Date, category: string, amount: string, extra = {}) =>
      seedTransaction(raw, `tx-${n++}`, {
        amount,
        accountId: 'acc',
        date,
        categoryId: category,
        ...extra,
      });
    tx(midMonth(0), 'food', '120.10');
    tx(midMonth(0), 'food', '300.20');
    tx(monthStart(0), 'rent', '1000');
    tx(monthEnd(1), 'food', '80');
    tx(midMonth(1), 'fun', '100');
    tx(midMonth(1), 'old', '75');
    tx(midMonth(2), 'food', '999');
    tx(midMonth(3), 'rent', '1000.01');
    tx(midMonth(3), 'salary', '5000', { type: 'income' });
    tx(midMonth(1), 'food', '50', { deleted: true });
    tx(midMonth(0), 'food', '200000', { currency: 'IDR' });

    queries = [];
    const countingDb = drizzle(raw, {
      schema: sqliteSchema,
      logger: { logQuery: (query: string) => queries.push(query) },
    });
    service = new BudgetService(countingDb);
  });

  async function overviewsByMonth(months: number) {
    const reference = new BudgetService(memory.db);
    const result: Awaited<ReturnType<BudgetService['getMonthlyOverview']>>[] = [];
    for (let i = 0; i < months; i++) {
      const start = monthStart(i);
      result.push(
        await reference.getMonthlyOverview(
          FIXTURE_WORKSPACE,
          start.getFullYear(),
          start.getMonth() + 1,
          'USD'
        )
      );
    }
    return result;
  }

  it('matches getMonthlyOverview month by month', async () => {
    const history = await service.getBudgetHistory(FIXTURE_WORKSPACE, 'USD', 6);
    const overviews = await overviewsByMonth(6);

    expect(history).toHaveLength(6);
    expect(history[0]!.month_name).toBe(MONTH_NAMES[new Date().getMonth()]);
    history.forEach((row, i) => {
      const overview = overviews[i]!;
      expect(row.month).toBe(monthStart(i).getMonth() + 1);
      expect(row.total_budget).toBe(overview.total_budget);
      expect(row.total_spent).toBe(overview.total_spent);
      expect(row.total_balance).toBe(overview.total_balance);
      expect(row.categories_count).toBe(overview.categories.length);
      expect(row.categories_exceeded).toBe(overview.categories_exceeded);
      expect(row.categories_warning).toBe(overview.categories_warning);
    });
    expect(history[0]).toMatchObject({ total_budget: '1400', total_spent: '1420.3' });
    expect(history[3]).toMatchObject({ categories_exceeded: 1 });
  });

  it('builds trends from the same per-month category rows', async () => {
    const trends = await service.getCategoryTrends(FIXTURE_WORKSPACE, 'USD', 6);
    const overviews = (await overviewsByMonth(6)).reverse();

    expect(trends.months.map((m) => m.month)).toEqual(
      [5, 4, 3, 2, 1, 0].map((i) => monthStart(i).getMonth() + 1)
    );
    expect(trends.categories.map((c) => c.category_id).sort()).toEqual(['food', 'fun', 'rent']);
    const averages = trends.categories.map((c) => c.avg_percentage_used);
    expect(averages).toEqual([...averages].sort((x, y) => y - x));
    for (const category of trends.categories) {
      category.months.forEach((cell, i) => {
        const source = overviews[i]!.categories.find((c) => c.category_id === category.category_id);
        expect(cell.month).toBe(trends.months[i]!.month);
        expect(cell.spent_amount).toBe(source?.spent_amount ?? '0');
        expect(cell.budget_amount).toBe(source?.budget_amount ?? '0');
        expect(cell.percentage_used).toBe(source?.percentage_used ?? 0);
        expect(cell.status).toBe(source?.status ?? 'ok');
      });
    }
  });

  it('runs a fixed number of queries however many months are asked for', async () => {
    await service.getBudgetHistory(FIXTURE_WORKSPACE, 'USD', 24);
    const historyQueries = queries.length;
    queries = [];
    await service.getCategoryTrends(FIXTURE_WORKSPACE, 'USD', 24);

    expect(historyQueries).toBeLessThanOrEqual(3);
    expect(queries.length).toBeLessThanOrEqual(3);
  });
});
