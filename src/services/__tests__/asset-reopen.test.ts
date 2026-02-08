import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService.reopen()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should reopen a closed account', async () => {
    const closedAsset = createMockAsset({
      id: 'asset-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date('2026-01-15'),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    const reopenedAsset = {
      ...closedAsset,
      status: 'active' as const,
      closed_at: null,
      closed_by_user_id: null,
    };

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(closedAsset)
      .mockResolvedValueOnce(reopenedAsset);

    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await assetService.reopen('asset-1', 'workspace-1');

    expect(result?.status).toBe('active');
    expect(result?.closed_at).toBeNull();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should throw NOT_CLOSED when reopening active account', async () => {
    const activeAsset = createMockAsset({
      id: 'asset-1',
      status: 'active',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(activeAsset);

    try {
      await assetService.reopen('asset-1', 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.NOT_CLOSED);
    }
  });

  it('should throw ASSET_NOT_FOUND when asset does not exist', async () => {
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(undefined);

    try {
      await assetService.reopen('nonexistent', 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ASSET_NOT_FOUND);
    }
  });
});
