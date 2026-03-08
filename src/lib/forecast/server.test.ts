import { afterEach, describe, expect, it, mock } from 'bun:test';
import { accountService, reportService, workspaceMetaService } from '@/services';

describe('getForecastRealityCheckData', () => {
  const originalGetSettings = workspaceMetaService.getSettings;
  const originalFindAllWithHistory = accountService.findAllWithHistory;
  const originalFindAllWithHistoryForForecast = (accountService as any)
    .findAllWithHistoryForForecast;
  const originalGetMonthlyNetSavingsByMonth = reportService.getMonthlyNetSavingsByMonth;

  afterEach(() => {
    workspaceMetaService.getSettings = originalGetSettings;
    accountService.findAllWithHistory = originalFindAllWithHistory;
    (accountService as any).findAllWithHistoryForForecast = originalFindAllWithHistoryForForecast;
    reportService.getMonthlyNetSavingsByMonth = originalGetMonthlyNetSavingsByMonth;
  });

  it('builds forecast data for a workspace without making an HTTP round trip', async () => {
    const { getForecastRealityCheckData } = await import('./server');

    workspaceMetaService.getSettings = mock(async () => ({
      currency: 'IDR',
      secondaryCurrency: '',
      weekStart: 'monday',
      monthlyIncome: {},
      forecastMonthlyTopup: 250,
      forecastAnnualRate: 12,
    })) as any;
    accountService.findAllWithHistory = mock(async () => {
      throw new Error('findAllWithHistory should not be used for forecast');
    }) as any;
    (accountService as any).findAllWithHistoryForForecast = mock(async () => [
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
    ]) as any;
    reportService.getMonthlyNetSavingsByMonth = mock(
      async () =>
        new Map([
          ['2024-01', { income: '800', expenses: '300', netSavings: '500' }],
          ['2024-02', { income: '400', expenses: '600', netSavings: '-200' }],
          ['2024-03', { income: '700', expenses: '400', netSavings: '300' }],
        ])
    ) as any;

    const result = await getForecastRealityCheckData('workspace-1');
    const february = result.timeline.find((point) => point.key === '2024-02');

    expect((accountService as any).findAllWithHistoryForForecast).toHaveBeenCalledWith(
      'workspace-1',
      'IDR'
    );
    expect(reportService.getMonthlyNetSavingsByMonth).toHaveBeenCalledTimes(1);
    expect(result.assumptions).toEqual({
      monthlyTopup: 250,
      annualRate: 12,
    });
    expect(result.summary.latestActualBalance).toBe(1200);
    expect(result.timeline[0]?.actualBalance).toBe(1000);
    expect(february?.plannedBalance).toBe(1260);
    expect(february?.actualNetSavings).toBe(-200);
    expect(february?.income).toBe(400);
    expect(february?.expenses).toBe(600);
    expect(result.chartWindow.latestActualKey).toBe('2024-03');
    expect(result.yearlyBreakdown[0]?.months[0]?.key).toBe('2024-01');
  });
});
