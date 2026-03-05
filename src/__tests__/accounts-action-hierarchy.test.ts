import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Accounts action hierarchy', () => {
  it('keeps New Account primary and overflows low-frequency actions', () => {
    const content = readFileSync('src/components/organisms/AccountActions.astro', 'utf8');
    expect(content).toContain('New Account');
    expect(content).toContain('ActionOverflowMenu');
  });
});
