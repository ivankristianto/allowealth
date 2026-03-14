/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';

import { exec } from '../lib/exec';
import { targetArg } from '../lib/target';

export default defineCommand({
  meta: { name: 'demo', description: 'Demo environment management commands' },
  subCommands: {
    reset: defineCommand({
      meta: {
        name: 'reset',
        description: 'Wipe all data and reseed with demo dataset (empty + seed --months=3)',
      },
      args: {
        target: targetArg,
        yes: {
          type: 'boolean',
          description: 'Skip confirmation prompt (required for non-interactive CI use)',
          default: false,
          alias: 'y',
        },
      },
      async run({ args }) {
        const { resolveTarget, getTarget } = await import('../lib/target');
        await resolveTarget(args);

        const target = getTarget();

        if ((target === 'd1' || target === 'd1-local') && !args.yes) {
          console.error('⚠️  This will wipe ALL data on D1 and reseed with demo data.');
          console.error('   Target:', target);
          console.error('\nType "yes" to confirm:');

          const readline = await import('readline');
          const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
          const answer = await new Promise<string>((resolve) => {
            rl.question('', (value) => {
              rl.close();
              resolve(value.trim());
            });
          });

          if (answer !== 'yes') {
            console.error('Aborted.');
            process.exit(1);
          }
        }

        console.log('Resetting demo data...');
        exec('bun', ['run', 'src/db/empty.ts']);
        exec('bun', ['run', 'src/db/seed/index.ts', '--months=3']);
        console.log('✅ Demo data reset complete.');
      },
    }),
  },
});
