import { beforeEach, describe, expect, it } from 'bun:test';
import { ReportService } from './report.service';
import { createMockDatabase, resetMockDatabase } from './test-helpers/mocks';

describe('ReportService recurring breakdown', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let reportService: ReportService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    reportService = new ReportService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('uses transaction_date month attribution for recurring vs one-time totals', async () => {
    (mockDb.query.transactions.findMany as any).mockResolvedValueOnce([
      {
        id: 'tx-recurring',
        category_id: 'cat-rent',
        amount: '100',
        category: { id: 'cat-rent', name: 'Rent' },
      },
      {
        id: 'tx-one-time',
        category_id: 'cat-food',
        amount: '50',
        category: { id: 'cat-food', name: 'Food' },
      },
    ]);
    (mockDb.query.recurringOccurrences.findMany as any).mockResolvedValueOnce([
      {
        id: 'ro-1',
        transaction_id: 'tx-recurring',
      },
    ]);

    const result = await reportService.getRecurringBreakdown('workspace-1', 2026, 2, 'IDR');

    expect(result.recurringTotal).toBe('100');
    expect(result.oneTimeTotal).toBe('50');
    expect(result.recurringByCategory).toEqual([
      {
        category_id: 'cat-rent',
        category_name: 'Rent',
        amount: '100',
      },
    ]);
  });

  it('returns zero totals when the month has no expense transactions', async () => {
    (mockDb.query.transactions.findMany as any).mockResolvedValueOnce([]);

    const result = await reportService.getRecurringBreakdown('workspace-1', 2026, 2, 'IDR');

    expect(result.recurringTotal).toBe('0');
    expect(result.oneTimeTotal).toBe('0');
    expect(result.recurringByCategory).toEqual([]);
    expect(mockDb.query.recurringOccurrences.findMany).not.toHaveBeenCalled();
  });
});
