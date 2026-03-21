import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const content = readFileSync('src/components/partials/AccountHistoryPartial.astro', 'utf8');

describe('AccountHistoryPartial', () => {
  it('declares currency prop', () => {
    expect(content).toContain('currency: Currency');
  });

  it('imports Currency type and formatCurrency', () => {
    expect(content).toContain("from '@/lib/constants/currency'");
    expect(content).toContain("from '@/lib/formatting'");
    expect(content).toContain('formatCurrency');
  });

  it('formats balance with currency symbol', () => {
    expect(content).toContain('formatCurrency(balance, currency)');
  });

  it('does not render a notes column', () => {
    expect(content).not.toContain('Notes');
    expect(content).not.toContain('entry.notes');
  });

  it('renders percentage change column', () => {
    expect(content).toContain('Math.abs(prevBalance)');
  });

  it('guards percent column against zero prevBalance', () => {
    expect(content).toContain('prevBalance === 0');
  });

  it('renders SVG sparkline elements for multi-entry history', () => {
    expect(content).toContain('<polyline');
    expect(content).toContain('<circle');
    expect(content).toContain('viewBox="0 0 100 44"');
  });

  it('skips sparkline when fewer than two entries', () => {
    expect(content).toContain('entries.length >= 2');
  });

  it('handles flat-line case with explicit mid-height', () => {
    expect(content).toContain('range === 0');
    expect(content).toContain('? 22');
  });

  it('skips growth annotation when oldestBalance is zero', () => {
    expect(content).toContain('oldestBalance === 0');
  });

  it('renders growth annotation with period labels', () => {
    expect(content).toContain('Now');
  });
});
