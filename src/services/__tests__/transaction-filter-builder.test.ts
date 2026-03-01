import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { TransactionService } from '@/services/transaction.service';
import { createMockDatabase, resetMockDatabase } from '@/services/test-helpers/mocks';

describe('Transaction filter builder sharing', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let transactionService: TransactionService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    transactionService = new TransactionService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('uses shared filter condition builder for findAll and count', async () => {
    const buildFilterConditions = mock(() => []);
    (transactionService as any).buildFilterConditions = buildFilterConditions;

    (mockDb.query.transactions.findMany as any).mockResolvedValueOnce([]);
    (mockDb.select as any).mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 0 }])),
      })),
    }));

    await transactionService.findAll({
      workspace_id: 'ws-1',
      limit: 10,
      offset: 0,
      type: 'expense',
      search: 'coffee',
    });

    await transactionService.count({
      workspace_id: 'ws-1',
      type: 'expense',
      search: 'coffee',
    });

    expect(buildFilterConditions).toHaveBeenCalledTimes(2);
  });
});
