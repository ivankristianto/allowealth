import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://docs.allowealth.io',
  output: 'static',
  integrations: [
    starlight({
      title: 'Allowealth Docs',
      description: 'User and developer documentation for Allowealth.',
      logo: {
        src: './public/favicon.svg',
        alt: 'Allowealth',
      },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/brand.css'],
      sidebar: [
        { slug: 'getting-started' },
        { slug: 'core-concepts' },
        {
          label: 'Guides: End Users',
          items: [{ slug: 'end-users/onboarding' }, { slug: 'end-users/daily-workflow' }],
        },
        {
          label: 'Guides: Admins',
          items: [{ slug: 'admins/onboarding' }, { slug: 'admins/deployment-guide' }],
        },
        {
          label: 'Guides: Developers',
          items: [
            { slug: 'developers/local-development' },
            { slug: 'developers/feature-workflow' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { slug: 'reference/commands' },
            { slug: 'reference/cli' },
            { slug: 'reference/api-overview' },
            { slug: 'reference/architecture' },
          ],
        },
      ],
    }),
    sitemap(),
  ],
});
