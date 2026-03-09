import { afterEach, describe, expect, it, mock } from 'bun:test';

import { GET } from '@/pages/api/recurring/forecast';
import { recurringForecastService } from '@/services';

function createApiContext(
  url: string,
  user?: { id: string; workspaceId: string; role: 'admin' | 'member' }
) {
  return {
    request: new Request(url),
    url: new URL(url),
    locals: { user, perf: undefined },
  } as any;
}

describe('GET /api/recurring/forecast', () => {
  const originalGetForecast = recurringForecastService.getForecast;

  afterEach(() => {
    recurringForecastService.getForecast = originalGetForecast;
  });

  it('passes monthCount from query params into the forecast service', async () => {
    recurringForecastService.getForecast = mock(async () => ({
      rows: [],
      totals: [],
      monthKeys: [],
    })) as typeof recurringForecastService.getForecast;

    const response = await GET(
      createApiContext('http://localhost/api/recurring/forecast?monthCount=24&type=income', {
        id: 'user-1',
        workspaceId: 'workspace-1',
        role: 'member',
      })
    );

    expect(response.status).toBe(200);
    expect(recurringForecastService.getForecast).toHaveBeenCalledWith(
      'workspace-1',
      { type: 'income', status: 'active' },
      24,
      undefined
    );
  });
});
