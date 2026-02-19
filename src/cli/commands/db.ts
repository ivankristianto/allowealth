/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'db', description: 'Database management commands' },
  subCommands: {
    migrate: defineCommand({
      meta: { name: 'migrate', description: 'Apply pending database migrations' },
      args: {
        d1: {
          type: 'boolean',
          description: 'Migrate Cloudflare D1 database instead of local/Postgres',
        },
        local: {
          type: 'boolean',
          description: 'Target local D1 instead of remote (only with --d1)',
        },
      },
      async run({ args }) {
        if (args.d1) {
          const { migrateD1 } = await import('../lib/d1-migrate');
          await migrateD1({ local: Boolean(args.local) });
        } else {
          exec('drizzle-kit', ['migrate']);
        }
      },
    }),
    generate: defineCommand({
      meta: { name: 'generate', description: 'Generate migration from schema changes' },
      run() {
        exec('drizzle-kit', ['generate']);
      },
    }),
    push: defineCommand({
      meta: { name: 'push', description: 'Push schema directly to database (dev only)' },
      run() {
        exec('drizzle-kit', ['push']);
      },
    }),
    studio: defineCommand({
      meta: { name: 'studio', description: 'Open Drizzle Studio visual DB browser' },
      run() {
        exec('drizzle-kit', ['studio']);
      },
    }),
    seed: defineCommand({
      meta: { name: 'seed', description: 'Seed database with demo data' },
      run() {
        exec('bun', ['run', 'src/db/seed.ts']);
      },
    }),
    reset: defineCommand({
      meta: { name: 'reset', description: 'Delete SQLite DB, push schema, and seed (dev only)' },
      run() {
        console.log('Resetting database...');
        exec('rm', ['-f', 'db/.dev.db', 'db/.dev.db-wal', 'db/.dev.db-shm']);
        exec('mkdir', ['-p', 'db']);
        exec('drizzle-kit', ['push', '--force']);
        exec('bun', ['run', 'src/db/seed.ts']);
      },
    }),
    empty: defineCommand({
      meta: { name: 'empty', description: 'Truncate all data (preserve schema)' },
      run() {
        exec('bun', ['run', 'src/db/empty.ts']);
      },
    }),
  },
});
