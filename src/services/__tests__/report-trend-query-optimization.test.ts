import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ReportService } from '@/services/report.service';
import {
  createMockDatabaseWithQueryCounter,
  resetMockDatabase,
  type MockDatabaseWithQueryCounter,
} from '@/services/test-helpers/mocks';

describe('Report trend query optimization regression', () => {
  let mockDb: MockDatabaseWithQueryCounter;
  let reportService: ReportService;

  beforeEach(() => {
    mockDb = createMockDatabaseWithQueryCounter();
    reportService = new ReportService(mockDb);
    resetMockDatabase(mockDb);

    // Keep non-trend yearly report branches out of this test.
    (reportService as any).getTotalIncome = mock(async () => '0');
    (reportService as any).getTotalExpenses = mock(async () => '0');
    (reportService as any).getYearlyBudgetHealth = mock(async () => 0);
    (reportService as any).getExpenseByCategory = mock(async () => []);
    (reportService as any).getYearlyCategoryIntelligence = mock(async () => []);
  });

  it('uses one grouped trend query instead of per-month query loop', async () => {
    const mockSelect = mockDb.select as any;
    mockSelect.mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() => ({
          groupBy: mock(() =>
            Promise.resolve([
              { month_bucket: '2026-01', income: '100', expenses: '40' },
              { month_bucket: '2026-02', income: '120', expenses: '50' },
            ])
          ),
        })),
      })),
    }));

    const report = await reportService.getYearlyReport('ws-1', 2026, 'IDR');

    expect(report.trendData).toHaveLength(12);
    expect((mockDb.select as any).mock.calls.length).toBe(1);
  });
});
