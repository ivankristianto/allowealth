/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'db', description: 'Database management commands' },
  subCommands: {
    migrate: defineCommand({
      meta: { name: 'migrate', description: 'Apply pending database migrations' },
      async run() {
        const { isD1, isD1Local } = await import('../lib/target');

        if (isD1()) {
          const { migrateD1 } = await import('../lib/d1-migrate');
          await migrateD1({ local: isD1Local() });
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
      async run() {
        const { isD1 } = await import('../lib/target');
        if (isD1()) {
          console.error('Error: "db seed" is not supported for D1 targets.');
          process.exit(1);
        }
        exec('bun', ['run', 'src/db/seed.ts']);
      },
    }),
    reset: defineCommand({
      meta: { name: 'reset', description: 'Delete SQLite DB, push schema, and seed (dev only)' },
      async run() {
        const { getTarget } = await import('../lib/target');
        if (getTarget() !== 'sqlite') {
          console.error('Error: "db reset" is only supported for the sqlite target.');
          process.exit(1);
        }
        console.log('Resetting database...');
        exec('rm', ['-f', 'db/.dev.db', 'db/.dev.db-wal', 'db/.dev.db-shm']);
        exec('mkdir', ['-p', 'db']);
        exec('drizzle-kit', ['push', '--force']);
        exec('bun', ['run', 'src/db/seed.ts']);
      },
    }),
    empty: defineCommand({
      meta: { name: 'empty', description: 'Truncate all data (preserve schema)' },
      async run() {
        const { isD1 } = await import('../lib/target');
        if (isD1()) {
          console.error('Error: "db empty" is not supported for D1 targets.');
          process.exit(1);
        }
        exec('bun', ['run', 'src/db/empty.ts']);
      },
    }),
  },
});
