import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'aw',
    description: 'Allowealth CLI — manage workspaces, database, deployments, and admin tasks',
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
