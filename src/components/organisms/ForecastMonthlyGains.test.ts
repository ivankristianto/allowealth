import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./ForecastMonthlyGains.astro');

describe('ForecastMonthlyGains component', () => {
  it('serializes only the focused chart window to the client payload', () => {
    expect(source).toContain('const visibleChartWindow =');
    expect(source).toContain('timeline: visibleTimeline');
    expect(source).toContain('chartWindow: visibleChartWindow');
  });
});
