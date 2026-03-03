import { defineCommand } from 'citty';
import {
  transactionsCreateArgs,
  transactionsDeleteArgs,
  transactionsGetArgs,
  transactionsListArgs,
  transactionsUpdateArgs,
  runCreate as runTransactionsCreate,
  runDelete as runTransactionsDelete,
  runGet as runTransactionsGet,
  runList as runTransactionsList,
  runUpdate as runTransactionsUpdate,
} from './transactions';

type TxHandlers = {
  add: (args: Record<string, unknown>) => Promise<unknown>;
  show: (args: Record<string, unknown>) => Promise<unknown>;
  ls: (args: Record<string, unknown>) => Promise<unknown>;
  edit: (args: Record<string, unknown>) => Promise<unknown>;
  rm: (args: Record<string, unknown>) => Promise<unknown>;
};

const defaultHandlers: TxHandlers = {
  add: runTransactionsCreate,
  show: runTransactionsGet,
  ls: runTransactionsList,
  edit: runTransactionsUpdate,
  rm: runTransactionsDelete,
};

export function createTxCommand(handlers: TxHandlers = defaultHandlers) {
  return defineCommand({
    meta: {
      name: 'tx',
      description: 'Transaction-oriented aliases',
      hidden: true,
    },
    subCommands: {
      add: defineCommand({
        meta: { name: 'add', description: 'Alias for transactions create' },
        args: transactionsCreateArgs,
        run: ({ args }) => handlers.add(args as Record<string, unknown>),
      }),
      edit: defineCommand({
        meta: { name: 'edit', description: 'Alias for transactions update' },
        args: transactionsUpdateArgs,
        run: ({ args }) => handlers.edit(args as Record<string, unknown>),
      }),
      ls: defineCommand({
        meta: { name: 'ls', description: 'Alias for transactions list' },
        args: transactionsListArgs,
        run: ({ args }) => handlers.ls(args as Record<string, unknown>),
      }),
      rm: defineCommand({
        meta: { name: 'rm', description: 'Alias for transactions delete' },
        args: transactionsDeleteArgs,
        run: ({ args }) => handlers.rm(args as Record<string, unknown>),
      }),
      show: defineCommand({
        meta: { name: 'show', description: 'Alias for transactions get' },
        args: transactionsGetArgs,
        run: ({ args }) => handlers.show(args as Record<string, unknown>),
      }),
    },
  });
}

export default createTxCommand();
