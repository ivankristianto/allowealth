import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService.update() - currency lock', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should throw CURRENCY_LOCKED when changing currency with history', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    // findById returns asset
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);

    // select().from().where() returns history count > 0
    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 5 }])),
      })),
    });

    try {
      await assetService.update('asset-1', 'workspace-1', { currency: 'USD' });
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.CURRENCY_LOCKED);
      expect(error.statusCode).toBe(400);
    }
  });

  it('should allow currency change when no history exists', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const updatedAsset = { ...asset, currency: 'USD' as const };

    // findById returns asset (for currency check), then updated asset
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(asset)
      .mockResolvedValueOnce(updatedAsset);

    // select().from().where() returns history count = 0
    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 0 }])),
      })),
    });

    // update mock
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await assetService.update('asset-1', 'workspace-1', { currency: 'USD' });

    expect(result?.currency).toBe('USD');
  });

  it('should allow update when currency is not changed', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      name: 'Old Name',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const updatedAsset = { ...asset, name: 'New Name' };

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(updatedAsset);

    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await assetService.update('asset-1', 'workspace-1', { name: 'New Name' });

    expect(result?.name).toBe('New Name');
  });
});
