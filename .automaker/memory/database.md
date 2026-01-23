---
tags: [database]
summary: database implementation decisions and patterns
relevantTo: [database]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---

# database

### Store monetary amounts and percentages as text rather than numeric types to preserve decimal precision across currencies and calculations. (2026-01-23)

- **Context:** Amounts like transaction totals, category budgets, asset balances, and exchange rates require exact decimal handling in SQLite/Drizzle.
- **Why:** SQLite lacks a fixed-precision decimal type; storing as text avoids floating-point rounding errors and keeps values stable across conversions and reports.
- **Rejected:** Using REAL/float columns was avoided because it introduces rounding drift in financial summaries.
- **Trade-offs:** Easier to preserve precision; harder to perform numeric aggregations without casting and validation.
- **Breaking if changed:** Switching to REAL would silently alter historical totals and could corrupt reporting/forecast accuracy.

### Use integer timestamps (ms since epoch via sqliteTimestampNow) for created/updated/recorded dates. (2026-01-23)

- **Context:** Many tables track creation, updates, and time-based queries (sessions, transactions, asset history, reminders).
- **Why:** Integer milliseconds are consistent across tables and easy to compare/sort without timezone parsing issues.
- **Rejected:** Storing timestamps as text/ISO strings was avoided to reduce parsing overhead and format inconsistencies.
- **Trade-offs:** Simpler comparisons and indexing; requires explicit formatting at the app layer.
- **Breaking if changed:** Changing to text dates would break existing queries/index expectations and require a data migration plus application date parsing updates.

#### [Pattern] Cascade deletes on most user-owned records ensure data cleanup when a user is removed. (2026-01-23)

- **Problem solved:** Users own categories, payment methods, transactions, assets, snapshots, sessions, and reset tokens.
- **Why this works:** Enforces referential integrity and prevents orphaned financial data after account deletion.
- **Trade-offs:** Simplifies lifecycle management; makes hard-delete irreversible without backups.

#### [Gotcha] Some foreign keys (e.g., transactions.category_id/payment_method_id, asset_snapshot_items.asset_id) do not specify onDelete behavior, relying on SQLite defaults. (2026-01-23)

- **Situation:** Not all relationships are configured with explicit delete rules.
- **Root cause:** Likely left as default to prevent accidental deletions of historical records when a related entity is removed.
- **How to avoid:** Protects history; requires explicit handling for deletes to avoid FK violations or dangling references.

#### [Pattern] Use snapshot and history tables (asset_history, asset_snapshots, asset_snapshot_items) to preserve point-in-time asset states. (2026-01-23)

- **Problem solved:** Assets change over time and reports need historical balances independent of current asset values.
- **Why this works:** Separating snapshots from live assets supports accurate historical reporting and period comparisons.
- **Trade-offs:** More tables and writes; much better auditability and reporting accuracy.
