import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService, type AssetRow } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

/**
 * Patches a mock database so its update/insert chains match the shape used by transfer():
 *   db.update(table).set(values).where(condition).returning(columns)
 *   db.insert(table).values(data)
 *
 * runTransaction on SQLite passes db directly (no real transaction), so we patch db itself.
 */
function patchMockDbForTransfer(
  mockDb: any,
  opts: {
    deductReturning: { balance: string }[];
    addReturning: { balance: string }[];
  }
) {
  let updateCallIndex = 0;
  const insertCalls: any[] = [];
  const updateFn = mock(() => ({
    set: mock(() => ({
      where: mock(() => ({
        returning: mock(() => {
          const result = updateCallIndex === 0 ? opts.deductReturning : opts.addReturning;
          updateCallIndex++;
          return Promise.resolve(result);
        }),
      })),
    })),
  }));

  (mockDb.update as any).mockImplementation(updateFn);

  (mockDb.insert as any).mockImplementation(() => ({
    values: mock((data: any) => {
      insertCalls.push(data);
      return Promise.resolve();
    }),
  }));

  return { insertCalls, updateFn };
}

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

    const updatedFromAsset = { ...fromAsset, balance: '700' } as AssetRow;
    const updatedToAsset = { ...toAsset, balance: '800' } as AssetRow;

    // Mock findFirst: 2 for findByIdIncludingClosed, 2 for final findById
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset)
      .mockResolvedValueOnce(updatedFromAsset)
      .mockResolvedValueOnce(updatedToAsset);

    patchMockDbForTransfer(mockDb, {
      deductReturning: [{ balance: '700' }],
      addReturning: [{ balance: '800' }],
    });

    const result = await assetService.transfer(
      'asset-1',
      'asset-2',
      '300',
      'Monthly transfer',
      'workspace-1'
    );

    expect(result.fromAsset).toEqual(updatedFromAsset);
    expect(result.toAsset).toEqual(updatedToAsset);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it('should reject transfer to the same asset', async () => {
    await expect(
      assetService.transfer('asset-1', 'asset-1', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Cannot transfer an asset to itself');

    expect(mockDb.query.assets.findFirst).not.toHaveBeenCalled();
  });

  it('should reject when source asset not found', async () => {
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createMockAsset({ id: 'asset-2' }));

    await expect(
      assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Asset not found');

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

    await expect(
      assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Asset not found');

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

    await expect(
      assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1')
    ).rejects.toThrow('Cannot transfer between different currencies');

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
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

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset);

    await expect(
      assetService.transfer('asset-1', 'asset-2', '1000', undefined, 'workspace-1')
    ).rejects.toThrow('Insufficient balance');

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

    await expect(
      assetService.transfer('asset-1', 'asset-2', '0', undefined, 'workspace-1')
    ).rejects.toThrow('Transfer amount must be positive');

    expect(mockDb.query.assets.findFirst).toHaveBeenCalledTimes(2);
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

    const updatedFromAsset = { ...fromAsset, balance: '800' } as AssetRow;
    const updatedToAsset = { ...toAsset, balance: '700' } as AssetRow;

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset)
      .mockResolvedValueOnce(updatedFromAsset)
      .mockResolvedValueOnce(updatedToAsset);

    const { insertCalls } = patchMockDbForTransfer(mockDb, {
      deductReturning: [{ balance: '800' }],
      addReturning: [{ balance: '700' }],
    });

    const testNotes = 'Transfer for rent payment';
    await assetService.transfer('asset-1', 'asset-2', '200', testNotes, 'workspace-1');

    expect(insertCalls).toHaveLength(2);
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

    const updatedFromAsset = { ...fromAsset, balance: '900' } as AssetRow;
    const updatedToAsset = { ...toAsset, balance: '600' } as AssetRow;

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(fromAsset)
      .mockResolvedValueOnce(toAsset)
      .mockResolvedValueOnce(updatedFromAsset)
      .mockResolvedValueOnce(updatedToAsset);

    patchMockDbForTransfer(mockDb, {
      deductReturning: [{ balance: '900' }],
      addReturning: [{ balance: '600' }],
    });

    const result = await assetService.transfer(
      'asset-1',
      'asset-2',
      '100',
      undefined,
      'workspace-1'
    );

    expect(result.fromAsset).toEqual(updatedFromAsset);
    expect(result.toAsset).toEqual(updatedToAsset);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it('should use history balance from .returning() not pre-computed values', async () => {
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
      .mockResolvedValueOnce(toAsset)
      .mockResolvedValueOnce({ ...fromAsset, balance: '700' })
      .mockResolvedValueOnce({ ...toAsset, balance: '800' });

    // Simulate DB returning the actual post-update balance
    const { insertCalls } = patchMockDbForTransfer(mockDb, {
      deductReturning: [{ balance: '700' }],
      addReturning: [{ balance: '800' }],
    });

    await assetService.transfer('asset-1', 'asset-2', '300', undefined, 'workspace-1');

    // History entries should use the balance from .returning(), not pre-computed
    expect(insertCalls[0].balance).toBe('700');
    expect(insertCalls[1].balance).toBe('800');
  });

  it('should throw when concurrent drain causes empty returning result', async () => {
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

    // Simulate: balance was drained between pre-check and transaction.
    // The WHERE balance >= amount guard returns no rows.
    patchMockDbForTransfer(mockDb, {
      deductReturning: [], // empty — concurrent transfer drained the balance
      addReturning: [{ balance: '800' }],
    });

    await expect(
      assetService.transfer('asset-1', 'asset-2', '300', undefined, 'workspace-1')
    ).rejects.toThrow('Insufficient balance');

    // Only one update call should have been made (the deduct that failed)
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    // No history inserts should have happened
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('should throw when destination asset disappears during transaction', async () => {
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

    // Deduct succeeds, but destination update returns no rows (asset deleted mid-transaction)
    patchMockDbForTransfer(mockDb, {
      deductReturning: [{ balance: '700' }],
      addReturning: [], // empty — destination disappeared
    });

    await expect(
      assetService.transfer('asset-1', 'asset-2', '300', undefined, 'workspace-1')
    ).rejects.toThrow('Asset not found');

    expect(mockDb.update).toHaveBeenCalledTimes(2);
    // Only one history insert (source deduct) before the error
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});
