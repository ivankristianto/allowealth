import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://docs.allowealth.io',
  output: 'static',
  integrations: [
    starlight({
      title: 'Allowealth Docs',
      description: 'Public product documentation for Allowealth.',
      logo: {
        src: './src/assets/logo.svg',
        alt: 'Allowealth',
      },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/brand.css'],
      sidebar: [
        { label: 'Getting Started', items: [{ slug: 'getting-started' }] },
        {
          label: 'End Users',
          items: [{ slug: 'end-users/onboarding' }, { slug: 'end-users/daily-workflow' }],
        },
        {
          label: 'Admins',
          items: [{ slug: 'admins/onboarding' }, { slug: 'admins/deployment-guide' }],
        },
      ],
    }),
    sitemap(),
  ],
});
