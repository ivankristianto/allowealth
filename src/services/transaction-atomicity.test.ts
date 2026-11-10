import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { countRows, createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { AccountService } from './account.service';
import { TransactionService } from './transaction.service';

const WORKSPACE_ID = 'ws-atomicity';
const USER_ID = 'user-atomicity';

function seedAccount(raw: MemoryDb['raw'], id: string, name: string, balance: string) {
  raw.run(
    `INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, balance, currency)
     VALUES (?, ?, ?, ?, 'bank', ?, 'IDR')`,
    [id, WORKSPACE_ID, USER_ID, name, balance]
  );
}

function failInsertsWhere(raw: MemoryDb['raw'], table: string, condition: string) {
  raw.run(
    `CREATE TRIGGER fail_${table} BEFORE INSERT ON ${table} WHEN ${condition}
     BEGIN SELECT RAISE(ABORT, 'forced failure'); END;`
  );
}

describe('multi-statement writes roll back on failure', () => {
  let memory: MemoryDb;

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, WORKSPACE_ID, USER_ID);
  });

  it('leaves balances and history untouched when a transfer fails mid-way', async () => {
    const { db, raw } = memory;
    seedAccount(raw, 'acc-from', 'Savings', '1000');
    seedAccount(raw, 'acc-to', 'Checking', '500');
    failInsertsWhere(raw, 'account_history', `NEW.account_id = 'acc-to'`);

    await expect(
      new AccountService(db).transfer('acc-from', 'acc-to', '300', WORKSPACE_ID)
    ).rejects.toThrow('Failed to transfer: could not create history entries');

    const balances = raw.query('SELECT id, balance FROM accounts ORDER BY id').all();
    expect(balances).toEqual([
      { id: 'acc-from', balance: '1000' },
      { id: 'acc-to', balance: '500' },
    ]);
    expect(countRows(raw, 'account_history')).toBe(0);
  });

  it('commits balances and history together when a transfer succeeds', async () => {
    const { db, raw } = memory;
    seedAccount(raw, 'acc-from', 'Savings', '1000');
    seedAccount(raw, 'acc-to', 'Checking', '500');

    await new AccountService(db).transfer('acc-from', 'acc-to', '300', WORKSPACE_ID);

    const balances = raw.query('SELECT id, balance FROM accounts ORDER BY id').all();
    expect(balances).toEqual([
      { id: 'acc-from', balance: '700' },
      { id: 'acc-to', balance: '800' },
    ]);
    expect(countRows(raw, 'account_history')).toBe(2);
  });

  it('imports no rows when a later CSV chunk fails', async () => {
    const { db, raw } = memory;
    seedAccount(raw, 'acc-csv', 'Wallet', '0');
    raw.run(
      `INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type)
       VALUES ('cat-csv', ?, ?, 'Groceries', 'expense')`,
      [WORKSPACE_ID, USER_ID]
    );
    // Row 10 sits in the second insert chunk (chunks hold 7 rows).
    failInsertsWhere(raw, 'transactions', `NEW.description = 'row 10'`);

    const rows = Array.from({ length: 12 }, (_, i) => ({
      date: '2026-01-15',
      type: 'expense',
      amount: String(1000 + i),
      currency: 'IDR',
      category: 'Groceries',
      account: 'Wallet',
      description: `row ${i + 1}`,
    }));

    const result = await new TransactionService(db).importFromCSV(WORKSPACE_ID, USER_ID, rows, {});

    expect(result.imported).toBe(0);
    expect(result.errors.some((e) => e.message.includes('forced failure'))).toBe(true);
    expect(countRows(raw, 'transactions')).toBe(0);
  });
});
