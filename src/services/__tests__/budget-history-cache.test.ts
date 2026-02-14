import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { BudgetService } from '../budget.service';
import {
  createMockDatabase,
  createMockBudgetWithCategory,
  resetMockDatabase,
} from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

describe('BudgetService.getBudgetHistory caching', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let budgetService: BudgetService;
  let cache: ReturnType<typeof getCacheManager>;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    budgetService = new BudgetService(mockDb);
    cache = getCacheManager();

    // Mock cache methods
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should call getMonthlyOverview per month (each is independently cached)', async () => {
    const workspaceId = 'workspace-1';
    const currency = 'USD';

    const mockBudgets = [
      createMockBudgetWithCategory(
        { id: 'budget-1', category_id: 'cat-1', budget_amount: '500000', currency: 'USD' },
        { id: 'cat-1', name: 'Food', type: 'expense', is_active: true }
      ),
    ];

    (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);
    (mockDb.query.transactions.findMany as any).mockResolvedValue([]);

    // Fix mock chain: select().from().where().groupBy() needs to work
    const groupByMock = mock(() => Promise.resolve([]));
    const whereMock = mock(() => ({ groupBy: groupByMock }));
    const fromMock = mock(() => ({ where: whereMock }));
    (mockDb as any).select = mock(() => ({ from: fromMock }));

    const history = await budgetService.getBudgetHistory(workspaceId, currency, 3);

    // Should return 3 months of history
    expect(history).toHaveLength(3);

    // Each month should attempt cache.get (3 cache reads)
    expect(cache.get).toHaveBeenCalledTimes(3);

    // On cache miss, each month's result is cached (3 cache writes)
    expect(cache.set).toHaveBeenCalledTimes(3);
  });

  it('should skip DB queries when cache hits', async () => {
    const workspaceId = 'workspace-1';
    const currency = 'USD';

    // Simulate all cache hits
    const cachedOverview = {
      total_budget: '500000',
      total_spent: '100000',
      total_balance: '400000',
      categories_warning: 0,
      categories_exceeded: 0,
      categories: [],
    };
    (cache.get as any).mockResolvedValue(cachedOverview);

    const history = await budgetService.getBudgetHistory(workspaceId, currency, 3);

    expect(history).toHaveLength(3);

    // No DB queries should be made
    expect(mockDb.query.budgets.findMany).not.toHaveBeenCalled();
    expect(mockDb.query.transactions.findMany).not.toHaveBeenCalled();

    // No new cache writes needed
    expect(cache.set).not.toHaveBeenCalled();
  });
});
