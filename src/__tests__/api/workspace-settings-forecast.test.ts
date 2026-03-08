import { afterEach, describe, expect, it, mock } from 'bun:test';
import { GET, PUT } from '@/pages/api/workspace/settings';
import { workspaceMetaService, workspaceService } from '@/services';

interface TestLocalsUser {
  id: string;
  workspaceId: string;
  role: 'admin' | 'member';
}

function createApiContext(method: 'GET' | 'PUT', user?: TestLocalsUser, body?: unknown) {
  return {
    request: new Request('http://localhost/api/workspace/settings', {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
    locals: { user },
  } as any;
}

describe('workspace settings forecast API', () => {
  const originalFindById = workspaceService.findById;
  const originalUpdateName = workspaceService.updateName;
  const originalGetSettings = workspaceMetaService.getSettings;
  const originalSetForecastMonthlyTopup = workspaceMetaService.setForecastMonthlyTopup;
  const originalSetForecastAnnualRate = workspaceMetaService.setForecastAnnualRate;

  afterEach(() => {
    workspaceService.findById = originalFindById;
    workspaceService.updateName = originalUpdateName;
    workspaceMetaService.getSettings = originalGetSettings;
    workspaceMetaService.setForecastMonthlyTopup = originalSetForecastMonthlyTopup;
    workspaceMetaService.setForecastAnnualRate = originalSetForecastAnnualRate;
  });

  const workspace = {
    id: 'workspace-1',
    name: 'Forecast Workspace',
    created_at: new Date('2026-03-01T00:00:00.000Z'),
  };

  const settings = {
    currency: 'IDR' as const,
    secondaryCurrency: '',
    weekStart: 'monday' as const,
    monthlyIncome: { IDR: '15000000' },
    forecastMonthlyTopup: 9000000,
    forecastAnnualRate: 9.5,
  };

  it('forwards saved forecast assumptions on PUT', async () => {
    workspaceService.findById = mock(async () => workspace) as any;
    workspaceMetaService.getSettings = mock(async () => settings) as any;
    workspaceMetaService.setForecastMonthlyTopup = mock(async () => {}) as any;
    workspaceMetaService.setForecastAnnualRate = mock(async () => {}) as any;

    const response = await PUT(
      createApiContext(
        'PUT',
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' },
        {
          forecastMonthlyTopup: 9000000,
          forecastAnnualRate: 9.5,
        }
      )
    );

    expect(response.status).toBe(200);
    expect(workspaceMetaService.setForecastMonthlyTopup).toHaveBeenCalledWith(
      'workspace-1',
      9000000
    );
    expect(workspaceMetaService.setForecastAnnualRate).toHaveBeenCalledWith('workspace-1', 9.5);

    const payload = await response.json();
    expect(payload.data.settings.monthlyIncome).toEqual({ IDR: '15000000' });
    expect(payload.data.settings.forecastMonthlyTopup).toBe(9000000);
    expect(payload.data.settings.forecastAnnualRate).toBe(9.5);
  });

  it('returns saved forecast assumptions on GET', async () => {
    workspaceService.findById = mock(async () => workspace) as any;
    workspaceMetaService.getSettings = mock(async () => settings) as any;

    const response = await GET(
      createApiContext('GET', { id: 'user-1', workspaceId: 'workspace-1', role: 'member' })
    );

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.data.settings.monthlyIncome).toEqual({ IDR: '15000000' });
    expect(payload.data.settings.forecastMonthlyTopup).toBe(9000000);
    expect(payload.data.settings.forecastAnnualRate).toBe(9.5);
  });

  it('rejects negative forecast assumptions with 400', async () => {
    workspaceService.findById = mock(async () => workspace) as any;
    workspaceMetaService.getSettings = mock(async () => settings) as any;

    const response = await PUT(
      createApiContext(
        'PUT',
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' },
        {
          forecastMonthlyTopup: -1,
          forecastAnnualRate: -0.5,
        }
      )
    );

    expect(response.status).toBe(400);

    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
  });
});
