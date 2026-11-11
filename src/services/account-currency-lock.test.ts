import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import {
  FIXTURE_USER,
  FIXTURE_WORKSPACE,
  midMonth,
  seedAccount,
  seedCategory,
  seedTransaction,
} from './test-helpers/money-fixtures';
import { AccountService } from './account.service';
import { ServiceErrorCode } from './service-errors';

describe('AccountService.update() currency lock on a real database', () => {
  let memory: MemoryDb;
  let service: AccountService;
  const date = midMonth();

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    const { raw } = memory;
    seedWorkspaceOwner(raw, FIXTURE_WORKSPACE, FIXTURE_USER);
    raw.run(
      `INSERT INTO workspace_meta (id, workspace_id, meta_key, meta_value) VALUES
         ('m1', ?, 'currency', 'IDR'), ('m2', ?, 'secondary_currency', 'USD')`,
      [FIXTURE_WORKSPACE, FIXTURE_WORKSPACE]
    );
    seedAccount(raw, 'acc', { currency: 'IDR' });
    seedAccount(raw, 'other', { currency: 'IDR' });
    seedCategory(raw, 'food');
    service = new AccountService(memory.db);
  });

  const changeToUsd = () => service.update('acc', FIXTURE_WORKSPACE, { currency: 'USD' });

  it('locks the currency of an account with transactions and no history rows', async () => {
    seedTransaction(memory.raw, 'tx', {
      amount: '50000',
      accountId: 'acc',
      date,
      categoryId: 'food',
      currency: 'IDR',
    });

    await expect(changeToUsd()).rejects.toMatchObject({
      code: ServiceErrorCode.CURRENCY_LOCKED,
      statusCode: 400,
    });
  });

  it('locks the currency of a transfer destination', async () => {
    seedTransaction(memory.raw, 'tx', {
      amount: '50000',
      accountId: 'other',
      toAccountId: 'acc',
      date,
      type: 'transfer',
      currency: 'IDR',
    });

    await expect(changeToUsd()).rejects.toMatchObject({ code: ServiceErrorCode.CURRENCY_LOCKED });
  });

  it('ignores deleted transactions, which cannot be restored', async () => {
    seedTransaction(memory.raw, 'tx', {
      amount: '50000',
      accountId: 'acc',
      date,
      categoryId: 'food',
      currency: 'IDR',
      deleted: true,
    });

    const updated = await changeToUsd();

    expect(updated?.currency).toBe('USD');
  });

  it('allows the change on an unused account', async () => {
    const updated = await changeToUsd();

    expect(updated?.currency).toBe('USD');
  });
});
