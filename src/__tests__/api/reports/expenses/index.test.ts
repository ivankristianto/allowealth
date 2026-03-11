import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { reportService, accountService, workspaceMetaService, workspaceService } from '@/services';

let GET: any;

const originalGetExpenseReport = reportService.getExpenseReport;
const originalGetTotalByClass = accountService.getTotalByClass;
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

const mockExpenseReport = {
  totalIncome: '10000000',
  totalExpenses: '7000000',
  netSavings: '3000000',
  budgetHealth: 85,
  expenseCategories: 5,
  expenseByCategory: [{ name: 'Food', value: '2000000' }],
  trendData: [{ name: 'Jan', income: '5000000', expenses: '3000000' }],
  categoryIntelligence: [
    {
      id: 'cat-1',
      name: 'Food',
      spent: '2000000',
      budgetLimit: '3000000',
      icon: 'utensils',
      color: 'bg-warning',
    },
  ],
  recurringBreakdown: {
    recurringTotal: '1500000',
    oneTimeTotal: '500000',
    recurringByCategory: [],
  },
  memberSummary: [
    {
      userId: 'user-1',
      userName: 'Test',
      totalIncome: '5000000',
      totalExpenses: '3000000',
      netSavings: '2000000',
      transactionCount: 10,
    },
  ],
};

describe('/api/reports/expenses contract', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/reports/expenses/index'));
  });

  afterEach(() => {
    reportService.getExpenseReport = originalGetExpenseReport;
    accountService.getTotalByClass = originalGetTotalByClass;
    workspaceMetaService.getWorkspaceCurrencies = originalGetWorkspaceCurrencies;
    workspaceService.getMembers = originalGetMembers;
  });

  it('returns expense-detail partials', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    reportService.getExpenseReport = mock(async () => mockExpenseReport) as any;
    accountService.getTotalByClass = mock(async () => []) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports/expenses?range=yearly&period=2026&_render=html&_partial=all'
      )
    );

    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('<!-- PARTIAL:summary -->');
    expect(html).toContain('<!-- PARTIAL:charts -->');
    expect(html).toContain('<!-- PARTIAL:table -->');
    expect(html).toContain('<!-- PARTIAL:members -->');
    expect(html).toContain('financialVelocitySubtitle="MONTHLY BREAKDOWN"');
    expect(html).toContain('subtitle="SORTED BY AMOUNT SPENT"');
  });

  it('returns expense JSON data', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    reportService.getExpenseReport = mock(async () => mockExpenseReport) as any;
    accountService.getTotalByClass = mock(async () => []) as any;

    const response = await GET(
      createApiContext('http://localhost/api/reports/expenses?range=monthly&period=2026-02')
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.totalExpenses).toBe('7000000');
    expect(payload.data.categoryIntelligence).toBeDefined();
    expect(payload.data.memberSummary).toBeDefined();
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
        'http://localhost/api/reports/expenses?range=monthly&period=2026-02&user_id=not-in-workspace'
      )
    );

    expect(response.status).toBe(400);
  });
});
