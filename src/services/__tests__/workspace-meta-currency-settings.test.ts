import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { WorkspaceMetaService } from '../workspace-meta.service';
import { createMockDatabase, resetMockDatabase } from '../test-helpers/mocks';
import { WORKSPACE_META_KEYS } from '@/lib/constants/workspace-meta-keys';
import { ServiceErrorCode } from '../service-errors';

describe('WorkspaceMetaService.setCurrencySettings()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let workspaceMetaService: WorkspaceMetaService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    workspaceMetaService = new WorkspaceMetaService(mockDb);
    (mockDb.query.workspaces.findFirst as any).mockResolvedValue({ id: 'workspace-1' });
  });

  it('persists explicit currency meta when submitted values match defaults', async () => {
    // Fresh workspace has no stored currency meta, so getters resolve defaults.
    (mockDb.query.workspaceMeta.findFirst as any)
      .mockResolvedValueOnce(undefined) // currency
      .mockResolvedValueOnce(undefined); // secondary_currency

    await workspaceMetaService.setCurrencySettings('workspace-1', 'IDR', '');

    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    const firstValues = (mockDb.insert as any).mock.results[0].value.values.mock.calls[0][0];
    const secondValues = (mockDb.insert as any).mock.results[1].value.values.mock.calls[0][0];
    const persistedMetaKeys = [firstValues.meta_key, secondValues.meta_key];

    expect(persistedMetaKeys).toContain(WORKSPACE_META_KEYS.CURRENCY);
    expect(persistedMetaKeys).toContain(WORKSPACE_META_KEYS.SECONDARY_CURRENCY);
  });

  it('skips writes when submitted values are unchanged and explicit meta already exists', async () => {
    (mockDb.query.workspaceMeta.findFirst as any)
      .mockResolvedValueOnce({ meta_value: 'IDR' }) // current primary
      .mockResolvedValueOnce({ meta_value: '' }) // current secondary (disabled)
      .mockResolvedValueOnce({ id: 'meta-currency' }) // explicit primary exists
      .mockResolvedValueOnce({ id: 'meta-secondary' }); // explicit secondary exists

    await workspaceMetaService.setCurrencySettings('workspace-1', 'IDR', '');

    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('backfills missing secondary meta when values are unchanged', async () => {
    (mockDb.query.workspaceMeta.findFirst as any)
      .mockResolvedValueOnce({ meta_value: 'IDR' }) // current primary
      .mockResolvedValueOnce(undefined) // current secondary (default null)
      .mockResolvedValueOnce({ id: 'meta-currency' }) // explicit primary exists
      .mockResolvedValueOnce(undefined); // explicit secondary missing

    await workspaceMetaService.setCurrencySettings('workspace-1', 'IDR', '');

    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it('allows unchanged-value meta backfill even when currency changes are locked', async () => {
    (mockDb.query.workspaceMeta.findFirst as any)
      .mockResolvedValueOnce(undefined) // current primary => defaults to IDR
      .mockResolvedValueOnce(undefined) // current secondary => defaults to null
      .mockResolvedValueOnce(undefined) // explicit primary missing
      .mockResolvedValueOnce(undefined); // explicit secondary missing

    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 1 }])),
      })),
    });

    await workspaceMetaService.setCurrencySettings('workspace-1', 'IDR', '');

    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('still enforces currency lock when submitted values actually change', async () => {
    (mockDb.query.workspaceMeta.findFirst as any)
      .mockResolvedValueOnce({ meta_value: 'IDR' }) // current primary
      .mockResolvedValueOnce(undefined); // current secondary

    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 1 }])),
      })),
    });

    await Promise.resolve(
      expect(
        workspaceMetaService.setCurrencySettings('workspace-1', 'USD', '')
      ).rejects.toMatchObject({
        code: ServiceErrorCode.CURRENCY_LOCKED,
        statusCode: 400,
      })
    );
  });
});
