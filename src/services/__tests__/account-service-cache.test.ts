import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager, CacheTags } from '@/lib/cache';

describe('AccountService.findAll caching', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;
  let cache: ReturnType<typeof getCacheManager>;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
    cache = getCacheManager();

    // Mock cache methods
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
    cache.invalidateByTags = mock(() => Promise.resolve());
  });

  it('should cache results from findAll on cache miss', async () => {
    const workspaceId = 'workspace-1';
    const mockAccounts = [
      createMockAccount({ id: 'account-1', workspace_id: workspaceId }),
      createMockAccount({ id: 'account-2', workspace_id: workspaceId }),
    ];

    (mockDb.query.accounts.findMany as any).mockResolvedValue(mockAccounts);

    const result = await accountService.findAll(workspaceId);

    expect(result).toEqual(mockAccounts);
    expect(cache.set).toHaveBeenCalledTimes(1);

    // Verify cache key contains the workspace ID
    const cacheSetCall = (cache.set as any).mock.calls[0];
    expect(cacheSetCall[0]).toContain('cache:accounts');
    expect(cacheSetCall[0]).toContain(workspaceId);

    // Verify tags
    const options = cacheSetCall[2];
    expect(options.tags).toContain(CacheTags.workspace(workspaceId));
    expect(options.tags).toContain(CacheTags.ACCOUNTS);
  });

  it('should return cached results on cache hit', async () => {
    const workspaceId = 'workspace-1';
    const mockAccounts = [createMockAccount({ id: 'account-1', workspace_id: workspaceId })];

    (cache.get as any).mockResolvedValue(mockAccounts);

    const result = await accountService.findAll(workspaceId);

    expect(result).toEqual(mockAccounts);
    // Should NOT call DB when cache hit
    expect(mockDb.query.accounts.findMany).not.toHaveBeenCalled();
  });

  it('should include filters in cache key hash', async () => {
    const workspaceId = 'workspace-1';
    const filters = { type: 'bank_account' as const, currency: 'USD' as const };

    (mockDb.query.accounts.findMany as any).mockResolvedValue([]);

    await accountService.findAll(workspaceId, filters);

    expect(cache.set).toHaveBeenCalledTimes(1);
    const cacheSetCall = (cache.set as any).mock.calls[0];
    expect(cacheSetCall[0]).toContain(workspaceId);
  });

  it('should fall back to DB when cache read throws', async () => {
    const workspaceId = 'workspace-1';
    const mockAccounts = [createMockAccount({ id: 'account-1', workspace_id: workspaceId })];

    (cache.get as any).mockRejectedValueOnce(new Error('cache down'));
    (mockDb.query.accounts.findMany as any).mockResolvedValue(mockAccounts);

    const result = await accountService.findAll(workspaceId);

    expect(result).toEqual(mockAccounts);
    expect(mockDb.query.accounts.findMany).toHaveBeenCalledTimes(1);
  });
});
