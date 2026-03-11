import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { reportService, workspaceMetaService } from '@/services';

let GET: any;

const originalGetCategoryTransactions = reportService.getCategoryTransactions;
const originalGetWorkspaceCurrencies = workspaceMetaService.getWorkspaceCurrencies;

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

describe('/api/reports/category-drilldown income support', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/reports/category-drilldown'));
  });

  afterEach(() => {
    reportService.getCategoryTransactions = originalGetCategoryTransactions;
    workspaceMetaService.getWorkspaceCurrencies = originalGetWorkspaceCurrencies;
  });

  it('returns drilldown data for income categories', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    reportService.getCategoryTransactions = mock(async () => ({
      transactions: [
        {
          id: 'txn-1',
          amount: '5000000',
          currency: 'IDR',
          description: 'Salary',
          transactionDate: new Date('2026-02-01'),
          accountName: 'Bank BCA',
          createdByName: 'Test',
        },
      ],
      total: '5000000',
      categoryName: 'Salary',
      totalCount: 1,
      limit: 100,
      offset: 0,
      hasMore: false,
    })) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports/category-drilldown?categoryId=abcdefghijklmnopqrstu&categoryName=Salary&period=2026-02&range=monthly&currency=IDR&spent=5000000&_render=html'
      )
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Salary');
  });

  it('infers income transaction type when categoryType is omitted', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    reportService.getCategoryTransactions = mock(async () => ({
      transactions: [
        {
          id: 'txn-1',
          amount: '5000000',
          currency: 'IDR',
          description: 'Salary',
          transactionDate: new Date('2026-02-01'),
          accountName: 'Bank BCA',
          createdByName: 'Test',
          hasHistory: false,
        },
      ],
      total: '5000000',
      categoryName: 'Salary',
      categoryType: 'income',
      totalCount: 1,
      limit: 100,
      offset: 0,
      hasMore: false,
    })) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports/category-drilldown?categoryId=abcdefghijklmnopqrstu&categoryName=Salary&period=2026-02&range=monthly&currency=IDR&spent=5000000'
      )
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.transactions[0]?.type).toBe('income');
    expect(payload.data.transactions[0]?.category.type).toBe('income');
  });
});
