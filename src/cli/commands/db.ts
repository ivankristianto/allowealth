/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'db', description: 'Database operations (migrate, seed, reset, studio)' },
  run() {
    console.log('Not implemented yet');
  },
});
