import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  plugins: [require('daisyui'), require('@tailwindcss/typography')],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#10b981', // emerald-500 (green for financial growth)
          secondary: '#f59e0b', // amber-500 (warnings)
          accent: '#3b82f6', // blue-500 (info)
          neutral: '#6b7280', // gray-500
          'base-100': '#ffffff', // white
          info: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444', // red-500 (over budget)
        },
      },
    ],
    logs: false,
  },
} satisfies Config;
