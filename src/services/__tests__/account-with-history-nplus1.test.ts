import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

describe('AccountService.findAllWithHistory N+1 fix', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    // Mock cache to always miss
    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should use bulk query instead of per-account queries', async () => {
    const workspaceId = 'workspace-1';

    // Create 10 mock accounts
    const accounts = Array.from({ length: 10 }, (_, i) =>
      createMockAccount({ id: `account-${i}`, workspace_id: workspaceId })
    );

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);

    // Mock bulk history query
    const histories = accounts.flatMap((account) => [
      { account_id: account.id, balance: '1000', recorded_at: new Date('2026-01-01') },
      { account_id: account.id, balance: '2000', recorded_at: new Date('2026-02-01') },
    ]);
    (mockDb.query.accountHistory as any).findMany.mockResolvedValue(histories);

    await accountService.findAllWithHistory(workspaceId);

    // Should call accountHistory.findMany exactly once (bulk query)
    // NOT 10 times (one per account)
    expect((mockDb.query.accountHistory as any).findMany).toHaveBeenCalledTimes(1);
  });

  it('should return accounts with history in chronological order', async () => {
    const workspaceId = 'workspace-1';

    const accounts = [
      createMockAccount({ id: 'account-1', workspace_id: workspaceId }),
      createMockAccount({ id: 'account-2', workspace_id: workspaceId }),
    ];

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);

    // History is already sorted asc by recorded_at
    const histories = [
      { account_id: 'account-1', balance: '1000', recorded_at: new Date('2026-01-15') },
      { account_id: 'account-1', balance: '1500', recorded_at: new Date('2026-02-01') },
      { account_id: 'account-2', balance: '2000', recorded_at: new Date('2026-01-20') },
    ];
    (mockDb.query.accountHistory as any).findMany.mockResolvedValue(histories);

    const result = await accountService.findAllWithHistory(workspaceId);

    expect(result).toHaveLength(2);
    expect(result[0].history).toHaveLength(2);
    expect(result[0].history[0].amount).toBe(1000);
    expect(result[0].history[1].amount).toBe(1500);
    expect(result[1].history).toHaveLength(1);
    expect(result[1].history[0].amount).toBe(2000);
  });

  it('chunks account IDs in findAllWithHistory when workspace has many accounts', async () => {
    const workspaceId = 'workspace-1';
    const accounts = Array.from({ length: 1200 }, (_, i) =>
      createMockAccount({ id: `account-${i}`, workspace_id: workspaceId })
    );

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);
    (mockDb.query.accountHistory as any).findMany.mockResolvedValue([]);

    await accountService.findAllWithHistory(workspaceId);

    expect((mockDb.query.accountHistory as any).findMany.mock.calls.length).toBeGreaterThan(1);
  });

  it('records perf metrics during chunked findAllWithHistory execution', async () => {
    const workspaceId = 'workspace-1';
    const accounts = Array.from({ length: 1200 }, (_, i) =>
      createMockAccount({ id: `account-${i}`, workspace_id: workspaceId })
    );
    const perf = { recordPhase: mock(() => undefined) } as any;

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);
    (mockDb.query.accountHistory as any).findMany.mockResolvedValue([]);

    await accountService.findAllWithHistory(workspaceId, perf);

    expect(perf.recordPhase).toHaveBeenCalledWith(
      'AccountService.findAllWithHistory.accountCount',
      1200
    );
    expect(perf.recordPhase).toHaveBeenCalledWith(
      'AccountService.findAllWithHistory.chunkCount',
      3
    );
    expect(perf.recordPhase).toHaveBeenCalledWith(
      'AccountService.findAllWithHistory.historyRowsFetched',
      0
    );
  });

  it('should return empty array when no accounts exist', async () => {
    (mockDb.query.accounts.findMany as any).mockResolvedValue([]);

    const result = await accountService.findAllWithHistory('workspace-1');

    expect(result).toHaveLength(0);
    expect((mockDb.query.accountHistory as any).findMany).not.toHaveBeenCalled();
  });

  it('should handle accounts with no history', async () => {
    const accounts = [createMockAccount({ id: 'account-1', workspace_id: 'workspace-1' })];

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);
    (mockDb.query.accountHistory as any).findMany.mockResolvedValue([]);

    const result = await accountService.findAllWithHistory('workspace-1');

    expect(result).toHaveLength(1);
    expect(result[0].history).toEqual([]);
  });
});
