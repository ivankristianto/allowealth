import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { transactionService, workspaceMetaService } from '@/services';
import { PAGINATION } from '@/lib/constants/pagination';

let GET: any;

const originalFindAll = transactionService.findAll;
const originalCount = transactionService.count;
const originalGetMonthSummary = (transactionService as any).getMonthSummary;
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
      perf: undefined,
    },
  } as any;
}

describe('/api/transactions summary aggregation path', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/transactions/index'));
  });

  afterEach(() => {
    transactionService.findAll = originalFindAll;
    transactionService.count = originalCount;
    (transactionService as any).getMonthSummary = originalGetMonthSummary;
    workspaceMetaService.getWorkspaceCurrencies = originalGetWorkspaceCurrencies;
  });

  it('builds summary from SQL aggregate and does not call findAll(limit=10000)', async () => {
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;

    transactionService.findAll = mock(async () => []) as any;
    transactionService.count = mock(async () => 0) as any;
    (transactionService as any).getMonthSummary = mock(async () => ({
      income: 500,
      expenses: 250,
      transactionCount: 2,
    }));

    const response = await GET(
      createApiContext(
        'http://localhost/api/transactions?start_date=2026-01-01&end_date=2026-01-31&limit=20&offset=0'
      )
    );
    const payload = await response.json();
    const calledWithMaxMonthLimit = (transactionService.findAll as any).mock.calls.some(
      ([arg]: any[]) => arg?.limit === PAGINATION.MAX_MONTH_TRANSACTIONS
    );

    expect(response.status).toBe(200);
    expect((transactionService as any).getMonthSummary).toHaveBeenCalledTimes(1);
    expect(calledWithMaxMonthLimit).toBe(false);
    expect(payload.data.summary).toEqual({
      income: 500,
      expenses: 250,
      transactionCount: 2,
    });
  });
});
