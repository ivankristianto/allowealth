import { defineConfig, type AstroIntegration } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// Load .env before config is parsed (Vite normally loads it too late)
const { PORT, DEV_HOST } = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

// DEV_HOST: Set custom hostname (e.g., "k2-expenses.local")
// Falls back to listening on all interfaces if not set
const devHost = DEV_HOST || true;
const port = parseInt(PORT || '4321', 10);

/**
 * Deployment Target Configuration
 *
 * Set DEPLOY_TARGET to switch between platforms:
 * - node (default): Local development and traditional Node.js hosting
 * - cloudflare: Cloudflare Workers/Pages
 * - vercel: Vercel serverless
 * - netlify: Netlify Functions
 */
type DeployTarget = 'node' | 'cloudflare' | 'vercel' | 'netlify';
const DEPLOY_TARGET = (process.env.DEPLOY_TARGET || 'node') as DeployTarget;

/**
 * Get the appropriate adapter based on DEPLOY_TARGET
 */
async function getAdapter(): Promise<AstroIntegration> {
  switch (DEPLOY_TARGET) {
    case 'cloudflare': {
      const cloudflare = await import('@astrojs/cloudflare');
      return cloudflare.default({
        platformProxy: {
          enabled: true,
        },
      });
    }
    case 'vercel': {
      const vercel = await import('@astrojs/vercel');
      return vercel.default({});
    }
    case 'netlify': {
      const netlify = await import('@astrojs/netlify');
      return netlify.default({});
    }
    case 'node':
    default: {
      const node = await import('@astrojs/node');
      return node.default({ mode: 'standalone' });
    }
  }
}

const adapter = await getAdapter();

console.log(`[astro.config] Using adapter: ${DEPLOY_TARGET}`);

export default defineConfig({
  server: {
    host: devHost,
    port: port,
  },
  output: 'server',
  adapter,
  vite: {
    plugins: [
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      visualizer({
        filename: 'dist/stats.json',
        gzipSize: true,
        brotliSize: true,
        json: true,
      }),
    ],
    server: {
      allowedHosts: ['.local'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            chartjs: ['chart.js'],
            motion: ['motion'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      },
    },
  },
});
