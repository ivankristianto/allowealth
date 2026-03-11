import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { RecurringOccurrenceService } from '@/services/recurring-occurrence.service';
import { createMockDatabase, resetMockDatabase } from '@/services/test-helpers/mocks';
import { recurringOccurrenceService as recurringOccurrenceServiceSingleton } from '@/services';
import { resetCacheManager } from '@/lib/cache';

describe('Recurring stats aggregation regression', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let recurringOccurrenceService: RecurringOccurrenceService;
  let recurringStatsRouteGet: any;

  const originalFindPending = recurringOccurrenceServiceSingleton.findPending;
  const originalGetMonthlySummary = (recurringOccurrenceServiceSingleton as any).getMonthlySummary;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    recurringOccurrenceService = new RecurringOccurrenceService(mockDb);
    resetMockDatabase(mockDb);
  });

  beforeAll(async () => {
    ({ GET: recurringStatsRouteGet } = await import('@/pages/api/recurring/stats'));
  });

  afterEach(() => {
    recurringOccurrenceServiceSingleton.findPending = originalFindPending;
    (recurringOccurrenceServiceSingleton as any).getMonthlySummary = originalGetMonthlySummary;
  });

  it('computes recurring stats via aggregate queries, not full-row findMany loads', async () => {
    let callIndex = 0;
    (mockDb.select as any).mockImplementation(() => {
      callIndex += 1;
      if (callIndex === 1) {
        return {
          from: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                groupBy: mock(() =>
                  Promise.resolve([
                    {
                      currency: 'IDR',
                      amount: '0',
                      pending_count: 0,
                      overdue_count: 0,
                    },
                  ])
                ),
              })),
            })),
          })),
        };
      }

      return {
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 0 }])),
        })),
      };
    });

    await recurringOccurrenceService.getStats('ws-1');

    expect(mockDb.query.recurringOccurrences.findMany).not.toHaveBeenCalled();
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('uses aggregate-backed monthly summary for HTML stats path (no findPending fallback)', async () => {
    recurringOccurrenceServiceSingleton.findPending = mock(async () => ({
      occurrences: [],
      total: 0,
    })) as any;
    (recurringOccurrenceServiceSingleton as any).getMonthlySummary = mock(async () => ({
      upcomingIncomeCount: 0,
      upcomingExpenseCount: 0,
      incomeByCurrency: [],
      expenseByCurrency: [],
      netByCurrency: [],
    }));

    const response = await recurringStatsRouteGet({
      url: new URL('http://localhost/api/recurring/stats?_render=html&month=2026-01'),
      request: new Request('http://localhost/api/recurring/stats?_render=html&month=2026-01', {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      }),
      locals: {
        user: {
          id: 'user-1',
          workspaceId: 'ws-1',
          role: 'member',
        },
      },
    } as any);

    expect(response.status).toBe(200);
    expect((recurringOccurrenceServiceSingleton as any).getMonthlySummary).toHaveBeenCalledTimes(1);
    expect(recurringOccurrenceServiceSingleton.findPending).not.toHaveBeenCalled();
  });
});
