import { describe, it, expect, beforeEach } from 'bun:test';
import { WorkspaceService } from '../workspace.service';
import { createMockDatabase, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

describe('WorkspaceService.getOnboardingStatus()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let workspaceService: WorkspaceService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    workspaceService = new WorkspaceService(mockDb);
  });

  it('should return all false for a fresh workspace', async () => {
    // All queries return undefined/empty (default mock behavior)
    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.currency).toBe(false);
    expect(status.categories).toBe(false);
    expect(status.budgets).toBe(false);
    expect(status.assets).toBe(false);
    expect(status.transactions).toBe(false);
  });

  it('should detect currency as set when workspace meta has currency entry', async () => {
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce({
      id: 'meta-1',
      workspace_id: 'workspace-1',
      meta_key: 'currency',
      meta_value: 'USD',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.currency).toBe(true);
    expect(status.categories).toBe(false);
  });

  it('should detect categories as set when at least one expense category exists', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // Category exists
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce({
      id: 'cat-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.categories).toBe(true);
  });

  it('should detect budgets as set when current month has a non-zero budget', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // No categories
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);
    // Budget exists with non-zero amount
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce({
      id: 'budget-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.budgets).toBe(true);
  });

  it('should detect assets as set when at least one non-deleted asset exists', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // No categories
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);
    // No budgets
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce(undefined);
    // Asset exists
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce({
      id: 'asset-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.assets).toBe(true);
  });

  it('should detect transactions as set when at least one non-deleted transaction exists', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // No categories
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);
    // No budgets
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce(undefined);
    // No assets
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(undefined);
    // Transaction exists
    (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce({
      id: 'txn-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.transactions).toBe(true);
  });

  it('should return all true when all steps are complete', async () => {
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce({
      id: 'meta-1',
      meta_key: 'currency',
      meta_value: 'IDR',
    });
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce({ id: 'cat-1' });
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce({ id: 'budget-1' });
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce({ id: 'asset-1' });
    (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce({ id: 'txn-1' });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.currency).toBe(true);
    expect(status.categories).toBe(true);
    expect(status.budgets).toBe(true);
    expect(status.assets).toBe(true);
    expect(status.transactions).toBe(true);
  });
});
