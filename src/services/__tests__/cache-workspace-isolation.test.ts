import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { CategoryService } from '../category.service';

const WORKSPACE_A = 'ws-a';
const WORKSPACE_B = 'ws-b';

describe('cache invalidation stays inside the writing workspace', () => {
  let memory: MemoryDb;
  let service: CategoryService;

  beforeEach(() => {
    resetCacheManager();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, WORKSPACE_A, 'user-a');
    seedWorkspaceOwner(memory.raw, WORKSPACE_B, 'user-b');
    service = new CategoryService(memory.db);
  });

  it("keeps workspace B's cached categories when workspace A writes", async () => {
    await service.findAll(WORKSPACE_B);
    // Written behind the service's back, so only a cache flush can make it visible.
    memory.raw.run(
      `INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type)
       VALUES ('cat-b-raw', ?, 'user-b', 'Raw B', 'expense')`,
      [WORKSPACE_B]
    );

    await service.create({
      workspace_id: WORKSPACE_A,
      created_by_user_id: 'user-a',
      name: 'Groceries',
      type: 'expense',
    });

    const workspaceB = await service.findAll(WORKSPACE_B);
    const workspaceA = await service.findAll(WORKSPACE_A);
    expect(workspaceB.map((c) => c.id)).not.toContain('cat-b-raw');
    expect(workspaceA.map((c) => c.name)).toContain('Groceries');
  });
});
