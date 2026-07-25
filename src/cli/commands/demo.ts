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
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);

        console.log('Resetting demo data...');
        exec('bun', ['run', 'src/db/empty.ts']);
        exec('bun', ['run', 'src/db/seed/index.ts', '--months=3']);
        console.log('✅ Demo data reset complete.');
      },
    }),
  },
});
