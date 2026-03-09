# Recurring Forecast UX Redesign

Full redesign of `/recurring/forecast` to fix a data integrity bug, improve readability, and align with the design system.

## Problems

1. **Scroll desync (critical):** Data rows and totals have independent horizontal scrollbars. A user scrolling data to August still sees March totals. Financial data misread risk.
2. **Design system non-compliance:** Page uses raw styling instead of DaisyUI/design-system patterns.
3. **No visual summary:** Users must read column-by-column to assess cashflow trends.
4. **Raw enum labels:** Account groups show `CREDIT_CARD`, `MUTUAL_FUND` instead of human-readable names.
5. **Inconsistent filter behavior:** Account dropdown applies immediately; type and status require a "Filter" button click.
6. **Hidden paused items:** Active filter silently hides paused templates with no indicator.
7. **Fixed time window:** No way to change the 12-month forecast range.
8. **Poor readability:** Tight spacing, no row striping, no hover, clipped numbers at right edge.
9. **Wrong back button label:** Says "Recurring Forecast" (current page) instead of "Recurring" (destination).

## Design

### Page Layout

```
┌──────────────────────────────────────────────────┐
│ Recurring > Forecast                             │
├──────────────────────────────────────────────────┤
│ [All Accounts ▼]  [Type ▼]   [3M|6M|12M|24M]    │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │  Stacked bar chart (income + expense)        │ │
│ │  + net cashflow line overlay                 │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │ Template    │ Freq    │ Mar │ Apr │ May │ …  │ │
│ │─────────────│─────────│─────│─────│─────│────│ │
│ │ Salary      │ Monthly │ +5M │ +5M │ +5M │    │ │
│ │ Rent (dim)  │ Monthly │ -2M │ -2M │ -2M │    │ │
│ │─────────────│─────────│─────│─────│─────│────│ │
│ │ Income      │         │  5M │  5M │  5M │    │ │
│ │ Expense     │         │ -3M │ -3M │ -3M │    │ │
│ │ Net         │         │  2M │  2M │  2M │    │ │
│ └──────────────────────────────────────────────┘ │
│                                 ▓░░ (fade edge)  │
└──────────────────────────────────────────────────┘
```

### 1. Single Scroll Container (Critical Fix)

Header, data rows, and totals share one `overflow-x-auto` wrapper. No separate scrollbars. Template name column stays sticky-left. Month headers stay sticky-top.

### 2. Filters

- **Account dropdown:** Existing `MultiSelectDropdown` with formatted group labels ("Credit Card", not "CREDIT_CARD"). Immediate apply on change.
- **Type:** `All | Income | Expense` select. Immediate apply, no Filter button.
- **Status filter:** Removed. Paused items always visible but dimmed (see below).
- **Range picker:** Segmented button group `3M | 6M | 12M | 24M`, default `12M`. Applies immediately via `monthCount` URL param.
- No "Filter" button. All filters apply on change.

### 3. Cashflow Chart

- **Type:** Stacked bar chart with net line overlay.
- **Bars:** Income (success color) stacked with expense (error color) per month.
- **Line:** Net cashflow overlaid on the bars.
- **Currency:** Uses the active currency from the header selector. One currency per view.
- **Tech:** Chart.js via `chart-setup.ts` and `createChartLifecycle()`. Lazy-loaded with IntersectionObserver.
- **Data source:** Same `ForecastResult` from the server. Chart data passed to client via `data-*` attributes.

### 4. Table Styling

Follow the design system table patterns:

- Card wrapper: `rounded-3xl border border-base-300 bg-base-100 shadow-sm`
- Cell padding: `px-3 py-3` (wider than current)
- Zebra striping: alternating `bg-base-200/20`
- Row hover: `hover:bg-base-200/30`
- Right-edge fade gradient instead of hard character clipping
- `tabular-nums` on all amount cells
- Sticky left column (template name + frequency)
- Sticky top row (month headers)

### 5. Paused Items

- Always shown, never hidden by a status filter.
- Rendered with reduced opacity (`opacity-50`) and a "Paused" badge beside the template name.
- Do not contribute to totals (existing service behavior, no change needed).

### 6. Breadcrumb Navigation

Replace the back button with a breadcrumb: `Recurring > Forecast`. Reuse the existing `Breadcrumb` atom component. "Recurring" links to `/recurring`; "Forecast" is the current page (no link).

### 7. Data Flow

- The service `getForecast()` already accepts a `monthCount` parameter. The page currently hardcodes 12.
- Page reads `monthCount` from URL search params, defaults to 12.
- No new API endpoints. Server-rendered with form-based filtering.
- Chart data derived from `ForecastResult.totals` for the active currency.

## Out of Scope

- Multi-currency chart (chart shows active currency only; table handles multi-currency detail)
- Custom date range beyond the four presets
- Extracting a shared `AccountMultiSelect` wrapper component (label fix only for now)
