import { describe, expect, it } from 'bun:test';
import { createTxCommand } from './tx';
import { createAccCommand } from './acc';
import { createBdgCommand } from './bdg';
import {
  transactionsCreateArgs,
  transactionsDeleteArgs,
  transactionsGetArgs,
  transactionsListArgs,
  transactionsUpdateArgs,
} from './transactions';
import {
  accountsCreateArgs,
  accountsDeleteArgs,
  accountsGetArgs,
  accountsListArgs,
  accountsUpdateArgs,
} from './accounts';
import {
  budgetsCreateArgs,
  budgetsDeleteArgs,
  budgetsGetArgs,
  budgetsListArgs,
  budgetsUpdateArgs,
} from './budgets';

type CommandLike = {
  subCommands: Record<
    string,
    {
      args: unknown;
      run: (ctx: { args: Record<string, unknown> }) => Promise<unknown>;
    }
  >;
};

async function runAlias(command: CommandLike, action: string, args: Record<string, unknown>) {
  await command.subCommands[action].run({ args });
}

describe('task-oriented aliases', () => {
  it('maps tx aliases to transactions handlers', async () => {
    const calls: string[] = [];
    const command = createTxCommand({
      add: async () => {
        calls.push('create');
      },
      show: async () => {
        calls.push('get');
      },
      ls: async () => {
        calls.push('list');
      },
      edit: async () => {
        calls.push('update');
      },
      rm: async () => {
        calls.push('delete');
      },
    }) as unknown as CommandLike;

    expect(Object.keys(command.subCommands)).toEqual(['add', 'edit', 'ls', 'rm', 'show']);

    await runAlias(command, 'add', {});
    await runAlias(command, 'show', {});
    await runAlias(command, 'ls', {});
    await runAlias(command, 'edit', {});
    await runAlias(command, 'rm', {});

    expect(calls).toEqual(['create', 'get', 'list', 'update', 'delete']);
  });

  it('maps acc aliases to accounts handlers', async () => {
    const calls: string[] = [];
    const command = createAccCommand({
      add: async () => {
        calls.push('create');
      },
      show: async () => {
        calls.push('get');
      },
      ls: async () => {
        calls.push('list');
      },
      edit: async () => {
        calls.push('update');
      },
      rm: async () => {
        calls.push('delete');
      },
    }) as unknown as CommandLike;

    expect(Object.keys(command.subCommands)).toEqual(['add', 'edit', 'ls', 'rm', 'show']);

    await runAlias(command, 'add', {});
    await runAlias(command, 'show', {});
    await runAlias(command, 'ls', {});
    await runAlias(command, 'edit', {});
    await runAlias(command, 'rm', {});

    expect(calls).toEqual(['create', 'get', 'list', 'update', 'delete']);
  });

  it('maps bdg aliases to budgets handlers', async () => {
    const calls: string[] = [];
    const command = createBdgCommand({
      set: async () => {
        calls.push('create');
      },
      show: async () => {
        calls.push('get');
      },
      ls: async () => {
        calls.push('list');
      },
      edit: async () => {
        calls.push('update');
      },
      rm: async () => {
        calls.push('delete');
      },
    }) as unknown as CommandLike;

    expect(Object.keys(command.subCommands)).toEqual(['edit', 'ls', 'rm', 'set', 'show']);

    await runAlias(command, 'set', {});
    await runAlias(command, 'show', {});
    await runAlias(command, 'ls', {});
    await runAlias(command, 'edit', {});
    await runAlias(command, 'rm', {});

    expect(calls).toEqual(['create', 'get', 'list', 'update', 'delete']);
  });

  it('delegates original args through each alias handler', async () => {
    const argSamples: Record<string, unknown>[] = [];
    const command = createTxCommand({
      add: async (args) => {
        argSamples.push(args);
      },
      show: async (args) => {
        argSamples.push(args);
      },
      ls: async (args) => {
        argSamples.push(args);
      },
      edit: async (args) => {
        argSamples.push(args);
      },
      rm: async (args) => {
        argSamples.push(args);
      },
    }) as unknown as CommandLike;

    const payload = { id: 'x-1', 'workspace-id': 'ws-1', marker: true };
    await runAlias(command, 'add', payload);
    await runAlias(command, 'show', payload);
    await runAlias(command, 'ls', payload);
    await runAlias(command, 'edit', payload);
    await runAlias(command, 'rm', payload);

    expect(argSamples).toEqual([payload, payload, payload, payload, payload]);
  });

  it('delegates original args through each acc alias handler', async () => {
    const argSamples: Record<string, unknown>[] = [];
    const command = createAccCommand({
      add: async (args) => {
        argSamples.push(args);
      },
      show: async (args) => {
        argSamples.push(args);
      },
      ls: async (args) => {
        argSamples.push(args);
      },
      edit: async (args) => {
        argSamples.push(args);
      },
      rm: async (args) => {
        argSamples.push(args);
      },
    }) as unknown as CommandLike;

    const payload = { id: 'a-1', 'workspace-id': 'ws-1', marker: true };
    await runAlias(command, 'add', payload);
    await runAlias(command, 'show', payload);
    await runAlias(command, 'ls', payload);
    await runAlias(command, 'edit', payload);
    await runAlias(command, 'rm', payload);

    expect(argSamples).toEqual([payload, payload, payload, payload, payload]);
  });

  it('delegates original args through each bdg alias handler', async () => {
    const argSamples: Record<string, unknown>[] = [];
    const command = createBdgCommand({
      set: async (args) => {
        argSamples.push(args);
      },
      show: async (args) => {
        argSamples.push(args);
      },
      ls: async (args) => {
        argSamples.push(args);
      },
      edit: async (args) => {
        argSamples.push(args);
      },
      rm: async (args) => {
        argSamples.push(args);
      },
    }) as unknown as CommandLike;

    const payload = { id: 'b-1', 'workspace-id': 'ws-1', marker: true };
    await runAlias(command, 'set', payload);
    await runAlias(command, 'show', payload);
    await runAlias(command, 'ls', payload);
    await runAlias(command, 'edit', payload);
    await runAlias(command, 'rm', payload);

    expect(argSamples).toEqual([payload, payload, payload, payload, payload]);
  });

  it('reuses canonical transactions args objects in tx aliases', () => {
    const command = createTxCommand() as unknown as CommandLike;
    expect(command.subCommands.add.args).toBe(transactionsCreateArgs);
    expect(command.subCommands.show.args).toBe(transactionsGetArgs);
    expect(command.subCommands.ls.args).toBe(transactionsListArgs);
    expect(command.subCommands.edit.args).toBe(transactionsUpdateArgs);
    expect(command.subCommands.rm.args).toBe(transactionsDeleteArgs);
  });

  it('reuses canonical accounts args objects in acc aliases', () => {
    const command = createAccCommand() as unknown as CommandLike;
    expect(command.subCommands.add.args).toBe(accountsCreateArgs);
    expect(command.subCommands.show.args).toBe(accountsGetArgs);
    expect(command.subCommands.ls.args).toBe(accountsListArgs);
    expect(command.subCommands.edit.args).toBe(accountsUpdateArgs);
    expect(command.subCommands.rm.args).toBe(accountsDeleteArgs);
  });

  it('reuses canonical budgets args objects in bdg aliases', () => {
    const command = createBdgCommand() as unknown as CommandLike;
    expect(command.subCommands.set.args).toBe(budgetsCreateArgs);
    expect(command.subCommands.show.args).toBe(budgetsGetArgs);
    expect(command.subCommands.ls.args).toBe(budgetsListArgs);
    expect(command.subCommands.edit.args).toBe(budgetsUpdateArgs);
    expect(command.subCommands.rm.args).toBe(budgetsDeleteArgs);
  });

  it('marks alias command groups as hidden in top-level help', () => {
    const tx = createTxCommand() as unknown as { meta?: { hidden?: boolean } };
    const acc = createAccCommand() as unknown as { meta?: { hidden?: boolean } };
    const bdg = createBdgCommand() as unknown as { meta?: { hidden?: boolean } };

    expect(tx.meta?.hidden).toBeTrue();
    expect(acc.meta?.hidden).toBeTrue();
    expect(bdg.meta?.hidden).toBeTrue();
  });
});
