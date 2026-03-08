import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('./LedgerProjections.astro', import.meta.url));
const source = readFileSync(sourcePath, 'utf-8');

describe('LedgerProjections yearly breakdown', () => {
  it('contains yearly summary rows', () => {
    expect(source).toContain('yearLabel');
  });

  it('contains expansion hooks for monthly rows', () => {
    expect(source).toContain('<details');
    expect(source).toContain('<summary');
    expect(source).toContain('row.months');
  });

  it('explains that historical balances are required for forecast details', () => {
    expect(source).toContain('Add account balance history to see your plan versus reality.');
  });

  it('renders a screen-reader-only table for yearly and monthly projection rows', () => {
    expect(source).toContain('aria-label="Ledger projections data table"');
    expect(source).toContain('<table class="sr-only"');
  });
});
