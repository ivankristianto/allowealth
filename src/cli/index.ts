import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'aw',
    description: 'Allowealth CLI — manage workspaces, database, deployments, and admin tasks',
  },
  args: {
    target: {
      type: 'string',
      description: 'Database target: sqlite (default), d1, d1-local, postgres',
      default: 'sqlite',
    },
  },
  async setup({ args }) {
    const { validateTarget } = await import('./lib/target');
    const target = validateTarget(args.target as string);
    process.env.AW_TARGET = target;

    if (target === 'postgres') {
      const { loadEnvFile } = await import('./lib/env-loader');
      loadEnvFile('.env.production');
    }
  },
  subCommands: {
    workspace: () => import('./commands/workspace').then((m) => m.default),
    db: () => import('./commands/db').then((m) => m.default),
    admin: () => import('./commands/admin').then((m) => m.default),
    deploy: () => import('./commands/deploy').then((m) => m.default),
    mcp: () => import('./commands/mcp').then((m) => m.default),
    release: () => import('./commands/release').then((m) => m.default),
  },
});

runMain(main);
