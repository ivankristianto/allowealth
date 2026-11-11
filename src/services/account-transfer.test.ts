import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { countRows, createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { FIXTURE_USER, FIXTURE_WORKSPACE, seedAccount } from './test-helpers/money-fixtures';
import { AccountService } from './account.service';
import { ServiceError, ServiceErrorCode } from './service-errors';

describe('AccountService.transfer()', () => {
  let memory: MemoryDb;
  let service: AccountService;

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, FIXTURE_WORKSPACE, FIXTURE_USER);
    service = new AccountService(memory.db);
  });

  const transfer = (from: string, to: string, amount: string, description?: string) =>
    service.transfer(from, to, amount, FIXTURE_WORKSPACE, {
      createdByUserId: FIXTURE_USER,
      description,
    });

  const balances = () =>
    Object.fromEntries(
      (memory.raw.query('SELECT id, balance FROM accounts').all() as any[]).map((row) => [
        row.id,
        row.balance,
      ])
    );

  describe('balances', () => {
    it('moves money between two liquid accounts', async () => {
      seedAccount(memory.raw, 'savings', { balance: '1000' });
      seedAccount(memory.raw, 'checking', { balance: '500' });

      const result = await transfer('savings', 'checking', '300');

      expect(result.fromAccount.balance).toBe('700');
      expect(result.toAccount.balance).toBe('800');
      expect(balances()).toEqual({ savings: '700', checking: '800' });
    });

    it('reduces debt when paying a credit card from a liquid account', async () => {
      seedAccount(memory.raw, 'bank', { balance: '10000000', currency: 'IDR' });
      seedAccount(memory.raw, 'card', {
        balance: '5000000',
        currency: 'IDR',
        accountClass: 'debt',
      });

      await transfer('bank', 'card', '2000000');

      expect(balances()).toEqual({ bank: '8000000', card: '3000000' });
    });

    it('increases debt on a cash advance from a debt account', async () => {
      seedAccount(memory.raw, 'card', {
        balance: '3000000',
        currency: 'IDR',
        accountClass: 'debt',
      });
      seedAccount(memory.raw, 'cash', { balance: '1000000', currency: 'IDR' });

      await transfer('card', 'cash', '500000');

      expect(balances()).toEqual({ card: '3500000', cash: '1500000' });
    });

    it('handles debt-to-debt transfers', async () => {
      seedAccount(memory.raw, 'card', {
        balance: '5000000',
        currency: 'IDR',
        accountClass: 'debt',
      });
      seedAccount(memory.raw, 'loan', {
        balance: '10000000',
        currency: 'IDR',
        accountClass: 'debt',
      });

      await transfer('card', 'loan', '2000000');

      expect(balances()).toEqual({ card: '7000000', loan: '8000000' });
    });

    it('reads balances inside the transaction, so back-to-back transfers both land', async () => {
      seedAccount(memory.raw, 'savings', { balance: '1000' });
      seedAccount(memory.raw, 'checking', { balance: '0' });

      await Promise.all([
        transfer('savings', 'checking', '100'),
        transfer('savings', 'checking', '250'),
      ]);

      expect(balances()).toEqual({ savings: '650', checking: '350' });
    });
  });

  describe('records', () => {
    it('writes both history rows and the transfer transaction', async () => {
      seedAccount(memory.raw, 'savings', { balance: '1000' });
      seedAccount(memory.raw, 'checking', { balance: '500' });

      const { transactionId } = await transfer('savings', 'checking', '300', 'Rent pot');

      const history = memory.raw
        .query('SELECT account_id, balance, notes FROM account_history ORDER BY account_id')
        .all();
      expect(history).toEqual([
        { account_id: 'checking', balance: '800', notes: 'Transfer from Account savings' },
        { account_id: 'savings', balance: '700', notes: 'Transfer to Account checking' },
      ]);

      const record = memory.raw
        .query(
          `SELECT type, amount, currency, account_id, to_account_id, category_id, description,
             created_by_user_id FROM transactions WHERE id = ?`
        )
        .get(transactionId);
      expect(record).toEqual({
        type: 'transfer',
        amount: '300',
        currency: 'USD',
        account_id: 'savings',
        to_account_id: 'checking',
        category_id: null,
        description: 'Rent pot',
        created_by_user_id: FIXTURE_USER,
      });
    });
  });

  describe('atomicity', () => {
    function failInserts(table: string) {
      memory.raw.run(
        `CREATE TRIGGER fail_${table} BEFORE INSERT ON ${table}
         BEGIN SELECT RAISE(ABORT, 'forced failure'); END;`
      );
    }

    for (const table of ['account_history', 'transactions']) {
      it(`leaves balances, history and transactions untouched when the ${table} insert fails`, async () => {
        seedAccount(memory.raw, 'savings', { balance: '1000' });
        seedAccount(memory.raw, 'checking', { balance: '500' });
        failInserts(table);

        const error = await transfer('savings', 'checking', '300').catch((e: unknown) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(ServiceError);
        expect((error as Error).message).toBe('Failed to transfer: the transfer was rolled back');
        expect(balances()).toEqual({ savings: '1000', checking: '500' });
        expect(countRows(memory.raw, 'account_history')).toBe(0);
        expect(countRows(memory.raw, 'transactions')).toBe(0);
      });
    }
  });

  describe('rejections are 4xx ServiceErrors', () => {
    async function rejection(promise: Promise<unknown>) {
      const error = await promise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ServiceError);
      return error as ServiceError;
    }

    it('rejects a transfer to the same account', async () => {
      const error = await rejection(transfer('savings', 'savings', '100'));

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ServiceErrorCode.VALIDATION_ERROR);
    });

    it('rejects a currency mismatch with 400 and changes nothing', async () => {
      seedAccount(memory.raw, 'idr', { balance: '10000000', currency: 'IDR' });
      seedAccount(memory.raw, 'usd', { balance: '1000', currency: 'USD' });

      const error = await rejection(transfer('idr', 'usd', '100'));

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Cannot transfer between different currencies');
      expect(balances()).toEqual({ idr: '10000000', usd: '1000' });
    });

    for (const amount of ['0', '-5', '1,000', 'abc', '1.234']) {
      it(`rejects the amount '${amount}' with 400`, async () => {
        seedAccount(memory.raw, 'savings', { balance: '1000' });
        seedAccount(memory.raw, 'checking', { balance: '500' });

        const error = await rejection(transfer('savings', 'checking', amount));

        expect(error.statusCode).toBe(400);
        expect(balances()).toEqual({ savings: '1000', checking: '500' });
      });
    }

    it('rejects a missing source or destination with 404', async () => {
      seedAccount(memory.raw, 'savings', { balance: '1000' });

      expect((await rejection(transfer('missing', 'savings', '1'))).statusCode).toBe(404);
      expect((await rejection(transfer('savings', 'missing', '1'))).statusCode).toBe(404);
    });

    it('rejects a deleted account with 404 and leaves it untouched', async () => {
      seedAccount(memory.raw, 'savings', { balance: '1000' });
      seedAccount(memory.raw, 'gone', { balance: '50' });
      memory.raw.run(`UPDATE accounts SET deleted_at = 1 WHERE id = 'gone'`);

      expect((await rejection(transfer('savings', 'gone', '1'))).statusCode).toBe(404);
      expect((await rejection(transfer('gone', 'savings', '1'))).statusCode).toBe(404);
      expect(balances()).toEqual({ savings: '1000', gone: '50' });
    });

    it('rejects an account from another workspace with 404', async () => {
      seedAccount(memory.raw, 'savings', { balance: '1000' });
      memory.raw.run(`INSERT INTO workspaces (id, name) VALUES ('ws-other', 'Other')`);
      memory.raw.run(
        `INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, balance, currency)
         VALUES ('foreign', 'ws-other', ?, 'Foreign', 'bank', '1000', 'USD')`,
        [FIXTURE_USER]
      );

      expect((await rejection(transfer('savings', 'foreign', '1'))).statusCode).toBe(404);
      expect(balances().foreign).toBe('1000');
    });

    for (const closed of ['source', 'destination'] as const) {
      it(`rejects a closed ${closed} account with ACCOUNT_CLOSED`, async () => {
        seedAccount(memory.raw, 'a', {
          balance: '1000',
          status: closed === 'source' ? 'closed' : 'active',
        });
        seedAccount(memory.raw, 'b', {
          balance: '0',
          status: closed === 'destination' ? 'closed' : 'active',
        });

        const error = await rejection(transfer('a', 'b', '100'));

        expect(error.code).toBe(ServiceErrorCode.ACCOUNT_CLOSED);
        expect(error.statusCode).toBe(400);
      });
    }
  });
});
