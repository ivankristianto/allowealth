import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('./LedgerProjections.astro', import.meta.url));
const source = readFileSync(sourcePath, 'utf-8');

describe('LedgerProjections yearly breakdown', () => {
  it('renders a screen-reader-only table for yearly and monthly projection rows', () => {
    expect(source).toContain('aria-label="Ledger projections data table"');
    expect(source).toContain('<table class="sr-only"');
  });
});
