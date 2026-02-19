import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'release', description: 'Interactive release (bump version, tag, changelog)' },
  run() {
    exec('bun', ['run', 'scripts/release.ts']);
  },
});
