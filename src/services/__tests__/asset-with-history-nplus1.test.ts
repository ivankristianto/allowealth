import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

describe('AssetService.findAllWithHistory N+1 fix', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);

    // Mock cache to always miss
    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should use bulk query instead of per-asset queries', async () => {
    const workspaceId = 'workspace-1';

    // Create 10 mock assets
    const assets = Array.from({ length: 10 }, (_, i) =>
      createMockAsset({ id: `asset-${i}`, workspace_id: workspaceId })
    );

    (mockDb.query.assets.findMany as any).mockResolvedValue(assets);

    // Mock bulk history query
    const histories = assets.flatMap((asset) => [
      { asset_id: asset.id, balance: '1000', recorded_at: new Date('2026-01-01') },
      { asset_id: asset.id, balance: '2000', recorded_at: new Date('2026-02-01') },
    ]);
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue(histories);

    await assetService.findAllWithHistory(workspaceId);

    // Should call assetHistory.findMany exactly once (bulk query)
    // NOT 10 times (one per asset)
    expect((mockDb.query.assetHistory as any).findMany).toHaveBeenCalledTimes(1);
  });

  it('should return assets with history in chronological order', async () => {
    const workspaceId = 'workspace-1';

    const assets = [
      createMockAsset({ id: 'asset-1', workspace_id: workspaceId }),
      createMockAsset({ id: 'asset-2', workspace_id: workspaceId }),
    ];

    (mockDb.query.assets.findMany as any).mockResolvedValue(assets);

    // History is already sorted asc by recorded_at
    const histories = [
      { asset_id: 'asset-1', balance: '1000', recorded_at: new Date('2026-01-15') },
      { asset_id: 'asset-1', balance: '1500', recorded_at: new Date('2026-02-01') },
      { asset_id: 'asset-2', balance: '2000', recorded_at: new Date('2026-01-20') },
    ];
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue(histories);

    const result = await assetService.findAllWithHistory(workspaceId);

    expect(result).toHaveLength(2);
    expect(result[0].history).toHaveLength(2);
    expect(result[0].history[0].amount).toBe(1000);
    expect(result[0].history[1].amount).toBe(1500);
    expect(result[1].history).toHaveLength(1);
    expect(result[1].history[0].amount).toBe(2000);
  });

  it('should return empty array when no assets exist', async () => {
    (mockDb.query.assets.findMany as any).mockResolvedValue([]);

    const result = await assetService.findAllWithHistory('workspace-1');

    expect(result).toHaveLength(0);
    expect((mockDb.query.assetHistory as any).findMany).not.toHaveBeenCalled();
  });

  it('should handle assets with no history', async () => {
    const assets = [createMockAsset({ id: 'asset-1', workspace_id: 'workspace-1' })];

    (mockDb.query.assets.findMany as any).mockResolvedValue(assets);
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue([]);

    const result = await assetService.findAllWithHistory('workspace-1');

    expect(result).toHaveLength(1);
    expect(result[0].history).toEqual([]);
  });
});
