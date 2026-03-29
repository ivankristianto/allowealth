import { defineCommand } from 'citty';
import { exec } from '../lib/exec';

export default defineCommand({
  meta: { name: 'deploy', description: 'Build and deploy the application' },
  subCommands: {
    cloudflare: defineCommand({
      meta: { name: 'cloudflare', description: 'Build and deploy to Cloudflare Workers' },
      run() {
        exec('astro', ['build'], { DEPLOY_TARGET: 'cloudflare' });
        exec('wrangler', ['deploy']);
      },
    }),
  },
});
