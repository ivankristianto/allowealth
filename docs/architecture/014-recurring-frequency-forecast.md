# ADR 014: Recurring Frequency Model & Forecast

## Status

Accepted

## Context

The recurring system originally supported monthly-only recurrence. Users need weekly, quarterly, semi-annual, and annual intervals for bills, bond income, and subscriptions. Users also want a 12-month cash flow forecast showing predicted income and expenses.

## Decision

### Frequency Model

Two-field approach on `recurring_templates`:

- `frequency` (text enum: `weekly` | `monthly`, default `monthly`)
- `interval_count` (integer, default 1)

This combination represents any interval without schema migrations for new frequencies. Weekly intervals derive their day-of-week from `start_date` — no additional column needed.

### Forecast Computation

Forecasts are computed via pure date math, not pre-generated occurrence rows. The `calculateDueDate()` utility is called in a loop for each template to determine which months have occurrences. This avoids database bloat and makes forecast computation stateless.

### Caching

Forecast data uses a 6-hour TTL (21600s) with tag-based invalidation via `CacheTags.RECURRING_FORECAST`. All template mutations (create, update, pause, resume, cancel) and occurrence mutations (confirm, skip) invalidate the forecast cache. This is safe because forecast data only changes when templates change.

## Consequences

Positive:

- Flexible frequency model supports current and future interval needs
- No schema migration needed for new intervals (e.g., biweekly)
- Forecast computation is fast (pure arithmetic) and heavily cached
- Existing monthly templates work unchanged (defaults apply)

Tradeoffs:

- Weekly occurrence generation produces more rows than monthly
- Forecast is a projection, not a guarantee (variable amounts differ)
- Cache invalidation scope includes forecast tag on every template mutation

## References

- Design doc: `docs/plans/2026-03-07-recurring-frequency-forecast-design.md`
- Cache architecture: ADR 008 (`docs/architecture/008-cache-abstraction.md`)
- Forecast service: `src/services/recurring-forecast.service.ts`
- Date calculation: `src/lib/utils/recurring-dates.ts`
