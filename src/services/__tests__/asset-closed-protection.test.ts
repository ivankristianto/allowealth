import { describe, it, expect, beforeEach } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService - closed account protection', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should throw ACCOUNT_CLOSED when updating balance of closed account', async () => {
    const closedAsset = createMockAsset({
      id: 'asset-1',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(closedAsset);

    try {
      await assetService.updateBalance('asset-1', 'workspace-1', { balance: '500' });
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_CLOSED);
    }
  });

  it('should throw ACCOUNT_CLOSED when transferring from closed account', async () => {
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

    try {
      await assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_CLOSED);
    }
  });

  it('should throw ACCOUNT_CLOSED when transferring to closed account', async () => {
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

    try {
      await assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_CLOSED);
    }
  });
});
