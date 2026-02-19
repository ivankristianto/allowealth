import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AccountService.update() - currency lock', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should throw CURRENCY_LOCKED when changing currency with history beyond initial entry', async () => {
    const account = createMockAccount({
      id: 'account-1',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    // findById returns account
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);

    // select().from().where() returns history count > 1 (has real history beyond initial)
    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 5 }])),
      })),
    });

    await Promise.resolve(
      expect(
        accountService.update('account-1', 'workspace-1', { currency: 'USD' })
      ).rejects.toMatchObject({
        code: ServiceErrorCode.CURRENCY_LOCKED,
        statusCode: 400,
      })
    );
  });

  it('should allow currency change when only initial history entry exists', async () => {
    const account = createMockAccount({
      id: 'account-1',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const updatedAccount = { ...account, currency: 'USD' as const };

    // findById returns account (for currency check), then updated account
    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(updatedAccount);

    // select().from().where() returns history count = 1 (only initial entry)
    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 1 }])),
      })),
    });

    // update mock
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await accountService.update('account-1', 'workspace-1', { currency: 'USD' });

    expect(result?.currency).toBe('USD');
  });

  it('should allow currency change when no history exists at all', async () => {
    const account = createMockAccount({
      id: 'account-1',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const updatedAccount = { ...account, currency: 'USD' as const };

    // findById returns account (for currency check), then updated account
    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(updatedAccount);

    // select().from().where() returns history count = 0
    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 0 }])),
      })),
    });

    // update mock
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await accountService.update('account-1', 'workspace-1', { currency: 'USD' });

    expect(result?.currency).toBe('USD');
  });

  it('should allow update when currency is not changed', async () => {
    const account = createMockAccount({
      id: 'account-1',
      name: 'Old Name',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const updatedAccount = { ...account, name: 'New Name' };

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(updatedAccount);

    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await accountService.update('account-1', 'workspace-1', { name: 'New Name' });

    expect(result?.name).toBe('New Name');
  });
});
