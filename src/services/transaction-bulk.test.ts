import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as sqliteSchema from '@/db/schema/sqlite';
import { resetCacheManager } from '@/lib/cache';
import { countRows, createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import {
  FIXTURE_USER,
  FIXTURE_WORKSPACE,
  midMonth,
  seedAccount,
  seedCategory,
  seedTransaction,
} from './test-helpers/money-fixtures';
import { TransactionService } from './transaction.service';
import type { BulkOperationResult } from './transaction.service';

const date = midMonth();

/** Live rows, active and deleted, in a form that ignores timestamps. */
function snapshot(raw: MemoryDb['raw']) {
  return raw
    .query(
      `SELECT id, category_id, account_id, updated_by_user_id, deleted_by_user_id,
         deleted_at IS NOT NULL AS deleted FROM transactions ORDER BY id`
    )
    .all();
}

function seedFixture(memory: MemoryDb) {
  const { raw } = memory;
  seedWorkspaceOwner(raw, FIXTURE_WORKSPACE, FIXTURE_USER);
  seedAccount(raw, 'usd-a');
  seedAccount(raw, 'usd-b');
  seedAccount(raw, 'idr', { currency: 'IDR' });
  seedCategory(raw, 'food');
  seedCategory(raw, 'rent');
  const tx = (id: string, fields: Partial<Parameters<typeof seedTransaction>[2]> = {}) =>
    seedTransaction(raw, id, {
      amount: '10',
      accountId: 'usd-a',
      date,
      categoryId: 'food',
      ...fields,
    });
  tx('t1');
  tx('t2', { categoryId: 'rent' });
  tx('t3', { accountId: 'usd-b' });
  tx('t-idr', { accountId: 'idr', currency: 'IDR' });
  tx('t-xfer', { type: 'transfer', categoryId: null, toAccountId: 'usd-b' });
  tx('t-xfer-idr', {
    type: 'transfer',
    categoryId: null,
    accountId: 'usd-b',
    toAccountId: 'usd-a',
  });
  tx('t-gone', { deleted: true });
  raw.run(`UPDATE transactions SET to_account_id = 'idr' WHERE id = 't-xfer-idr'`);
}

const IDS = ['t1', 't2', 'missing', 't3', 't-idr', 't-xfer', 't-xfer-idr', 't-gone', 't1'];

/** The pre-batching behaviour: one update()/delete() per id, errors collected per id. */
async function perIdLoop(
  run: (id: string) => Promise<unknown>,
  ids: string[]
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = { updated: 0, failed: 0, errors: [] };
  for (const id of ids) {
    try {
      await run(id);
      result.updated++;
    } catch (error) {
      result.failed++;
      result.errors.push({ id, error: (error as Error).message });
    }
  }
  return result;
}

describe('bulk transaction operations', () => {
  let bulk: MemoryDb;
  let reference: MemoryDb;
  let queries: string[];
  let service: TransactionService;
  let referenceService: TransactionService;

  beforeEach(() => {
    resetCacheManager();
    bulk = createMemoryDb();
    reference = createMemoryDb();
    seedFixture(bulk);
    seedFixture(reference);
    queries = [];
    service = new TransactionService(
      drizzle(bulk.raw, {
        schema: sqliteSchema,
        logger: { logQuery: (query: string) => queries.push(query) },
      })
    );
    referenceService = new TransactionService(reference.db);
  });

  const audits = () =>
    (
      bulk.raw
        .query(
          `SELECT entity_id, action, old_value, new_value, user_id FROM audit_logs ORDER BY entity_id`
        )
        .all() as Array<{
        entity_id: string;
        action: string;
        old_value: string;
        new_value: string | null;
      }>
    ).map((row) => ({
      ...row,
      old_value: JSON.parse(row.old_value),
      new_value: row.new_value && JSON.parse(row.new_value),
    }));

  describe('bulkUpdateCategory', () => {
    it('gives the same results and rows as updating each id in turn', async () => {
      const result = await service.bulkUpdateCategory(IDS, 'rent', FIXTURE_WORKSPACE, FIXTURE_USER);
      const expected = await perIdLoop(
        (id) =>
          referenceService.update(id, FIXTURE_WORKSPACE, { category_id: 'rent' }, FIXTURE_USER),
        IDS
      );

      expect(result).toEqual(expected);
      expect(snapshot(bulk.raw)).toEqual(snapshot(reference.raw));
    });

    it('writes one audit row per changed transaction', async () => {
      await service.bulkUpdateCategory(['t1', 't2', 't1'], 'rent', FIXTURE_WORKSPACE, FIXTURE_USER);

      expect(audits()).toEqual([
        {
          entity_id: 't1',
          action: 'update',
          old_value: { category_id: 'food' },
          new_value: { category_id: 'rent' },
          user_id: FIXTURE_USER,
        },
      ]);
    });

    it('runs a fixed number of statements however many ids it gets', async () => {
      await service.bulkUpdateCategory(['t1', 't3'], 'rent', FIXTURE_WORKSPACE, FIXTURE_USER);
      const few = queries.length;
      queries = [];
      await service.bulkUpdateCategory(IDS, 'food', FIXTURE_WORKSPACE, FIXTURE_USER);

      expect(queries.length).toBe(few);
      expect(few).toBeLessThanOrEqual(6);
    });
  });

  describe('bulkUpdateAccount', () => {
    it('gives the same results and rows as updating each id in turn', async () => {
      const result = await service.bulkUpdateAccount(IDS, 'usd-b', FIXTURE_WORKSPACE, FIXTURE_USER);
      const expected = await perIdLoop(
        (id) =>
          referenceService.update(id, FIXTURE_WORKSPACE, { account_id: 'usd-b' }, FIXTURE_USER),
        IDS
      );

      expect(result).toEqual(expected);
      expect(result.errors.map((e) => e.error)).toEqual([
        'Transaction not found',
        'Transaction currency must match source account currency',
        'Transfer accounts must use the same currency',
        'Transaction not found',
      ]);
      expect(snapshot(bulk.raw)).toEqual(snapshot(reference.raw));
    });

    it('audits only rows whose account changed', async () => {
      await service.bulkUpdateAccount(['t1', 't3'], 'usd-b', FIXTURE_WORKSPACE, FIXTURE_USER);

      expect(audits().map((row) => [row.entity_id, row.old_value, row.new_value])).toEqual([
        ['t1', { account_id: 'usd-a' }, { account_id: 'usd-b' }],
      ]);
    });
  });

  describe('bulkDelete', () => {
    it('gives the same results and rows as deleting each id in turn', async () => {
      const result = await service.bulkDelete(IDS, FIXTURE_WORKSPACE, FIXTURE_USER);
      const expected = await perIdLoop(
        (id) => referenceService.delete(id, FIXTURE_WORKSPACE, FIXTURE_USER),
        IDS
      );

      expect(result).toEqual(expected);
      expect(snapshot(bulk.raw)).toEqual(snapshot(reference.raw));
    });

    it('writes a delete audit row with the full snapshot', async () => {
      await service.bulkDelete(['t2'], FIXTURE_WORKSPACE, FIXTURE_USER);

      expect(audits()).toEqual([
        {
          entity_id: 't2',
          action: 'delete',
          old_value: {
            type: 'expense',
            amount: '10',
            currency: 'USD',
            category_id: 'rent',
            account_id: 'usd-a',
            to_account_id: null,
            description: null,
            transaction_date: new Date(Math.floor(date.getTime() / 1000) * 1000).toISOString(),
          },
          new_value: null,
          user_id: FIXTURE_USER,
        },
      ]);
    });

    it('rolls back every delete when the audit insert fails', async () => {
      bulk.raw.run(
        `CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'boom'); END;`
      );

      await expect(
        service.bulkDelete(['t1', 't2'], FIXTURE_WORKSPACE, FIXTURE_USER)
      ).rejects.toThrow('boom');

      expect(countRows(bulk.raw, 'transactions', 'deleted_at IS NOT NULL')).toBe(1);
    });

    it('runs a fixed number of statements however many ids it gets', async () => {
      await service.bulkDelete(['t1'], FIXTURE_WORKSPACE, FIXTURE_USER);
      const few = queries.length;
      queries = [];
      await service.bulkDelete(
        ['t2', 't3', 't-idr', 't-xfer', 'missing'],
        FIXTURE_WORKSPACE,
        FIXTURE_USER
      );

      expect(queries.length).toBe(few);
    });
  });

  it('invalidates the caches once per bulk call, and not at all when nothing changed', async () => {
    const invalidate = mock(async () => {});
    (
      service as unknown as { invalidateWorkspaceCaches: typeof invalidate }
    ).invalidateWorkspaceCaches = invalidate;

    await service.bulkUpdateCategory(['t1', 't2', 't3'], 'rent', FIXTURE_WORKSPACE, FIXTURE_USER);
    await service.bulkDelete(['t1', 't2'], FIXTURE_WORKSPACE, FIXTURE_USER);
    await service.bulkDelete(['missing'], FIXTURE_WORKSPACE, FIXTURE_USER);

    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('rejects more than 100 ids before touching the database', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `t-${i}`);

    await expect(service.bulkDelete(ids, FIXTURE_WORKSPACE, FIXTURE_USER)).rejects.toThrow(
      'Bulk operations limited to 100'
    );
    expect(queries).toHaveLength(0);
  });
});
