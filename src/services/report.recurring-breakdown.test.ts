import { beforeEach, describe, expect, it, mock } from 'bun:test';
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
    let callIndex = 0;
    (mockDb.select as any).mockImplementation(() => {
      callIndex += 1;

      if (callIndex === 1) {
        return {
          from: mock(() => ({
            where: mock(() =>
              Promise.resolve([
                {
                  recurring_total: '100',
                  one_time_total: '50',
                },
              ])
            ),
          })),
        };
      }

      return {
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => ({
              groupBy: mock(() =>
                Promise.resolve([
                  {
                    category_id: 'cat-rent',
                    category_name: 'Rent',
                    amount: '100',
                  },
                ])
              ),
            })),
          })),
        })),
      };
    });

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
    let callIndex = 0;
    (mockDb.select as any).mockImplementation(() => {
      callIndex += 1;

      if (callIndex === 1) {
        return {
          from: mock(() => ({
            where: mock(() =>
              Promise.resolve([
                {
                  recurring_total: '0',
                  one_time_total: '0',
                },
              ])
            ),
          })),
        };
      }

      return {
        from: mock(() => ({
          innerJoin: mock(() => ({
            where: mock(() => ({
              groupBy: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      };
    });

    const result = await reportService.getRecurringBreakdown('workspace-1', 2026, 2, 'IDR');

    expect(result.recurringTotal).toBe('0');
    expect(result.oneTimeTotal).toBe('0');
    expect(result.recurringByCategory).toEqual([]);
    expect(mockDb.query.recurringOccurrences.findMany).not.toHaveBeenCalled();
  });
});
