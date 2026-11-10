import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { BudgetService } from './budget.service';

const WORKSPACE_ID = 'ws-budget-csv';
const USER_ID = 'user-budget-csv';

function storedAmount(raw: MemoryDb['raw']): string {
  const row = raw.query(`SELECT budget_amount FROM budgets WHERE id = 'budget-1'`).get() as {
    budget_amount: string;
  };
  return row.budget_amount;
}

describe('BudgetService.importFromCSV amount validation', () => {
  let memory: MemoryDb;
  let service: BudgetService;

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, WORKSPACE_ID, USER_ID);
    memory.raw.run(
      `INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type)
       VALUES ('cat-1', ?, ?, 'Groceries', 'expense')`,
      [WORKSPACE_ID, USER_ID]
    );
    memory.raw.run(
      `INSERT INTO budgets (id, workspace_id, created_by_user_id, category_id, month, year, budget_amount, currency)
       VALUES ('budget-1', ?, ?, 'cat-1', 1, 2026, '500', 'IDR')`,
      [WORKSPACE_ID, USER_ID]
    );
    service = new BudgetService(memory.db);
  });

  async function importAmount(budget_amount: string) {
    return service.importFromCSV(
      WORKSPACE_ID,
      [{ budget_id: 'budget-1', budget_amount }],
      1,
      2026,
      'IDR'
    );
  }

  for (const amount of ['1,000', '100abc', 'Infinity', '-5', '100.123', '1e5']) {
    it(`rejects ${amount} and leaves the budget unchanged`, async () => {
      const result = await importAmount(amount);

      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain(`Invalid amount "${amount}"`);
      expect(storedAmount(memory.raw)).toBe('500');
    });
  }

  const accepted: Array<[string, string]> = [
    ['0', '0'],
    ['750000', '750000'],
    ['750000.50', '750000.5'],
    [' 1200 ', '1200'],
  ];
  for (const [amount, expected] of accepted) {
    it(`accepts ${JSON.stringify(amount)} and stores ${expected}`, async () => {
      const result = await importAmount(amount);

      expect(result.errors).toEqual([]);
      expect(result.updated).toBe(1);
      expect(storedAmount(memory.raw)).toBe(expected);
    });
  }
});
