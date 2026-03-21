# Account History Inline — Sparkline Design

**Date:** 2026-03-21
**Branch:** accounts-table-ui
**Scope:** `src/components/partials/AccountHistoryPartial.astro`

## Problem

The current inline history table has three issues:

1. Balance values lack a currency prefix (shows `117,801,500` instead of `Rp 117,801,500`).
2. The notes column is always empty and wastes horizontal space.
3. There is no visual indication of trend direction or magnitude — the user must read numbers to understand whether an account is growing or declining.

## Solution

Add a server-side SVG sparkline above the existing rows, simplify the row columns, and add a % change column. No new dependencies. No additional database queries.

## Scope

**One file:** `src/components/partials/AccountHistoryPartial.astro`

**One prop added:** `currency: Currency` — required to format balances with the correct symbol.

The prop must be threaded through the API route that renders this partial. The partial is fetched via `GET /api/accounts/:id/history?limit=10&_render=html`. The account's currency is already available at that endpoint.

## Sparkline

### Rendering

- Inline SVG, computed entirely server-side in the Astro frontmatter.
- No client JavaScript. No Chart.js. No new dependencies.
- Dimensions: full container width × 44px tall.

### Data

- Source: the same 10 `HistoryEntry` records already fetched for the table. No extra query.
- Each entry's `balance` (parsed as float) maps to a Y coordinate.
- Entries are ordered newest-first in the array; the SVG plots them left = oldest, right = newest.

### SVG construction

```
minBalance = Math.min(...balances)
maxBalance = Math.max(...balances)
range = maxBalance - minBalance (floor at 1 to avoid division by zero)

For each entry at index i (oldest = 0, newest = n-1):
  x = (i / (n - 1)) * svgWidth
  y = 44 - ((balance - minBalance) / range) * 40 + 2   // 2px top padding
```

Elements rendered:
- `<path>` area fill from the polyline down to the baseline, green with low opacity.
- `<polyline>` line connecting all points, green stroke, 2px, rounded joins.
- `<circle>` endpoint dot at the rightmost (newest) point, green fill.

### Growth annotation

Below the SVG, a single row shows:

```
[oldest date]          +X.X% (N entries)          Now
```

Computed as:

```
growth = (newestBalance - oldestBalance) / oldestBalance * 100
```

- Positive growth: green text.
- Negative growth: red text.
- If only one entry: skip the annotation row entirely.
- Period label: `formatDate(entries[last].recorded_at)` on the left, `"Now"` on the right.

## Row Columns

**Before:**

| Date | Balance | Change | Notes |
|------|---------|--------|-------|

**After:**

| Date | Balance | Change | % |
|------|---------|--------|---|

Changes:
- **Balance**: formatted with `formatCurrency(balance, currency)` — adds the currency prefix.
- **Change**: unchanged — colored green/red/muted, prefixed with `+`.
- **%**: new column. Muted text. Computed as `(change / prevBalance) * 100`, formatted to one decimal place. Shown as `+X.X%` or `−X.X%`. Last entry shows `—`.
- **Notes**: removed.

## Edge Cases

| Condition | Behavior |
|-----------|----------|
| 0 entries | Existing "No history entries yet." empty state — no change. |
| 1 entry | Sparkline omitted (cannot draw a meaningful line). Growth annotation omitted. Single row with `—` for change and %. |
| All balances identical | `range = 0` guarded: render a flat horizontal line at mid-height. |
| Negative balance (debt accounts) | SVG uses raw float values. Formatting uses `formatCurrency` which handles sign. |

## What Does Not Change

- The `AccountTableRow.astro` component — no structural changes.
- The client-side toggle logic in `AccountInlineHistory.client.ts` — no changes.
- The API route handler — only the `currency` prop needs to be passed when calling the partial.
- The "View all history →" link — unchanged.
- Accessibility attributes (`role="region"`, `aria-live`, `aria-label`) — unchanged.

## Files Changed

| File | Change |
|------|--------|
| `src/components/partials/AccountHistoryPartial.astro` | Add sparkline, % column, currency prop, remove notes column |
| API route rendering the partial | Pass `currency` prop |
