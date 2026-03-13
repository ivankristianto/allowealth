import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('AuthLayout demo banner integration', () => {
  it('imports DemoBanner and renders it above auth content', () => {
    const source = readFileSync('src/layouts/AuthLayout.astro', 'utf8');

    expect(source).toContain("import DemoBanner from '../components/atoms/DemoBanner.astro';");
    expect(source).toContain('<DemoBanner />');
  });
});
