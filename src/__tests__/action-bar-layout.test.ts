import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ActionBar layout', () => {
  it('supports secondary-visible and overflow slots without requiring primary', () => {
    const content = readFileSync('src/components/molecules/ActionBar.astro', 'utf8');
    expect(content).toContain("Astro.slots.has('secondary-visible')");
    expect(content).toContain("Astro.slots.has('overflow')");
  });
});
