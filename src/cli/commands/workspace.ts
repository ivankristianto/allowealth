/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'workspace', description: 'Manage workspaces (create, list, delete)' },
  run() {
    console.log('Not implemented yet');
  },
});
