import type { StorybookConfig } from '@storybook/html-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    reactDocgen: 'off',
  },
  async viteFinal(config) {
    // Add Tailwind CSS v4 plugin for Storybook
    config.plugins = config.plugins || [];
    config.plugins.push(
      tailwindcss({
        // Use the same content paths as main tailwind.config.ts
        content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
      })
    );

    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          '@': '/src',
          '@/*': '/src/*',
          '@lib/*': '/src/lib/*',
          '@components/*': '/src/components/*',
          '@db/*': '/src/db/*',
          '@layouts/*': '/src/layouts/*',
          '@services/*': '/src/services/*',
          '@styles/*': '/src/styles/*',
          '@src-types/*': '/src/types/*',
        },
      },
    };
  },
};

export default config;
