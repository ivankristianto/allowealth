import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService, type AssetRow } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

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

    const updatedFromAsset = {
      ...fromAsset,
      balance: '700', // 1000 - 300
    } as AssetRow;

    const updatedToAsset = {
      ...toAsset,
      balance: '800', // 500 + 300
    } as AssetRow;

    // Mock findFirst for initial lookups (fromAsset, toAsset) and final lookups (updated versions)
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset)
      .mockResolvedValueOnce(updatedFromAsset)
      .mockResolvedValueOnce(updatedToAsset);

    // Mock transaction
    const mockTx = {
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      })),
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })),
    };
    (mockDb.transaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    const result = await assetService.transfer(
      'asset-1',
      'asset-2',
      '300',
      'Monthly transfer',
      'workspace-1'
    );

    expect(result.fromAsset).toEqual(updatedFromAsset);
    expect(result.toAsset).toEqual(updatedToAsset);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.update).toHaveBeenCalledTimes(2);
    expect(mockTx.insert).toHaveBeenCalledTimes(2);
  });

  it('should reject transfer to the same asset', async () => {
    await expect(
      assetService.transfer('asset-1', 'asset-1', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Cannot transfer an asset to itself');

    expect(mockDb.query.assets.findFirst).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('should reject when source asset not found', async () => {
    // Mock findFirst to return undefined for source asset, then any value for destination
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createMockAsset({ id: 'asset-2' }));

    await expect(
      assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Asset not found');

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('should reject when destination asset not found', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'Savings',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    // Mock findFirst to return fromAsset, then undefined for toAsset
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(undefined);

    await expect(
      assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Asset not found');

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
    expect(mockDb.transaction).not.toHaveBeenCalled();
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

    // Mock findFirst for initial lookups
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    await expect(
      assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Cannot transfer between different currencies');

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('should reject when source has insufficient balance', async () => {
    const fromAsset = createMockAsset({
      id: 'asset-1',
      name: 'Savings',
      balance: '500',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const toAsset = createMockAsset({
      id: 'asset-2',
      name: 'Checking',
      balance: '1000',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    // Mock findFirst for initial lookups
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    await expect(
      assetService.transfer('asset-1', 'asset-2', '1000', undefined, 'workspace-1')
    ).rejects.toThrow('Insufficient balance');

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
    expect(mockDb.transaction).not.toHaveBeenCalled();
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

    // Mock findFirst for initial lookups
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    await expect(
      assetService.transfer('asset-1', 'asset-2', '0', undefined, 'workspace-1')
    ).rejects.toThrow('Transfer amount must be positive');

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('should include notes in history entries', async () => {
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

    const updatedFromAsset = {
      ...fromAsset,
      balance: '800', // 1000 - 200
    } as AssetRow;

    const updatedToAsset = {
      ...toAsset,
      balance: '700', // 500 + 200
    } as AssetRow;

    // Mock findFirst for initial lookups (fromAsset, toAsset) and final lookups (updated versions)
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset)
      .mockResolvedValueOnce(updatedFromAsset)
      .mockResolvedValueOnce(updatedToAsset);

    // Mock transaction with tracking
    const insertCalls: any[] = [];
    const mockTx = {
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      })),
      insert: mock(() => ({
        values: mock((data: any) => {
          insertCalls.push(data);
          return {
            returning: mock(() => Promise.resolve([])),
          };
        }),
      })),
    };
    (mockDb.transaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    const testNotes = 'Transfer for rent payment';
    await assetService.transfer('asset-1', 'asset-2', '200', testNotes, 'workspace-1');

    // Verify insert was called twice (two history entries)
    expect(mockTx.insert).toHaveBeenCalledTimes(2);
    expect(insertCalls).toHaveLength(2);

    // Verify notes are included in history entries with proper prefixes
    expect(insertCalls[0].notes).toBe(`Transfer out: ${testNotes}`);
    expect(insertCalls[1].notes).toBe(`Transfer in: ${testNotes}`);
  });

  it('should handle transfer without notes', async () => {
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

    const updatedFromAsset = {
      ...fromAsset,
      balance: '900', // 1000 - 100
    } as AssetRow;

    const updatedToAsset = {
      ...toAsset,
      balance: '600', // 500 + 100
    } as AssetRow;

    // Mock findFirst for initial lookups (fromAsset, toAsset) and final lookups (updated versions)
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset)
      .mockResolvedValueOnce(updatedFromAsset)
      .mockResolvedValueOnce(updatedToAsset);

    // Mock transaction
    const mockTx = {
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      })),
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })),
    };
    (mockDb.transaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    const result = await assetService.transfer(
      'asset-1',
      'asset-2',
      '100',
      undefined,
      'workspace-1'
    );

    expect(result.fromAsset).toEqual(updatedFromAsset);
    expect(result.toAsset).toEqual(updatedToAsset);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});
