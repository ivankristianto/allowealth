import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';
import { PerfCollector } from '@/lib/perf';

describe('AccountService.getSnapshotForMonth N+1 fix', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;
  let selectCallCount: number;

  /**
   * Sets up the select mock to handle the two-step snapshot query:
   *   Step 1 (groupBy): returns max recorded_at per account_id
   *   Step 2 (where only): returns full history rows
   */
  function mockSelectForSnapshot(
    maxDates: Array<{ account_id: string; max_recorded_at: Date | number }>,
    historyRows: Array<{ account_id: string; balance: string; recorded_at: Date | number }>
  ) {
    selectCallCount = 0;
    let isStep2 = false;
    (mockDb as any).select = mock(() => {
      return {
        from: mock(() => ({
          where: mock(() => {
            selectCallCount++;
            if (isStep2) {
              // Step 2: fetch full rows by (account_id, recorded_at) pairs
              isStep2 = false;
              return Promise.resolve(historyRows);
            }
            // Step 1: the where() call that chains to groupBy
            // If maxDates is non-empty, next select call will be step 2
            isStep2 = maxDates.length > 0;
            const promise = Promise.resolve(maxDates);
            (promise as any).groupBy = mock(() => Promise.resolve(maxDates));
            (promise as any).orderBy = mock(() => Promise.resolve([]));
            return promise;
          }),
          groupBy: mock(() => Promise.resolve(maxDates)),
          orderBy: mock(() => Promise.resolve([])),
        })),
      };
    });
  }

  beforeEach(() => {
    resetCacheManager();
    selectCallCount = 0;
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    // Mock cache to always miss (we're testing query behavior)
    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should use bulk query instead of per-account queries', async () => {
    const workspaceId = 'workspace-1';
    const year = 2026;
    const month = 2;

    // Create 10 mock accounts
    const accounts = Array.from({ length: 10 }, (_, i) =>
      createMockAccount({
        id: `account-${i}`,
        workspace_id: workspaceId,
        created_at: new Date(year, month - 2, 1),
      })
    );

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);

    const maxDates = accounts.map((account) => ({
      account_id: account.id,
      max_recorded_at: new Date(year, month - 1, 15),
    }));
    const histories = accounts.map((account) => ({
      account_id: account.id,
      balance: '1000',
      recorded_at: new Date(year, month - 1, 15),
    }));
    mockSelectForSnapshot(maxDates, histories);

    await accountService.getSnapshotForMonth(workspaceId, year, month);

    // Should NOT use per-account findFirst at all (old N+1 pattern)
    expect((mockDb.query.accountHistory as any).findFirst).not.toHaveBeenCalled();

    // Should have called select twice per chunk (step 1: maxDates, step 2: rows)
    expect(selectCallCount).toBe(2);
  });

  it('should return snapshot balances correctly from bulk query', async () => {
    const workspaceId = 'workspace-1';
    const year = 2026;
    const month = 2;

    const account1 = createMockAccount({
      id: 'account-1',
      workspace_id: workspaceId,
      balance: '5000',
      initial_balance: '1000',
      created_at: new Date(year, month - 2, 1),
    });

    const account2 = createMockAccount({
      id: 'account-2',
      workspace_id: workspaceId,
      balance: '3000',
      initial_balance: '2000',
      created_at: new Date(year, month - 1, 1),
    });

    (mockDb.query.accounts.findMany as any).mockResolvedValue([account1, account2]);

    mockSelectForSnapshot(
      [
        { account_id: 'account-1', max_recorded_at: new Date(year, month - 1, 15) },
        { account_id: 'account-2', max_recorded_at: new Date(year, month - 1, 20) },
      ],
      [
        { account_id: 'account-1', balance: '4500', recorded_at: new Date(year, month - 1, 15) },
        { account_id: 'account-2', balance: '3200', recorded_at: new Date(year, month - 1, 20) },
      ]
    );

    const snapshots = await accountService.getSnapshotForMonth(workspaceId, year, month);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].snapshot_balance).toBe('4500');
    expect(snapshots[1].snapshot_balance).toBe('3200');
  });

  it('chunks account IDs when count exceeds SQLite variable limit', async () => {
    const workspaceId = 'workspace-1';
    const accounts = Array.from({ length: 1200 }, (_, i) =>
      createMockAccount({
        id: `account-${i}`,
        workspace_id: workspaceId,
        created_at: new Date('2026-01-01'),
      })
    );

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);
    // Return empty for all chunks - the select mock handles both steps
    mockSelectForSnapshot([], []);

    await accountService.getSnapshotForMonth(workspaceId, 2026, 2);

    // With 1200 accounts and chunk size 500, should have 3 chunks
    // Step 1 returns empty, so Step 2 is skipped → only 3 select calls total
    expect(selectCallCount).toBe(3);
  });

  it('records perf metrics during chunked snapshot execution', async () => {
    const workspaceId = 'workspace-1';
    const accounts = Array.from({ length: 1200 }, (_, i) =>
      createMockAccount({
        id: `account-${i}`,
        workspace_id: workspaceId,
        created_at: new Date('2026-01-01'),
      })
    );
    const perf = new PerfCollector();

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);
    mockSelectForSnapshot([], []);

    await accountService.getSnapshotForMonth(workspaceId, 2026, 2, undefined, perf);

    const phases = perf.getPhases();
    expect(
      phases.some((phase) => phase.name === 'AccountService.getSnapshotForMonth.accountCount')
    ).toBe(true);
    expect(
      phases.some((phase) => phase.name === 'AccountService.getSnapshotForMonth.chunkCount')
    ).toBe(true);
    expect(
      phases.some((phase) => phase.name === 'AccountService.getSnapshotForMonth.historyRowsFetched')
    ).toBe(true);
  });

  it('uses latest history at or before month-end per account', async () => {
    const workspaceId = 'workspace-1';
    const account = createMockAccount({
      id: 'account-1',
      workspace_id: workspaceId,
      balance: '5000',
      initial_balance: '1000',
      created_at: new Date('2026-01-01'),
    });

    (mockDb.query.accounts.findMany as any).mockResolvedValue([account]);

    // The max_recorded_at query returns the latest date; then the full row fetch
    // returns two rows — the historyMap in the service keeps the latest
    mockSelectForSnapshot(
      [{ account_id: 'account-1', max_recorded_at: new Date('2026-01-31') }],
      [{ account_id: 'account-1', balance: '3000', recorded_at: new Date('2026-01-31') }]
    );

    const snapshots = await accountService.getSnapshotForMonth(workspaceId, 2026, 1);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].snapshot_balance).toBe('3000');
    expect(snapshots[0].snapshot_date).toEqual(new Date('2026-01-31'));
  });

  it('should fall back to initial_balance when no history exists', async () => {
    const workspaceId = 'workspace-1';
    const year = 2026;
    const month = 2;

    const account = createMockAccount({
      id: 'account-1',
      workspace_id: workspaceId,
      balance: '5000',
      initial_balance: '1000',
      created_at: new Date(year, month - 2, 1),
    });

    (mockDb.query.accounts.findMany as any).mockResolvedValue([account]);
    // No history — step 1 returns empty, step 2 is never called
    mockSelectForSnapshot([], []);

    const snapshots = await accountService.getSnapshotForMonth(workspaceId, year, month);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].snapshot_balance).toBe('1000');
  });

  it('should return empty array when no accounts exist', async () => {
    const workspaceId = 'workspace-1';

    (mockDb.query.accounts.findMany as any).mockResolvedValue([]);

    const snapshots = await accountService.getSnapshotForMonth(workspaceId, 2026, 2);

    expect(snapshots).toHaveLength(0);
    // Should not even call select for history query
    expect(selectCallCount).toBe(0);
  });
});
