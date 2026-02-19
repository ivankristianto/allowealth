import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

describe('AccountService.findAll owner_user_id filter', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should filter accounts by owner_user_id when provided', async () => {
    const ownedAccount = createMockAccount({
      id: 'account-1',
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
    });

    (mockDb.query.accounts.findMany as any).mockResolvedValue([ownedAccount]);

    const result = await accountService.findAll('ws-1', { owner_user_id: 'user-1' });

    expect(result).toEqual([ownedAccount]);
    expect(mockDb.query.accounts.findMany).toHaveBeenCalled();
  });

  it('should return all accounts when owner_user_id is not provided', async () => {
    const accounts = [
      createMockAccount({ id: 'a-1', workspace_id: 'ws-1', created_by_user_id: 'user-1' }),
      createMockAccount({ id: 'a-2', workspace_id: 'ws-1', created_by_user_id: 'user-2' }),
    ];

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);

    const result = await accountService.findAll('ws-1');

    expect(result).toHaveLength(2);
  });
});
