import { describe, expect, it } from 'bun:test';
import budgetsCommand, {
  runCreate,
  runDelete,
  runGet,
  runList,
  runUpdate,
  type BudgetsDeps,
} from './budgets';

function createDeps(
  spies: {
    resolveTarget?: (args: Record<string, unknown>) => Promise<unknown>;
    createBudget?: (input: unknown) => Promise<unknown>;
    getBudgetById?: (id: string, workspaceId: string) => Promise<unknown>;
    findAllBudgets?: (
      workspaceId: string,
      month: number,
      year: number,
      currency?: string
    ) => Promise<unknown>;
    updateBudget?: (id: string, workspaceId: string, updateInput: unknown) => Promise<unknown>;
    deleteBudget?: (id: string, workspaceId: string) => Promise<{ success: boolean }>;
    confirm?: (opts: { yes?: unknown; prompt?: string; expected?: string }) => Promise<void>;
    write?: (value: unknown, message: string | ((value: unknown) => string)) => void;
  } = {}
): BudgetsDeps {
  return {
    resolveTarget: spies.resolveTarget ?? (async () => undefined),
    createService: async () => ({
      createBudget: spies.createBudget ?? (async () => ({ id: 'bud-created' })),
      getBudgetById: spies.getBudgetById ?? (async () => ({ id: 'bud-1' })),
      findAllBudgets: spies.findAllBudgets ?? (async () => []),
      updateBudget: spies.updateBudget ?? (async () => ({ id: 'bud-1' })),
      deleteBudget: spies.deleteBudget ?? (async () => ({ success: true })),
    }),
    createOutput: () => ({
      json: false,
      write: spies.write ?? (() => undefined),
    }),
    requireDestructiveConfirmation: spies.confirm ?? (async () => undefined),
  };
}

describe('budgets command mapping', () => {
  it('includes shared target/json/yes args on all leaf commands', () => {
    const command = budgetsCommand as unknown as {
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
        'category-id': 'cat-1',
        month: 1,
        year: 2025,
        'budget-amount': '100',
        currency: 'USD',
      },
      deps
    );
    await runGet({ id: 'bud-1', 'workspace-id': 'ws-1' }, deps);
    await runList({ 'workspace-id': 'ws-1', month: 1, year: 2025 }, deps);
    await runUpdate({ id: 'bud-1', 'workspace-id': 'ws-1', notes: 'x' }, deps);
    await runDelete({ id: 'bud-1', 'workspace-id': 'ws-1', yes: true }, deps);

    expect(resolveCalls).toHaveLength(5);
  });

  it('maps create args to BudgetService.createBudget payload', async () => {
    let payload: unknown;
    const deps = createDeps({
      createBudget: async (input) => {
        payload = input;
        return { id: 'bud-1' };
      },
    });

    await runCreate(
      {
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        'category-id': 'cat-1',
        month: 3,
        year: 2025,
        'budget-amount': '500.00',
        currency: 'USD',
        notes: 'March budget',
      },
      deps
    );

    expect(payload).toEqual({
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
      category_id: 'cat-1',
      month: 3,
      year: 2025,
      budget_amount: '500.00',
      currency: 'USD',
      notes: 'March budget',
    });
  });

  it('maps get args to BudgetService.getBudgetById call', async () => {
    let getCall: unknown[] = [];
    const deps = createDeps({
      getBudgetById: async (id, workspaceId) => {
        getCall = [id, workspaceId];
        return { id };
      },
    });

    await runGet(
      {
        id: 'bud-1',
        'workspace-id': 'ws-1',
      },
      deps
    );

    expect(getCall).toEqual(['bud-1', 'ws-1']);
  });

  it('maps list args to BudgetService.findAllBudgets parameters', async () => {
    let listCall: unknown[] = [];
    const deps = createDeps({
      findAllBudgets: async (workspaceId, month, year, currency) => {
        listCall = [workspaceId, month, year, currency];
        return [];
      },
    });

    await runList(
      {
        'workspace-id': 'ws-1',
        month: 4,
        year: 2026,
        currency: 'EUR',
      },
      deps
    );

    expect(listCall).toEqual(['ws-1', 4, 2026, 'EUR']);
  });

  it('parses CLI-like string month/year inputs for list', async () => {
    let listCall: unknown[] = [];
    const deps = createDeps({
      findAllBudgets: async (workspaceId, month, year, currency) => {
        listCall = [workspaceId, month, year, currency];
        return [];
      },
    });

    await runList(
      {
        'workspace-id': 'ws-1',
        month: '4',
        year: '2026',
        currency: 'EUR',
      },
      deps
    );

    expect(listCall).toEqual(['ws-1', 4, 2026, 'EUR']);
  });

  it('rejects invalid currency for create with clear error', async () => {
    const deps = createDeps();

    await expect(
      runCreate(
        {
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          'category-id': 'cat-1',
          month: 3,
          year: 2025,
          'budget-amount': '500.00',
          currency: 'BAD',
        },
        deps
      )
    ).rejects.toThrow('Invalid currency: expected one of');
  });

  it('rejects invalid currency for list with clear error', async () => {
    const deps = createDeps();

    await expect(
      runList(
        {
          'workspace-id': 'ws-1',
          month: 4,
          year: 2026,
          currency: 'BAD',
        },
        deps
      )
    ).rejects.toThrow('Invalid currency: expected one of');
  });

  it('validates list month/year bounds with clear errors', async () => {
    const deps = createDeps();

    await expect(
      runList(
        {
          'workspace-id': 'ws-1',
          month: 13,
          year: 2026,
        },
        deps
      )
    ).rejects.toThrow('Invalid month: expected an integer between 1 and 12');

    await expect(
      runList(
        {
          'workspace-id': 'ws-1',
          month: 4,
          year: 1999,
        },
        deps
      )
    ).rejects.toThrow('Invalid year: expected an integer between 2000 and 2100');
  });

  it('maps update args to BudgetService.updateBudget payload', async () => {
    let updateCall: unknown[] = [];
    const deps = createDeps({
      updateBudget: async (id, workspaceId, updateInput) => {
        updateCall = [id, workspaceId, updateInput];
        return { id };
      },
    });

    await runUpdate(
      {
        id: 'bud-1',
        'workspace-id': 'ws-1',
        'budget-amount': '700.00',
        notes: 'updated',
        'is-closed': true,
      },
      deps
    );

    expect(updateCall).toEqual([
      'bud-1',
      'ws-1',
      {
        budget_amount: '700.00',
        notes: 'updated',
        is_closed: true,
      },
    ]);
  });

  it('rejects update with empty payload', async () => {
    let called = false;
    const deps = createDeps({
      updateBudget: async () => {
        called = true;
        return { id: 'bud-1' };
      },
    });

    await expect(
      runUpdate(
        {
          id: 'bud-1',
          'workspace-id': 'ws-1',
        },
        deps
      )
    ).rejects.toThrow('No update fields provided.');
    expect(called).toBe(false);
  });

  it('does not call deleteBudget when confirmation is rejected', async () => {
    const events: string[] = [];
    const deps = createDeps({
      confirm: async () => {
        events.push('confirm');
        throw new Error('Confirmation declined.');
      },
      deleteBudget: async () => {
        events.push('delete');
        return { success: true };
      },
    });

    await expect(
      runDelete(
        {
          id: 'bud-1',
          'workspace-id': 'ws-1',
          yes: false,
        },
        deps
      )
    ).rejects.toThrow('Confirmation declined.');

    expect(events).toEqual(['confirm']);
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
        id: 'bud-1',
        'workspace-id': 'ws-1',
        yes: true,
      },
      deps
    );

    expect(confirmYes).toBeTrue();
  });
});
