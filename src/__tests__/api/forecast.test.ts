import { afterEach, describe, expect, it, mock } from 'bun:test';
import { GET } from '@/pages/api/forecast';
import { accountService, reportService, workspaceMetaService } from '@/services';

interface TestLocalsUser {
  id: string;
  workspaceId: string;
  role: 'admin' | 'member';
}

function createApiContext(user?: TestLocalsUser) {
  return {
    request: new Request('http://localhost/api/forecast'),
    url: new URL('http://localhost/api/forecast'),
    locals: { user },
  } as any;
}

describe('GET /api/forecast', () => {
  const originalGetSettings = workspaceMetaService.getSettings;
  const originalFindAllWithHistory = accountService.findAllWithHistory;
  const originalGetMonthlyNetSavingsByMonth = reportService.getMonthlyNetSavingsByMonth;

  afterEach(() => {
    workspaceMetaService.getSettings = originalGetSettings;
    accountService.findAllWithHistory = originalFindAllWithHistory;
    reportService.getMonthlyNetSavingsByMonth = originalGetMonthlyNetSavingsByMonth;
  });

  it('returns 401 for unauthenticated requests', async () => {
    const response = await GET(createApiContext());

    expect(response.status).toBe(401);

    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.message).toBe('Unauthorized');
  });

  it('uses saved assumptions, excludes debt and non-primary currency accounts, and returns the new timeline contract', async () => {
    workspaceMetaService.getSettings = mock(async () => ({
      currency: 'IDR',
      secondaryCurrency: '',
      weekStart: 'monday',
      compactNumbers: true,
      monthlyIncome: '',
      forecastMonthlyTopup: 250,
      forecastAnnualRate: 12,
    })) as any;
    accountService.findAllWithHistory = mock(async () => [
      {
        id: 'account-asset-idr',
        balance: '1200',
        currency: 'IDR',
        account_class: 'asset',
        history: [
          { date: new Date('2024-01-15'), amount: 1000 },
          { date: new Date('2024-02-15'), amount: 1100 },
          { date: new Date('2024-03-15'), amount: 1200 },
        ],
      },
      {
        id: 'account-debt-idr',
        balance: '3800',
        currency: 'IDR',
        account_class: 'debt',
        history: [
          { date: new Date('2024-01-15'), amount: 4000 },
          { date: new Date('2024-02-15'), amount: 3900 },
          { date: new Date('2024-03-15'), amount: 3800 },
        ],
      },
      {
        id: 'account-asset-usd',
        balance: '999',
        currency: 'USD',
        account_class: 'asset',
        history: [
          { date: new Date('2024-01-15'), amount: 999 },
          { date: new Date('2024-02-15'), amount: 999 },
          { date: new Date('2024-03-15'), amount: 999 },
        ],
      },
    ]) as any;
    reportService.getMonthlyNetSavingsByMonth = mock(
      async () =>
        new Map([
          ['2024-01', { income: '800', expenses: '300', netSavings: '500' }],
          ['2024-02', { income: '400', expenses: '600', netSavings: '-200' }],
          ['2024-03', { income: '700', expenses: '400', netSavings: '300' }],
        ])
    ) as any;

    const response = await GET(
      createApiContext({ id: 'user-1', workspaceId: 'workspace-1', role: 'member' })
    );

    expect(response.status).toBe(200);
    expect(reportService.getMonthlyNetSavingsByMonth).toHaveBeenCalledTimes(1);

    const payload = await response.json();
    const february = payload.data.timeline.find(
      (point: { key: string }) => point.key === '2024-02'
    );

    expect(payload.data.assumptions).toEqual({
      monthlyTopup: 250,
      annualRate: 12,
    });
    expect(payload.data.summary.latestActualBalance).toBe(1200);
    expect(payload.data.timeline[0].actualBalance).toBe(1000);
    expect(february?.plannedBalance).toBe(1260);
    expect(february?.actualNetSavings).toBe(-200);
    expect(february?.income).toBe(400);
    expect(february?.expenses).toBe(600);
    expect(payload.data.chartWindow.latestActualKey).toBe('2024-03');
    expect(payload.data.yearlyBreakdown[0].months[0].key).toBe('2024-01');
  });
});
