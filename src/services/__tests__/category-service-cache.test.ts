import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CategoryService } from '../category.service';
import { createMockDatabase, createMockCategory, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager, CacheTags } from '@/lib/cache';

describe('CategoryService.findAll caching', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let categoryService: CategoryService;
  let cache: ReturnType<typeof getCacheManager>;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    categoryService = new CategoryService(mockDb);
    cache = getCacheManager();

    // Mock cache methods
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
    cache.invalidateByTags = mock(() => Promise.resolve());
  });

  it('should cache results from findAll on cache miss', async () => {
    const workspaceId = 'workspace-1';
    const mockCategories = [
      createMockCategory({ id: 'cat-1', workspace_id: workspaceId }),
      createMockCategory({ id: 'cat-2', workspace_id: workspaceId }),
    ];

    (mockDb.query.categories.findMany as any).mockResolvedValue(mockCategories);

    const result = await categoryService.findAll(workspaceId);

    expect(result).toEqual(mockCategories);
    expect(cache.set).toHaveBeenCalledTimes(1);

    const cacheSetCall = (cache.set as any).mock.calls[0];
    expect(cacheSetCall[0]).toContain('cache:categories');
    expect(cacheSetCall[0]).toContain(workspaceId);

    const options = cacheSetCall[2];
    expect(options.tags).toContain(CacheTags.workspace(workspaceId));
    expect(options.tags).toContain(CacheTags.CATEGORIES);
  });

  it('should invalidate cache on create', async () => {
    const workspaceId = 'workspace-1';

    // Mock insert chain
    const returningMock = mock(() =>
      Promise.resolve([createMockCategory({ id: 'new-1', workspace_id: workspaceId })])
    );
    const valuesMock = mock(() => ({ returning: returningMock }));
    (mockDb as any).insert = mock(() => ({ values: valuesMock }));

    await categoryService.create({
      workspace_id: workspaceId,
      created_by_user_id: 'user-1',
      name: 'New Category',
      type: 'expense',
    });

    expect(cache.invalidateByTags).toHaveBeenCalledTimes(1);
    const tags = (cache.invalidateByTags as any).mock.calls[0][0];
    expect(tags).toContain(CacheTags.workspace(workspaceId));
    expect(tags).toContain(CacheTags.CATEGORIES);
  });

  it('should return cached results on cache hit', async () => {
    const workspaceId = 'workspace-1';
    const mockCategories = [createMockCategory({ id: 'cat-1', workspace_id: workspaceId })];

    (cache.get as any).mockResolvedValue(mockCategories);

    const result = await categoryService.findAll(workspaceId);

    expect(result).toEqual(mockCategories);
    expect(mockDb.query.categories.findMany).not.toHaveBeenCalled();
  });

  it('should invalidate cache on update', async () => {
    const workspaceId = 'workspace-1';
    const mockCategory = createMockCategory({ id: 'cat-1', workspace_id: workspaceId });

    (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);

    await categoryService.update('cat-1', workspaceId, { name: 'Updated' });

    expect(cache.invalidateByTags).toHaveBeenCalledTimes(1);
    const tags = (cache.invalidateByTags as any).mock.calls[0][0];
    expect(tags).toContain(CacheTags.workspace(workspaceId));
    expect(tags).toContain(CacheTags.CATEGORIES);
  });

  it('should invalidate cache on delete', async () => {
    const workspaceId = 'workspace-1';
    const mockCategory = createMockCategory({ id: 'cat-1', workspace_id: workspaceId });

    (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);

    await categoryService.delete('cat-1', workspaceId);

    expect(cache.invalidateByTags).toHaveBeenCalledTimes(1);
    const tags = (cache.invalidateByTags as any).mock.calls[0][0];
    expect(tags).toContain(CacheTags.workspace(workspaceId));
    expect(tags).toContain(CacheTags.CATEGORIES);
  });
});
