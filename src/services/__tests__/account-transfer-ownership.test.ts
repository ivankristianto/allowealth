import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AccountService.transferOwnership()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.invalidateByTags = mock(() => Promise.resolve());
  });

  it('should update created_by_user_id to new owner', async () => {
    const account = createMockAccount({
      id: 'account-1',
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValue(account);

    const where = mock(() => Promise.resolve());
    const set = mock(() => ({ where }));
    (mockDb.update as any).mockReturnValue({ set });

    await accountService.transferOwnership('account-1', 'user-2', 'ws-1');

    expect(mockDb.update).toHaveBeenCalled();
    expect(set).toHaveBeenCalled();
    const firstSetArg = (set as any).mock.calls[0]?.[0];
    expect(firstSetArg?.created_by_user_id).toBe('user-2');
  });

  it('should throw ACCOUNT_NOT_FOUND when account does not exist', async () => {
    (mockDb.query.accounts.findFirst as any).mockResolvedValue(null);

    let caughtError: any;
    try {
      await accountService.transferOwnership('nonexistent', 'user-2', 'ws-1');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError?.code).toBe(ServiceErrorCode.ACCOUNT_NOT_FOUND);
  });

  it('should invalidate cache after transfer', async () => {
    const account = createMockAccount({
      id: 'account-1',
      workspace_id: 'ws-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValue(account);
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({ where: mock(() => Promise.resolve()) })),
    });

    const cache = getCacheManager();
    await accountService.transferOwnership('account-1', 'user-2', 'ws-1');

    expect(cache.invalidateByTags).toHaveBeenCalled();
  });
});
