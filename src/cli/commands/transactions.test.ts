import { describe, expect, it } from 'bun:test';
import transactionsCommand, {
  runCreate,
  runDelete,
  runGet,
  runList,
  runUpdate,
  type TransactionsDeps,
} from './transactions';
import type { TransactionFilters } from '@/services/transaction.service';

function createDeps(
  spies: {
    resolveTarget?: (args: Record<string, unknown>) => Promise<unknown>;
    create?: (input: unknown) => Promise<unknown>;
    findById?: (id: string, workspaceId: string) => Promise<unknown>;
    findAll?: (filters: TransactionFilters) => Promise<unknown>;
    update?: (
      id: string,
      workspaceId: string,
      updateData: unknown,
      userId?: string
    ) => Promise<unknown>;
    delete?: (id: string, workspaceId: string, userId?: string) => Promise<{ success: true }>;
    confirm?: (opts: { yes?: unknown; prompt?: string; expected?: string }) => Promise<void>;
    write?: (value: unknown, message: string | ((value: unknown) => string)) => void;
  } = {}
): TransactionsDeps {
  return {
    resolveTarget: spies.resolveTarget ?? (async () => undefined),
    createService: async () => ({
      create: spies.create ?? (async () => ({ id: 'txn-created' })),
      findById: spies.findById ?? (async () => ({ id: 'txn-1' })),
      findAll: spies.findAll ?? (async () => []),
      update: spies.update ?? (async () => ({ id: 'txn-1' })),
      delete: spies.delete ?? (async () => ({ success: true })),
    }),
    createOutput: () => ({
      json: false,
      write: spies.write ?? (() => undefined),
    }),
    requireDestructiveConfirmation: spies.confirm ?? (async () => undefined),
  };
}

describe('transactions command mapping', () => {
  it('includes shared target/json/yes args on all leaf commands', () => {
    const command = transactionsCommand as unknown as {
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
        type: 'expense',
        amount: '1',
        currency: 'USD',
        'account-id': 'acc-1',
      },
      deps
    );
    await runGet({ id: 'txn-1', 'workspace-id': 'ws-1' }, deps);
    await runList({ 'workspace-id': 'ws-1' }, deps);
    await runUpdate(
      { id: 'txn-1', 'workspace-id': 'ws-1', 'user-id': 'user-1', amount: '2' },
      deps
    );
    await runDelete({ id: 'txn-1', 'workspace-id': 'ws-1', 'user-id': 'user-1', yes: true }, deps);

    expect(resolveCalls).toHaveLength(5);
  });

  it('maps create args to TransactionService.create payload', async () => {
    let payload: unknown;
    const deps = createDeps({
      create: async (input) => {
        payload = input;
        return { id: 'txn-1' };
      },
    });

    await runCreate(
      {
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        type: 'expense',
        amount: '12.50',
        currency: 'USD',
        'category-id': 'cat-1',
        'account-id': 'acc-1',
        'to-account-id': 'acc-2',
        'transaction-date': '2024-03-02',
        description: 'Coffee',
      },
      deps
    );

    expect(payload).toEqual({
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
      type: 'expense',
      amount: '12.50',
      currency: 'USD',
      category_id: 'cat-1',
      account_id: 'acc-1',
      to_account_id: 'acc-2',
      transaction_date: new Date('2024-03-02T00:00:00.000Z'),
      description: 'Coffee',
    });
  });

  it('maps list args to TransactionService.findAll filters', async () => {
    let filters: TransactionFilters | undefined;
    const deps = createDeps({
      findAll: async (inputFilters) => {
        filters = inputFilters;
        return [];
      },
    });

    await runList(
      {
        'workspace-id': 'ws-1',
        type: 'income',
        'category-id': 'cat-1',
        'account-id': 'acc-1',
        'user-id': 'user-1',
        currency: 'USD',
        'start-date': '2024-01-01',
        'end-date': '2024-01-31',
        search: 'salary',
        'include-deleted': true,
        limit: 20,
        offset: 5,
      },
      deps
    );

    expect(filters).toEqual({
      workspace_id: 'ws-1',
      type: 'income',
      category_id: 'cat-1',
      account_id: 'acc-1',
      created_by_user_id: 'user-1',
      currency: 'USD',
      start_date: new Date('2024-01-01T00:00:00.000Z'),
      end_date: new Date('2024-01-31T00:00:00.000Z'),
      search: 'salary',
      include_deleted: true,
      limit: 20,
      offset: 5,
    });
  });

  it('passes update args and user identity to TransactionService.update', async () => {
    let updateCall: unknown[] = [];
    const deps = createDeps({
      update: async (id, workspaceId, updateData, userId) => {
        updateCall = [id, workspaceId, updateData, userId];
        return { id };
      },
    });

    await runUpdate(
      {
        id: 'txn-1',
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        amount: '44.00',
        'transaction-date': '2024-03-10',
      },
      deps
    );

    expect(updateCall).toEqual([
      'txn-1',
      'ws-1',
      {
        amount: '44.00',
        transaction_date: new Date('2024-03-10T00:00:00.000Z'),
      },
      'user-1',
    ]);
  });

  it('requires delete confirmation before invoking service.delete', async () => {
    const events: string[] = [];
    const deps = createDeps({
      confirm: async () => {
        events.push('confirm');
      },
      delete: async () => {
        events.push('delete');
        return { success: true };
      },
    });

    await runDelete(
      {
        id: 'txn-1',
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        yes: false,
      },
      deps
    );

    expect(events).toEqual(['confirm', 'delete']);
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
        id: 'txn-1',
        'workspace-id': 'ws-1',
        'user-id': 'user-1',
        yes: true,
      },
      deps
    );

    expect(confirmYes).toBeTrue();
  });

  it('throws clear error for invalid date input', async () => {
    const deps = createDeps();

    await expect(
      runCreate(
        {
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          type: 'expense',
          amount: '12.50',
          currency: 'USD',
          'account-id': 'acc-1',
          'transaction-date': '2024-02-31',
        },
        deps
      )
    ).rejects.toThrow('Invalid transaction-date: expected valid YYYY-MM-DD date');
  });

  it('does not call service.delete when confirmation is rejected', async () => {
    const events: string[] = [];
    const deps = createDeps({
      confirm: async () => {
        events.push('confirm');
        throw new Error('Confirmation rejected');
      },
      delete: async () => {
        events.push('delete');
        return { success: true };
      },
    });

    await expect(
      runDelete(
        {
          id: 'txn-1',
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          yes: false,
        },
        deps
      )
    ).rejects.toThrow('Confirmation rejected');

    expect(events).toEqual(['confirm']);
  });

  it('propagates service errors from update operation', async () => {
    const deps = createDeps({
      update: async () => {
        throw new Error('update failed');
      },
    });

    await expect(
      runUpdate(
        {
          id: 'txn-1',
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          amount: '10.00',
        },
        deps
      )
    ).rejects.toThrow('update failed');
  });

  it('rejects empty update payload before invoking service.update', async () => {
    let updateCalled = false;
    const deps = createDeps({
      update: async () => {
        updateCalled = true;
        return { id: 'txn-1' };
      },
    });

    await expect(
      runUpdate(
        {
          id: 'txn-1',
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
        },
        deps
      )
    ).rejects.toThrow('No update fields provided. Provide at least one mutable field.');

    expect(updateCalled).toBeFalse();
  });

  it('throws clear error for invalid transaction type in create', async () => {
    const deps = createDeps();

    await expect(
      runCreate(
        {
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          type: 'invalid',
          amount: '12.50',
          currency: 'USD',
          'account-id': 'acc-1',
        },
        deps
      )
    ).rejects.toThrow('Invalid type: invalid.');
  });

  it('throws clear error for invalid currency in update', async () => {
    const deps = createDeps();

    await expect(
      runUpdate(
        {
          id: 'txn-1',
          'workspace-id': 'ws-1',
          'user-id': 'user-1',
          currency: 'XYZ',
        },
        deps
      )
    ).rejects.toThrow('Invalid currency: XYZ.');
  });

  it('throws clear error for invalid type in list filters', async () => {
    const deps = createDeps();

    await expect(
      runList(
        {
          'workspace-id': 'ws-1',
          type: 'invalid',
        },
        deps
      )
    ).rejects.toThrow('Invalid type: invalid.');
  });
});
