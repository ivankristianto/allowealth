/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'admin', description: 'Admin operations (create super admin, API keys)' },
  run() {
    console.log('Not implemented yet');
  },
});
