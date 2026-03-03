import { describe, expect, it } from 'bun:test';
import categoriesCommand, {
  runCreate,
  runDelete,
  runGet,
  runList,
  runUpdate,
  type CategoriesDeps,
  type CategoryListFilters,
} from './categories';

function createDeps(
  spies: {
    resolveTarget?: (args: Record<string, unknown>) => Promise<unknown>;
    create?: (input: unknown) => Promise<unknown>;
    findById?: (id: string, workspaceId: string) => Promise<unknown>;
    findAll?: (workspaceId: string, filters?: CategoryListFilters) => Promise<unknown>;
    update?: (id: string, workspaceId: string, updateInput: unknown) => Promise<unknown>;
    deleteCategory?: (id: string, workspaceId: string) => Promise<{ success: boolean }>;
    confirm?: (opts: { yes?: unknown; prompt?: string; expected?: string }) => Promise<void>;
    write?: (value: unknown, message: string | ((value: unknown) => string)) => void;
  } = {}
): CategoriesDeps {
  return {
    resolveTarget: spies.resolveTarget ?? (async () => undefined),
    createService: async () => ({
      create: spies.create ?? (async () => ({ id: 'cat-created' })),
      findById: spies.findById ?? (async () => ({ id: 'cat-1' })),
      findAll: spies.findAll ?? (async () => []),
      update: spies.update ?? (async () => ({ id: 'cat-1' })),
      delete: spies.deleteCategory ?? (async () => ({ success: true })),
    }),
    createOutput: () => ({
      json: false,
      write: spies.write ?? (() => undefined),
    }),
    requireDestructiveConfirmation: spies.confirm ?? (async () => undefined),
  };
}

describe('categories command mapping', () => {
  it('includes shared target/json/yes args on all leaf commands', () => {
    const command = categoriesCommand as unknown as {
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
        name: 'Food',
        type: 'expense',
      },
      deps
    );
    await runGet({ id: 'cat-1', 'workspace-id': 'ws-1' }, deps);
    await runList({ 'workspace-id': 'ws-1' }, deps);
    await runUpdate({ id: 'cat-1', 'workspace-id': 'ws-1', name: 'Housing' }, deps);
    await runDelete({ id: 'cat-1', 'workspace-id': 'ws-1', yes: true }, deps);

    expect(resolveCalls).toHaveLength(5);
  });

  it('maps create args to CategoryService.create payload', async () => {
    let payload: unknown;
    const deps = createDeps({
      create: async (input) => {
        payload = input;
        return { id: 'cat-1' };
      },
    });

    await runCreate(
      {
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        name: 'Food',
        type: 'expense',
        description: 'Meals and groceries',
        icon: 'utensils',
        color: 'bg-red-500',
      },
      deps
    );

    expect(payload).toEqual({
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
      name: 'Food',
      type: 'expense',
      description: 'Meals and groceries',
      icon: 'utensils',
      color: 'bg-red-500',
    });
  });

  it('maps list args to CategoryService.findAll filters', async () => {
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
        type: 'income',
        'is-active': false,
      },
      deps
    );

    expect(findAllCall).toEqual([
      'ws-1',
      {
        type: 'income',
        is_active: false,
      },
    ]);
  });

  it('maps update args to CategoryService.update payload', async () => {
    let updateCall: unknown[] = [];
    const deps = createDeps({
      update: async (id, workspaceId, updateInput) => {
        updateCall = [id, workspaceId, updateInput];
        return { id };
      },
    });

    await runUpdate(
      {
        id: 'cat-1',
        'workspace-id': 'ws-1',
        name: 'Updated',
        type: 'income',
        description: 'new',
        icon: 'tag',
        color: 'bg-blue-500',
        'is-active': true,
      },
      deps
    );

    expect(updateCall).toEqual([
      'cat-1',
      'ws-1',
      {
        name: 'Updated',
        type: 'income',
        description: 'new',
        icon: 'tag',
        color: 'bg-blue-500',
        is_active: true,
      },
    ]);
  });

  it('rejects invalid type before service call', async () => {
    let called = false;
    const deps = createDeps({
      create: async () => {
        called = true;
        return { id: 'cat-1' };
      },
    });

    await expect(
      runCreate(
        {
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          name: 'Bad',
          type: 'other',
        },
        deps
      )
    ).rejects.toThrow('Invalid type: other.');

    expect(called).toBe(false);
  });

  it('rejects update with empty payload', async () => {
    let called = false;
    const deps = createDeps({
      update: async () => {
        called = true;
        return { id: 'cat-1' };
      },
    });

    await expect(
      runUpdate(
        {
          id: 'cat-1',
          'workspace-id': 'ws-1',
        },
        deps
      )
    ).rejects.toThrow('No update fields provided.');
    expect(called).toBe(false);
  });

  it('handles null update result in human output mode without throwing', async () => {
    let rendered = '';
    const deps = createDeps({
      update: async () => null,
      write: (value, message) => {
        if (typeof message === 'function') {
          rendered = message(value);
        }
      },
    });

    await runUpdate(
      {
        id: 'cat-1',
        'workspace-id': 'ws-1',
        name: 'Updated',
      },
      deps
    );

    expect(rendered).toBe('Updated category ');
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
        id: 'cat-1',
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
          id: 'cat-1',
          'workspace-id': 'ws-1',
          yes: false,
        },
        deps
      )
    ).rejects.toThrow('Confirmation declined.');

    expect(events).toEqual(['confirm']);
  });
});
