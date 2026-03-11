import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  accountCategoryService,
  accountService,
  transactionService,
  workspaceMetaService,
} from '@/services';

let transactionsGetRoute: any;
let transactionHistoryGetRoute: any;
let accountCategoriesGetRoute: any;

const originalTransactionFindAll = transactionService.findAll;
const originalTransactionCount = transactionService.count;
const originalTransactionGetHistory = transactionService.getHistory;
const originalTransactionGetMonthSummary = transactionService.getMonthSummary;
const originalGetWorkspaceCurrencies = workspaceMetaService.getWorkspaceCurrencies;
const originalAccountCategoryFindAll = accountCategoryService.findAll;
const originalCountByCategory = accountService.countByCategory;

function createBaseContext(url: string) {
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
  } as const;
}

describe('HTML render guard', () => {
  beforeAll(async () => {
    ({ GET: transactionsGetRoute } = await import('@/pages/api/transactions/index'));
    ({ GET: transactionHistoryGetRoute } = await import('@/pages/api/transactions/[id]/history'));
    ({ GET: accountCategoriesGetRoute } = await import('@/pages/api/account-categories/index'));
  });

  beforeEach(() => {
    transactionService.findAll = mock(async () => []) as any;
    transactionService.count = mock(async () => 0) as any;
    transactionService.getHistory = mock(async () => ({
      history: [],
      totalEdits: 0,
      showingEdits: 0,
    })) as any;
    transactionService.getMonthSummary = mock(async () => null) as any;
    workspaceMetaService.getWorkspaceCurrencies = mock(async () => ({
      primary: 'IDR',
      secondary: null,
    })) as any;
    accountCategoryService.findAll = mock(async () => []) as any;
    accountService.countByCategory = mock(async () => []) as any;
  });

  afterEach(() => {
    transactionService.findAll = originalTransactionFindAll;
    transactionService.count = originalTransactionCount;
    transactionService.getHistory = originalTransactionGetHistory;
    transactionService.getMonthSummary = originalTransactionGetMonthSummary;
    workspaceMetaService.getWorkspaceCurrencies = originalGetWorkspaceCurrencies;
    accountCategoryService.findAll = originalAccountCategoryFindAll;
    accountService.countByCategory = originalCountByCategory;
  });

  it('rejects transaction list html requests before loading data', async () => {
    const response = await transactionsGetRoute(
      createBaseContext('http://localhost/api/transactions?_render=html')
    );

    expect(response.status).toBe(403);
    expect(transactionService.findAll).not.toHaveBeenCalled();
    expect(transactionService.count).not.toHaveBeenCalled();
    expect(transactionService.getMonthSummary).not.toHaveBeenCalled();
    expect(workspaceMetaService.getWorkspaceCurrencies).not.toHaveBeenCalled();
  });

  it('rejects transaction history html requests before loading history', async () => {
    const response = await transactionHistoryGetRoute({
      ...createBaseContext('http://localhost/api/transactions/tx-1/history?_render=html'),
      params: { id: 'tx-1' },
    });

    expect(response.status).toBe(403);
    expect(transactionService.getHistory).not.toHaveBeenCalled();
  });

  it('rejects account category html requests before loading categories', async () => {
    const response = await accountCategoriesGetRoute(
      createBaseContext('http://localhost/api/account-categories?_render=html')
    );

    expect(response.status).toBe(403);
    expect(accountCategoryService.findAll).not.toHaveBeenCalled();
    expect(accountService.countByCategory).not.toHaveBeenCalled();
  });
});
