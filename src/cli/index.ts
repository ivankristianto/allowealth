import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'aw',
    description: 'Allowealth CLI — manage workspaces, database, deployments, and admin tasks',
  },
  args: {
    prod: {
      type: 'boolean',
      description: 'Use production environment (.env.production)',
    },
  },
  async setup({ args }) {
    if (args.prod) {
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
    backfill: () => import('./commands/backfill').then((m) => m.default),
  },
});

runMain(main);
