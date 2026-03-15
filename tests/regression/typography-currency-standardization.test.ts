import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('typography and currency standardization', () => {
  it('uses global tabular figures and removes monospace styling from numeric atoms', () => {
    const globals = read('src/styles/globals.css');
    const currency = read('src/components/atoms/Currency.astro');
    const percentage = read('src/components/atoms/Percentage.astro');

    expect(globals).toContain('font-variant-numeric: tabular-nums;');
    expect(currency).not.toContain('font-mono');
    expect(percentage).not.toContain('font-mono');
  });
});
