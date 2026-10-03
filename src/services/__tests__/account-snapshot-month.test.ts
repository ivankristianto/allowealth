import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import type { SQL } from 'drizzle-orm';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

describe('AccountService.getSnapshotForMonth month boundaries', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;
  let whereConditions: SQL[];

  /**
   * Answers the two-step snapshot query: step 1 (groupBy) returns the newest
   * recorded_at per account, step 2 returns the full rows. Every `where`
   * condition is captured so its bound parameters can be inspected.
   */
  function mockSelectForSnapshot(
    historyRows: Array<{ account_id: string; balance: string; recorded_at: Date }>
  ) {
    whereConditions = [];
    let isStep2 = false;
    (mockDb as any).select = mock(() => ({
      from: mock(() => ({
        where: mock((condition: SQL) => {
          whereConditions.push(condition);
          if (isStep2) {
            isStep2 = false;
            return Promise.resolve(historyRows);
          }
          const maxDates = historyRows.map((row) => ({
            account_id: row.account_id,
            max_recorded_at: row.recorded_at,
          }));
          isStep2 = maxDates.length > 0;
          const promise = Promise.resolve(maxDates);
          (promise as any).groupBy = mock(() => Promise.resolve(maxDates));
          return promise;
        }),
      })),
    }));
  }

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('includes an account created later whose balance history reaches into the month', async () => {
    const account = createMockAccount({
      id: 'account-1',
      balance: '5000',
      initial_balance: '1000',
      created_at: new Date(2099, 9, 3),
    });
    (mockDb.query.accounts.findMany as any).mockResolvedValue([account]);
    mockSelectForSnapshot([
      { account_id: 'account-1', balance: '4500', recorded_at: new Date(2099, 0, 31, 12) },
    ]);

    const snapshots = await accountService.getSnapshotForMonth('workspace-1', 2099, 1);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.snapshot_balance).toBe('4500');
  });

  it('excludes an account with no history by month end and created after it', async () => {
    const account = createMockAccount({ id: 'account-1', created_at: new Date(2099, 9, 3) });
    (mockDb.query.accounts.findMany as any).mockResolvedValue([account]);
    mockSelectForSnapshot([]);

    const snapshots = await accountService.getSnapshotForMonth('workspace-1', 2099, 1);

    expect(snapshots).toHaveLength(0);
  });

  it('still includes an account created by month end that has no history', async () => {
    const account = createMockAccount({
      id: 'account-1',
      initial_balance: '1000',
      created_at: new Date(2099, 0, 10),
    });
    (mockDb.query.accounts.findMany as any).mockResolvedValue([account]);
    mockSelectForSnapshot([]);

    const snapshots = await accountService.getSnapshotForMonth('workspace-1', 2099, 1);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.snapshot_balance).toBe('1000');
  });

  it('bounds the history query in seconds, the unit recorded_at is stored in', async () => {
    const account = createMockAccount({ id: 'account-1', created_at: new Date(2099, 0, 1) });
    (mockDb.query.accounts.findMany as any).mockResolvedValue([account]);
    mockSelectForSnapshot([]);

    await accountService.getSnapshotForMonth('workspace-1', 2099, 1);

    const endOfMonthSeconds = Math.floor(new Date(2099, 0, 31, 23, 59, 59, 999).getTime() / 1000);
    const { params } = new SQLiteSyncDialect().sqlToQuery(whereConditions[0]!);
    expect(params).toContain(endOfMonthSeconds);
  });
});
