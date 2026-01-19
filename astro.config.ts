import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  server: {
    host: true,
  },
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // Specific aliases first (before general @)
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@lib/*': fileURLToPath(new URL('./src/lib/*', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@components/*': fileURLToPath(new URL('./src/components/*', import.meta.url)),
        '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
        '@db/*': fileURLToPath(new URL('./src/db/*', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@services/*': fileURLToPath(new URL('./src/services/*', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@styles/*': fileURLToPath(new URL('./src/styles/*', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@layouts/*': fileURLToPath(new URL('./src/layouts/*', import.meta.url)),
        // General @ alias last
        '@': srcDir,
      },
    },
  },
});
