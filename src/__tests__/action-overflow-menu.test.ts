import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ActionOverflowMenu', () => {
  it('includes consistent More trigger with menu semantics', () => {
    const content = readFileSync('src/components/molecules/ActionOverflowMenu.astro', 'utf8');
    expect(content).toContain('More');
    expect(content).toContain('aria-haspopup="menu"');
    expect(content).toContain('role="menu"');
  });
});
