import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { countRows, createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
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

function expenseRow(overrides: Record<string, string> = {}) {
  return {
    date: '2026-01-15',
    type: 'expense',
    amount: '1000',
    currency: 'IDR',
    category: 'Groceries',
    account: 'Wallet',
    description: 'row',
    ...overrides,
  };
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

  describe('importFromCSV amount validation', () => {
    for (const amount of ['1,000', '100abc', 'Infinity', '1e5', '-100', '0', '100.123', '']) {
      it(`rejects amount ${JSON.stringify(amount)}`, async () => {
        const result = await service.importFromCSV(
          WORKSPACE_ID,
          USER_ID,
          [expenseRow({ amount })],
          {}
        );

        expect(result.imported).toBe(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.row).toBe(1);
        expect(countRows(memory.raw, 'transactions')).toBe(0);
      });
    }

    it('accepts plain decimals and stores them in canonical form', async () => {
      const result = await service.importFromCSV(
        WORKSPACE_ID,
        USER_ID,
        [
          expenseRow({ amount: '1000', description: 'a' }),
          expenseRow({ amount: '2500.50', description: 'b' }),
          expenseRow({ amount: ' 300 ', description: 'c' }),
        ],
        {}
      );

      expect(result.errors).toEqual([]);
      expect(result.imported).toBe(3);
      const stored = memory.raw
        .query('SELECT amount FROM transactions ORDER BY description')
        .all() as Array<{ amount: string }>;
      expect(stored.map((r) => r.amount)).toEqual(['1000', '2500.5', '300']);
    });
  });

  describe('importFromCSV currency checks', () => {
    it('rejects a row whose currency differs from the source account', async () => {
      const result = await service.importFromCSV(
        WORKSPACE_ID,
        USER_ID,
        [expenseRow({ currency: 'USD' }), expenseRow({ amount: '2000' })],
        {}
      );

      expect(result.imported).toBe(1);
      expect(result.errors).toEqual([
        { row: 1, message: 'Transaction currency must match source account currency' },
      ]);
      expect(countRows(memory.raw, 'transactions', `currency = 'USD'`)).toBe(0);
    });

    it('rejects a transfer whose destination account uses another currency', async () => {
      const result = await service.importFromCSV(
        WORKSPACE_ID,
        USER_ID,
        [
          expenseRow({ type: 'transfer', category: '', to_account: 'Dollar Account' }),
          expenseRow({ type: 'transfer', category: '', to_account: 'Savings', amount: '2000' }),
        ],
        { to_account: 'to_account' }
      );

      expect(result.imported).toBe(1);
      expect(result.errors).toEqual([
        { row: 1, message: 'Transfer accounts must use the same currency' },
      ]);
      expect(countRows(memory.raw, 'transactions', `to_account_id = 'acc-usd'`)).toBe(0);
    });
  });

  describe('importFromCSV duplicate detection', () => {
    async function seedManualExpense(amount: string) {
      await memory.db.insert(transactions).values({
        id: 'tx-manual',
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        category_id: 'cat-food',
        account_id: 'acc-idr',
        type: 'expense',
        amount,
        currency: 'IDR',
        description: 'typed by hand',
        transaction_date: new Date(Date.UTC(2026, 0, 15)),
      });
    }

    it('skips an imported row that matches a manual entry stored with trailing zeros', async () => {
      await seedManualExpense('1000.00');

      const result = await service.importFromCSV(WORKSPACE_ID, USER_ID, [expenseRow()], {});

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(countRows(memory.raw, 'transactions')).toBe(1);
    });

    it('skips an imported row with trailing zeros that matches a plain stored amount', async () => {
      await seedManualExpense('1000');

      const result = await service.importFromCSV(
        WORKSPACE_ID,
        USER_ID,
        [expenseRow({ amount: '1000.00' })],
        {}
      );

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('still imports a row whose amount differs', async () => {
      await seedManualExpense('1000.50');

      const result = await service.importFromCSV(WORKSPACE_ID, USER_ID, [expenseRow()], {});

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
    });
  });
});
