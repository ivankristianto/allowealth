# Design: Recurring Frequency & Forecast

**Date**: 2026-03-07
**Issue**: #181 — Add recurring bills tracking with weekly/monthly/yearly intervals
**Status**: Approved

## Problem

The current recurring system supports monthly-only recurrence. Users need:

1. Flexible frequencies: weekly, monthly, quarterly, semi-annual, annual
2. Bond/investment income tracking (e.g., every 6 months)
3. A tabular forecast view projecting 12 months of upcoming income and expenses
4. Filtering by account (multi-select) and type (income/expense)
5. Prediction of upcoming cash flow across all recurring templates

## Design Decisions

### D1: Two-Field Frequency Model

Add `frequency` (enum: `weekly` | `monthly`) and `interval_count` (integer, default 1) to `recurring_templates`.

| User Intent | frequency | interval_count |
|-------------|-----------|----------------|
| Weekly | weekly | 1 |
| Biweekly | weekly | 2 |
| Monthly | monthly | 1 |
| Quarterly | monthly | 3 |
| Semi-annual | monthly | 6 |
| Annual | monthly | 12 |

**Rationale**: Most flexible approach. New intervals (e.g., every 2 months) require no schema migration. UI presents friendly preset labels while storing the two fields.

### D2: Weekly Day Derived from Start Date

Weekly recurrences derive their day-of-week from `start_date`. No new `day_of_week` column. If a user creates a weekly recurring starting on Monday January 12, 2026, all occurrences fall on Mondays.

`day_of_month` remains on the schema but is only meaningful when `frequency=monthly`. For weekly templates it is ignored.

### D3: Forecast Page at `/recurring/forecast`

A separate page rather than a new tab on `/recurring`. Gives room for a wide table with 12 monthly columns plus filters without crowding the main recurring management page.

### D4: 12-Month Projection Window

The forecast projects 12 months ahead starting from the current month. Covers annual patterns (bonds, memberships) and gives a full-year cash flow picture.

### D5: Pure Computation for Forecast

Forecast data is computed from active (and optionally paused) templates using date math. No new occurrence rows are created in the database. The existing `calculateDueDate()` function is called in a loop for each template to determine which months have occurrences.

### D6: Forecast Shows Active + Paused, Filterable by Status

- Active templates shown normally, contribute to totals
- Paused templates shown with reduced opacity, excluded from totals
- Status filter (default: active) lets users toggle visibility
- Cancelled/completed templates excluded

### D7: Separate Totals Per Currency

Multi-currency workspaces get separate total rows per currency (income, expense, net). No exchange rate conversion. Consistent with existing `RecurringMonthlySummary` patterns.

## Schema Changes

### `recurring_templates` — Add Two Columns

```sql
ALTER TABLE recurring_templates ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE recurring_templates ADD COLUMN interval_count INTEGER NOT NULL DEFAULT 1;
```

| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| `frequency` | text enum (`weekly`, `monthly`) | `monthly` | NOT NULL |
| `interval_count` | integer | `1` | NOT NULL, >= 1 |

Existing templates automatically become `monthly` / `1` with zero data migration.

Both SQLite and PostgreSQL schemas must be updated.

## Due Date Calculation

Replace the current monthly-only `calculateDueDate()`:

```
calculateDueDate(startDate, dayOfMonth, occurrenceOffset)
```

With a frequency-aware version:

```
calculateDueDate(startDate, dayOfMonth, occurrenceOffset, frequency, intervalCount)
```

**Monthly** (`frequency=monthly`): Same logic as today but the month offset is `occurrenceOffset * intervalCount` instead of `occurrenceOffset`. Handles day clamping for short months.

**Weekly** (`frequency=weekly`): `startDate + (occurrenceOffset * intervalCount * 7)` days. `dayOfMonth` is ignored.

## Validation Schema Updates

- Add `frequency` (enum `weekly` | `monthly`, default `monthly`) to create/update schemas
- Add `interval_count` (integer, min 1, max 52, default 1)
- `day_of_month` required only when `frequency=monthly`; optional/ignored for weekly
- Both service-layer and API-layer schemas updated

## Form UI Changes

Add a "Frequency" section to `RecurringTemplateForm` between the type selector and amount field.

```
+-------------------------------------------+
| Frequency                                 |
|  [Monthly v]  every  [1 v]  month(s)      |
|                                           |
|  Presets:                                 |
|  [Weekly] [Monthly] [Quarterly]           |
|  [Semi-annual] [Annual]                   |
+-------------------------------------------+
```

- Dropdown for frequency (Weekly/Monthly) + number input for interval
- Quick-select preset buttons for common patterns
- When `frequency=weekly`: hide "Day of month" field
- When `frequency=monthly`: show "Day of month" field

## Forecast Page

### Route

`/recurring/forecast` — new Astro page under `src/pages/recurring/forecast/index.astro`.

### Navigation

Add a "Forecast" link/button on the main `/recurring` page header, linking to `/recurring/forecast`. The forecast page has a "Back to Recurring" link.

### Layout

```
+---------------------------------------------------------------------+
| <- Back to Recurring          Recurring Forecast                     |
+---------------------------------------------------------------------+
| Filters:                                                             |
| [Account v multi-select]  [Type v all/income/expense]                |
| [Status v active(default)/paused/all]                                |
+--------------+--------+---------+---------+---- ... ----------------+
| Name         | Freq.  | Mar '26 | Apr '26 |      ... +12 months    |
+--------------+--------+---------+---------+---- ... ----------------+
| + Salary     | Monthly|  5,000  |  5,000  |                         |
| o Bonus      | Annual |    --   |    --   |  (paused, greyed out)   |
| + ABC Bond   | 6mo    |    --   |    --   |  300 (Jul '26)          |
| - Rent       | Monthly| -2,000  | -2,000  |                         |
| - Netflix    | Monthly|   -15   |    -15  |                         |
+--------------+--------+---------+---------+---- ... ----------------+
| Income (IDR) |        |5,000,000|5,000,000|                         |
| Expense(IDR) |        |2,015,000|2,015,000|                         |
| Net (IDR)    |        |2,985,000|2,985,000|                         |
| Income (USD) |        |    --   |    --   |  300                    |
| Expense(USD) |        |    --   |    --   |                         |
| Net (USD)    |        |    --   |    --   |  300                    |
+--------------+--------+---------+---------+---- ... ----------------+
```

### Row Details

- One row per active (or paused) recurring template, filtered by account/type/status
- Income rows show positive amounts; expense rows show negative
- Paused templates: reduced opacity, excluded from footer totals
- Cells show amount when an occurrence falls in that month, "--" when none

### Footer Totals

- Grouped by currency
- Each currency gets income / expense / net rows
- Only active templates contribute to totals

### Mobile

- Sticky first column (Name)
- Horizontal scroll for month columns

## Forecast Service

### New Service Method

`RecurringForecastService.getForecast(workspaceId, filters, monthCount)`:

- Fetches active (and optionally paused) templates matching filters
- For each template, calls `calculateDueDate()` in a loop to project occurrences across `monthCount` months
- Returns structured data: `{ rows: ForecastRow[], totals: ForecastTotals }`

### Types

```typescript
interface ForecastFilters {
  accountIds?: string[];
  type?: 'income' | 'expense';
  status?: 'active' | 'paused' | 'all';
}

interface ForecastRow {
  templateId: string;
  templateName: string;
  templateType: 'income' | 'expense';
  frequency: string;      // display label, e.g. "Monthly", "6mo"
  currency: string;
  status: 'active' | 'paused';
  category: { id: string; name: string; icon: string; color: string };
  account: { id: string; name: string };
  months: Record<string, string | null>;  // monthKey -> amount or null
}

interface ForecastCurrencyTotals {
  currency: string;
  months: Record<string, { income: string; expense: string; net: string }>;
}

interface ForecastResult {
  rows: ForecastRow[];
  totals: ForecastCurrencyTotals[];
  monthKeys: string[];  // ordered list of month keys for column headers
}
```

## Performance & Caching

### Caching Strategy

Forecast data changes only when templates are mutated (create, update, pause, resume, cancel). It does not change hourly. This makes it ideal for aggressive caching.

**Cache key**: `CacheKeys.recurringForecast(workspaceId, filtersHash)`
- Pattern: `cache:recurring-forecast:{workspaceId}:{filtersHash}`
- `filtersHash` covers: account IDs, type filter, status filter, month count

**Cache tag**: `CacheTags.RECURRING_FORECAST` (new tag: `'recurring-forecast'`)

**TTL**: 6 hours (21600 seconds). Rationale:
- Existing recurring TTLs: 900s (occurrences), 1800s (templates)
- Forecast is even more stable — pure projections, not actionable items
- Template mutations trigger invalidation immediately regardless of TTL
- Most users check forecast once a day or less

**Invalidation**: Add `CacheTags.RECURRING_FORECAST` to the existing `invalidateWorkspaceCache()` in both `RecurringTemplateService` and `RecurringOccurrenceService`. These already fire on all template mutations (create, update, pause, resume, cancel) and occurrence mutations (confirm, skip).

### Computation Cost

- Iterates active templates (typically 10-50 per workspace)
- For each template: up to 12 calls to `calculateDueDate()` (pure arithmetic)
- Total: ~600 date calculations worst case, sub-millisecond
- DB cost: single query to fetch templates with relations — same as existing `findAll`

## Documentation Updates

### New Architecture Doc

`docs/architecture/014-recurring-frequency-forecast.md`:
- Documents frequency model decision (two-field approach)
- Documents forecast computation approach (pure date math)
- Documents caching strategy (6h TTL, tag-based invalidation)
- References ADR 008 for cache patterns

### Update User Guide

`docs/sites/src/content/docs/end-users/recurring.md`:
- Update "Frequency Options" table to explain flexible intervals
- Add section about Forecast view with link
- Update "Creating Templates" to include frequency selector

### New User Guide

`docs/sites/src/content/docs/end-users/recurring-forecast.md`:
- How to read the forecast table
- How filters work (accounts, type, status)
- What predictions mean and limitations
- Separate from existing `forecast.md` (wealth trajectory calculator)

## What Does NOT Change

- Occurrence generation model (still creates real rows for actionable months)
- Queue/Calendar views on `/recurring`
- Confirm/Skip workflow
- Installment tracking
- Cash Flow Widget integration
- API endpoint structure (just new fields on existing endpoints)

## Implementation Order

Following UI -> Service -> API -> CLI -> Seeder:

1. Schema migration — add `frequency` + `interval_count` columns (both SQLite + PostgreSQL)
2. `calculateDueDate` rewrite — frequency-aware, with tests
3. Validation schemas — add new fields, conditional `day_of_month`
4. Types — update `RecurringTemplate` interface
5. Template service — accept/persist new fields, update `_generateForTemplate`
6. Form UI — frequency selector with presets
7. API endpoints — accept new fields in create/update
8. Forecast service — new `RecurringForecastService` with caching
9. Forecast page — `/recurring/forecast` with table, filters, mobile scroll
10. Navigation — link from `/recurring` to forecast
11. Architecture doc — `014-recurring-frequency-forecast.md`
12. User guides — update `recurring.md`, create `recurring-forecast.md`
13. Seeder — add sample templates with various frequencies
