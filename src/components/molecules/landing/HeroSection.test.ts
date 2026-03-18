import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const readSource = () =>
  readFileSync('apps/site/src/components/molecules/landing/HeroSection.astro', 'utf8');

describe('HeroSection', () => {
  it('keeps the entrance animation classes in place', () => {
    const source = readSource();

    expect(source).toContain(
      'inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full mb-8 sm:mb-12 animate-fade-in-down'
    );
    expect(source).toContain(
      'text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-base-content leading-[0.85] mb-6 sm:mb-10 animate-fade-in-up'
    );
    expect(source).toContain(
      'text-base-content/60 text-base sm:text-lg md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed mb-10 sm:mb-16 animate-fade-in-up-delay'
    );
    expect(source).toContain(
      'class="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 animate-fade-in-up-delay-2"'
    );
  });
});
