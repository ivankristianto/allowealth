import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { TransactionService } from '@/services/transaction.service';
import { createMockDatabase, resetMockDatabase } from '@/services/test-helpers/mocks';

describe('Transaction month summary sign parity', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let transactionService: TransactionService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    transactionService = new TransactionService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('returns positive expenses, positive income, and unchanged expense count', async () => {
    (mockDb.select as any).mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() =>
          Promise.resolve([
            {
              income: '1250',
              expenses: '430',
              expense_count: 3,
            },
          ])
        ),
      })),
    }));

    const summary = await (transactionService as any).getMonthSummary({
      workspace_id: 'ws-1',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-01-31T23:59:59.999Z'),
      currency: 'IDR',
    });

    expect(summary).toEqual({
      income: 1250,
      expenses: 430,
      transactionCount: 3,
    });
  });
});
