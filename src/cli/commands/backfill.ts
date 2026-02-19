import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'backfill', description: 'Run data backfill scripts' },
  subCommands: {
    'email-verification': defineCommand({
      meta: {
        name: 'email-verification',
        description: 'Backfill email verification for existing users',
      },
      run() {
        exec('bun', ['run', 'scripts/backfill-email-verification.ts']);
      },
    }),
  },
});
