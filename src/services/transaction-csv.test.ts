import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { transactions } from '@/db/schema/sqlite';
import { TransactionService } from './transaction.service';

const WORKSPACE_ID = 'ws-csv';
const USER_ID = 'user-csv';

function seedAccount(raw: MemoryDb['raw'], id: string, name: string, currency: string) {
  raw.run(
    `INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, balance, currency)
     VALUES (?, ?, ?, ?, 'bank', '0', ?)`,
    [id, WORKSPACE_ID, USER_ID, name, currency]
  );
}

function seedCategory(raw: MemoryDb['raw']) {
  raw.run(
    `INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type)
     VALUES ('cat-food', ?, ?, 'Groceries', 'expense')`,
    [WORKSPACE_ID, USER_ID]
  );
}

describe('TransactionService CSV', () => {
  let memory: MemoryDb;
  let service: TransactionService;

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, WORKSPACE_ID, USER_ID);
    seedAccount(memory.raw, 'acc-idr', 'Wallet', 'IDR');
    seedAccount(memory.raw, 'acc-idr-2', 'Savings', 'IDR');
    seedAccount(memory.raw, 'acc-usd', 'Dollar Account', 'USD');
    seedCategory(memory.raw);
    service = new TransactionService(memory.db);
  });

  describe('exportToCSV', () => {
    it('exports every matching row, not just the first page', async () => {
      const rows = Array.from({ length: 51 }, (_, i) => ({
        id: `tx-${i}`,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        category_id: 'cat-food',
        account_id: 'acc-idr',
        type: 'expense' as const,
        amount: String(1000 + i),
        currency: 'IDR',
        description: `row ${i}`,
        transaction_date: new Date(Date.UTC(2026, 0, 1 + (i % 28))),
      }));
      await memory.db.insert(transactions).values(rows);

      const csv = await service.exportToCSV({ workspace_id: WORKSPACE_ID });
      const dataLines = csv.split('\n').slice(1);

      expect(dataLines).toHaveLength(51);
    });

    it('leaves list pagination at its default page size', async () => {
      const rows = Array.from({ length: 51 }, (_, i) => ({
        id: `tx-${i}`,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        category_id: 'cat-food',
        account_id: 'acc-idr',
        type: 'expense' as const,
        amount: '1000',
        currency: 'IDR',
        transaction_date: new Date(Date.UTC(2026, 0, 1)),
      }));
      await memory.db.insert(transactions).values(rows);

      const page = await service.findAll({ workspace_id: WORKSPACE_ID });

      expect(page).toHaveLength(50);
    });
  });
});
