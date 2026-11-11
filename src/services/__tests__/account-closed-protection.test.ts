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
});
