import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountCategoryService } from '../account-category.service';
import { createMockDatabase, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager, CacheTags } from '@/lib/cache';

describe('AccountCategoryService.findAll caching', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountCategoryService: AccountCategoryService;
  let cache: ReturnType<typeof getCacheManager>;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountCategoryService = new AccountCategoryService(mockDb);
    cache = getCacheManager();

    // Mock cache methods
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
    cache.invalidateByTags = mock(() => Promise.resolve());
  });

  it('should cache results from findAll on cache miss', async () => {
    const workspaceId = 'workspace-1';
    const mockCategories = [
      {
        id: 'acat-1',
        workspace_id: workspaceId,
        name: 'Cash',
        is_system: true,
        is_liability: false,
        sort_order: 0,
      },
      {
        id: 'acat-2',
        workspace_id: workspaceId,
        name: 'Investments',
        is_system: false,
        is_liability: false,
        sort_order: 1,
      },
    ];

    (mockDb.query.accountCategories as any).findMany.mockResolvedValue(mockCategories);

    const result = await accountCategoryService.findAll(workspaceId);

    expect(result).toEqual(mockCategories);
    expect(cache.set).toHaveBeenCalledTimes(1);

    const cacheSetCall = (cache.set as any).mock.calls[0];
    expect(cacheSetCall[0]).toContain('cache:account-categories');
    expect(cacheSetCall[0]).toContain(workspaceId);

    const options = cacheSetCall[2];
    expect(options.tags).toContain(CacheTags.workspace(workspaceId));
    expect(options.tags).toContain(CacheTags.ACCOUNT_CATEGORIES);
  });

  it('should invalidate cache on create', async () => {
    const workspaceId = 'workspace-1';

    // Mock insert chain
    const returningMock = mock(() => Promise.resolve([{ id: 'new-1', workspace_id: workspaceId }]));
    const valuesMock = mock(() => ({ returning: returningMock }));
    (mockDb as any).insert = mock(() => ({ values: valuesMock }));

    // Mock existsByName to return false
    (mockDb.query.accountCategories as any).findFirst.mockResolvedValue(null);

    // Mock countCustom: select().from().where() returns array
    const whereMock = mock(() => Promise.resolve([{ count: 0 }]));
    const fromMock = mock(() => ({ where: whereMock }));
    (mockDb as any).select = mock(() => ({ from: fromMock }));

    await accountCategoryService.create({
      workspace_id: workspaceId,
      created_by_user_id: 'user-1',
      name: 'New Category',
      is_liability: false,
      is_system: false,
      sort_order: 0,
    });

    expect(cache.invalidateByTags).toHaveBeenCalledTimes(1);
    const tags = (cache.invalidateByTags as any).mock.calls[0][0];
    expect(tags).toContain(CacheTags.workspace(workspaceId));
    expect(tags).toContain(CacheTags.ACCOUNT_CATEGORIES);
  });

  it('should invalidate cache on seedDefaultCategories', async () => {
    const workspaceId = 'workspace-1';

    // Mock no existing categories (idempotency guard)
    (mockDb.query.accountCategories as any).findFirst.mockResolvedValue(null);

    // Mock insert (no returning needed for seed)
    (mockDb as any).insert = mock(() => ({
      values: mock(() => Promise.resolve()),
    }));

    await accountCategoryService.seedDefaultCategories(workspaceId, 'user-1');

    expect(cache.invalidateByTags).toHaveBeenCalledTimes(1);
    const tags = (cache.invalidateByTags as any).mock.calls[0][0];
    expect(tags).toContain(CacheTags.workspace(workspaceId));
    expect(tags).toContain(CacheTags.ACCOUNT_CATEGORIES);
  });

  it('should return cached results on cache hit', async () => {
    const workspaceId = 'workspace-1';
    const mockCategories = [{ id: 'acat-1', workspace_id: workspaceId, name: 'Cash' }];

    (cache.get as any).mockResolvedValue(mockCategories);

    const result = await accountCategoryService.findAll(workspaceId);

    expect(result).toEqual(mockCategories);
    expect((mockDb.query.accountCategories as any).findMany).not.toHaveBeenCalled();
  });
});
