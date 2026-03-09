import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./ForecastSummary.astro');

describe('ForecastSummary component', () => {
  it('exports income, expense, net, currency, and monthCount props', () => {
    expect(source).toContain('income: string');
    expect(source).toContain('expense: string');
    expect(source).toContain('net: string');
    expect(source).toContain('currency: Currency');
    expect(source).toContain('monthCount: number');
  });

  it('renders three stat cards with accessible labels', () => {
    expect(source).toContain('Projected Income');
    expect(source).toContain('Projected Expenses');
    expect(source).toContain('Net Cash Flow');
  });

  it('shows the period label using monthCount', () => {
    expect(source).toMatch(/\{monthCount\}-Month/);
  });
});
