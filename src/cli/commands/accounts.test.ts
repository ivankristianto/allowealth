import { describe, expect, it } from 'bun:test';
import accountsCommand, {
  runCreate,
  runDelete,
  runGet,
  runList,
  runUpdate,
  type AccountsDeps,
  type AccountListFilters,
} from './accounts';

function createDeps(
  spies: {
    resolveTarget?: (args: Record<string, unknown>) => Promise<unknown>;
    create?: (input: unknown) => Promise<unknown>;
    findById?: (id: string, workspaceId: string) => Promise<unknown>;
    findAll?: (workspaceId: string, filters?: AccountListFilters) => Promise<unknown>;
    update?: (id: string, workspaceId: string, updateInput: unknown) => Promise<unknown>;
    close?: (id: string, workspaceId: string, userId: string) => Promise<unknown>;
    confirm?: (opts: { yes?: unknown; prompt?: string; expected?: string }) => Promise<void>;
    write?: (value: unknown, message: string | ((value: unknown) => string)) => void;
  } = {}
): AccountsDeps {
  return {
    resolveTarget: spies.resolveTarget ?? (async () => undefined),
    createService: async () => ({
      create: spies.create ?? (async () => ({ id: 'acc-created' })),
      findById: spies.findById ?? (async () => ({ id: 'acc-1' })),
      findAll: spies.findAll ?? (async () => []),
      update: spies.update ?? (async () => ({ id: 'acc-1' })),
      close: spies.close ?? (async () => ({ id: 'acc-1', status: 'closed' })),
    }),
    createOutput: () => ({
      json: false,
      write: spies.write ?? (() => undefined),
    }),
    requireDestructiveConfirmation: spies.confirm ?? (async () => undefined),
  };
}

describe('accounts command mapping', () => {
  it('includes shared target/json/yes args on all leaf commands', () => {
    const command = accountsCommand as unknown as {
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
        name: 'Cash',
        type: 'cash',
        balance: '1',
        currency: 'USD',
      },
      deps
    );
    await runGet({ id: 'acc-1', 'workspace-id': 'ws-1' }, deps);
    await runList({ 'workspace-id': 'ws-1' }, deps);
    await runUpdate({ id: 'acc-1', 'workspace-id': 'ws-1', name: 'Updated' }, deps);
    await runDelete({ id: 'acc-1', 'workspace-id': 'ws-1', 'user-id': 'user-1', yes: true }, deps);

    expect(resolveCalls).toHaveLength(5);
  });

  it('maps create args to AccountService.create payload', async () => {
    let payload: unknown;
    const deps = createDeps({
      create: async (input) => {
        payload = input;
        return { id: 'acc-1' };
      },
    });

    await runCreate(
      {
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        name: 'Cash Wallet',
        type: 'cash',
        balance: '125.00',
        currency: 'USD',
        'category-id': 'cat-1',
        'credit-limit': '500.00',
        'is-cash-account': true,
      },
      deps
    );

    expect(payload).toEqual({
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
      name: 'Cash Wallet',
      type: 'cash',
      balance: '125.00',
      currency: 'USD',
      category_id: 'cat-1',
      credit_limit: '500.00',
      is_cash_account: true,
    });
  });

  it('maps get args to AccountService.findById call', async () => {
    let getCall: unknown[] = [];
    const deps = createDeps({
      findById: async (id, workspaceId) => {
        getCall = [id, workspaceId];
        return { id };
      },
    });

    await runGet(
      {
        id: 'acc-1',
        'workspace-id': 'ws-1',
      },
      deps
    );

    expect(getCall).toEqual(['acc-1', 'ws-1']);
  });

  it('maps list args to AccountService.findAll filters', async () => {
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
        type: 'cash',
        'category-id': 'cat-1',
        currency: 'USD',
        'include-inactive': true,
        'owner-user-id': 'owner-1',
      },
      deps
    );

    expect(findAllCall).toEqual([
      'ws-1',
      {
        type: 'cash',
        category_id: 'cat-1',
        currency: 'USD',
        includeInactive: true,
        owner_user_id: 'owner-1',
      },
    ]);
  });

  it('maps update args to AccountService.update payload', async () => {
    let updateCall: unknown[] = [];
    const deps = createDeps({
      update: async (id, workspaceId, updateInput) => {
        updateCall = [id, workspaceId, updateInput];
        return { id };
      },
    });

    await runUpdate(
      {
        id: 'acc-1',
        'workspace-id': 'ws-1',
        name: 'Updated account',
        balance: '99.00',
        'credit-limit': '250.00',
      },
      deps
    );

    expect(updateCall).toEqual([
      'acc-1',
      'ws-1',
      {
        name: 'Updated account',
        balance: '99.00',
        credit_limit: '250.00',
      },
    ]);
  });

  it('rejects invalid type before update service call', async () => {
    let called = false;
    const deps = createDeps({
      update: async () => {
        called = true;
        return { id: 'acc-1' };
      },
    });

    await expect(
      runUpdate(
        {
          id: 'acc-1',
          'workspace-id': 'ws-1',
          type: 'invalid',
        },
        deps
      )
    ).rejects.toThrow('Invalid type: invalid.');
    expect(called).toBe(false);
  });

  it('rejects invalid currency before update service call', async () => {
    let called = false;
    const deps = createDeps({
      update: async () => {
        called = true;
        return { id: 'acc-1' };
      },
    });

    await expect(
      runUpdate(
        {
          id: 'acc-1',
          'workspace-id': 'ws-1',
          currency: 'XYZ',
        },
        deps
      )
    ).rejects.toThrow('Invalid currency: XYZ.');
    expect(called).toBe(false);
  });

  it('rejects update with empty payload', async () => {
    let called = false;
    const deps = createDeps({
      update: async () => {
        called = true;
        return { id: 'acc-1' };
      },
    });

    await expect(
      runUpdate(
        {
          id: 'acc-1',
          'workspace-id': 'ws-1',
        },
        deps
      )
    ).rejects.toThrow('No update fields provided.');
    expect(called).toBe(false);
  });

  it('calls AccountService.close for delete and passes user-id', async () => {
    let closeCall: unknown[] = [];
    const deps = createDeps({
      close: async (id, workspaceId, userId) => {
        closeCall = [id, workspaceId, userId];
        return { id, status: 'closed' };
      },
    });

    await runDelete(
      {
        id: 'acc-1',
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        yes: true,
      },
      deps
    );

    expect(closeCall).toEqual(['acc-1', 'ws-1', 'user-1']);
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
        id: 'acc-1',
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        yes: true,
      },
      deps
    );

    expect(confirmYes).toBeTrue();
  });

  it('does not call close when destructive confirmation is rejected', async () => {
    const events: string[] = [];
    const deps = createDeps({
      confirm: async () => {
        events.push('confirm');
        throw new Error('Confirmation declined.');
      },
      close: async () => {
        events.push('close');
        return { id: 'acc-1', status: 'closed' };
      },
    });

    await expect(
      runDelete(
        {
          id: 'acc-1',
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          yes: false,
        },
        deps
      )
    ).rejects.toThrow('Confirmation declined.');

    expect(events).toEqual(['confirm']);
  });
});
