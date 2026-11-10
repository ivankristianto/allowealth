/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';

import { exec } from '../lib/exec';
import { targetArg } from '../lib/target';
import { toWipeFlags, wipeArgs, wipeFlagArgv } from '../lib/wipe-args';

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
        ...wipeArgs,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        const { enforceWipeGuard, resolveDatabasePath } = await import('@/db/wipe-guard');

        const dbPath = resolveDatabasePath();
        const flags = toWipeFlags(args);
        enforceWipeGuard({ dbPath, action: 'reset demo data in', ...flags });

        console.log('Resetting demo data...');
        const env = { DATABASE_URL: dbPath };
        exec('bun', ['run', 'src/db/empty.ts', ...wipeFlagArgv(flags)], env);
        exec('bun', ['run', 'src/db/seed/index.ts', '--months=3', '--yes'], env);
        console.log('✅ Demo data reset complete.');
      },
    }),
  },
});
