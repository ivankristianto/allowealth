import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./ForecastCashflowChart.astro');

describe('ForecastCashflowChart component', () => {
  it('renders the approved chart title and empty state copy', () => {
    expect(source).toContain('Cashflow Forecast');
    expect(source).toContain('No forecast data for this currency.');
  });

  it('defines stacked income and expense bars with a net line overlay', () => {
    expect(source).toContain("label: 'Income'");
    expect(source).toContain("label: 'Expenses'");
    expect(source).toContain("label: 'Net'");
    expect(source).toContain("type: 'line' as const");
    expect(source).toContain("stack: 'cashflow'");
  });

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

describe('ForecastCashflowChart context-aware subtitle', () => {
  it('exports paused-state context props for the subtitle copy', () => {
    expect(source).toContain("typeFilter?: '' | 'income' | 'expense'");
    expect(source).toContain('showPaused?: boolean');
    expect(source).toContain('const qualifier = showPaused ? ');
  });

  it('shows type-aware subtitle variants', () => {
    expect(source).toMatch(/typeFilter === 'income'/);
    expect(source).toMatch(/typeFilter === 'expense'/);
    expect(source).toContain('Projected monthly income from your ${qualifier} transactions');
    expect(source).toContain('Projected monthly expenses from your ${qualifier} transactions');
    expect(source).toContain(
      'Projected monthly income and expenses from your ${qualifier} transactions'
    );
  });

  it('caps bar width to prevent oversized bars at low month counts', () => {
    expect(source).toContain('maxBarThickness');
  });

  it('shows a visible y-axis with abbreviated currency ticks', () => {
    expect(source).toContain('import { isValidCurrency, CURRENCY_META } from');
    expect(source).toContain(
      'function formatCurrencyAbbreviated(value: number, currency: Currency)'
    );
    expect(source).toContain('meta.symbolPosition === ');
    expect(source).toContain('display: true');
    expect(source).toContain('maxTicksLimit: 4');
    expect(source).toContain('formatCurrencyAbbreviated(Number(value), currency)');
    expect(source).not.toContain('return formatCurrency(value, currency);');
  });

  it('keeps help tooltip copy aligned with paused-state subtitle wording', () => {
    expect(source).toContain('const tooltipQualifier = showPaused ? ');
    expect(source).toContain('based on your ${tooltipQualifier} transactions.');
  });
});
