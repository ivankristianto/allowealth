import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { WorkspaceMetaService } from './workspace-meta.service';
import { ServiceErrorCode, WorkspaceMetaServiceError } from './service-errors';
import { WORKSPACE_META_KEYS } from '@/lib/constants/workspace-meta-keys';

type ForecastWorkspaceMetaService = WorkspaceMetaService & {
  getForecastMonthlyTopup(workspaceId: string): Promise<number>;
  setForecastMonthlyTopup(workspaceId: string, value: number): Promise<void>;
  getForecastAnnualRate(workspaceId: string): Promise<number>;
  setForecastAnnualRate(workspaceId: string, value: number): Promise<void>;
};

function createMockDb(initialMeta: Record<string, string> = {}) {
  const metaStore = new Map(Object.entries(initialMeta));

  const workspaceMetaRows = () =>
    Array.from(metaStore.entries()).map(([meta_key, meta_value]) => ({
      id: `meta-${meta_key}`,
      workspace_id: 'workspace-1',
      meta_key,
      meta_value,
      created_at: new Date(),
      updated_at: new Date(),
    }));

  const db = {
    query: {
      workspaces: {
        findFirst: mock(() =>
          Promise.resolve({
            id: 'workspace-1',
            name: 'Forecast Workspace',
            created_at: new Date(),
            updated_at: new Date(),
          })
        ),
      },
      workspaceMeta: {
        findFirst: mock(() => Promise.resolve(workspaceMetaRows()[0] ?? null)),
        findMany: mock(() => Promise.resolve(workspaceMetaRows())),
      },
    },
    insert: mock(() => ({
      values: mock((row: { meta_key: string; meta_value: string }) => {
        metaStore.set(row.meta_key, row.meta_value);

        return {
          onConflictDoUpdate: mock(({ set }: { set?: { meta_value?: string } }) => {
            if (set?.meta_value !== undefined) {
              metaStore.set(row.meta_key, set.meta_value);
            }
            return Promise.resolve({});
          }),
        };
      }),
    })),
    __metaStore: metaStore,
  };

  return db;
}

describe('WorkspaceMetaService forecast settings', () => {
  beforeEach(() => {
    resetCacheManager();
  });

  it('falls back to the existing forecast defaults when no values are saved', async () => {
    const service = new WorkspaceMetaService(createMockDb() as any);

    const settings = await service.getSettings('workspace-1');

    expect(settings.forecastMonthlyTopup).toBe(5000000);
    expect(settings.forecastAnnualRate).toBe(7);
  });

  it('round-trips a saved forecast monthly top-up as a number', async () => {
    const mockDb = createMockDb();
    const service = new WorkspaceMetaService(mockDb as any) as ForecastWorkspaceMetaService;

    expect(typeof service.setForecastMonthlyTopup).toBe('function');
    expect(typeof service.getForecastMonthlyTopup).toBe('function');

    await service.setForecastMonthlyTopup('workspace-1', 7500000);

    expect(mockDb.__metaStore.get(WORKSPACE_META_KEYS.FORECAST_MONTHLY_TOPUP)).toBe('7500000');
    expect(await service.getForecastMonthlyTopup('workspace-1')).toBe(7500000);

    const settings = await service.getSettings('workspace-1');
    expect(settings.forecastMonthlyTopup).toBe(7500000);
  });

  it('round-trips a saved forecast APY as a number', async () => {
    const mockDb = createMockDb();
    const service = new WorkspaceMetaService(mockDb as any) as ForecastWorkspaceMetaService;

    expect(typeof service.setForecastAnnualRate).toBe('function');
    expect(typeof service.getForecastAnnualRate).toBe('function');

    await service.setForecastAnnualRate('workspace-1', 8.5);

    expect(mockDb.__metaStore.get(WORKSPACE_META_KEYS.FORECAST_ANNUAL_RATE)).toBe('8.5');
    expect(await service.getForecastAnnualRate('workspace-1')).toBe(8.5);

    const settings = await service.getSettings('workspace-1');
    expect(settings.forecastAnnualRate).toBe(8.5);
  });

  it('rejects negative forecast assumption values', async () => {
    const service = new WorkspaceMetaService(createMockDb() as any) as ForecastWorkspaceMetaService;

    expect(typeof service.setForecastMonthlyTopup).toBe('function');
    expect(typeof service.setForecastAnnualRate).toBe('function');

    try {
      await service.setForecastMonthlyTopup('workspace-1', -1);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(WorkspaceMetaServiceError);
      expect((error as WorkspaceMetaServiceError).code).toBe(ServiceErrorCode.INVALID_META_VALUE);
    }

    try {
      await service.setForecastAnnualRate('workspace-1', -0.5);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(WorkspaceMetaServiceError);
      expect((error as WorkspaceMetaServiceError).code).toBe(ServiceErrorCode.INVALID_META_VALUE);
    }
  });
});
