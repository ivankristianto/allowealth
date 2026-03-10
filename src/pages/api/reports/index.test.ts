import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { reportService, accountService, workspaceMetaService, workspaceService } from '@/services';

let GET: any;

// Save originals for restore
const originalGetOverview = reportService.getOverviewReport;
const originalGetTotalByClass = accountService.getTotalByClass;
const originalGetWorkspaceCurrencies = workspaceMetaService.getWorkspaceCurrencies;
const originalGetMembers = workspaceService.getMembers;

function createApiContext(urlStr: string) {
  const url = new URL(urlStr, 'http://localhost');
  return {
    request: new Request(url.toString()),
    url,
    locals: {
      user: { id: 'user-1', workspaceId: 'ws-1', role: 'admin' },
      perf: undefined,
    },
  } as any;
}

describe('/api/reports overview contract', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/reports/index'));
  });

  afterEach(() => {
    reportService.getOverviewReport = originalGetOverview;
    accountService.getTotalByClass = originalGetTotalByClass;
    workspaceMetaService.getWorkspaceCurrencies = originalGetWorkspaceCurrencies;
    workspaceService.getMembers = originalGetMembers;
  });

  it('returns lightweight overview JSON with overview fields', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;

    reportService.getOverviewReport = mock(async () => ({
      totalIncome: '10000000',
      totalExpenses: '7000000',
      netSavings: '3000000',
      savingsRate: '30',
      trendData: [{ name: 'Jan', income: '5000000', expenses: '3000000' }],
      incomePreview: { topCategories: [{ name: 'Salary', value: '5000000' }], total: '10000000' },
      expensePreview: { topCategories: [{ name: 'Food', value: '2000000' }], total: '7000000' },
    })) as any;

    const response = await GET(
      createApiContext('http://localhost/api/reports?range=monthly&period=2026-02')
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.totalIncome).toBe('10000000');
    expect(payload.data.savingsRate).toBe('30');
    expect(payload.data.incomePreview).toBeDefined();
    expect(payload.data.expensePreview).toBeDefined();
  });

  it('returns overview partials for HTML render', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;

    reportService.getOverviewReport = mock(async () => ({
      totalIncome: '10000000',
      totalExpenses: '7000000',
      netSavings: '3000000',
      savingsRate: '30',
      trendData: [{ name: 'Jan', income: '5000000', expenses: '3000000' }],
      incomePreview: { topCategories: [{ name: 'Salary', value: '5000000' }], total: '10000000' },
      expensePreview: { topCategories: [{ name: 'Food', value: '2000000' }], total: '7000000' },
    })) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports?range=monthly&period=2026-02&_render=html&_partial=all'
      )
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<!-- PARTIAL:summary -->');
    expect(html).toContain('<!-- PARTIAL:charts -->');
    expect(html).toContain('<!-- PARTIAL:previews -->');
    // Overview should NOT have table or members
    expect(html).not.toContain('<!-- PARTIAL:table -->');
    expect(html).not.toContain('<!-- PARTIAL:members -->');
  });

  it('rejects invalid member filters for overview', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;

    workspaceService.getMembers = mock(async () => [
      { id: 'user-1', name: 'Test', email: 'test@test.com' },
    ]) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports?range=monthly&period=2026-02&user_id=not-in-workspace'
      )
    );

    expect(response.status).toBe(400);
  });
});
