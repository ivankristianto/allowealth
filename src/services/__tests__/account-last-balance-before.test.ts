import { describe, it, expect, beforeEach } from 'bun:test';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

describe('AccountService.getLastBalanceBefore()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should return balance from latest history entry before the month', async () => {
    const account = createMockAccount({ id: 'account-1', balance: '5000000' });
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);

    // History entry from end of January
    (mockDb.query.accountHistory.findFirst as any).mockResolvedValueOnce({
      id: 'hist-1',
      account_id: 'account-1',
      balance: '4500000',
      recorded_at: new Date('2026-01-31T23:00:00Z'),
    });

    const result = await accountService.getLastBalanceBefore('account-1', 'workspace-1', 2026, 2);

    expect(result).toBe('4500000');
  });

  it('should fall back to initial_balance when no history exists', async () => {
    const account = createMockAccount({
      id: 'account-1',
      balance: '5000000',
      initial_balance: '3000000',
    });
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);
    (mockDb.query.accountHistory.findFirst as any).mockResolvedValueOnce(undefined);

    const result = await accountService.getLastBalanceBefore('account-1', 'workspace-1', 2026, 2);

    expect(result).toBe('3000000');
  });

  it('should return null when no history and no initial_balance', async () => {
    const account = createMockAccount({
      id: 'account-1',
      balance: '5000000',
      initial_balance: null,
    });
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);
    (mockDb.query.accountHistory.findFirst as any).mockResolvedValueOnce(undefined);

    const result = await accountService.getLastBalanceBefore('account-1', 'workspace-1', 2026, 2);

    expect(result).toBeNull();
  });

  it('should throw when account not found', async () => {
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(undefined);

    await expect(
      accountService.getLastBalanceBefore('nonexistent', 'workspace-1', 2026, 2)
    ).rejects.toThrow('Account not found');
  });

  it('should query with correct timestamp for month boundary', async () => {
    const account = createMockAccount({ id: 'account-1' });
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);
    (mockDb.query.accountHistory.findFirst as any).mockResolvedValueOnce(undefined);

    await accountService.getLastBalanceBefore('account-1', 'workspace-1', 2026, 3);

    // Should have queried accountHistory.findFirst
    expect(mockDb.query.accountHistory.findFirst).toHaveBeenCalledTimes(1);
  });

  it('bounds the history lookup in seconds, the unit recorded_at is stored in', async () => {
    const account = createMockAccount({ id: 'account-1', balance: '5000000' });
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);
    (mockDb.query.accountHistory.findFirst as any).mockResolvedValueOnce(undefined);

    await accountService.getLastBalanceBefore('account-1', 'workspace-1', 2099, 2);

    const [query] = (mockDb.query.accountHistory.findFirst as any).mock.calls.at(-1);
    const { params } = new SQLiteSyncDialect().sqlToQuery(query.where);
    expect(params).toContain(new Date(2099, 1, 1).getTime() / 1000);
  });
});
