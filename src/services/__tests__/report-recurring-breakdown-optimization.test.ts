import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ReportService } from '@/services/report.service';
import { createMockDatabase, resetMockDatabase } from '@/services/test-helpers/mocks';

describe('Report recurring breakdown query optimization', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let reportService: ReportService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    reportService = new ReportService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('computes recurring breakdown via set-based queries without full-row hydration', async () => {
    let callIndex = 0;
    (mockDb.select as any).mockImplementation(() => {
      callIndex += 1;

      if (callIndex === 1) {
        return {
          from: mock(() => ({
            where: mock(() =>
              Promise.resolve([
                {
                  recurring_total: '1200',
                  one_time_total: '300',
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
                    category_id: 'cat-1',
                    category_name: 'Rent',
                    amount: '1200',
                  },
                ])
              ),
            })),
          })),
        })),
      };
    });

    const result = await reportService.getRecurringBreakdown('ws-1', 2026, 1, 'IDR');

    expect(result).toEqual({
      recurringTotal: '1200',
      oneTimeTotal: '300',
      recurringByCategory: [
        {
          category_id: 'cat-1',
          category_name: 'Rent',
          amount: '1200',
        },
      ],
    });
    expect(mockDb.query.transactions.findMany).not.toHaveBeenCalled();
    expect(mockDb.query.recurringOccurrences.findMany).not.toHaveBeenCalled();
  });
});
