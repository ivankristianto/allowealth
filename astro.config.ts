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
const devHost = DEV_HOST || true;
const port = parseInt(PORT || '4321', 10);

export default defineConfig({
  server: {
    host: devHost,
    port: port,
  },
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Options: 'treemap', 'sunburst', 'network'
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
            // Separate chart.js into its own chunk for better caching
            chartjs: ['chart.js'],
            // Separate motion library into its own chunk
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
