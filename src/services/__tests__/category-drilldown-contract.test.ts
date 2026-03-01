import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { reportService, workspaceMetaService } from '@/services';

let GET: any;

const originalGetCategoryTransactions = reportService.getCategoryTransactions;
const originalGetWorkspaceCurrencies = workspaceMetaService.getWorkspaceCurrencies;

function createApiContext(url: string) {
  return {
    url: new URL(url),
    request: new Request(url, { method: 'GET' }),
    locals: {
      user: {
        id: 'user-1',
        workspaceId: 'ws-1',
        role: 'member',
      },
    },
  } as any;
}

describe('/api/reports/category-drilldown contract', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/reports/category-drilldown'));
  });

  afterEach(() => {
    reportService.getCategoryTransactions = originalGetCategoryTransactions;
    workspaceMetaService.getWorkspaceCurrencies = originalGetWorkspaceCurrencies;
  });

  it('returns transactions, total, limit, offset, and hasMore', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;

    reportService.getCategoryTransactions = mock(async () => ({
      transactions: [
        {
          id: 'tx-1',
          amount: '50',
          currency: 'IDR',
          description: 'Coffee',
          transactionDate: new Date('2026-01-10T00:00:00.000Z'),
          accountName: 'Cash',
          hasHistory: false,
        },
      ],
      total: '50',
      categoryName: 'Food',
      totalCount: 1,
      limit: 100,
      offset: 0,
      hasMore: false,
    })) as any;

    const response = await GET(
      createApiContext(
        'http://localhost/api/reports/category-drilldown?categoryId=aaaaaaaaaaaaaaaaaaaaa&period=2026-01&range=monthly&categoryName=Food&currency=IDR&spent=50'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data.transactions)).toBe(true);
    expect(typeof payload.data.total).toBe('number');
    expect(typeof payload.data.limit).toBe('number');
    expect(typeof payload.data.offset).toBe('number');
    expect(typeof payload.data.hasMore).toBe('boolean');
  });
});
