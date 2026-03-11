import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { reportService, workspaceMetaService, workspaceService } from '@/services';

let GET: any;

const originalGetIncomeReport = reportService.getIncomeReport;
const originalGetWorkspaceCurrencies = workspaceMetaService.getWorkspaceCurrencies;
const originalGetMembers = workspaceService.getMembers;

function createApiContext(urlStr: string) {
  const url = new URL(urlStr, 'http://localhost');
  return {
    request: new Request(url.toString(), {
      headers:
        url.searchParams.get('_render') === 'html'
          ? {
              'X-Requested-With': 'XMLHttpRequest',
            }
          : undefined,
    }),
    url,
    locals: {
      user: { id: 'user-1', workspaceId: 'ws-1', role: 'admin' },
      perf: undefined,
    },
  } as any;
}

const mockIncomeReport = {
  summary: {
    totalIncome: '13000000',
    activeIncome: '10000000',
    passiveIncome: '2500000',
    otherIncome: '500000',
    growthVsPreviousPeriod: '15.5',
    previousPeriodLabel: 'Jan 2026',
  },
  sourceMix: [{ name: 'Salary', value: '10000000' }],
  sourceGroupTrend: [{ name: 'Jan', active: '10000000', passive: '2500000', other: '500000' }],
  members: [{ userId: 'user-1', userName: 'Test', totalIncome: '13000000', transactionCount: 5 }],
  history: {
    transactions: [
      {
        id: 'txn-1',
        description: 'Monthly Salary',
        amount: '10000000',
        currency: 'IDR',
        transaction_date: '2026-02-01',
        category_name: 'Salary',
        category_icon: 'banknote',
        category_color: 'bg-success',
        income_source_type: 'active',
        created_by_name: 'Test',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 25,
    appliedFilters: {},
  },
};

describe('/api/reports/income contract', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/reports/income/index'));
  });

  afterEach(() => {
    reportService.getIncomeReport = originalGetIncomeReport;
    workspaceMetaService.getWorkspaceCurrencies = originalGetWorkspaceCurrencies;
    workspaceService.getMembers = originalGetMembers;
  });

  it('returns income JSON data with source groups and history', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    reportService.getIncomeReport = mock(async () => mockIncomeReport) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports/income?range=monthly&period=2026-02&page=1&pageSize=25'
      )
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.summary.activeIncome).toBe('10000000');
    expect(payload.data.summary.passiveIncome).toBe('2500000');
    expect(Array.isArray(payload.data.sourceMix)).toBe(true);
    expect(Array.isArray(payload.data.history.transactions)).toBe(true);
  });

  it('returns income HTML partials', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    reportService.getIncomeReport = mock(async () => mockIncomeReport) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports/income?range=monthly&period=2026-02&_render=html&_partial=all'
      )
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<!-- PARTIAL:summary -->');
    expect(html).toContain('<!-- PARTIAL:sources -->');
    expect(html).toContain('<!-- PARTIAL:members -->');
    expect(html).toContain('<!-- PARTIAL:history -->');
    expect(html).toContain('previousPeriodLabel="Jan 2026"');
  });

  it('rejects invalid member filters', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    workspaceService.getMembers = mock(async () => [
      { id: 'user-1', name: 'Test', email: 'test@test.com' },
    ]) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports/income?range=monthly&period=2026-02&user_id=not-in-workspace'
      )
    );
    expect(response.status).toBe(400);
  });

  it('clamps pageSize to max', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    reportService.getIncomeReport = mock(async () => mockIncomeReport) as any;

    await GET(
      createApiContext(
        'http://localhost/api/reports/income?range=monthly&period=2026-02&pageSize=999'
      )
    );
    const callArgs = (reportService.getIncomeReport as any).mock.calls[0];
    expect(callArgs[4].pageSize).toBeLessThanOrEqual(100);
  });
});
