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

  it('hardcodes all statuses while wiring monthCount from the URL into the service call', () => {
    const page = readForecastPage();

    expect(page).toContain(
      'const { monthCount, ...filters } = buildForecastFilters(Astro.url.searchParams);'
    );
    expect(page).toContain("filters.status = 'all';");
    expect(page).toContain(
      'recurringForecastService.getForecast(user.workspaceId, filters, monthCount, perf)'
    );
  });

  it('renders the segmented 3M/6M/12M/24M range picker and sticky unified table', () => {
    const page = readForecastPage();

    expect(page).toContain("{ value: 3, label: '3M' }");
    expect(page).toContain("{ value: 24, label: '24M' }");
    expect(page).toContain('monthCount: opt.value === 12 ? undefined : String(opt.value)');
    expect(page).toContain('thead class="sticky top-0 z-20 bg-base-100"');
    expect(page).toContain(
      'class="pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-8 rounded-r-3xl bg-gradient-to-l from-base-100 to-transparent"'
    );
    expect(page).toContain("row.status === 'paused' && 'opacity-50'");
    expect(page).toContain('badge badge-ghost badge-xs');
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
});
