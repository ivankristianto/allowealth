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
});
