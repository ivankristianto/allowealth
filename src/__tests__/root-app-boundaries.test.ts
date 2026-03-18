import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const removedRootMarketingFiles = [
  'src/layouts/PublicLayout.astro',
  'src/components/layouts/PublicNavbar.astro',
  'src/components/layouts/PublicFooter.astro',
  'src/components/layouts/PublicAuthCta.client.ts',
  'src/components/molecules/landing/HeroSection.astro',
  'src/components/molecules/landing/FeaturesGrid.astro',
  'src/components/molecules/landing/FaqSection.astro',
  'src/components/organisms/landing/ShowcaseSection.astro',
  'src/components/organisms/landing/PricingSection.astro',
  'src/lib/landing-content.ts',
  'src/assets/screenshots/accounts.jpg',
  'src/assets/screenshots/budget.jpg',
  'src/assets/screenshots/dashboard.jpg',
  'src/assets/screenshots/reports.jpg',
  'src/assets/screenshots/transactions.jpg',
];

const siteMarketingFiles = [
  'apps/site/src/layouts/PublicLayout.astro',
  'apps/site/src/components/layouts/PublicNavbar.astro',
  'apps/site/src/components/layouts/PublicFooter.astro',
  'apps/site/src/components/molecules/landing/HeroSection.astro',
  'apps/site/src/components/molecules/landing/FeaturesGrid.astro',
  'apps/site/src/components/molecules/landing/FaqSection.astro',
  'apps/site/src/components/organisms/landing/ShowcaseSection.astro',
  'apps/site/src/lib/landing-content.ts',
];

describe('root app ownership boundaries', () => {
  it('keeps marketing ownership in apps/site instead of src', () => {
    removedRootMarketingFiles.forEach((filePath) => {
      expect(existsSync(join(projectRoot, filePath))).toBe(false);
    });

    siteMarketingFiles.forEach((filePath) => {
      expect(existsSync(join(projectRoot, filePath))).toBe(true);
    });
  });

  it('routes root-app branding to app-owned destinations', () => {
    const authLayoutSource = readFileSync('src/layouts/AuthLayout.astro', 'utf8');
    const navigationSource = readFileSync('src/components/layouts/Navigation.astro', 'utf8');

    expect(authLayoutSource).toContain('href="/login"');
    expect(authLayoutSource).toContain('aria-label="allowealth Sign In"');
    expect(authLayoutSource).not.toContain('href="/"');
    expect(authLayoutSource).not.toContain('aria-label="allowealth Home"');

    expect(navigationSource).toContain('href="/dashboard"');
    expect(navigationSource).toContain('aria-label="allowealth Dashboard"');
    expect(navigationSource).not.toContain('href="/"');
    expect(navigationSource).not.toContain('aria-label="allowealth Home"');
  });
});
