import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  plugins: [daisyui, typography],
} satisfies Config;
