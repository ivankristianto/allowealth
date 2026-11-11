import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./ForecastCashflowChart.astro');

describe('ForecastCashflowChart component', () => {
  it('includes screen-reader table markup for chart data', () => {
    expect(source).toContain('aria-label="Cashflow forecast data table"');
    expect(source).toContain('<th>Month</th>');
    expect(source).toContain('<th>Net</th>');
  });

  it('uses chart lifecycle helpers and theme-aware updates', () => {
    expect(source).toContain('createChartLifecycle');
    expect(source).toContain('updateChartThemeColors');
    expect(source).toContain("document.addEventListener('astro:after-swap', lifecycle.init);");
  });
});
