import { describe, it, expect, beforeEach } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockAccount, createMockDatabase, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

/** Captures the `values(...)` argument of every insert, in call order. */
function captureInserts(mockDb: ReturnType<typeof createMockDatabase>) {
  const inserted: Record<string, unknown>[] = [];
  (mockDb.insert as any).mockImplementation(() => ({
    values: (row: Record<string, unknown>) => {
      inserted.push(row);
      return { returning: () => Promise.resolve([{ ...row }]) };
    },
  }));
  return inserted;
}

/** Captures the `set(...)` argument of every update, in call order. */
function captureUpdates(mockDb: ReturnType<typeof createMockDatabase>) {
  const updated: Record<string, unknown>[] = [];
  (mockDb.update as any).mockImplementation(() => ({
    set: (row: Record<string, unknown>) => {
      updated.push(row);
      return { where: () => Promise.resolve() };
    },
  }));
  return updated;
}

describe('AccountService dated balances', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
    // The currency check reads the workspace; with no meta it allows IDR.
    (mockDb.query.workspaces.findFirst as any).mockResolvedValue({ id: 'workspace-1' });
  });

  const createInput = {
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
    name: 'Bank1 OwnerA',
    type: 'bank_account' as const,
    balance: '1000',
    currency: 'IDR' as const,
  };

  it('dates the opening balance and last_updated at opened_at when given', async () => {
    const inserted = captureInserts(mockDb);
    const openedAt = new Date('2099-01-01T00:00:00.000Z');

    await accountService.create({ ...createInput, opened_at: openedAt });

    const [account, history] = inserted;
    expect(account?.last_updated).toEqual(openedAt);
    expect(history?.recorded_at).toEqual(openedAt);
  });

  it('keeps created_at as the real creation time even when opened_at is earlier', async () => {
    const inserted = captureInserts(mockDb);
    const before = Date.now();

    await accountService.create({
      ...createInput,
      opened_at: new Date('2099-01-01T00:00:00.000Z'),
    });

    expect((inserted[0]?.created_at as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('dates the opening balance now when opened_at is omitted', async () => {
    const inserted = captureInserts(mockDb);
    const before = Date.now();

    await accountService.create(createInput);

    expect((inserted[1]?.recorded_at as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('sets last_updated to the recorded_at of a dated balance update', async () => {
    const updated = captureUpdates(mockDb);
    captureInserts(mockDb);
    (mockDb.query.accounts.findFirst as any).mockResolvedValue(
      createMockAccount({ id: 'account-1', balance: '1000' })
    );
    const recordedAt = new Date('2099-01-31T23:00:00.000Z');

    await accountService.updateBalance('account-1', 'workspace-1', {
      balance: '2000',
      recorded_at: recordedAt,
    });

    expect(updated[0]?.last_updated).toEqual(recordedAt);
  });

  it('sets last_updated to now for an undated balance update', async () => {
    const updated = captureUpdates(mockDb);
    captureInserts(mockDb);
    (mockDb.query.accounts.findFirst as any).mockResolvedValue(
      createMockAccount({ id: 'account-1', balance: '1000' })
    );
    const before = Date.now();

    await accountService.updateBalance('account-1', 'workspace-1', { balance: '2000' });

    expect((updated[0]?.last_updated as Date).getTime()).toBeGreaterThanOrEqual(before);
  });
});
