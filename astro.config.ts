import { defineConfig } from 'astro/config';
import type { AstroIntegration } from 'astro';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// Load .env before config is parsed (Vite normally loads it too late)
const { PORT, DEV_HOST } = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

// DEV_HOST: Set custom hostname (e.g., "k2-expenses.local")
// Falls back to listening on all interfaces if not set
const devHost = DEV_HOST || '0.0.0.0';
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
      return cloudflare.default({});
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

export default defineConfig({
  server: {
    host: devHost,
    port: port,
  },
  output: 'server',
  adapter,
  security: {
    csp: true,
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  build: {
    server: './server/',
    client: './client/',
  },
  image: {
    remotePatterns: [],
  },
  vite: {
    build: {
      // Keep processed Astro scripts external so CSP does not require
      // per-request HTML nonce injection in middleware.
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/chart.js')) return 'chartjs';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion'))
              return 'motion';
          },
        },
      },
    },
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
        template: 'raw-data',
      }),
    ],
    server: {
      allowedHosts: ['.local'],
      warmup: {
        // Pre-transform heavy pages to reduce first-request dev-mode latency.
        // These pages have deep import trees (services, components, icons)
        // that cause ~1-2s Vite module resolution on cold access.
        ssrFiles: [
          './src/pages/dashboard.astro',
          './src/pages/transactions/index.astro',
          './src/pages/budget/index.astro',
          './src/pages/accounts/index.astro',
          './src/pages/reports/index.astro',
          './src/layouts/ProtectedLayout.astro',
          './src/services/index.ts',
        ],
      },
    },
    // Externalize Node.js built-in modules to suppress Vite warnings
    // These are auto-externalized but Vite emits warnings suggesting explicit config
    ssr: {
      external: [
        // Node.js built-ins (both prefixed and non-prefixed)
        'path',
        'fs',
        'os',
        'child_process',
        'crypto',
        'url',
        'util',
        'stream',
        'events',
        'buffer',
        'tty',
        'net',
        'module',
        'http2',
        'node:path',
        'node:fs',
        'node:os',
        'node:child_process',
        'node:crypto',
        'node:url',
        'node:util',
        'node:stream',
        'node:events',
        'node:buffer',
        'node:tty',
        'node:net',
        'node:module',
        'node:http2',
        'esbuild',
        // Bun-specific modules (for Cloudflare Workers compatibility)
        // These are only used in local SQLite development, not in Workers
        'bun:sqlite',
        'bun:test',
      ],
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
        '@mcp-server': fileURLToPath(new URL('./apps/mcp/src', import.meta.url)),
      },
    },
  },
});
