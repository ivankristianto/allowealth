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

Add a server-side SVG sparkline above the existing rows, simplify the row columns, and add a % change column. No new dependencies. No additional database queries beyond one lightweight account lookup.

## Scope

**Primary file:** `src/components/partials/AccountHistoryPartial.astro`

**One prop added:** `currency: Currency` — required to format balances with the correct symbol.

### Threading `currency` through the API route

The partial is fetched via `GET /api/accounts/:id/history` rendered in `src/pages/api/accounts/[id]/history.ts`. That route currently calls `accountService.getHistory(...)` which returns only history rows — the account's currency is not included.

To obtain the currency, call `accountService.findById(id, auth.workspaceId)` (or the equivalent method that returns the full account object) **before** rendering the partial. Pass `account.currency` as the `currency` prop. This adds one lightweight indexed lookup by primary key — acceptable overhead for an authenticated route.

```ts
// In history.ts, inside the HTML render branch:
const account = await accountService.findById(id, auth.workspaceId);
const container = await AstroContainer.create();
const html = await container.renderToString(AccountHistoryPartial, {
  props: {
    entries: history,
    accountId: id,
    currency: account.currency,
  },
});
```

## Sparkline

### Rendering

- Inline SVG, computed entirely server-side in the Astro frontmatter.
- No client JavaScript. No Chart.js. No new dependencies.
- SVG element: `width="100%"` `height="44"` `viewBox="0 0 100 44"` — scales to the container width at all breakpoints.

### Data

- Source: the same 10 `HistoryEntry` records already fetched for the table. No extra query.
- Each entry's `balance` (parsed as float) maps to a Y coordinate.
- Entries are ordered newest-first in the array; the SVG plots them **left = oldest, right = newest** (reversed index order).

### SVG construction

**Only evaluated when `entries.length >= 2`.** The 1-entry and 0-entry cases skip the sparkline entirely (see Edge Cases).

```
balances = entries.map(e => parseFloat(e.balance)).reverse()  // oldest first
n = balances.length

minBalance = Math.min(...balances)
maxBalance = Math.max(...balances)
range = maxBalance - minBalance

// Coordinate space: viewBox 0 0 100 44, so treat svgWidth = 100
For each balance at index i:
  x = (i / (n - 1)) * 100
  y = range === 0
      ? 22                                           // flat line at mid-height
      : 42 - ((balance - minBalance) / range) * 40  // 2px bottom padding, 40px usable height
```

Elements rendered:
- `<path>` area fill from the polyline down to `y=44`, green fill with low opacity (`fill-opacity="0.12"`).
- `<polyline>` line connecting all points, green stroke (`stroke="#16a34a"`), `stroke-width="1.5"`, `stroke-linejoin="round"` `stroke-linecap="round"`.
- `<circle>` endpoint dot at the rightmost (newest) point, `r="2"`, green fill.

### Growth annotation

Below the SVG, a single flex row shows:

```
[oldest date]          +X.X% (N entries)          Now
```

Computed as:

```
oldestBalance = balances[0]   // after reversing to oldest-first
newestBalance = balances[n-1]
growth = (newestBalance - oldestBalance) / oldestBalance * 100
```

Rules:
- If `oldestBalance === 0`: skip the annotation entirely (no `%` label shown).
- If only one entry: skip the annotation row entirely.
- Positive growth: green text (`text-success`).
- Negative growth: red text (`text-error`).
- Period label: `formatDate(entries[entries.length - 1].recorded_at)` on the left (oldest date), `"Now"` on the right.

## Row Columns

**Before:**

| Date | Balance | Change | Notes |
|------|---------|--------|-------|

**After:**

| Date | Balance | Change | % |
|------|---------|--------|---|

Changes:
- **Balance**: formatted with `formatCurrency(balance, currency)` — adds the currency prefix.
- **Change**: unchanged — colored `text-success` / `text-error` / `text-base-content/50`, prefixed with `+` where positive.
- **%**: new column, muted text (`text-base-content/40`). Rules:
  - Last entry (oldest, no prior row): show `—`.
  - `prevBalance === 0`: show `—` (avoid division by zero).
  - Otherwise: `(change / Math.abs(prevBalance)) * 100`, formatted to one decimal place. Shown as `+X.X%` or `−X.X%`.
  - Note: for debt accounts `prevBalance` is negative; using `Math.abs(prevBalance)` as the denominator gives the correct magnitude ratio.
- **Notes**: removed.

## Edge Cases

| Condition | Behavior |
|-----------|----------|
| 0 entries | Existing "No history entries yet." empty state — no sparkline, no table. |
| 1 entry | Sparkline omitted. Growth annotation omitted. Single row with `—` for change and %. |
| All balances identical (`range === 0`) | Flat horizontal line at `y = 22` (mid-height). Growth annotation shows `+0.0%`. |
| `oldestBalance === 0` (growth annotation) | Skip the `%` annotation — do not divide by zero. |
| `prevBalance === 0` (per-row %) | Show `—` in the % column. |
| Negative balance (debt accounts) | SVG uses raw float values — works correctly. Per-row % uses `Math.abs(prevBalance)` as denominator. `formatCurrency` handles negative display. |

## What Does Not Change

- The `AccountTableRow.astro` component — no structural changes.
- The client-side toggle logic in `AccountInlineHistory.client.ts` — no changes.
- The "View all history →" link — unchanged.
- Accessibility attributes (`role="region"`, `aria-live`, `aria-label`) — unchanged.

## Files Changed

| File | Change |
|------|--------|
| `src/components/partials/AccountHistoryPartial.astro` | Add sparkline, % column, `currency` prop, remove notes column |
| `src/pages/api/accounts/[id]/history.ts` | Call `accountService.findById` to get currency; pass `currency` prop to partial |
| `src/__tests__/account-history-partial.test.ts` | New file: assert sparkline present for 2+ entries, omitted for 0 and 1 entries; assert `%` column header present, `Notes` header absent |
