import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readMultiSelectDropdown(): string {
  return readFileSync('src/components/molecules/MultiSelectDropdown.astro', 'utf-8');
}

describe('MultiSelectDropdown', () => {
  it('preserves account group label casing from the provided data', () => {
    const source = readMultiSelectDropdown();

    expect(source).toContain('text-base-content/40 tracking-wider');
    expect(source).not.toContain('text-base-content/40 uppercase tracking-wider');
  });
});
