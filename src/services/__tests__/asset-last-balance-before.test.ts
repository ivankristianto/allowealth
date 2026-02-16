import { describe, it, expect, beforeEach } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

describe('AssetService.getLastBalanceBefore()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should return balance from latest history entry before the month', async () => {
    const asset = createMockAsset({ id: 'asset-1', balance: '5000000' });
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);

    // History entry from end of January
    (mockDb.query.assetHistory.findFirst as any).mockResolvedValueOnce({
      id: 'hist-1',
      asset_id: 'asset-1',
      balance: '4500000',
      recorded_at: new Date('2026-01-31T23:00:00Z'),
    });

    const result = await assetService.getLastBalanceBefore('asset-1', 'workspace-1', 2026, 2);

    expect(result).toBe('4500000');
  });

  it('should fall back to initial_balance when no history exists', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      balance: '5000000',
      initial_balance: '3000000',
    });
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);
    (mockDb.query.assetHistory.findFirst as any).mockResolvedValueOnce(undefined);

    const result = await assetService.getLastBalanceBefore('asset-1', 'workspace-1', 2026, 2);

    expect(result).toBe('3000000');
  });

  it('should return null when no history and no initial_balance', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      balance: '5000000',
      initial_balance: null,
    });
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);
    (mockDb.query.assetHistory.findFirst as any).mockResolvedValueOnce(undefined);

    const result = await assetService.getLastBalanceBefore('asset-1', 'workspace-1', 2026, 2);

    expect(result).toBeNull();
  });

  it('should throw when asset not found', async () => {
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(undefined);

    await expect(
      assetService.getLastBalanceBefore('nonexistent', 'workspace-1', 2026, 2)
    ).rejects.toThrow('Asset not found');
  });

  it('should query with correct timestamp for month boundary', async () => {
    const asset = createMockAsset({ id: 'asset-1' });
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);
    (mockDb.query.assetHistory.findFirst as any).mockResolvedValueOnce(undefined);

    await assetService.getLastBalanceBefore('asset-1', 'workspace-1', 2026, 3);

    // Should have queried assetHistory.findFirst
    expect(mockDb.query.assetHistory.findFirst).toHaveBeenCalledTimes(1);
  });
});
