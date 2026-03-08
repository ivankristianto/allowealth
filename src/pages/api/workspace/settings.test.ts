import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { workspaceMetaService, workspaceService } from '@/services';

let GET: any;
let PUT: any;

const originalFindById = workspaceService.findById;
const originalGetSettings = workspaceMetaService.getSettings;
const originalSetMonthlyIncome = workspaceMetaService.setMonthlyIncome;

function createApiContext(method: 'GET' | 'PUT', body?: unknown) {
  return {
    request: new Request('http://localhost/api/workspace/settings', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    locals: {
      user: {
        id: 'user-1',
        workspaceId: 'ws-1',
        role: 'admin',
      },
      perf: undefined,
    },
  } as any;
}

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('/api/workspace/settings monthly income contract', () => {
  beforeAll(async () => {
    ({ GET, PUT } = await import('@/pages/api/workspace/settings'));
  });

  afterEach(() => {
    workspaceService.findById = originalFindById;
    workspaceMetaService.getSettings = originalGetSettings;
    workspaceMetaService.setMonthlyIncome = originalSetMonthlyIncome;
  });

  it('returns monthlyIncome as a currency map in GET responses', async () => {
    workspaceService.findById = mock(async () => ({
      id: 'ws-1',
      name: 'Family Budget',
      created_at: 1_741_403_200_000,
    })) as any;
    workspaceMetaService.getSettings = mock(async () => ({
      currency: 'IDR',
      secondaryCurrency: 'USD',
      weekStart: 'monday',
      monthlyIncome: { IDR: '5000000', USD: '250' },
      forecastMonthlyTopup: 5_000_000,
      forecastAnnualRate: 7,
    })) as any;

    const response = await GET(createApiContext('GET'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.settings.monthlyIncome).toEqual({
      IDR: '5000000',
      USD: '250',
    });
    expect(payload.data.settings.forecastMonthlyTopup).toBe(5_000_000);
    expect(payload.data.settings.forecastAnnualRate).toBe(7);
  });

  it('returns monthlyIncome as a currency map after PUT updates', async () => {
    workspaceService.findById = mock(async () => ({
      id: 'ws-1',
      name: 'Family Budget',
      created_at: 1_741_403_200_000,
    })) as any;
    workspaceMetaService.setMonthlyIncome = mock(async () => {}) as any;
    workspaceMetaService.getSettings = mock(async () => ({
      currency: 'IDR',
      secondaryCurrency: '',
      weekStart: 'monday',
      monthlyIncome: { IDR: '7500000' },
      forecastMonthlyTopup: 6_000_000,
      forecastAnnualRate: 8,
    })) as any;

    const response = await PUT(
      createApiContext('PUT', {
        monthlyIncome: {
          IDR: '7500000',
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(workspaceMetaService.setMonthlyIncome).toHaveBeenCalledWith('ws-1', {
      IDR: '7500000',
    });
    expect(payload.data.settings.monthlyIncome).toEqual({
      IDR: '7500000',
    });
    expect(payload.data.settings.forecastMonthlyTopup).toBe(6_000_000);
    expect(payload.data.settings.forecastAnnualRate).toBe(8);
  });

  it('documents monthlyIncome in workspace settings OpenAPI schema and examples', () => {
    const workspaceSettingsSchema = read('openapi/schemas/WorkspaceSettings.yml');
    const updateSettingsSchema = read('openapi/schemas/UpdateWorkspaceSettingsRequest.yml');
    const workspacePath = read('openapi/paths/workspace.yml');

    expect(workspaceSettingsSchema).toContain('monthlyIncome');
    expect(updateSettingsSchema).toContain('monthlyIncome');
    expect(workspacePath).toContain('monthlyIncome');
    expect(workspaceSettingsSchema).toContain('forecastMonthlyTopup');
    expect(workspaceSettingsSchema).toContain('forecastAnnualRate');
    expect(workspacePath).toContain(
      'Available settings: name, currency, secondaryCurrency, weekStart, monthlyIncome,'
    );
  });
});
