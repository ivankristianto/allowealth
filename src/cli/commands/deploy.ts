/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'deploy', description: 'Deploy the application' },
  run() {
    console.log('Not implemented yet');
  },
});
