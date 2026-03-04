/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';
import { targetArg } from '../lib/target';

export default defineCommand({
  meta: { name: 'db', description: 'Database management commands' },
  subCommands: {
    migrate: defineCommand({
      meta: { name: 'migrate', description: 'Apply pending database migrations' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget, isD1, isD1Local } = await import('../lib/target');
        await resolveTarget(args);

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
      args: {
        target: targetArg,
        benchmark: {
          type: 'boolean',
          description: 'Add ~10k benchmark transactions for performance testing',
          default: false,
        },
        stress: {
          type: 'boolean',
          description: 'Seed 5 years of realistic 4-member family stress-test data',
          default: false,
        },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        const seedArgs = ['run', 'src/db/seed.ts'];
        if (args.benchmark) seedArgs.push('--benchmark');
        if (args.stress) seedArgs.push('--stress');
        exec('bun', seedArgs);
      },
    }),
    reset: defineCommand({
      meta: { name: 'reset', description: 'Delete SQLite DB, push schema, and seed (dev only)' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget, getTarget } = await import('../lib/target');
        await resolveTarget(args);

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
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        exec('bun', ['run', 'src/db/empty.ts']);
      },
    }),
    drop: defineCommand({
      meta: {
        name: 'drop',
        description: '⚠️  DANGEROUS: Delete all tables and reset database',
      },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget, getTarget, isD1, isD1Local } = await import('../lib/target');
        await resolveTarget(args);

        const target = getTarget();

        // Show warning and require confirmation
        console.error('\n⚠️  DANGER ZONE ⚠️');
        console.error('This command will DELETE ALL TABLES and reset the database.');
        console.error(`Target: ${target}`);

        if (target === 'd1' || target === 'd1-local') {
          console.error('This will drop all tables on D1 (including production if --target d1).');
        }

        console.error('\nType "yes" to confirm:');

        // Read confirmation from stdin
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stderr,
        });

        const confirmation = await new Promise<string>((resolve) => {
          rl.question('', (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });

        if (confirmation !== 'yes') {
          console.error('\nAborted.');
          process.exit(1);
        }

        console.error('\nDropping all tables...\n');

        if (isD1()) {
          const { dropD1Tables } = await import('../lib/d1-migrate');
          await dropD1Tables({ local: isD1Local() });
        } else if (target === 'sqlite') {
          exec('rm', ['-f', 'db/.dev.db', 'db/.dev.db-wal', 'db/.dev.db-shm']);
          console.log('✅ SQLite database file deleted.');
        } else if (target === 'postgres') {
          exec('bun', ['run', 'src/db/drop-postgres.ts']);
        }

        console.log('\n✅ Database dropped. Run "aw db migrate" to recreate schema.\n');
      },
    }),
  },
});
