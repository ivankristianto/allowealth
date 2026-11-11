import { beforeEach, describe, expect, it } from 'bun:test';
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
import { BudgetService } from './budget.service';
import { DashboardService } from './dashboard.service';

describe('budget status at the 100% boundary', () => {
  let memory: MemoryDb;
  const date = midMonth();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, FIXTURE_WORKSPACE, FIXTURE_USER);
    seedAccount(memory.raw, 'acc');
    seedCategory(memory.raw, 'food');
  });

  async function statuses(budget: string, spent: string) {
    seedBudget(memory.raw, 'b-food', 'food', date, budget);
    seedTransaction(memory.raw, 'tx', {
      amount: spent,
      accountId: 'acc',
      date,
      categoryId: 'food',
    });

    const overview = await new BudgetService(memory.db).getMonthlyOverview(
      FIXTURE_WORKSPACE,
      year,
      month,
      'USD'
    );
    const dashboard = await new DashboardService(memory.db).getDashboardData(
      FIXTURE_WORKSPACE,
      month,
      year,
      'USD'
    );
    return {
      budgetPage: overview.categories[0]?.status,
      exceededCount: overview.categories_exceeded,
      dashboard: dashboard.budgetHealth.alerts[0]?.status,
    };
  }

  it('reports exactly 100% as exceeded on the budget page and the dashboard', async () => {
    expect(await statuses('500', '500')).toEqual({
      budgetPage: 'exceeded',
      exceededCount: 1,
      dashboard: 'exceeded',
    });
  });

  it('reports one cent under the budget as a warning in both places', async () => {
    expect(await statuses('500', '499.99')).toEqual({
      budgetPage: 'warning',
      exceededCount: 0,
      dashboard: 'warning',
    });
  });
});
