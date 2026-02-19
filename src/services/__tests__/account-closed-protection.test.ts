import { describe, it, expect, beforeEach } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AccountService - closed account protection', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should throw ACCOUNT_CLOSED when updating balance of closed account', async () => {
    const closedAccount = createMockAccount({
      id: 'account-1',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(closedAccount);

    await Promise.resolve(
      expect(
        accountService.updateBalance('account-1', 'workspace-1', { balance: '500' })
      ).rejects.toMatchObject({ code: ServiceErrorCode.ACCOUNT_CLOSED })
    );
  });

  it('should throw ACCOUNT_CLOSED when transferring from closed account', async () => {
    const closedAccount = createMockAccount({
      id: 'account-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const activeAccount = createMockAccount({
      id: 'account-2',
      balance: '1000',
      status: 'active',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(closedAccount)
      .mockResolvedValueOnce(activeAccount);

    await Promise.resolve(
      expect(
        accountService.transfer('account-1', 'account-2', '100', 'workspace-1')
      ).rejects.toMatchObject({ code: ServiceErrorCode.ACCOUNT_CLOSED })
    );
  });

  it('should throw ACCOUNT_CLOSED when transferring to closed account', async () => {
    const activeAccount = createMockAccount({
      id: 'account-1',
      balance: '1000',
      status: 'active',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const closedAccount = createMockAccount({
      id: 'account-2',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(activeAccount)
      .mockResolvedValueOnce(closedAccount);

    await Promise.resolve(
      expect(
        accountService.transfer('account-1', 'account-2', '100', 'workspace-1')
      ).rejects.toMatchObject({ code: ServiceErrorCode.ACCOUNT_CLOSED })
    );
  });
});
