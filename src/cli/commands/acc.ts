import { defineCommand } from 'citty';
import {
  accountsCreateArgs,
  accountsDeleteArgs,
  accountsGetArgs,
  accountsListArgs,
  accountsUpdateArgs,
  runCreate as runAccountsCreate,
  runDelete as runAccountsDelete,
  runGet as runAccountsGet,
  runList as runAccountsList,
  runUpdate as runAccountsUpdate,
} from './accounts';

type AccHandlers = {
  add: (args: Record<string, unknown>) => Promise<unknown>;
  show: (args: Record<string, unknown>) => Promise<unknown>;
  ls: (args: Record<string, unknown>) => Promise<unknown>;
  edit: (args: Record<string, unknown>) => Promise<unknown>;
  rm: (args: Record<string, unknown>) => Promise<unknown>;
};

const defaultHandlers: AccHandlers = {
  add: runAccountsCreate,
  show: runAccountsGet,
  ls: runAccountsList,
  edit: runAccountsUpdate,
  rm: runAccountsDelete,
};

export function createAccCommand(handlers: AccHandlers = defaultHandlers) {
  return defineCommand({
    meta: {
      name: 'acc',
      description: 'Account-oriented aliases',
    },
    subCommands: {
      add: defineCommand({
        meta: { name: 'add', description: 'Alias for accounts create' },
        args: accountsCreateArgs,
        run: ({ args }) => handlers.add(args as Record<string, unknown>),
      }),
      show: defineCommand({
        meta: { name: 'show', description: 'Alias for accounts get' },
        args: accountsGetArgs,
        run: ({ args }) => handlers.show(args as Record<string, unknown>),
      }),
      ls: defineCommand({
        meta: { name: 'ls', description: 'Alias for accounts list' },
        args: accountsListArgs,
        run: ({ args }) => handlers.ls(args as Record<string, unknown>),
      }),
      edit: defineCommand({
        meta: { name: 'edit', description: 'Alias for accounts update' },
        args: accountsUpdateArgs,
        run: ({ args }) => handlers.edit(args as Record<string, unknown>),
      }),
      rm: defineCommand({
        meta: { name: 'rm', description: 'Alias for accounts delete' },
        args: accountsDeleteArgs,
        run: ({ args }) => handlers.rm(args as Record<string, unknown>),
      }),
    },
  });
}

export default createAccCommand();
