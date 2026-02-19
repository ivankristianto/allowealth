import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

function hasColumnReference(condition: unknown, columnName: string): boolean {
  const visited = new Set<unknown>();
  const stack: unknown[] = [(condition as { queryChunks?: unknown })?.queryChunks ?? condition];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || (typeof current !== 'object' && typeof current !== 'function')) {
      continue;
    }
    if (visited.has(current)) continue;
    visited.add(current);

    if ((current as { name?: unknown }).name === columnName) {
      return true;
    }

    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    if ('queryChunks' in (current as Record<string, unknown>)) {
      stack.push((current as { queryChunks?: unknown }).queryChunks);
    }
  }

  return false;
}

describe('AccountService.findAll owner_user_id filter', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should filter accounts by owner_user_id when provided', async () => {
    const ownedAccount = createMockAccount({
      id: 'account-1',
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
    });

    (mockDb.query.accounts.findMany as any).mockResolvedValue([ownedAccount]);

    const result = await accountService.findAll('ws-1', { owner_user_id: 'user-1' });

    expect(result).toEqual([ownedAccount]);
    expect(mockDb.query.accounts.findMany).toHaveBeenCalled();
  });

  it('should return all accounts when owner_user_id is not provided', async () => {
    const accounts = [
      createMockAccount({ id: 'a-1', workspace_id: 'ws-1', created_by_user_id: 'user-1' }),
      createMockAccount({ id: 'a-2', workspace_id: 'ws-1', created_by_user_id: 'user-2' }),
    ];

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);

    const result = await accountService.findAll('ws-1');

    expect(result).toHaveLength(2);
  });
});

describe('AccountService.getSnapshotForMonth owner filter', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should accept owner_user_id in filters', async () => {
    (mockDb.query.accounts.findMany as any).mockResolvedValue([]);

    const result = await accountService.getSnapshotForMonth('ws-1', 2026, 2, {
      owner_user_id: 'user-1',
    });

    expect(result).toEqual([]);
  });
});

describe('AccountService.countClosed with owner filter', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should add created_by_user_id condition when ownerUserId is provided', async () => {
    const where = mock((conditionsArg: unknown) => {
      const hasOwnerCondition = hasColumnReference(conditionsArg, 'created_by_user_id');
      return Promise.resolve([{ count: hasOwnerCondition ? 3 : 0 }]);
    });
    const from = mock(() => ({ where }));
    const select = mock(() => ({ from }));
    (mockDb as any).select = select;

    const result = await accountService.countClosed('ws-1', 'user-1');

    expect(result).toBe(3);
    expect(where).toHaveBeenCalled();
  });
});
