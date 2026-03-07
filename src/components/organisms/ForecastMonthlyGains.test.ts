import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./ForecastMonthlyGains.astro');

describe('ForecastMonthlyGains component', () => {
  it('contains Forecast Interest', () => {
    expect(source).toContain('Forecast Interest');
  });

  it('contains Actual Net Savings', () => {
    expect(source).toContain('Actual Net Savings');
  });

  it('uses design-system chart colors instead of hardcoded hex values', () => {
    expect(source).toContain('--color-warning');
    expect(source).toContain('--color-success');
    expect(source).toContain('readThemeColor');
  });

  it('explains that forecast needs historical balance snapshots when empty', () => {
    expect(source).toContain('historical balances');
  });

  it('serializes only the focused chart window to the client payload', () => {
    expect(source).toContain('const visibleChartWindow =');
    expect(source).toContain('timeline: visibleTimeline');
    expect(source).toContain('chartWindow: visibleChartWindow');
  });
});
