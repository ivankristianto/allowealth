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
});
