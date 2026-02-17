import { describe, it, expect, beforeEach } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService.transfer()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should transfer balance between two same-currency assets', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const toAsset = createMockAsset({
      id: 'asset-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    const result = await assetService.transfer('asset-1', 'asset-2', '300', 'workspace-1');

    // Transfer mutates balances: source deducted, destination credited
    expect(result.fromAsset?.balance).toBe('700');
    expect(result.toAsset?.balance).toBe('800');
  });

  it('should reject transfer to the same asset', async () => {
    await expect(assetService.transfer('asset-1', 'asset-1', '100', 'workspace-1')).rejects.toThrow(
      'Cannot transfer an asset to itself'
    );

    expect(mockDb.query.assets.findFirst).not.toHaveBeenCalled();
  });

  it('should reject when source asset not found', async () => {
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createMockAsset({ id: 'asset-2' }));

    await expect(assetService.transfer('asset-1', 'asset-2', '100', 'workspace-1')).rejects.toThrow(
      'Asset not found'
    );

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject when destination asset not found', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(undefined);

    await expect(assetService.transfer('asset-1', 'asset-2', '100', 'workspace-1')).rejects.toThrow(
      'Asset not found'
    );

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject transfer between different currencies', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'IDR Account',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const toAsset = createMockAsset({
      id: 'asset-2',
      name: 'USD Account',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    await expect(assetService.transfer('asset-1', 'asset-2', '100', 'workspace-1')).rejects.toThrow(
      'Cannot transfer between different currencies'
    );

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject when transfer amount is zero or negative', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const toAsset = createMockAsset({
      id: 'asset-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    await expect(assetService.transfer('asset-1', 'asset-2', '0', 'workspace-1')).rejects.toThrow(
      'Transfer amount must be positive'
    );

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should reject when source asset is closed', async () => {
    const closedAsset = createMockAsset({
      id: 'asset-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const activeAsset = createMockAsset({
      id: 'asset-2',
      balance: '1000',
      status: 'active',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(closedAsset)
      .mockResolvedValueOnce(activeAsset);

    await Promise.resolve(
      expect(
        assetService.transfer('asset-1', 'asset-2', '100', 'workspace-1')
      ).rejects.toMatchObject({ code: ServiceErrorCode.ACCOUNT_CLOSED })
    );
  });

  it('should reject when destination asset is closed', async () => {
    const activeAsset = createMockAsset({
      id: 'asset-1',
      balance: '1000',
      status: 'active',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const closedAsset = createMockAsset({
      id: 'asset-2',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(activeAsset)
      .mockResolvedValueOnce(closedAsset);

    await Promise.resolve(
      expect(
        assetService.transfer('asset-1', 'asset-2', '100', 'workspace-1')
      ).rejects.toMatchObject({ code: ServiceErrorCode.ACCOUNT_CLOSED })
    );
  });

  it('should reduce debt when transferring from liquid to debt account (credit card payment)', async () => {
    const liquidAsset = createMockAsset({
      id: 'asset-1',
      name: 'BCA Savings',
      type: 'bank_account',
      account_class: 'liquid',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const debtAsset = createMockAsset({
      id: 'asset-2',
      name: 'BCA Credit Card',
      type: 'credit_card',
      account_class: 'debt',
      balance: '5000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(liquidAsset)
      .mockResolvedValueOnce(debtAsset);

    const result = await assetService.transfer('asset-1', 'asset-2', '2000000', 'workspace-1');

    // Liquid source: 10M - 2M = 8M (subtracted normally)
    expect(result.fromAsset?.balance).toBe('8000000');
    // Debt destination: 5M - 2M = 3M (subtracted — paying off reduces debt)
    expect(result.toAsset?.balance).toBe('3000000');
  });

  it('should increase debt when transferring from debt account (cash advance)', async () => {
    const debtAsset = createMockAsset({
      id: 'asset-1',
      name: 'Credit Card',
      type: 'credit_card',
      account_class: 'debt',
      balance: '3000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const liquidAsset = createMockAsset({
      id: 'asset-2',
      name: 'Cash',
      type: 'cash',
      account_class: 'liquid',
      balance: '1000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(debtAsset)
      .mockResolvedValueOnce(liquidAsset);

    const result = await assetService.transfer('asset-1', 'asset-2', '500000', 'workspace-1');

    // Debt source: 3M + 500K = 3.5M (added — cash advance increases debt)
    expect(result.fromAsset?.balance).toBe('3500000');
    // Liquid destination: 1M + 500K = 1.5M (added normally)
    expect(result.toAsset?.balance).toBe('1500000');
  });

  it('should handle debt-to-debt transfers correctly', async () => {
    const debtAsset1 = createMockAsset({
      id: 'asset-1',
      name: 'Credit Card A',
      type: 'credit_card',
      account_class: 'debt',
      balance: '5000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const debtAsset2 = createMockAsset({
      id: 'asset-2',
      name: 'Loan B',
      type: 'loan',
      account_class: 'debt',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(debtAsset1)
      .mockResolvedValueOnce(debtAsset2);

    const result = await assetService.transfer('asset-1', 'asset-2', '2000000', 'workspace-1');

    // Source debt: 5M + 2M = 7M (increases — transferring from debt means more owed)
    expect(result.fromAsset?.balance).toBe('7000000');
    // Dest debt: 10M - 2M = 8M (decreases — paying off this loan)
    expect(result.toAsset?.balance).toBe('8000000');
  });

  it('should record balance history for both accounts with correct payloads', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'BCA Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const toAsset = createMockAsset({
      id: 'asset-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    await assetService.transfer('asset-1', 'asset-2', '300', 'workspace-1');

    // insert() called twice: once for source history, once for destination history
    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    // Verify first insert: source account history
    const firstInsertResult = (mockDb.insert as any).mock.results[0].value;
    const firstValues = firstInsertResult.values.mock.calls[0][0];
    expect(firstValues).toMatchObject({
      asset_id: 'asset-1',
      balance: '700',
      notes: 'Transfer to Checking',
    });

    // Verify second insert: destination account history
    const secondInsertResult = (mockDb.insert as any).mock.results[1].value;
    const secondValues = secondInsertResult.values.mock.calls[0][0];
    expect(secondValues).toMatchObject({
      asset_id: 'asset-2',
      balance: '800',
      notes: 'Transfer from BCA Savings',
    });
  });

  it('should record correct history balances for debt account transfers', async () => {
    const liquidAsset = createMockAsset({
      id: 'asset-1',
      name: 'Savings',
      account_class: 'liquid',
      balance: '10000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const debtAsset = createMockAsset({
      id: 'asset-2',
      name: 'Credit Card',
      account_class: 'debt',
      balance: '5000000',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(liquidAsset)
      .mockResolvedValueOnce(debtAsset);

    await assetService.transfer('asset-1', 'asset-2', '2000000', 'workspace-1');

    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    // Source history: 10M - 2M = 8M
    const firstValues = (mockDb.insert as any).mock.results[0].value.values.mock.calls[0][0];
    expect(firstValues).toMatchObject({
      asset_id: 'asset-1',
      balance: '8000000',
      notes: 'Transfer to Credit Card',
    });

    // Dest history: 5M - 2M = 3M (debt reduced)
    const secondValues = (mockDb.insert as any).mock.results[1].value.values.mock.calls[0][0];
    expect(secondValues).toMatchObject({
      asset_id: 'asset-2',
      balance: '3000000',
      notes: 'Transfer from Savings',
    });
  });

  it('should rollback both balances if history insert fails', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
      last_updated: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    });

    const toAsset = createMockAsset({
      id: 'asset-2',
      name: 'Checking',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
      last_updated: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    // Make insert fail on first call (history insert)
    (mockDb.insert as any).mockImplementationOnce(() => ({
      values: () => {
        throw new Error('DB insert failed');
      },
    }));

    await expect(assetService.transfer('asset-1', 'asset-2', '300', 'workspace-1')).rejects.toThrow(
      'Failed to transfer: could not create history entries'
    );

    // update() called 4 times: 2 for balance updates + 2 for rollback
    expect(mockDb.update).toHaveBeenCalledTimes(4);
  });
});
