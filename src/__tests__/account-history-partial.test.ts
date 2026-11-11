import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const content = readFileSync('src/components/partials/AccountHistoryPartial.astro', 'utf8');

describe('AccountHistoryPartial', () => {
  it('formats balance with currency symbol', () => {
    expect(content).toContain('formatCurrency(balance, currency)');
  });

  it('renders percentage change column', () => {
    expect(content).toContain('Math.abs(prevBalance)');
  });

  it('guards percent column against zero prevBalance', () => {
    expect(content).toContain('prevBalance === 0');
  });

  it('skips sparkline when fewer than two entries', () => {
    expect(content).toContain('entries.length >= 2');
  });

  it('handles flat-line case with explicit mid-height', () => {
    expect(content).toContain('range === 0');
    expect(content).toContain('? 22');
  });

  it('skips growth annotation when oldestBalance is zero', () => {
    expect(content).toContain('oldestBalance !== 0');
  });
});
