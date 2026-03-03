import { defineCommand } from 'citty';
import {
  budgetsCreateArgs,
  budgetsDeleteArgs,
  budgetsGetArgs,
  budgetsListArgs,
  budgetsUpdateArgs,
  runCreate as runBudgetsCreate,
  runDelete as runBudgetsDelete,
  runGet as runBudgetsGet,
  runList as runBudgetsList,
  runUpdate as runBudgetsUpdate,
} from './budgets';

type BdgHandlers = {
  set: (args: Record<string, unknown>) => Promise<unknown>;
  show: (args: Record<string, unknown>) => Promise<unknown>;
  ls: (args: Record<string, unknown>) => Promise<unknown>;
  edit: (args: Record<string, unknown>) => Promise<unknown>;
  rm: (args: Record<string, unknown>) => Promise<unknown>;
};

const defaultHandlers: BdgHandlers = {
  set: runBudgetsCreate,
  show: runBudgetsGet,
  ls: runBudgetsList,
  edit: runBudgetsUpdate,
  rm: runBudgetsDelete,
};

export function createBdgCommand(handlers: BdgHandlers = defaultHandlers) {
  return defineCommand({
    meta: {
      name: 'bdg',
      description: 'Budget-oriented aliases',
      hidden: true,
    },
    subCommands: {
      edit: defineCommand({
        meta: { name: 'edit', description: 'Alias for budgets update' },
        args: budgetsUpdateArgs,
        run: ({ args }) => handlers.edit(args as Record<string, unknown>),
      }),
      ls: defineCommand({
        meta: { name: 'ls', description: 'Alias for budgets list' },
        args: budgetsListArgs,
        run: ({ args }) => handlers.ls(args as Record<string, unknown>),
      }),
      rm: defineCommand({
        meta: { name: 'rm', description: 'Alias for budgets delete' },
        args: budgetsDeleteArgs,
        run: ({ args }) => handlers.rm(args as Record<string, unknown>),
      }),
      set: defineCommand({
        meta: { name: 'set', description: 'Alias for budgets create' },
        args: budgetsCreateArgs,
        run: ({ args }) => handlers.set(args as Record<string, unknown>),
      }),
      show: defineCommand({
        meta: { name: 'show', description: 'Alias for budgets get' },
        args: budgetsGetArgs,
        run: ({ args }) => handlers.show(args as Record<string, unknown>),
      }),
    },
  });
}

export default createBdgCommand();
