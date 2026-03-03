import { describe, expect, it } from 'bun:test';
import accountCategoriesCommand, {
  runCreate,
  runDelete,
  runGet,
  runList,
  runUpdate,
  type AccountCategoriesDeps,
  type AccountCategoryListFilters,
} from './account-categories';

function createDeps(
  spies: {
    resolveTarget?: (args: Record<string, unknown>) => Promise<unknown>;
    create?: (input: unknown) => Promise<unknown>;
    findById?: (id: string, workspaceId: string) => Promise<unknown>;
    findAll?: (workspaceId: string, filters?: AccountCategoryListFilters) => Promise<unknown>;
    update?: (id: string, workspaceId: string, updateInput: unknown) => Promise<unknown>;
    deleteCategory?: (id: string, workspaceId: string) => Promise<{ success: boolean }>;
    confirm?: (opts: { yes?: unknown; prompt?: string; expected?: string }) => Promise<void>;
    write?: (value: unknown, message: string | ((value: unknown) => string)) => void;
  } = {}
): AccountCategoriesDeps {
  return {
    resolveTarget: spies.resolveTarget ?? (async () => undefined),
    createService: async () => ({
      create: spies.create ?? (async () => ({ id: 'acat-created' })),
      findById: spies.findById ?? (async () => ({ id: 'acat-1' })),
      findAll: spies.findAll ?? (async () => []),
      update: spies.update ?? (async () => ({ id: 'acat-1' })),
      delete: spies.deleteCategory ?? (async () => ({ success: true })),
    }),
    createOutput: () => ({
      json: false,
      write: spies.write ?? (() => undefined),
    }),
    requireDestructiveConfirmation: spies.confirm ?? (async () => undefined),
  };
}

describe('account-categories command mapping', () => {
  it('includes shared target/json/yes args on all leaf commands', () => {
    const command = accountCategoriesCommand as unknown as {
      subCommands: Record<string, { args: Record<string, unknown> }>;
    };

    for (const leaf of Object.values(command.subCommands)) {
      expect(leaf.args.target).toBeDefined();
      expect((leaf.args.target as { alias?: string }).alias).toBe('t');
      expect(leaf.args.json).toBeDefined();
      expect(leaf.args.yes).toBeDefined();
    }
  });

  it('calls resolveTarget in every run path', async () => {
    const resolveCalls: string[] = [];
    const deps = createDeps({
      resolveTarget: async () => {
        resolveCalls.push('called');
      },
    });

    await runCreate(
      {
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        name: 'Savings',
        'is-liability': false,
      },
      deps
    );
    await runGet({ id: 'acat-1', 'workspace-id': 'ws-1' }, deps);
    await runList({ 'workspace-id': 'ws-1' }, deps);
    await runUpdate({ id: 'acat-1', 'workspace-id': 'ws-1', name: 'Updated' }, deps);
    await runDelete({ id: 'acat-1', 'workspace-id': 'ws-1', yes: true }, deps);

    expect(resolveCalls).toHaveLength(5);
  });

  it('maps create args to AccountCategoryService.create payload', async () => {
    let payload: unknown;
    const deps = createDeps({
      create: async (input) => {
        payload = input;
        return { id: 'acat-1' };
      },
    });

    await runCreate(
      {
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        name: 'Savings',
        description: 'Savings buckets',
        'is-liability': false,
        'sort-order': '3',
      },
      deps
    );

    expect(payload).toEqual({
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
      name: 'Savings',
      description: 'Savings buckets',
      is_liability: false,
      is_system: false,
      sort_order: 3,
    });
  });

  it('maps list args to AccountCategoryService.findAll filters', async () => {
    let findAllCall: unknown[] = [];
    const deps = createDeps({
      findAll: async (workspaceId, filters) => {
        findAllCall = [workspaceId, filters];
        return [];
      },
    });

    await runList(
      {
        'workspace-id': 'ws-1',
        'is-liability': true,
        'is-system': false,
      },
      deps
    );

    expect(findAllCall).toEqual([
      'ws-1',
      {
        is_liability: true,
        is_system: false,
      },
    ]);
  });

  it('maps update args to AccountCategoryService.update payload', async () => {
    let updateCall: unknown[] = [];
    const deps = createDeps({
      update: async (id, workspaceId, updateInput) => {
        updateCall = [id, workspaceId, updateInput];
        return { id };
      },
    });

    await runUpdate(
      {
        id: 'acat-1',
        'workspace-id': 'ws-1',
        name: 'Updated',
        description: 'new',
        'is-liability': true,
        'sort-order': 8,
      },
      deps
    );

    expect(updateCall).toEqual([
      'acat-1',
      'ws-1',
      {
        name: 'Updated',
        description: 'new',
        is_liability: true,
        sort_order: 8,
      },
    ]);
  });

  it('rejects invalid sort-order before service call', async () => {
    let called = false;
    const deps = createDeps({
      create: async () => {
        called = true;
        return { id: 'acat-1' };
      },
    });

    await expect(
      runCreate(
        {
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          name: 'Bad',
          'is-liability': false,
          'sort-order': '-1',
        },
        deps
      )
    ).rejects.toThrow('Invalid sort-order: expected a non-negative integer');

    expect(called).toBe(false);
  });

  it('rejects update with empty payload', async () => {
    let called = false;
    const deps = createDeps({
      update: async () => {
        called = true;
        return { id: 'acat-1' };
      },
    });

    await expect(
      runUpdate(
        {
          id: 'acat-1',
          'workspace-id': 'ws-1',
        },
        deps
      )
    ).rejects.toThrow('No update fields provided.');
    expect(called).toBe(false);
  });

  it('passes yes flag into destructive confirmation', async () => {
    let confirmYes: unknown;
    const deps = createDeps({
      confirm: async (opts) => {
        confirmYes = opts.yes;
      },
    });

    await runDelete(
      {
        id: 'acat-1',
        'workspace-id': 'ws-1',
        yes: true,
      },
      deps
    );

    expect(confirmYes).toBeTrue();
  });

  it('does not call delete when confirmation is rejected', async () => {
    const events: string[] = [];
    const deps = createDeps({
      confirm: async () => {
        events.push('confirm');
        throw new Error('Confirmation declined.');
      },
      deleteCategory: async () => {
        events.push('delete');
        return { success: true };
      },
    });

    await expect(
      runDelete(
        {
          id: 'acat-1',
          'workspace-id': 'ws-1',
          yes: false,
        },
        deps
      )
    ).rejects.toThrow('Confirmation declined.');

    expect(events).toEqual(['confirm']);
  });
});
