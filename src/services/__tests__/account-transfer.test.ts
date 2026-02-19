import { describe, it, expect, beforeEach } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AccountService.transfer()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should transfer balance between two same-currency accounts', async () => {
    const fromAccount = createMockAccount({
      id: 'account-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const toAccount = createMockAccount({
      id: 'account-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(fromAccount)
      .mockResolvedValueOnce(toAccount);

    const result = await accountService.transfer('account-1', 'account-2', '300', 'workspace-1');

    // Transfer mutates balances: source deducted, destination credited
    expect(result.fromAccount?.balance).toBe('700');
    expect(result.toAccount?.balance).toBe('800');
  });

  it('should reject transfer to the same account', async () => {
    await expect(
      accountService.transfer('account-1', 'account-1', '100', 'workspace-1')
    ).rejects.toThrow('Cannot transfer an account to itself');

    expect(mockDb.query.accounts.findFirst).not.toHaveBeenCalled();
  });

  it('should reject when source account not found', async () => {
    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createMockAccount({ id: 'account-2' }));

    await expect(
      accountService.transfer('account-1', 'account-2', '100', 'workspace-1')
    ).rejects.toThrow('Account not found');

    expect(mockDb.query.accounts.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject when destination account not found', async () => {
    const fromAccount = createMockAccount({
      id: 'account-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(fromAccount)
      .mockResolvedValueOnce(undefined);

    await expect(
      accountService.transfer('account-1', 'account-2', '100', 'workspace-1')
    ).rejects.toThrow('Account not found');

    expect(mockDb.query.accounts.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject transfer between different currencies', async () => {
    const fromAccount = createMockAccount({
      id: 'account-1',
      name: 'IDR Account',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const toAccount = createMockAccount({
      id: 'account-2',
      name: 'USD Account',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(fromAccount)
      .mockResolvedValueOnce(toAccount);

    await expect(
      accountService.transfer('account-1', 'account-2', '100', 'workspace-1')
    ).rejects.toThrow('Cannot transfer between different currencies');

    expect(mockDb.query.accounts.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject when transfer amount is zero or negative', async () => {
    const fromAccount = createMockAccount({
      id: 'account-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const toAccount = createMockAccount({
      id: 'account-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(fromAccount)
      .mockResolvedValueOnce(toAccount);

    await expect(
      accountService.transfer('account-1', 'account-2', '0', 'workspace-1')
    ).rejects.toThrow('Transfer amount must be positive');

    expect(mockDb.query.accounts.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject when source account is closed', async () => {
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

  it('should reject when destination account is closed', async () => {
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

  it('should reduce debt when transferring from liquid to debt account (credit card payment)', async () => {
    const liquidAccount = createMockAccount({
      id: 'account-1',
      name: 'BCA Savings',
      type: 'bank_account',
      account_class: 'liquid',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const debtAccount = createMockAccount({
      id: 'account-2',
      name: 'BCA Credit Card',
      type: 'credit_card',
      account_class: 'debt',
      balance: '5000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(liquidAccount)
      .mockResolvedValueOnce(debtAccount);

    const result = await accountService.transfer(
      'account-1',
      'account-2',
      '2000000',
      'workspace-1'
    );

    // Liquid source: 10M - 2M = 8M (subtracted normally)
    expect(result.fromAccount?.balance).toBe('8000000');
    // Debt destination: 5M - 2M = 3M (subtracted — paying off reduces debt)
    expect(result.toAccount?.balance).toBe('3000000');
  });

  it('should increase debt when transferring from debt account (cash advance)', async () => {
    const debtAccount = createMockAccount({
      id: 'account-1',
      name: 'Credit Card',
      type: 'credit_card',
      account_class: 'debt',
      balance: '3000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const liquidAccount = createMockAccount({
      id: 'account-2',
      name: 'Cash',
      type: 'cash',
      account_class: 'liquid',
      balance: '1000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(debtAccount)
      .mockResolvedValueOnce(liquidAccount);

    const result = await accountService.transfer('account-1', 'account-2', '500000', 'workspace-1');

    // Debt source: 3M + 500K = 3.5M (added — cash advance increases debt)
    expect(result.fromAccount?.balance).toBe('3500000');
    // Liquid destination: 1M + 500K = 1.5M (added normally)
    expect(result.toAccount?.balance).toBe('1500000');
  });

  it('should handle debt-to-debt transfers correctly', async () => {
    const debtAccount1 = createMockAccount({
      id: 'account-1',
      name: 'Credit Card A',
      type: 'credit_card',
      account_class: 'debt',
      balance: '5000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const debtAccount2 = createMockAccount({
      id: 'account-2',
      name: 'Loan B',
      type: 'loan',
      account_class: 'debt',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(debtAccount1)
      .mockResolvedValueOnce(debtAccount2);

    const result = await accountService.transfer(
      'account-1',
      'account-2',
      '2000000',
      'workspace-1'
    );

    // Source debt: 5M + 2M = 7M (increases — transferring from debt means more owed)
    expect(result.fromAccount?.balance).toBe('7000000');
    // Dest debt: 10M - 2M = 8M (decreases — paying off this loan)
    expect(result.toAccount?.balance).toBe('8000000');
  });

  it('should record balance history for both accounts with correct payloads', async () => {
    const fromAccount = createMockAccount({
      id: 'account-1',
      name: 'BCA Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const toAccount = createMockAccount({
      id: 'account-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(fromAccount)
      .mockResolvedValueOnce(toAccount);

    await accountService.transfer('account-1', 'account-2', '300', 'workspace-1');

    // insert() called twice: once for source history, once for destination history
    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    // Verify first insert: source account history
    const firstInsertResult = (mockDb.insert as any).mock.results[0].value;
    const firstValues = firstInsertResult.values.mock.calls[0][0];
    expect(firstValues).toMatchObject({
      account_id: 'account-1',
      balance: '700',
      notes: 'Transfer to Checking',
    });

    // Verify second insert: destination account history
    const secondInsertResult = (mockDb.insert as any).mock.results[1].value;
    const secondValues = secondInsertResult.values.mock.calls[0][0];
    expect(secondValues).toMatchObject({
      account_id: 'account-2',
      balance: '800',
      notes: 'Transfer from BCA Savings',
    });
  });

  it('should record correct history balances for debt account transfers', async () => {
    const liquidAccount = createMockAccount({
      id: 'account-1',
      name: 'Savings',
      account_class: 'liquid',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const debtAccount = createMockAccount({
      id: 'account-2',
      name: 'Credit Card',
      account_class: 'debt',
      balance: '5000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(liquidAccount)
      .mockResolvedValueOnce(debtAccount);

    await accountService.transfer('account-1', 'account-2', '2000000', 'workspace-1');

    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    // Source history: 10M - 2M = 8M
    const firstValues = (mockDb.insert as any).mock.results[0].value.values.mock.calls[0][0];
    expect(firstValues).toMatchObject({
      account_id: 'account-1',
      balance: '8000000',
      notes: 'Transfer to Credit Card',
    });

    // Dest history: 5M - 2M = 3M (debt reduced)
    const secondValues = (mockDb.insert as any).mock.results[1].value.values.mock.calls[0][0];
    expect(secondValues).toMatchObject({
      account_id: 'account-2',
      balance: '3000000',
      notes: 'Transfer from Savings',
    });
  });

  it('should rollback both balances if history insert fails', async () => {
    const fromAccount = createMockAccount({
      id: 'account-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
      last_updated: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    });

    const toAccount = createMockAccount({
      id: 'account-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
      last_updated: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    });

    (mockDb.query.accounts.findFirst as any)
      .mockResolvedValueOnce(fromAccount)
      .mockResolvedValueOnce(toAccount);

    // Make insert fail on first call (history insert)
    (mockDb.insert as any).mockImplementationOnce(() => ({
      values: () => {
        throw new Error('DB insert failed');
      },
    }));

    await expect(
      accountService.transfer('account-1', 'account-2', '300', 'workspace-1')
    ).rejects.toThrow('Failed to transfer: could not create history entries');

    // update() called 4 times: 2 for balance updates + 2 for rollback
    expect(mockDb.update).toHaveBeenCalledTimes(4);
  });
});
