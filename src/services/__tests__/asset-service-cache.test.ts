import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager, CacheTags } from '@/lib/cache';

describe('AssetService.findAll caching', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;
  let cache: ReturnType<typeof getCacheManager>;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
    cache = getCacheManager();

    // Mock cache methods
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
    cache.invalidateByTags = mock(() => Promise.resolve());
  });

  it('should cache results from findAll on cache miss', async () => {
    const workspaceId = 'workspace-1';
    const mockAssets = [
      createMockAsset({ id: 'asset-1', workspace_id: workspaceId }),
      createMockAsset({ id: 'asset-2', workspace_id: workspaceId }),
    ];

    (mockDb.query.assets.findMany as any).mockResolvedValue(mockAssets);

    const result = await assetService.findAll(workspaceId);

    expect(result).toEqual(mockAssets);
    expect(cache.set).toHaveBeenCalledTimes(1);

    // Verify cache key contains the workspace ID
    const cacheSetCall = (cache.set as any).mock.calls[0];
    expect(cacheSetCall[0]).toContain('cache:assets');
    expect(cacheSetCall[0]).toContain(workspaceId);

    // Verify tags
    const options = cacheSetCall[2];
    expect(options.tags).toContain(CacheTags.workspace(workspaceId));
    expect(options.tags).toContain(CacheTags.ASSETS);
  });

  it('should return cached results on cache hit', async () => {
    const workspaceId = 'workspace-1';
    const mockAssets = [createMockAsset({ id: 'asset-1', workspace_id: workspaceId })];

    (cache.get as any).mockResolvedValue(mockAssets);

    const result = await assetService.findAll(workspaceId);

    expect(result).toEqual(mockAssets);
    // Should NOT call DB when cache hit
    expect(mockDb.query.assets.findMany).not.toHaveBeenCalled();
  });

  it('should include filters in cache key hash', async () => {
    const workspaceId = 'workspace-1';
    const filters = { type: 'bank_account' as const, currency: 'USD' as const };

    (mockDb.query.assets.findMany as any).mockResolvedValue([]);

    await assetService.findAll(workspaceId, filters);

    expect(cache.set).toHaveBeenCalledTimes(1);
    const cacheSetCall = (cache.set as any).mock.calls[0];
    expect(cacheSetCall[0]).toContain(workspaceId);
  });
});
