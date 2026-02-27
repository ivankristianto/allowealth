# Transaction Bulk Operations — Design

**Issue:** #272
**Date:** 2026-02-23
**Status:** Approved

## Summary

Add multi-select checkboxes to the transaction list with a sticky bottom action bar for bulk operations: change category, change account, and delete. Operates on current page only.

## Scope

**In scope:**

- Checkbox per transaction row + "select all" for current page
- Sticky bottom action bar with: Change Category, Change Account, Delete
- Single `POST /api/transactions/bulk` endpoint
- Service layer bulk methods that preserve per-transaction audit logging
- Confirmation modal for bulk delete

**Out of scope:**

- Cross-page selection (current page only)
- Mark cleared (no `cleared_at` column yet — separate feature)
- Bulk split or amount editing
- Undo/undo-history

## Decisions

| Decision                 | Choice                        | Rationale                                 |
| ------------------------ | ----------------------------- | ----------------------------------------- |
| Payment method = account | `account_id` column           | Already exists in schema                  |
| Mark cleared             | Deferred                      | No schema column yet                      |
| Architecture             | Single bulk API endpoint      | Clean, preserves audit trail, simple      |
| Action bar position      | Sticky bottom                 | Visible while scrolling, standard pattern |
| Value picker UX          | Inline dropdown in action bar | Quick, no extra modal step                |

## UI Design

### Checkboxes

- Always visible on each `TransactionCard` (left side)
- Desktop: leftmost column in the horizontal layout
- Mobile: first element in the row
- Uses `data-transaction-id` attribute for binding

### Select All

- Checkbox above the first date group in `TransactionDateGroups`
- Shows "X of Y selected" count
- Toggles all visible transactions on current page

### Sticky Bottom Action Bar

Appears when 1+ transactions selected. Fixed to viewport bottom.

```
┌──────────────────────────────────────────────────────────────────┐
│  ✕  3 selected    [Change Category ▾]  [Change Account ▾]  [Delete]  │
└──────────────────────────────────────────────────────────────────┘
```

- `✕` clears selection
- "Change Category" / "Change Account" open inline dropdowns
- Dropdowns list active categories (filtered by expense/income type) and active accounts
- Selecting a value immediately fires the bulk action
- "Delete" opens confirmation modal: "Delete N transactions? This cannot be undone."
- DaisyUI styling: `bg-base-100 shadow-lg border-t border-base-300`

## Client-Side State

### Nano Store

```typescript
// Selection state
selectedTransactionIds: WritableAtom<Set<string>>;
```

No separate "select mode" toggle — checking any box naturally enters bulk mode.

### Event Flow

1. Check box → `selectedTransactionIds` updated → action bar visible
2. Click action → dropdown opens (category/account) or confirm modal (delete)
3. Pick value / confirm → `POST /api/transactions/bulk`
4. Success → toast "N transactions updated/deleted" → clear selection → re-fetch page
5. Error → toast error → selection preserved for retry

### Filter Interaction

- Changing any filter clears the selection
- Bulk action sends explicit IDs (filter-independent)
- Page navigation clears selection

## API Design

### `POST /api/transactions/bulk`

**Request:**

```json
{
  "action": "update_category" | "update_account" | "delete",
  "ids": ["id1", "id2", "id3"],
  "payload": {
    "category_id": "cat-123",
    "account_id": "acc-456"
  }
}
```

**Response (success):**

```json
{ "updated": 3, "failed": 0 }
```

**Response (partial failure):**

```json
{
  "updated": 2,
  "failed": 1,
  "errors": [{ "id": "id3", "error": "Transaction not found" }]
}
```

### Validation

- Max 100 IDs per request
- All IDs must belong to user's workspace
- `update_category`: category must exist, be active, match transaction type
- `update_account`: account must exist and be active
- `delete`: no payload needed, soft delete

## Service Layer

New methods in `transaction.service.ts`:

### `bulkUpdateCategory(ids, categoryId, workspaceId, userId)`

- Validate category exists and is active
- Loop through IDs, call existing `update()` per transaction
- Preserves audit logging with field-level diffs
- Returns `{ updated, failed, errors }`

### `bulkUpdateAccount(ids, accountId, workspaceId, userId)`

- Validate account exists and is active
- Loop through IDs, call existing `update()` per transaction
- Returns `{ updated, failed, errors }`

### `bulkDelete(ids, workspaceId, userId)`

- Loop through IDs, call existing `delete()` per transaction
- Preserves per-transaction audit logging
- Returns `{ updated, failed, errors }`

**Why loop?** Each transaction needs its own audit log entry with field-level diffs. For 5-50 transactions, loop latency is acceptable. Bulk SQL would bypass audit logging.

**Cache invalidation:** Happens per-transaction in existing methods.

## Error Handling

- **Concurrent edit:** If another user deletes a transaction mid-bulk, that ID fails individually; others proceed
- **Mixed types:** Category type validated per transaction; mismatches fail individually
- **Empty selection:** Action bar hidden, no API call possible
- **Navigation during bulk:** Server-side operation completes regardless

## Testing

- **Unit tests:** Service bulk methods — happy path, partial failure, validation
- **E2E tests:** Select → change category → verify. Select → delete → confirm → verify.
- **No schema migration:** All actions use existing columns
