import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

describe('AssetService.getSnapshotForMonth N+1 fix', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);

    // Mock cache to always miss (we're testing query behavior)
    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should use bulk query instead of per-asset queries', async () => {
    const workspaceId = 'workspace-1';
    const year = 2026;
    const month = 2;

    // Create 10 mock assets
    const assets = Array.from({ length: 10 }, (_, i) =>
      createMockAsset({
        id: `asset-${i}`,
        workspace_id: workspaceId,
        created_at: new Date(year, month - 2, 1),
      })
    );

    (mockDb.query.assets.findMany as any).mockResolvedValue(assets);

    // Mock bulk history query
    const histories = assets.map((asset) => ({
      asset_id: asset.id,
      balance: '1000',
      recorded_at: new Date(year, month - 1, 15),
    }));
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue(histories);

    await assetService.getSnapshotForMonth(workspaceId, year, month);

    // Should call assetHistory.findMany exactly once (bulk query)
    // NOT N times (one per asset)
    expect((mockDb.query.assetHistory as any).findMany).toHaveBeenCalledTimes(1);

    // Should NOT use findFirst at all (old N+1 pattern)
    expect((mockDb.query.assetHistory as any).findFirst).not.toHaveBeenCalled();
  });

  it('should return snapshot balances correctly from bulk query', async () => {
    const workspaceId = 'workspace-1';
    const year = 2026;
    const month = 2;

    const asset1 = createMockAsset({
      id: 'asset-1',
      workspace_id: workspaceId,
      balance: '5000',
      initial_balance: '1000',
      created_at: new Date(year, month - 2, 1),
    });

    const asset2 = createMockAsset({
      id: 'asset-2',
      workspace_id: workspaceId,
      balance: '3000',
      initial_balance: '2000',
      created_at: new Date(year, month - 1, 1),
    });

    (mockDb.query.assets.findMany as any).mockResolvedValue([asset1, asset2]);

    // Mock histories - ordered desc by recorded_at (most recent first)
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue([
      { asset_id: 'asset-1', balance: '4500', recorded_at: new Date(year, month - 1, 15) },
      { asset_id: 'asset-2', balance: '3200', recorded_at: new Date(year, month - 1, 20) },
    ]);

    const snapshots = await assetService.getSnapshotForMonth(workspaceId, year, month);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].snapshot_balance).toBe('4500');
    expect(snapshots[1].snapshot_balance).toBe('3200');
  });

  it('chunks asset IDs when count exceeds SQLite variable limit', async () => {
    const workspaceId = 'workspace-1';
    const assets = Array.from({ length: 1200 }, (_, i) =>
      createMockAsset({
        id: `asset-${i}`,
        workspace_id: workspaceId,
        created_at: new Date('2026-01-01'),
      })
    );

    (mockDb.query.assets.findMany as any).mockResolvedValue(assets);
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue([]);

    await assetService.getSnapshotForMonth(workspaceId, 2026, 2);

    expect((mockDb.query.assetHistory as any).findMany.mock.calls.length).toBeGreaterThan(1);
  });

  it('uses latest history at or before month-end per asset', async () => {
    const workspaceId = 'workspace-1';
    const asset = createMockAsset({
      id: 'asset-1',
      workspace_id: workspaceId,
      balance: '5000',
      initial_balance: '1000',
      created_at: new Date('2026-01-01'),
    });

    (mockDb.query.assets.findMany as any).mockResolvedValue([asset]);
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue([
      { asset_id: 'asset-1', balance: '1500', recorded_at: new Date('2026-01-15') },
      { asset_id: 'asset-1', balance: '3000', recorded_at: new Date('2026-01-31') },
    ]);

    const snapshots = await assetService.getSnapshotForMonth(workspaceId, 2026, 1);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].snapshot_balance).toBe('3000');
    expect(snapshots[0].snapshot_date).toEqual(new Date('2026-01-31'));
  });

  it('should fall back to initial_balance when no history exists', async () => {
    const workspaceId = 'workspace-1';
    const year = 2026;
    const month = 2;

    const asset = createMockAsset({
      id: 'asset-1',
      workspace_id: workspaceId,
      balance: '5000',
      initial_balance: '1000',
      created_at: new Date(year, month - 2, 1),
    });

    (mockDb.query.assets.findMany as any).mockResolvedValue([asset]);
    (mockDb.query.assetHistory as any).findMany.mockResolvedValue([]);

    const snapshots = await assetService.getSnapshotForMonth(workspaceId, year, month);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].snapshot_balance).toBe('1000');
  });

  it('should return empty array when no assets exist', async () => {
    const workspaceId = 'workspace-1';

    (mockDb.query.assets.findMany as any).mockResolvedValue([]);

    const snapshots = await assetService.getSnapshotForMonth(workspaceId, 2026, 2);

    expect(snapshots).toHaveLength(0);
    // Should not even call history query
    expect((mockDb.query.assetHistory as any).findMany).not.toHaveBeenCalled();
  });
});
