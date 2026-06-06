import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('MainLayout demo banner integration', () => {
  it('imports DemoBanner and renders it before Header', () => {
    const source = readFileSync('src/layouts/MainLayout.astro', 'utf8');

    expect(source).toContain("import DemoBanner from '../components/atoms/DemoBanner.astro';");

    const bannerIndex = source.indexOf('<DemoBanner />');
    const headerIndex = source.indexOf('<Header');

    expect(bannerIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeGreaterThan(-1);
    expect(bannerIndex).toBeLessThan(headerIndex);
  });
});

describe('MainLayout workspace name forwarding', () => {
  it('accepts workspaceName and forwards it to BaseLayout', () => {
    const source = readFileSync('src/layouts/MainLayout.astro', 'utf8');

    expect(source).toContain('workspaceName?: string;');
    expect(source).toContain(
      '<BaseLayout title={title} ssrTheme={ssrTheme} workspaceName={workspaceName}>'
    );
  });
});
