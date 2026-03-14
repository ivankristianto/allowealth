import { defineCommand, runMain } from 'citty';
import { normalizeTargetArgv, targetArg, validateTarget } from './lib/target';

// Normalize `--target d1` → `--target=d1` before citty parses argv.
// Citty treats the first non-flag token as a subcommand name, so space-separated
// values like `--target d1 db migrate` would interpret "d1" as a subcommand.
normalizeTargetArgv();

const main = defineCommand({
  meta: {
    name: 'aw',
    description: 'Allowealth CLI — manage workspaces, database, deployments, and admin tasks',
  },
  args: {
    target: targetArg,
  },
  async setup({ args }) {
    const target = validateTarget(args.target as string);

    // Only set AW_TARGET for non-default targets so leaf commands
    // can still override via their own --target arg.
    if (target !== 'sqlite') {
      process.env.AW_TARGET = target;

      if (target === 'd1') {
        const { loadEnvFile } = await import('./lib/env-loader');
        loadEnvFile('.env.production');
      }

      if (target === 'd1' || target === 'd1-local') {
        process.env.D1_ENABLED = 'true';
      }
    }
  },
  subCommands: {
    acc: () => import('./commands/acc').then((m) => m.default),
    'account-categories': () => import('./commands/account-categories').then((m) => m.default),
    accounts: () => import('./commands/accounts').then((m) => m.default),
    admin: () => import('./commands/admin').then((m) => m.default),
    bdg: () => import('./commands/bdg').then((m) => m.default),
    budgets: () => import('./commands/budgets').then((m) => m.default),
    categories: () => import('./commands/categories').then((m) => m.default),
    db: () => import('./commands/db').then((m) => m.default),
    demo: () => import('./commands/demo').then((m) => m.default),
    deploy: () => import('./commands/deploy').then((m) => m.default),
    mcp: () => import('./commands/mcp').then((m) => m.default),
    recurring: () => import('./commands/recurring').then((m) => m.default),
    release: () => import('./commands/release').then((m) => m.default),
    transactions: () => import('./commands/transactions').then((m) => m.default),
    tx: () => import('./commands/tx').then((m) => m.default),
    workspace: () => import('./commands/workspace').then((m) => m.default),
  },
});

runMain(main);
