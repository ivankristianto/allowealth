import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const heroSectionPath = join(
  projectRoot,
  'apps/site/src/components/molecules/landing/HeroSection.astro'
);

describe('site hero secondary CTA', () => {
  it('keeps the self-host label and href binding without the GitHub icon cue', () => {
    const source = readFileSync(heroSectionPath, 'utf8');

    expect(source).toContain("href={heroContent.ctaSecondaryHref ?? '#showcase'}");
    expect(source).toContain('{heroContent.ctaSecondary}');
    expect(source).not.toContain('GitHubIcon');
  });
});
