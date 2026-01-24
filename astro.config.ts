import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// DEV_HOST: Set custom hostname (e.g., "k2-expenses.local")
// Falls back to listening on all interfaces if not set
const devHost = process.env.DEV_HOST || true;

export default defineConfig({
  server: {
    host: devHost,
  },
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [tailwindcss()],
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
