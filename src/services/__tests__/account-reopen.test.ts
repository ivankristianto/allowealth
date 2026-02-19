import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AccountService.reopen()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should reopen a closed account', async () => {
    const closedAccount = createMockAccount({
      id: 'account-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date('2026-01-15'),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    const reopenedAccount = {
      ...closedAccount,
      status: 'active' as const,
      closed_at: null,
      closed_by_user_id: null,
    };

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(closedAccount)
      .mockResolvedValueOnce(reopenedAccount);

    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await accountService.reopen('account-1', 'workspace-1');

    expect(result?.status).toBe('active');
    expect(result?.closed_at).toBeNull();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should throw NOT_CLOSED when reopening active account', async () => {
    const activeAccount = createMockAccount({
      id: 'account-1',
      status: 'active',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(activeAccount);

    await Promise.resolve(
      expect(accountService.reopen('account-1', 'workspace-1')).rejects.toMatchObject({
        code: ServiceErrorCode.NOT_CLOSED,
      })
    );
  });

  it('should throw ACCOUNT_NOT_FOUND when account does not exist', async () => {
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(undefined);

    await Promise.resolve(
      expect(accountService.reopen('nonexistent', 'workspace-1')).rejects.toMatchObject({
        code: ServiceErrorCode.ACCOUNT_NOT_FOUND,
      })
    );
  });
});
