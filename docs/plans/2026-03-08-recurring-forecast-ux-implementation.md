# Recurring Forecast UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the `/recurring/forecast` page to fix a scroll-sync data integrity bug, add a cashflow chart, add a date range picker, and align with the design system.

**Architecture:** Server-rendered Astro page with form-based filters that auto-submit on change. Chart uses Chart.js mixed bar+line (stacked income/expense bars with net line overlay). Single scroll container for header, data rows, and totals. Active currency from cookie determines chart currency.

**Tech Stack:** Astro 5, DaisyUI v5, Chart.js (via `@/lib/chart-setup`), `createChartLifecycle` for lazy loading

**Design doc:** `docs/plans/2026-03-08-recurring-forecast-ux-design.md`

---

### Task 1: Add monthCount parsing to filter utilities

**Files:**
- Modify: `src/lib/utils/recurring-forecast-filters.ts`
- Modify: `src/lib/utils/recurring-forecast-filters.test.ts`

**Step 1: Write the failing tests**

Add to `src/lib/utils/recurring-forecast-filters.test.ts`:

```typescript
import {
  MAX_FORECAST_ACCOUNT_IDS,
  buildForecastFilters,
  normalizeForecastAccountIds,
  normalizeForecastFilters,
  parseForecastMonthCount,
} from './recurring-forecast-filters';

// Add new describe block:
describe('parseForecastMonthCount', () => {
  test('returns valid month counts', () => {
    expect(parseForecastMonthCount('3')).toBe(3);
    expect(parseForecastMonthCount('6')).toBe(6);
    expect(parseForecastMonthCount('12')).toBe(12);
    expect(parseForecastMonthCount('24')).toBe(24);
  });

  test('defaults to 12 for invalid values', () => {
    expect(parseForecastMonthCount(null)).toBe(12);
    expect(parseForecastMonthCount(undefined)).toBe(12);
    expect(parseForecastMonthCount('')).toBe(12);
    expect(parseForecastMonthCount('7')).toBe(12);
    expect(parseForecastMonthCount('abc')).toBe(12);
  });
});
```

Update the existing `buildForecastFilters` test to expect `monthCount`:

```typescript
describe('buildForecastFilters', () => {
  test('parses repeated and comma-separated account params', () => {
    const params = new URLSearchParams();
    params.append('accounts', 'acc_2');
    params.append('accounts', 'acc_1,acc_2');
    params.append('status', 'all');
    params.append('type', 'expense');

    expect(buildForecastFilters(params)).toEqual({
      type: 'expense',
      status: 'all',
      accountIds: ['acc_1', 'acc_2'],
      monthCount: 12,
    });
  });

  test('parses monthCount from params', () => {
    const params = new URLSearchParams();
    params.set('monthCount', '6');

    expect(buildForecastFilters(params)).toEqual({
      status: 'active',
      monthCount: 6,
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/utils/recurring-forecast-filters.test.ts`
Expected: FAIL — `parseForecastMonthCount` not exported, `monthCount` not in result

**Step 3: Implement parseForecastMonthCount**

Add to `src/lib/utils/recurring-forecast-filters.ts`:

```typescript
const VALID_MONTH_COUNTS = [3, 6, 12, 24] as const;
export type ForecastMonthCount = (typeof VALID_MONTH_COUNTS)[number];

export function parseForecastMonthCount(value: string | null | undefined): ForecastMonthCount {
  const num = Number(value);
  if (VALID_MONTH_COUNTS.includes(num as ForecastMonthCount)) return num as ForecastMonthCount;
  return 12;
}
```

Update `buildForecastFilters` return type and body:

```typescript
export function buildForecastFilters(
  params: URLSearchParams
): ForecastFilters & { monthCount: ForecastMonthCount } {
  const type = parseForecastType(params.get('type'));
  const status = parseForecastStatus(params.get('status'));
  const accountIds = parseForecastAccountIds(params);
  const monthCount = parseForecastMonthCount(params.get('monthCount'));

  return {
    ...(type && { type }),
    ...(status && { status }),
    ...(accountIds && { accountIds }),
    monthCount,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/lib/utils/recurring-forecast-filters.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/utils/recurring-forecast-filters.ts src/lib/utils/recurring-forecast-filters.test.ts
git commit -m "feat(forecast): add monthCount parsing to filter utilities"
```

---

### Task 2: Create ForecastCashflowChart component

**Files:**
- Create: `src/components/organisms/ForecastCashflowChart.astro`

**Reference:** Follow `src/components/organisms/FinancialVelocityChart.astro` patterns exactly — same data serialization, chart lifecycle, theme handling, cleanup, and accessibility patterns.

**Step 1: Create the component**

Create `src/components/organisms/ForecastCashflowChart.astro`:

```astro
---
import Card from '@/components/atoms/Card.astro';
import Skeleton from '@/components/atoms/Skeleton.astro';
import type { Currency } from '@/lib/constants/currency';

export interface ForecastChartDataPoint {
  name: string;
  income: number;
  expenses: number;
  net: number;
}

export interface Props {
  data: ForecastChartDataPoint[];
  currency?: Currency;
  loading?: boolean;
  className?: string;
}

const { data = [], currency = 'IDR', loading = false, className = '' } = Astro.props;

const serializedData = JSON.stringify(data)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');

const chartId = `forecast-cashflow-chart-${Math.random().toString(36).slice(2, 11)}`;
---

<Card
  padding="lg"
  rounded="card-lg"
  className={className}
  role="region"
  aria-label="Monthly cashflow forecast"
>
  <div class="flex flex-col gap-6">
    <h4 class="font-bold text-base text-base-content tracking-tight">
      Cashflow Forecast
    </h4>

    {
      loading ? (
        <div class="min-h-[280px]">
          <Skeleton variant="rectangular" width="100%" height="280px" className="rounded-2xl" />
        </div>
      ) : data.length === 0 ? (
        <div class="p-12 text-center">
          <p class="text-base-content/60 font-medium">No forecast data for this currency.</p>
        </div>
      ) : (
        <div
          class="h-[280px] w-full min-h-[280px]"
          data-chart-data={serializedData}
          data-currency={currency}
          id={`${chartId}-container`}
        >
          <canvas
            id={chartId}
            aria-label={`Cashflow forecast chart for ${data.length} months`}
            role="img"
          />
        </div>
      )
    }

    {
      !loading && data.length > 0 && (
        <table class="sr-only" aria-label="Cashflow forecast data table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr>
                <td>{item.name}</td>
                <td>{item.income}</td>
                <td>{item.expenses}</td>
                <td>{item.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
  </div>
</Card>

<script>
  import { Chart } from '@/lib/chart-setup';
  import { formatCurrency } from '@/lib/formatting/currency-client';
  import { createChartLifecycle, isDarkTheme } from '@/lib/utils/chart-lifecycle';
  import { isValidCurrency } from '@/lib/constants/currency';
  import type { Currency } from '@/lib/constants/currency';

  interface ForecastChartDataPoint {
    name: string;
    income: number;
    expenses: number;
    net: number;
  }

  interface ChartEntry {
    chart: Chart;
    data: ForecastChartDataPoint[];
  }

  const charts: Record<string, ChartEntry> = {};

  function updateChartThemeColors(): void {
    const dark = isDarkTheme();

    Object.values(charts).forEach(({ chart }) => {
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = dark
          ? 'rgba(248, 250, 252, 0.95)'
          : 'rgba(15, 23, 42, 0.9)';
        chart.options.plugins.tooltip.titleColor = dark ? '#0f172a' : '#fff';
        chart.options.plugins.tooltip.bodyColor = dark ? '#0f172a' : '#fff';
      }

      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = dark ? '#94a3b8' : '#64748b';
      }

      if (chart.options.scales?.x?.ticks) {
        chart.options.scales.x.ticks.color = dark ? '#94a3b8' : '#64748b';
      }
      if (chart.options.scales?.y?.ticks) {
        chart.options.scales.y.ticks.color = dark ? '#94a3b8' : '#64748b';
      }
      if (chart.options.scales?.y?.grid) {
        chart.options.scales.y.grid.color = dark
          ? 'rgba(148, 163, 184, 0.1)'
          : 'rgba(148, 163, 184, 0.15)';
      }

      chart.update('none');
    });
  }

  function initForecastChart(
    chartId: string,
    data: ForecastChartDataPoint[],
    currency: Currency
  ): void {
    const canvas = document.getElementById(chartId) as HTMLCanvasElement;
    if (!canvas) return;

    if (charts[chartId]?.chart) {
      charts[chartId].chart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = data.map((d) => d.name);
    const incomeData = data.map((d) => d.income);
    const expensesData = data.map((d) => d.expenses);
    const netData = data.map((d) => d.net);

    const dark = isDarkTheme();
    const gridColor = dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)';
    const textColor = dark ? '#94a3b8' : '#64748b';

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Income',
            data: incomeData,
            backgroundColor: '#10b981',
            borderRadius: 4,
            borderSkipped: false,
            stack: 'cashflow',
            order: 2,
          },
          {
            type: 'bar' as const,
            label: 'Expenses',
            data: expensesData,
            backgroundColor: '#f43f5e',
            borderRadius: 4,
            borderSkipped: false,
            stack: 'cashflow',
            order: 2,
          },
          {
            type: 'line' as const,
            label: 'Net',
            data: netData,
            borderColor: '#0ea5e9',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#0ea5e9',
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: textColor,
              font: { size: 10, weight: 700 },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: dark ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.9)',
            titleColor: dark ? '#0f172a' : '#fff',
            bodyColor: dark ? '#0f172a' : '#fff',
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${formatCurrency(value, currency)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10, weight: 700 } },
            border: { display: false },
          },
          y: {
            display: false,
            grid: { color: gridColor },
            border: { display: false },
            beginAtZero: true,
          },
        },
      },
    });

    charts[chartId] = { chart, data };
  }

  function parseChartData(raw: unknown): ForecastChartDataPoint[] | null {
    if (!Array.isArray(raw)) return null;
    const validData = raw.filter(
      (item) =>
        typeof item?.income === 'number' &&
        isFinite(item.income) &&
        item.income >= 0 &&
        typeof item?.expenses === 'number' &&
        isFinite(item.expenses) &&
        item.expenses >= 0 &&
        typeof item?.net === 'number' &&
        isFinite(item.net) &&
        typeof item?.name === 'string' &&
        item.name.length > 0 &&
        item.name.length <= 100
    ) as ForecastChartDataPoint[];
    return validData.length > 0 ? validData : null;
  }

  const lifecycle = createChartLifecycle<ForecastChartDataPoint[]>({
    containerSelector: '[id^="forecast-cashflow-chart-"][id$="-container"]',
    parseData: parseChartData,
    onInit: (container, data) => {
      const chartId = container.querySelector('canvas')?.id;
      if (!chartId || charts[chartId]) return;
      const currencyAttr = container.getAttribute('data-currency');
      const currency: Currency =
        currencyAttr && isValidCurrency(currencyAttr) ? currencyAttr : 'IDR';
      initForecastChart(chartId, data, currency);
    },
    onThemeChange: updateChartThemeColors,
    onCleanup: () => {
      Object.keys(charts).forEach((chartId) => {
        const entry = charts[chartId];
        if (entry?.chart) {
          try {
            entry.chart.destroy();
          } catch (e) {
            console.warn('Failed to destroy chart:', chartId, e);
          }
        }
        delete charts[chartId];
      });
    },
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lifecycle.init);
  } else {
    lifecycle.init();
  }

  window.addEventListener('beforeunload', lifecycle.cleanup);
  document.addEventListener('astro:before-swap', lifecycle.cleanup);
  document.addEventListener('astro:after-swap', lifecycle.init);
  document.addEventListener('charts:reinit', lifecycle.init);
</script>
```

**Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/organisms/ForecastCashflowChart.astro
git commit -m "feat(forecast): add cashflow chart component with stacked bars and net line"
```

---

### Task 3: Rewrite forecast page

**Files:**
- Modify: `src/pages/recurring/forecast/index.astro`

**Context:** This is a full rewrite of the page. The changes are:

1. **Breadcrumb**: Replace back button with `Breadcrumb` component: `Recurring > Forecast` (reuse existing `@/components/atoms/Breadcrumb.astro`)
2. **Filters**: Remove status dropdown, remove Filter button. Type select and account dropdown auto-submit on change. Add segmented range picker (3M/6M/12M/24M).
3. **Account labels**: Use `getAccountTypeLabel()` for group names
4. **Chart**: Add `ForecastCashflowChart` between filters and table, fed by active currency totals
5. **Table**: Single scroll container for header + data rows + totals. Design system styling: wider padding, zebra striping, row hover, right-edge fade, sticky left column + top header.
6. **Paused rows**: Always shown, dimmed with `opacity-50` and "Paused" badge. Status hardcoded to `'all'`.
7. **monthCount**: Read from URL, pass to service.

**Step 1: Rewrite the page**

Replace `src/pages/recurring/forecast/index.astro` with:

```astro
---
import ProtectedLayout from '@/layouts/ProtectedLayout.astro';
import MultiSelectDropdown from '@/components/molecules/MultiSelectDropdown.astro';
import ForecastCashflowChart from '@/components/organisms/ForecastCashflowChart.astro';
import type { ForecastChartDataPoint } from '@/components/organisms/ForecastCashflowChart.astro';
import Breadcrumb from '@/components/atoms/Breadcrumb.astro';
import { Wallet } from '@lucide/astro';
import { formatCurrency } from '@/lib/formatting';
import { recurringForecastService, accountService, workspaceMetaService } from '@/services';
import { buildForecastFilters } from '@/lib/utils/recurring-forecast-filters';
import { getAccountTypeLabel } from '@/lib/types/account';
import { isValidCurrency } from '@/lib/constants/currency';

const user = Astro.locals.user;
if (!user?.id) {
  return Astro.redirect('/login');
}

const { monthCount, ...filters } = buildForecastFilters(Astro.url.searchParams);
// Always fetch both active and paused templates
filters.status = 'all';

const perf = Astro.locals.perf;

const [forecast, accounts, currencyConfig] = await Promise.all([
  recurringForecastService.getForecast(user.workspaceId, filters, monthCount, perf),
  accountService.findAll(user.workspaceId, undefined, perf),
  workspaceMetaService.getWorkspaceCurrencies(user.workspaceId),
]);

// Determine active currency from cookie
const activeCurrencyCookie = Astro.cookies.get('activeCurrency')?.value || '';
const workspaceCurrencies = [
  currencyConfig.primary,
  ...(currencyConfig.secondary ? [currencyConfig.secondary] : []),
];
const activeCurrency =
  activeCurrencyCookie &&
  isValidCurrency(activeCurrencyCookie) &&
  workspaceCurrencies.includes(activeCurrencyCookie)
    ? activeCurrencyCookie
    : currencyConfig.primary;

// Build chart data from totals for active currency
const activeTotals = forecast.totals.find((t) => t.currency === activeCurrency);
const chartData: ForecastChartDataPoint[] = forecast.monthKeys.map((key) => {
  const m = activeTotals?.months[key];
  return {
    name: formatMonthHeader(key),
    income: m ? Number.parseFloat(m.income) : 0,
    expenses: m ? Number.parseFloat(m.expense) : 0,
    net: m ? Number.parseFloat(m.net) : 0,
  };
});

const selectedAccounts = filters.accountIds ?? [];
const forecastAccounts = accounts
  .map((account) => ({
    id: account.id,
    name: account.name,
    group: getAccountTypeLabel(account.type),
  }))
  .sort((a, b) => {
    const liquidLabels = new Set(['Cash', 'Bank Account', 'E-Wallet', 'Credit Card']);
    const aIsLiquid = liquidLabels.has(a.group);
    const bIsLiquid = liquidLabels.has(b.group);
    if (aIsLiquid && !bIsLiquid) return -1;
    if (!aIsLiquid && bIsLiquid) return 1;
    return a.name.localeCompare(b.name);
  });

function formatMonthHeader(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatSignedAmount(
  amount: string,
  type: 'income' | 'expense',
  currency: string
): string {
  const numeric = Number.parseFloat(amount);
  const signed = type === 'expense' ? -Math.abs(numeric) : Math.abs(numeric);
  return formatCurrency(signed.toFixed(2), currency);
}

function formatNegativeAmount(amount: string, currency: string): string {
  const numeric = Number.parseFloat(amount);
  return formatCurrency((-Math.abs(numeric)).toFixed(2), currency);
}

// Build filter URL helper for range picker links
function buildFilterUrl(overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (selectedAccounts.length > 0) params.set('accounts', selectedAccounts.join(','));
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/recurring/forecast?${qs}` : '/recurring/forecast';
}

const rangeOptions = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
  { value: 24, label: '24M' },
];
---

<ProtectedLayout title="Recurring Forecast" currentPath="/recurring/forecast">
  <div class="mx-auto max-w-7xl space-y-5 px-1 pb-10 sm:space-y-6 sm:px-2 lg:px-6">
    {/* Breadcrumb */}
    <Breadcrumb items={[{ label: 'Recurring', href: '/recurring' }, { label: 'Forecast' }]} />

    {/* Filters */}
    <section class="rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
      <form
        id="forecast-filters"
        method="get"
        action="/recurring/forecast"
        class="flex flex-wrap items-end gap-3"
      >
        <MultiSelectDropdown
          id="forecast-account"
          label="All Accounts"
          inputName="accounts"
          selectedIds={selectedAccounts}
          items={forecastAccounts}
          searchable={true}
          searchPlaceholder="Search accounts..."
          filterEventType="accounts"
          class="w-full max-w-xs"
        >
          <Wallet
            size={16}
            class="stroke-current text-base-content/40"
            aria-hidden="true"
            slot="icon"
          />
        </MultiSelectDropdown>

        <label class="form-control w-full max-w-[10rem]">
          <span class="label-text text-xs font-semibold">Type</span>
          <select
            name="type"
            class="select select-bordered select-sm w-full"
            data-auto-submit
          >
            <option value="" selected={!filters.type}>All</option>
            <option value="income" selected={filters.type === 'income'}>Income</option>
            <option value="expense" selected={filters.type === 'expense'}>Expense</option>
          </select>
        </label>

        {/* Range Picker */}
        <div class="form-control">
          <span class="label-text text-xs font-semibold">Range</span>
          <div
            class="flex gap-0.5 rounded-xl bg-base-200 p-1"
            role="group"
            aria-label="Forecast range"
          >
            {rangeOptions.map((opt) => (
              <a
                href={buildFilterUrl({
                  monthCount: opt.value === 12 ? undefined : String(opt.value),
                })}
                class:list={[
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition-all min-h-[32px] flex items-center',
                  monthCount === opt.value
                    ? 'bg-base-100 shadow text-primary'
                    : 'text-base-content/50 hover:text-base-content/70',
                ]}
                aria-current={monthCount === opt.value ? 'true' : undefined}
              >
                {opt.label}
              </a>
            ))}
          </div>
        </div>
      </form>
    </section>

    {/* Chart */}
    {chartData.length > 0 && (
      <ForecastCashflowChart data={chartData} currency={activeCurrency} />
    )}

    {/* Table */}
    {forecast.rows.length === 0 ? (
      <section class="rounded-3xl border border-base-300 bg-base-100 p-8 text-center shadow-sm">
        <p class="text-base-content/60">No recurring templates match the selected filters.</p>
      </section>
    ) : (
      <section class="relative rounded-3xl border border-base-300 bg-base-100 shadow-sm">
        {/* Right edge fade */}
        <div class="pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-8 rounded-r-3xl bg-gradient-to-l from-base-100 to-transparent" />

        <div class="overflow-x-auto">
          <table class="table w-full">
            <caption class="sr-only">Recurring forecast by template and month</caption>
            <thead class="sticky top-0 z-20 bg-base-100">
              <tr>
                <th class="sticky left-0 z-30 bg-base-100 min-w-[14rem] px-4 py-3">
                  Template
                </th>
                <th class="px-3 py-3 text-center whitespace-nowrap bg-base-100">Freq.</th>
                {forecast.monthKeys.map((key) => (
                  <th class="px-3 py-3 text-right whitespace-nowrap bg-base-100">{formatMonthHeader(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecast.rows.map((row, i) => (
                <tr
                  class:list={[
                    'hover:bg-base-200/30 transition-colors',
                    row.status === 'paused' && 'opacity-50',
                    i % 2 === 1 && 'bg-base-200/20',
                  ]}
                >
                  <th scope="row" class="sticky left-0 z-10 bg-base-100 px-4 py-3 text-left">
                    <div class="flex items-center gap-2">
                      <span
                        class:list={[
                          'inline-block h-2 w-2 shrink-0 rounded-full',
                          row.templateType === 'income' ? 'bg-success' : 'bg-error',
                        ]}
                        aria-hidden="true"
                      />
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="truncate text-sm font-medium">{row.templateName}</span>
                          {row.status === 'paused' && (
                            <span class="badge badge-ghost badge-xs whitespace-nowrap">
                              Paused
                            </span>
                          )}
                        </div>
                        <div class="truncate text-xs text-base-content/60">
                          <span>{row.account.name}</span>
                          <span class="mx-1 text-base-content/40">&bull;</span>
                          <span
                            class:list={[
                              'font-semibold',
                              row.templateType === 'income' ? 'text-success' : 'text-error',
                            ]}
                          >
                            {row.templateType === 'income' ? 'Income' : 'Expense'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </th>
                  <td class="px-3 py-3 text-center text-xs text-base-content/60">
                    {row.frequencyLabel}
                  </td>
                  {forecast.monthKeys.map((key) => (
                    <td class="px-3 py-3 text-right text-sm tabular-nums whitespace-nowrap">
                      {row.months[key] != null ? (
                        formatSignedAmount(row.months[key]!, row.templateType, row.currency)
                      ) : (
                        <span class="text-base-content/20">&mdash;</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

            {/* Totals — inside same table, same scroll container */}
            {forecast.totals.map((t) => (
              <tfoot class="border-t-2 border-base-300">
                <tr class="text-xs font-bold uppercase tracking-wide text-base-content/50">
                  <th
                    class="sticky left-0 z-10 bg-base-100 px-4 pt-4 pb-2 text-left"
                    colspan="2"
                  >
                    Totals ({t.currency})
                  </th>
                  {forecast.monthKeys.map(() => (
                    <td />
                  ))}
                </tr>
                <tr class="hover:bg-base-200/30 transition-colors">
                  <th
                    scope="row"
                    class="sticky left-0 z-10 bg-base-100 px-4 py-2 text-left text-sm font-medium text-success"
                  >
                    Income
                  </th>
                  <td />
                  {forecast.monthKeys.map((key) => (
                    <td class="px-3 py-2 text-right text-sm tabular-nums text-success whitespace-nowrap">
                      {t.months[key] ? formatCurrency(t.months[key].income, t.currency) : '—'}
                    </td>
                  ))}
                </tr>
                <tr class="hover:bg-base-200/30 transition-colors">
                  <th
                    scope="row"
                    class="sticky left-0 z-10 bg-base-100 px-4 py-2 text-left text-sm font-medium text-error"
                  >
                    Expense
                  </th>
                  <td />
                  {forecast.monthKeys.map((key) => (
                    <td class="px-3 py-2 text-right text-sm tabular-nums text-error whitespace-nowrap">
                      {t.months[key]
                        ? formatNegativeAmount(t.months[key].expense, t.currency)
                        : '—'}
                    </td>
                  ))}
                </tr>
                <tr class="font-bold hover:bg-base-200/30 transition-colors">
                  <th
                    scope="row"
                    class="sticky left-0 z-10 bg-base-100 px-4 py-2 text-left text-sm"
                  >
                    Net
                  </th>
                  <td />
                  {forecast.monthKeys.map((key) => (
                    <td class="px-3 py-2 text-right text-sm tabular-nums whitespace-nowrap">
                      {t.months[key] ? formatCurrency(t.months[key].net, t.currency) : '—'}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ))}
          </table>
        </div>
      </section>
    )}
  </div>
</ProtectedLayout>

<script>
  // Auto-submit form when type select changes or account dropdown updates
  function initForecastFilters(): void {
    const form = document.getElementById('forecast-filters') as HTMLFormElement | null;
    if (!form) return;

    form.querySelectorAll<HTMLSelectElement>('select[data-auto-submit]').forEach((select) => {
      select.addEventListener('change', () => form.submit());
    });

    const handleFilterChange = ((e: CustomEvent) => {
      if (e.detail?.type === 'accounts') {
        form.submit();
      }
    }) as EventListener;

    window.addEventListener('filterChange', handleFilterChange);

    // Cleanup on view transitions to prevent listener accumulation
    document.addEventListener(
      'astro:before-swap',
      () => window.removeEventListener('filterChange', handleFilterChange),
      { once: true }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForecastFilters);
  } else {
    initForecastFilters();
  }
  document.addEventListener('astro:after-swap', initForecastFilters);
</script>
```

**Key design decisions in this rewrite:**

- **Breadcrumb** replaces back button — reuses existing `Breadcrumb` atom: `Recurring > Forecast`.
- **Range picker uses `<a>` links** — no JS needed, server renders the correct URLs. Default (12) omits `monthCount` param for clean URLs.
- **Status always `'all'`** — hardcoded in frontmatter, no hidden input needed. Paused rows shown dimmed, no status dropdown.
- **Sticky `<thead>`** with `sticky top-0 z-20` — month headers stay visible when scrolling vertically on mobile. Template column header gets `z-30` (intersection of sticky-left + sticky-top).
- **Listener cleanup** — filterChange listener removed on `astro:before-swap` to prevent accumulation with view transitions.
- **Type select auto-submits** via `data-auto-submit` + client script.
- **Account dropdown auto-submits** by listening for `filterChange` custom event from `MultiSelectDropdown`.
- **Totals inside `<tfoot>`** of the same `<table>` — single scroll container. No separate `overflow-x-auto` div.
- **Right-edge fade** via absolute-positioned gradient div.
- **Zebra striping** via index-based class: `i % 2 === 1 && 'bg-base-200/20'`.
- **Paused rows** get `opacity-50` + `badge badge-ghost badge-xs`.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Run quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All PASS

**Step 4: Commit**

```bash
git add src/pages/recurring/forecast/index.astro
git commit -m "feat(forecast): redesign page with unified scroll, chart, range picker, and design system"
```

---

### Task 4: Verify and fix edge cases

**Step 1: Run existing forecast tests**

```bash
bun test src/services/recurring-forecast.service.test.ts
bun test src/__tests__/api/forecast.test.ts
```

Expected: All PASS (no service changes, only page changes)

**Step 2: Run full quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

**Step 3: Run build**

```bash
bun run build
```

Expected: PASS — no build errors

**Step 4: Visual verification in browser**

Start dev server and verify in Chrome:

1. Navigate to `/recurring/forecast`
2. Verify chart renders with stacked bars + net line
3. Scroll table horizontally — totals scroll with data (no desync)
4. Verify account dropdown shows "Credit Card", "Mutual Fund" (not CREDIT_CARD)
5. Change Type filter — page reloads immediately (no Filter button needed)
6. Click range picker buttons — page reloads with different month counts
7. Verify paused rows show dimmed with "Paused" badge
8. Verify right-edge fade instead of hard clipping
9. Verify breadcrumb shows "Recurring > Forecast" with link on "Recurring"
10. Check mobile view — filters stack, table scrolls

**Step 5: Fix any issues found, then final commit if needed**

---

### Summary of changes

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/utils/recurring-forecast-filters.ts` | Modify | Add `parseForecastMonthCount`, update `buildForecastFilters` |
| `src/lib/utils/recurring-forecast-filters.test.ts` | Modify | Tests for monthCount parsing |
| `src/components/organisms/ForecastCashflowChart.astro` | Create | Stacked bar + net line chart component |
| `src/pages/recurring/forecast/index.astro` | Rewrite | Full page redesign |

### Files NOT changed (no modifications needed)

- `src/services/recurring-forecast.service.ts` — already accepts `monthCount` param, already filters totals to active-only
- `src/lib/types/recurring.ts` — types unchanged
- `src/lib/chart-setup.ts` — already registers BarController, LineController
- `src/components/molecules/MultiSelectDropdown.astro` — reused as-is
