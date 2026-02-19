import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AccountService.close()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should close account with zero balance', async () => {
    const account = createMockAccount({
      id: 'account-1',
      balance: '0',
      status: 'active',
      workspace_id: 'workspace-1',
    });

    // findById lookup
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account).mockResolvedValueOnce({
      ...account,
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
    });

    // update mock
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await accountService.close('account-1', 'workspace-1', 'user-1');

    expect(result?.status).toBe('closed');
    expect(result?.closed_by_user_id).toBe('user-1');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should throw BALANCE_NOT_ZERO when balance is not zero', async () => {
    const account = createMockAccount({
      id: 'account-1',
      balance: '1000',
      status: 'active',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);

    try {
      await accountService.close('account-1', 'workspace-1', 'user-1');
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.BALANCE_NOT_ZERO);
      expect(error.statusCode).toBe(400);
    }
  });

  it('should throw ALREADY_CLOSED when account is already closed', async () => {
    const account = createMockAccount({
      id: 'account-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);

    try {
      await accountService.close('account-1', 'workspace-1', 'user-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ALREADY_CLOSED);
    }
  });

  it('should throw ACCOUNT_NOT_FOUND when account does not exist', async () => {
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(undefined);

    try {
      await accountService.close('nonexistent', 'workspace-1', 'user-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_NOT_FOUND);
    }
  });
});
