import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { TransactionService } from '@/services/transaction.service';
import { accountService } from '@/services';
import { createMockDatabase, resetMockDatabase } from '@/services/test-helpers/mocks';

let accountHistoryGetRoute: any;

const originalAccountGetHistory = accountService.getHistory;

function createApiContext(url: string) {
  return {
    url: new URL(url),
    request: new Request(url, { method: 'GET' }),
    params: { id: 'account-1' },
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

describe('History endpoint bounds and query-shape', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let transactionService: TransactionService;

  beforeAll(async () => {
    ({ GET: accountHistoryGetRoute } = await import('@/pages/api/accounts/[id]/history'));
  });

  beforeEach(() => {
    mockDb = createMockDatabase();
    transactionService = new TransactionService(mockDb);
    resetMockDatabase(mockDb);
  });

  afterEach(() => {
    accountService.getHistory = originalAccountGetHistory;
  });

  it('avoids workspace-wide category/account map loads when audit payload has no refs', async () => {
    (mockDb.query.auditLogs.findMany as any).mockResolvedValueOnce([
      {
        id: 'log-1',
        action: 'create',
        user_id: 'user-1',
        old_value: null,
        new_value: JSON.stringify({ description: 'created' }),
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        user: { id: 'user-1', name: 'User One' },
      },
    ]);

    const result = await transactionService.getHistory('tx-1', 'ws-1');

    expect(result.history).toHaveLength(1);
    expect(mockDb.query.categories.findMany).not.toHaveBeenCalled();
    expect(mockDb.query.accounts.findMany).not.toHaveBeenCalled();
  });

  it('applies bounded account history defaults and max clamp in API route', async () => {
    accountService.getHistory = mock(async () => []) as any;

    await accountHistoryGetRoute(
      createApiContext('http://localhost/api/accounts/account-1/history')
    );
    expect(accountService.getHistory).toHaveBeenLastCalledWith('account-1', 'ws-1', undefined, 100);

    await accountHistoryGetRoute(
      createApiContext('http://localhost/api/accounts/account-1/history?limit=5000')
    );
    expect(accountService.getHistory).toHaveBeenLastCalledWith('account-1', 'ws-1', undefined, 500);
  });
});
