# Transaction History & Audit Trail

## Problem

Multiple family members share a workspace. There is no visibility into who created, edited, or deleted a transaction. Deleted transactions disappear from the list entirely.

## Goals

- See who created each transaction
- See edit history: who changed what, when, with field-level diffs
- Deleted transactions remain visible (strikethrough) with deletion attribution
- All history accessible inline from the transaction card

## Non-Goals

- Restore deleted transactions
- Filter to hide/show deleted transactions
- Audit logging for non-transaction entities
- Pagination on history (capped at 5 recent edits with "Show all" fallback)

---

## Data Model

### Schema Changes: `transactions` table

Add two nullable columns (both SQLite and PostgreSQL):

| Column               | Type                              | Description           |
| -------------------- | --------------------------------- | --------------------- |
| `updated_by_user_id` | `text`, FK → `users.id`, nullable | Last user who edited  |
| `deleted_by_user_id` | `text`, FK → `users.id`, nullable | User who soft-deleted |

### Audit Log Usage

Reuse existing `audit_logs` table. No new tables needed.

**Entry format per action:**

| Action | `action` | `entity_type` | `old_value`                     | `new_value`                     |
| ------ | -------- | ------------- | ------------------------------- | ------------------------------- |
| Create | `create` | `transaction` | `null`                          | JSON snapshot of created fields |
| Update | `update` | `transaction` | JSON of changed fields (before) | JSON of changed fields (after)  |
| Delete | `delete` | `transaction` | JSON snapshot at deletion time  | `null`                          |

**Field diff example for update:**

```json
// old_value
{"amount": "50000", "category_id": "cat_abc"}
// new_value
{"amount": "75000", "category_id": "cat_xyz"}
```

Only changed fields are stored. If nothing changed, no audit log is written.

---

## Service Layer

### TransactionService changes

**`create()`**

- After inserting the transaction, write an audit log entry with `action: 'create'`
- `new_value` contains: amount, currency, type, category_id, asset_id, to_asset_id, description, transaction_date

**`update()`**

- Fetch current transaction before applying changes
- Compute field-level diff (compare: amount, category_id, asset_id, to_asset_id, description, transaction_date, currency, type)
- Skip audit log if no fields actually changed
- Set `updated_by_user_id` to current user
- Write audit log with only the changed fields in `old_value` / `new_value`

**`delete()`**

- Fetch current transaction before soft-deleting
- Snapshot full transaction into `old_value`
- Set `deleted_by_user_id` to current user
- Write audit log with `action: 'delete'`

### New method: `getHistory(transactionId)`

- Query `audit_logs` where `entity_type = 'transaction'` and `entity_id = transactionId`
- Join with `users` table to get user name per entry
- Order by `created_at` ascending (chronological)
- Resolve category_id and asset_id to human-readable names in the diff
- Default: return create event + last 5 update events + delete event (if exists)
- Optional `all=true` parameter to return full history

### `findAll()` changes

- Remove the `deleted_at IS NULL` filter — include soft-deleted transactions
- Add a `is_deleted` derived field to distinguish deleted items in the response

---

## API

### New endpoint: `GET /api/transactions/:id/history`

**Query params:**

- `all` — if `true`, return all history entries (default: capped at 5 edits)
- `_render` — `html` for server-rendered partial, `json` for raw data

**Response (JSON):**

```json
{
  "history": [
    {
      "id": "log_abc",
      "action": "create",
      "user_name": "Ivan",
      "created_at": "2025-01-03T14:30:00Z",
      "changes": null,
      "snapshot": { "amount": "50000", "category": "Food", "asset": "Cash", ... }
    },
    {
      "action": "update",
      "user_name": "Sarah",
      "created_at": "2025-01-05T09:15:00Z",
      "changes": [
        { "field": "amount", "from": "Rp 50,000", "to": "Rp 75,000" },
        { "field": "category", "from": "Food", "to": "Transport" }
      ]
    }
  ],
  "total_edits": 12,
  "showing_edits": 5
}
```

### Modified: `GET /api/transactions`

- Include soft-deleted transactions in results
- Add `is_deleted`, `deleted_by_user_name`, `deleted_at` to response items

---

## UI Design

### TransactionCard changes

**All transactions:**

- Add a History icon (Lucide `History`) in the card actions area
- Clicking expands an inline timeline below the card
- Clicking again collapses it
- History fetched on first expand via `GET /api/transactions/:id/history?_render=html`

**Deleted transactions:**

- Description text: `line-through` decoration
- Amount: original value displayed with `line-through` (not replaced with 0)
- Dimmed styling: `opacity-50` or `text-base-content/50`
- Small "Deleted" badge: `badge badge-ghost badge-sm`
- No edit or delete action buttons — only History icon remains
- Stays in chronological position in the list

### TransactionHistoryPartial.astro (new component)

Server-rendered timeline, fetched as HTML fragment.

**Visual design:**

- Vertical timeline with connected dots (DaisyUI `timeline` or `border-l-2`)
- Compact: `text-sm` with `text-base-content/70` for secondary info
- Each entry shows: user name, timestamp, and action-specific content

**Timeline entry types:**

```
● Created by Ivan — Jan 3, 2025 at 14:30
  Expense · Rp 50,000 · Food · Cash

● Edited by Sarah — Jan 5, 2025 at 09:15
  Amount: Rp 50,000 → Rp 75,000
  Category: Food → Transport

● Deleted by Ivan — Jan 8, 2025 at 11:00
```

**Capping behavior:**

- Always show: create event + delete event (if exists)
- Show last 5 edit events
- If >5 edits exist, show a "Show all N changes" link
- Clicking "Show all" re-fetches with `?all=true&_render=html`

### TransactionHistoryRenderer.client.ts (new)

Client-side script for expand/collapse behavior:

- Listen for click on History icon via `data-action="toggle-history"`
- On first expand: fetch HTML partial, inject below card, animate open
- On subsequent toggles: show/hide with animation
- Handle "Show all" link click: re-fetch full history, replace content

---

## Migration Plan

1. Generate migrations for both SQLite and PostgreSQL:
   - Add `updated_by_user_id` column to `transactions`
   - Add `deleted_by_user_id` column to `transactions`
2. No backfill needed — existing transactions will have `null` for both fields (meaning "unknown / before audit trail")
3. Audit logs start accumulating from deployment forward

---

## Implementation Order

Following project convention (UI → Service → API → CLI → Seeder):

1. **Schema** — Add columns, generate dual migrations
2. **Service** — Audit logging in create/update/delete, new getHistory method, modify findAll
3. **API** — New history endpoint, modify transaction list response
4. **UI** — TransactionCard changes, TransactionHistoryPartial, client-side toggle
5. **Seeder** — Add sample audit log entries for demo/testing
