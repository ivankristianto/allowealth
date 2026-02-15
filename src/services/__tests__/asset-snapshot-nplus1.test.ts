import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';
import { PerfCollector } from '@/lib/perf';

describe('AssetService.getSnapshotForMonth N+1 fix', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;
  let selectCallCount: number;

  /**
   * Sets up the select mock to handle the two-step snapshot query:
   *   Step 1 (groupBy): returns max recorded_at per asset_id
   *   Step 2 (where only): returns full history rows
   */
  function mockSelectForSnapshot(
    maxDates: Array<{ asset_id: string; max_recorded_at: Date | number }>,
    historyRows: Array<{ asset_id: string; balance: string; recorded_at: Date | number }>
  ) {
    selectCallCount = 0;
    let isStep2 = false;
    (mockDb as any).select = mock(() => {
      return {
        from: mock(() => ({
          where: mock(() => {
            selectCallCount++;
            if (isStep2) {
              // Step 2: fetch full rows by (asset_id, recorded_at) pairs
              isStep2 = false;
              return Promise.resolve(historyRows);
            }
            // Step 1: the where() call that chains to groupBy
            // If maxDates is non-empty, next select call will be step 2
            isStep2 = maxDates.length > 0;
            const promise = Promise.resolve(maxDates);
            (promise as any).groupBy = mock(() => Promise.resolve(maxDates));
            (promise as any).orderBy = mock(() => Promise.resolve([]));
            return promise;
          }),
          groupBy: mock(() => Promise.resolve(maxDates)),
          orderBy: mock(() => Promise.resolve([])),
        })),
      };
    });
  }

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

  afterEach(() => {
    selectCallCount = 0;
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

    const maxDates = assets.map((asset) => ({
      asset_id: asset.id,
      max_recorded_at: new Date(year, month - 1, 15),
    }));
    const histories = assets.map((asset) => ({
      asset_id: asset.id,
      balance: '1000',
      recorded_at: new Date(year, month - 1, 15),
    }));
    mockSelectForSnapshot(maxDates, histories);

    await assetService.getSnapshotForMonth(workspaceId, year, month);

    // Should NOT use per-asset findFirst at all (old N+1 pattern)
    expect((mockDb.query.assetHistory as any).findFirst).not.toHaveBeenCalled();

    // Should have called select twice per chunk (step 1: maxDates, step 2: rows)
    expect(selectCallCount).toBe(2);
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

    mockSelectForSnapshot(
      [
        { asset_id: 'asset-1', max_recorded_at: new Date(year, month - 1, 15) },
        { asset_id: 'asset-2', max_recorded_at: new Date(year, month - 1, 20) },
      ],
      [
        { asset_id: 'asset-1', balance: '4500', recorded_at: new Date(year, month - 1, 15) },
        { asset_id: 'asset-2', balance: '3200', recorded_at: new Date(year, month - 1, 20) },
      ]
    );

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
    // Return empty for all chunks - the select mock handles both steps
    mockSelectForSnapshot([], []);

    await assetService.getSnapshotForMonth(workspaceId, 2026, 2);

    // With 1200 assets and chunk size 500, should have 3 chunks
    // Step 1 returns empty, so Step 2 is skipped → only 3 select calls total
    expect(selectCallCount).toBe(3);
  });

  it('records perf metrics during chunked snapshot execution', async () => {
    const workspaceId = 'workspace-1';
    const assets = Array.from({ length: 1200 }, (_, i) =>
      createMockAsset({
        id: `asset-${i}`,
        workspace_id: workspaceId,
        created_at: new Date('2026-01-01'),
      })
    );
    const perf = new PerfCollector();

    (mockDb.query.assets.findMany as any).mockResolvedValue(assets);
    mockSelectForSnapshot([], []);

    await assetService.getSnapshotForMonth(workspaceId, 2026, 2, undefined, perf);

    const phases = perf.getPhases();
    expect(
      phases.some((phase) => phase.name === 'AssetService.getSnapshotForMonth.assetCount')
    ).toBe(true);
    expect(
      phases.some((phase) => phase.name === 'AssetService.getSnapshotForMonth.chunkCount')
    ).toBe(true);
    expect(
      phases.some((phase) => phase.name === 'AssetService.getSnapshotForMonth.historyRowsFetched')
    ).toBe(true);
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

    // The max_recorded_at query returns the latest date; then the full row fetch
    // returns two rows — the historyMap in the service keeps the latest
    mockSelectForSnapshot(
      [{ asset_id: 'asset-1', max_recorded_at: new Date('2026-01-31') }],
      [{ asset_id: 'asset-1', balance: '3000', recorded_at: new Date('2026-01-31') }]
    );

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
    // No history — step 1 returns empty, step 2 is never called
    mockSelectForSnapshot([], []);

    const snapshots = await assetService.getSnapshotForMonth(workspaceId, year, month);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].snapshot_balance).toBe('1000');
  });

  it('should return empty array when no assets exist', async () => {
    const workspaceId = 'workspace-1';

    (mockDb.query.assets.findMany as any).mockResolvedValue([]);

    const snapshots = await assetService.getSnapshotForMonth(workspaceId, 2026, 2);

    expect(snapshots).toHaveLength(0);
    // Should not even call select for history query
    expect(selectCallCount).toBe(0);
  });
});
