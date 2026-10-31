import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
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

export default defineConfig({
  server: {
    host: devHost,
    port: port,
  },
  output: 'server',
  adapter: node({ mode: 'standalone' }),
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
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'chartjs', test: /node_modules[\\/]chart\.js/ },
              { name: 'motion', test: /node_modules[\\/](motion|framer-motion)/ },
            ],
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
        // Bun-specific modules resolved by the Bun runtime, not bundled by Vite
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
