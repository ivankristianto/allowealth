# CSV Import Performance — Design

**Issue:** [#207](https://github.com/ivankristianto/allowealth/issues/207)
**Date:** 2026-02-11
**Status:** Approved

## Problem

CSV import executes 3-4 database queries per row via `create()`, producing ~3,000 queries for a 500-row file. Cache invalidation and audit logging also fire per row.

## Decisions

| Decision              | Choice                                                      | Rationale                                          |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Bulk vs single create | Dedicated `bulkInsert()` method                             | Clean separation, no risk to single-row `create()` |
| Atomicity             | Two-phase: validate all, then insert all in one transaction | Per-row error reporting preserved, atomic insert   |
| Duplicate detection   | Date-scoped query instead of 10k fetch                      | Targets only relevant rows, indexable              |
| Audit logging         | Single entry per import                                     | One meaningful event, not 500 identical entries    |

## Architecture

```
importFromCSV(rows, columnMapping, workspaceId)
  │
  ├─ Phase 1: Validate all rows (pure, no DB writes)
  │   ├─ Pre-load: categories map, assets map (2 queries)
  │   ├─ Duplicate detection via date-scoped query (1 query)
  │   └─ Loop rows → validate against in-memory maps + duplicate set
  │       → Collect: validRows[], errors[]
  │
  ├─ Phase 2: Bulk insert valid rows (single transaction)
  │   └─ db.transaction(() => { batch INSERT validRows })
  │
  └─ Post-insert (once):
      ├─ Single audit log entry
      └─ Single cache invalidation
```

### Query Count Comparison

| Operation                  | Current (500 rows) | New (500 rows)  |
| -------------------------- | ------------------ | --------------- |
| Category/asset pre-load    | 2                  | 2               |
| Duplicate detection        | 1 (fetch 10k)      | 1 (date-scoped) |
| Per-row validation queries | 1,500-2,000        | 0               |
| Insert                     | 500                | 1 (batch)       |
| Audit log                  | 500                | 1               |
| Cache invalidation         | 500                | 1               |
| **Total**                  | **~3,000**         | **~5**          |

## `bulkInsert()` Method

**Location:** `src/services/transaction.service.ts`

```typescript
private bulkInsert(
  validRows: NewTransaction[],
  workspaceId: string
): { inserted: number } | { error: string }
```

- Accepts pre-validated rows with IDs already resolved
- Single `db.transaction()` with sync callback (better-sqlite3 requirement)
- Uses `db.insert(transactions).values(validRows)` for batch insert
- No `.returning()` — not needed for import flow
- No validation, audit logging, or cache invalidation (caller handles)

## Phase 1: Validation

Refactored `importFromCSV()` validation loop:

1. Pre-load category map (`Map<lowercase_name, id>`) and asset map (`Map<lowercase_name, asset_object>`) — 2 queries, same as current
2. Duplicate detection: `SELECT ... FROM transactions WHERE workspace_id = ? AND date IN (unique_dates_from_csv)` — builds Set from results. Scoping by date keeps query small and indexable
3. Loop all rows with zero DB queries:
   - Parse/validate date, type, amount, currency (pure checks)
   - Resolve category name → id via map
   - Resolve asset name → object via map, check `status !== 'closed'`
   - For transfers: resolve destination asset
   - Check composite key against duplicate Set
   - Add composite key to Set (catches intra-file duplicates)
   - Valid → `validRows[]`, invalid → `errors[]`

## Phase 2: Insert

- Call `bulkInsert(validRows, workspaceId)`
- On success: proceed to post-insert
- On failure: return top-level error (Phase 1 should catch all data issues; transaction failures are unexpected)

## Post-Insert

- Single audit log: `{ action: 'import', entity_type: 'transaction', details: { imported, skipped, total, source: 'csv' } }`
- Single cache invalidation: workspace, transactions, dashboard, budget tags

## Scope

**Changed:** `src/services/transaction.service.ts` — refactored `importFromCSV()` + new `bulkInsert()`

**Unchanged:** CSV parsing, API endpoint, UI, column mapping, error display format

## Acceptance Criteria

- Import completes in under 5 seconds for 500 rows
- All existing validation preserved (duplicates, closed accounts, inactive categories)
- Per-row error reporting works correctly
- Valid rows insert atomically (all or none)
