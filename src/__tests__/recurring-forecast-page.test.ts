import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readForecastPage(): string {
  return readFileSync('src/pages/recurring/forecast/index.astro', 'utf8');
}

describe('recurring forecast page', () => {
  it('uses breadcrumb navigation and the new cashflow chart', () => {
    const page = readForecastPage();

    expect(page).toContain("import Breadcrumb from '@/components/atoms/Breadcrumb.astro';");
    expect(page).toContain(
      "import ForecastCashflowChart from '@/components/organisms/ForecastCashflowChart.astro';"
    );
    expect(page).toContain(
      "<Breadcrumb items={[{ label: 'Recurring', href: '/recurring' }, { label: 'Forecast' }]} />"
    );
  });

  it('uses parsed filters directly and only includes paused items when requested', () => {
    const page = readForecastPage();

    expect(page).toContain(
      'const { monthCount, ...filters } = buildForecastFilters(Astro.url.searchParams);'
    );
    expect(page).not.toContain("filters.status = 'all';");
    expect(page).toContain("const showPaused = filters.status === 'all';");
    expect(page).toContain(
      '<input type="hidden" name="status" value="all" id="forecast-status-hidden" />'
    );
    expect(page).toContain(
      'recurringForecastService.getForecast(user.workspaceId, filters, monthCount, perf)'
    );
  });

  it('renders the segmented range picker and extracted forecast table', () => {
    const page = readForecastPage();

    expect(page).toContain("{ value: 3, label: '3M' }");
    expect(page).toContain("{ value: 24, label: '24M' }");
    expect(page).toContain('monthCount: opt.value === 12 ? undefined : String(opt.value)');
    expect(page).toContain(
      "import ForecastTable from '@/components/organisms/ForecastTable.astro';"
    );
    expect(page).toContain(
      '<ForecastTable rows={forecast.rows} totals={forecast.totals} monthKeys={forecast.monthKeys} />'
    );
    expect(page).toContain('class="toggle toggle-sm toggle-accent"');
  });

  it('auto-submits filters with the Astro page-load lifecycle pattern', () => {
    const page = readForecastPage();

    expect(page).toContain("const CONTROLLER_KEY = '__forecastFiltersController';");
    expect(page).toContain('[CONTROLLER_KEY]?.abort();');
    expect(page).toContain(
      "window.addEventListener('filterChange', handleFilterChange, { signal });"
    );
    expect(page).toContain("document.addEventListener('astro:page-load', initForecastFilters);");
  });

  it('preserves non-default monthCount across filter submissions and hides the chart on empty results', () => {
    const page = readForecastPage();

    expect(page).toContain(
      '{monthCount !== 12 && <input type="hidden" name="monthCount" value={monthCount} />}'
    );
    expect(page).toContain('const chartData: ForecastChartDataPoint[] = activeTotals');
    expect(page).toMatch(
      /\{\s*forecast\.rows\.length > 0 && \(\s*<ForecastCashflowChart data=\{chartData\} currency=\{activeCurrency\} typeFilter=\{typeFilter\} \/>\s*\)\s*\}/
    );
    expect(page).not.toContain(
      '{chartData.length > 0 && <ForecastCashflowChart data={chartData} currency={activeCurrency} />}'
    );
  });

  it('makes the filter bar sticky so it stays visible while scrolling', () => {
    const page = readForecastPage();

    expect(page).toMatch(/class="[^"]*sticky[^"]*top-0[^"]*z-\d+[^"]*rounded-3xl[^"]*border[^"]*"/);
  });

  it('imports ForecastSummary and renders it when activeTotals is present', () => {
    const page = readForecastPage();

    expect(page).toContain(
      "import ForecastSummary from '@/components/organisms/ForecastSummary.astro';"
    );
    expect(page).toContain('<ForecastSummary');
    expect(page).toContain('income={summaryIncome}');
    expect(page).toContain('expense={summaryExpense}');
    expect(page).toContain('net={summaryNet}');
    expect(page).toContain('monthCount={monthCount}');
  });
});
