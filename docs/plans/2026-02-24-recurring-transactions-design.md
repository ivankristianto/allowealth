# Recurring Transactions Design

**Date:** 2026-02-24
**Issues:** #181, #159, #184
**Status:** Approved
**Revised:** 2026-02-25 (consolidated review feedback + Codex issue fixes: atomicity compensating logic, end condition both-allowed, CLI-only generation, audit types, route protection, event names, file paths, pagination, partial refresh scope)

## Summary

Recurring transactions system for tracking repeating bills and income. Users create templates that generate monthly occurrences requiring manual confirmation before becoming actual transactions. Supports installments with occurrence counters (e.g., "iPhone 17 Pro - Installment 05/12").

## Requirements

| Requirement       | Decision                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Transaction types | Both expense and income                                                                                                   |
| Interval          | Monthly only (extensible later)                                                                                           |
| End condition     | Both: occurrence count OR end date (at least one required)                                                                |
| Auto-creation     | No - user manually confirms each occurrence                                                                               |
| Confirm date      | Pre-filled with due date, user can change. **Dates may be in the future** (users confirm upcoming bills before due date)  |
| Confirm amount    | Pre-filled from template, user can edit                                                                                   |
| Confirm fields    | Category and Account are pre-filled from template but **editable** in confirm modal (user may pay from different account) |
| Installments      | Counter only (05/12), custom starting number                                                                              |
| Skip handling     | Explicit skip button with confirmation modal and optional reason                                                          |
| Cancellation      | User can cancel/stop any recurring anytime (requires confirmation — destructive action)                                   |
| Budget link       | Warning when recurring total exceeds category budget                                                                      |

## Architecture: Two Tables (Templates + Occurrences)

### `recurring_templates` table

| Column                       | Type      | Notes                                              |
| ---------------------------- | --------- | -------------------------------------------------- |
| `id`                         | text PK   | nanoid                                             |
| `workspace_id`               | text FK   | → workspaces (cascade delete)                      |
| `created_by_user_id`         | text FK   | → users                                            |
| `name`                       | text      | e.g., "Netflix", "Rent", "iPhone 17 Pro"           |
| `type`                       | enum      | `expense` \| `income`                              |
| `amount`                     | text      | Default amount (text for decimal precision)        |
| `currency`                   | text      | Currency code                                      |
| `category_id`                | text FK   | → budget_categories                                |
| `account_id`                 | text FK   | → accounts                                         |
| `day_of_month`               | integer   | 1-31, which day the bill is due                    |
| `start_date`                 | text      | ISO date, first occurrence month                   |
| `end_date`                   | text?     | ISO date, optional end month                       |
| `total_occurrences`          | integer?  | e.g., 12 for installments                          |
| `is_installment`             | boolean   | Show occurrence counter in description             |
| `installment_label`          | text?     | e.g., "Installment" (customizable)                 |
| `starting_occurrence_number` | integer   | Default: 1. For mid-stream installments            |
| `description`                | text?     | Optional notes template                            |
| `status`                     | enum      | `active` \| `paused` \| `completed` \| `cancelled` |
| `created_at`                 | timestamp |                                                    |
| `updated_at`                 | timestamp |                                                    |

**Indexes:** `workspace_id`, `workspace_id + status`, `category_id`

**Constraints:**

- PostgreSQL: `CHECK (NOT is_installment OR total_occurrences IS NOT NULL)` — installments require total_occurrences

**Status transitions:**

```
active → paused (temporary, can resume)
active → cancelled (permanent, user stopped early; future pending removed)
active → completed (all occurrences done or end_date passed)
paused → active (resume)
```

**End condition:** Template ends when EITHER `total_occurrences` is reached OR `end_date` is passed, whichever first. At least one must be set.

### `recurring_occurrences` table

| Column              | Type       | Notes                                                           |
| ------------------- | ---------- | --------------------------------------------------------------- |
| `id`                | text PK    | nanoid                                                          |
| `template_id`       | text FK    | → recurring_templates (cascade delete)                          |
| `workspace_id`      | text FK    | → workspaces (efficient queries)                                |
| `due_date`          | text       | ISO date, the scheduled date                                    |
| `occurrence_number` | integer    | 1-based counter (starts at `starting_occurrence_number`)        |
| `status`            | enum       | `pending` \| `confirmed` \| `skipped`                           |
| `transaction_id`    | text? FK   | → transactions (set on confirm, **UNIQUE**)                     |
| `confirmed_amount`  | text?      | Always stored on confirmation (copy from template if unchanged) |
| `skip_reason`       | text?      | Optional reason when skipped (max 200 chars)                    |
| `confirmed_at`      | timestamp? | When user confirmed                                             |
| `created_at`        | timestamp  |                                                                 |
| `updated_at`        | timestamp  | Updated on status change                                        |

**Indexes:** `template_id`, `workspace_id + status`, `workspace_id + due_date`, `transaction_id`

**Constraints:**

- `UNIQUE(template_id, occurrence_number)` — prevents duplicate occurrences from generation bugs
- `UNIQUE(transaction_id)` WHERE NOT NULL — prevents double-confirmation creating duplicate transactions

**No changes to existing `transactions` table.** Link is occurrence → transaction.

### Day-of-month edge cases

- `day_of_month = 31` in a 30-day month → use last day of month
- `day_of_month = 29/30/31` in February → use Feb 28 (or 29 in leap year)

### Delete semantics

Template `delete()` is a **hard delete** (CASCADE deletes occurrences). Confirmed occurrences' linked transactions are preserved in the transactions table — the FK is one-directional. The `cancel` action handles the "stop this recurring" use case while preserving history.

## Occurrence Generation Strategy

Occurrences are generated **on-demand**, not by a background scheduler.

### When generated:

1. **Template creation** — generate first occurrence(s) immediately (current month + 1 month lookahead)
2. **Template resume** — regenerate future pending occurrences after un-pausing
3. **CLI cron job** `bun run aw recurring generate` — scheduled trigger for all workspaces (recommended: daily cron)

**Note:** Generation must NOT happen during page load (SSR) or GET API endpoints. Page loads must be read-only. The CLI cron job is the primary mechanism for keeping occurrences up-to-date across all workspaces.

### Generation logic:

```
For each active template:
  1. Find last generated occurrence_number
  2. Calculate next due_date = start_date month + (occurrence_number - starting_occurrence_number) months
  3. Set day = min(day_of_month, last_day_of_target_month)
  4. If due_date <= end of next month
     AND (total_occurrences IS NULL OR occurrence_number <= total_occurrences)
     AND (end_date IS NULL OR due_date <= end_date):
     → INSERT occurrence with status=pending (ON CONFLICT DO NOTHING for idempotency)
  5. If (total_occurrences IS NOT NULL AND total_occurrences reached)
     OR (end_date IS NOT NULL AND end_date passed):
     → Mark template status=completed
```

**Idempotency:** Generation uses `ON CONFLICT DO NOTHING` on the `(template_id, occurrence_number)` unique constraint. This makes CLI re-runs and page reloads safe.

**Internal architecture:** Extract a `_generateForTemplate(template)` method called per-template. The workspace-wide `generateOccurrences(workspaceId)` iterates active templates and calls this method for each. Template `create()` calls `_generateForTemplate()` directly for just the new template, avoiding a full workspace scan.

### Installment description:

When `is_installment = true`, auto-generate:

```
{name} - {installment_label} {padded_occurrence_number}/{total_occurrences}
```

Example: `iPhone 17 Pro - Installment 05/12`

## Service Layer

### RecurringTemplateService

| Method                             | Description                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `create(input)`                    | Create template + generate first occurrence(s)                                      |
| `findAll(workspaceId, filters?)`   | List templates with stats, paginated (`page`, `limit` in filters, default limit=20) |
| `findById(id, workspaceId)`        | Template with occurrence history                                                    |
| `update(id, workspaceId, data)`    | Update template (future occurrences only)                                           |
| `pause(id, workspaceId)`           | Set status=paused + audit log                                                       |
| `resume(id, workspaceId)`          | Set status=active, regenerate occurrences + audit log                               |
| `cancel(id, workspaceId)`          | Set status=cancelled, remove future pending + audit log                             |
| `delete(id, workspaceId)`          | Hard delete template (cascade deletes occurrences) + audit log                      |
| `generateOccurrences(workspaceId)` | Generate missing occurrences for all active templates                               |

### RecurringOccurrenceService

| Method                                      | Description                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `findPending(workspaceId, filters?)`        | Pending bills for confirmation. Filters: `month?` (YYYY-MM), `status?` (pending/confirmed/skipped), `due_within?` (e.g., '7d') |
| `findByTemplate(templateId, workspaceId)`   | All occurrences for a template                                                                                                 |
| `confirm(id, workspaceId, {amount, date})`  | Create transaction + link (atomic)                                                                                             |
| `skip(id, workspaceId, reason?)`            | Mark as skipped + audit log                                                                                                    |
| `getCalendarData(workspaceId, year, month)` | Occurrences grouped by day                                                                                                     |
| `getStats(workspaceId)`                     | Counts by status, per-currency pending                                                                                         |

### Confirm flow (ATOMIC):

```
User clicks "Confirm" on pending bill
  → Opens confirm modal pre-filled with: amount, date, category, account
  → User can edit amount, date, category, account
  → On submit:
    runTransaction(db, async (tx) => {
      1. Verify occurrence.status = 'pending' (optimistic guard — WHERE status = 'pending')
         → If 0 rows match, throw OCCURRENCE_ALREADY_CONFIRMED
      2. Create transaction via TransactionService(tx).create()
         → Note: bypasses future-date validation for recurring context
      3. Update occurrence: status=confirmed, transaction_id, confirmed_amount, confirmed_at
      4. Audit log: logAuditEvent()
         → Note: logAuditEvent() uses global DB, not the tx handle — audit logs persist even on rollback (acceptable for debugging)
    })
    5. Invalidate cache (RECURRING + RECURRING_OCCURRENCES + RECURRING_CALENDAR + TRANSACTIONS + DASHBOARD tags)
    6. Client-side: refresh pending list partial, stats row, AND calendar view (if active) via ?_render=html fetches
```

**Atomicity:** Steps 1-3 execute within `runTransaction()`. Step 4 (audit) uses global DB and is not rolled back. On PostgreSQL, this is a real transaction with rollback. On SQLite/D1, `runTransaction()` is a no-op (runs sequentially without rollback) — see `src/db/index.ts:180-193`.

**Compensating logic for SQLite/D1:** If step 3 (occurrence update) fails after step 2 (transaction created), the confirm method must catch the error and delete the orphaned transaction before re-throwing. This prevents ghost transactions on non-transactional backends:

```
try {
  // step 2: create transaction
  // step 3: update occurrence
} catch (error) {
  if (transactionId) {
    // Compensate: delete orphaned transaction
    await transactionService.delete(transactionId, workspaceId);
  }
  throw error;
}
```

**Race condition prevention:** The `WHERE status = 'pending'` guard + `UNIQUE(transaction_id)` constraint prevent double-confirmation from concurrent requests (e.g., double-click, two tabs).

**Future-date handling:** The existing `createTransactionSchema` rejects future dates. For recurring confirmations, use a separate schema or bypass flag since users confirm upcoming bills before the due date.

### Error handling:

Uses `RecurringServiceError` class (extends `ServiceError`) with codes:

- `RECURRING_TEMPLATE_NOT_FOUND`
- `RECURRING_OCCURRENCE_NOT_FOUND`
- `OCCURRENCE_ALREADY_CONFIRMED`
- `OCCURRENCE_ALREADY_SKIPPED`
- `TEMPLATE_NOT_ACTIVE`
- `TEMPLATE_ALREADY_CANCELLED`

### Stats currency handling:

`getStats()` returns per-currency breakdown (not a cross-currency sum):

```typescript
RecurringStats = {
  pendingCount: number;
  pendingByCurrency: { currency: string; amount: string }[];
  overdueCount: number;
  confirmedThisMonth: number;
}
```

## API Endpoints

```
POST   /api/recurring                           → Create template
GET    /api/recurring                           → List templates (with stats, paginated)
GET    /api/recurring/[id]                      → Get template detail
PUT    /api/recurring/[id]                      → Update template
DELETE /api/recurring/[id]                      → Delete template
POST   /api/recurring/[id]/pause                → Pause
POST   /api/recurring/[id]/resume               → Resume
POST   /api/recurring/[id]/cancel               → Cancel

GET    /api/recurring/occurrences               → Pending occurrences (filterable)
POST   /api/recurring/occurrences/[id]/confirm  → Confirm + create transaction
POST   /api/recurring/occurrences/[id]/skip     → Skip occurrence

GET    /api/recurring/calendar                  → Calendar data for a month
GET    /api/recurring/stats                     → Dashboard stats
```

All endpoints: auth, workspace scoping, CSRF validation (POST/PUT/DELETE), Zod validation, HTML rendering support (`?_render=html`).

**Note:** Neither GET API endpoints nor page load SSR call `generateOccurrences()`. Generation happens only on template create, template resume, and via CLI cron job (`bun run aw recurring generate`).

## UI Design

### `/recurring` page

Two view modes: **List View** (default) and **Calendar View**.

**URL params:** `?view=list|calendar&month=2026-02` — persisted in URL for bookmarkability and back/forward support.

**Month navigation:** Uses existing `PeriodNavigator` component (same as transactions page). Emits `periodChange` event (import `PERIOD_CHANGE_EVENT` from `@/lib/constants/events`).

**View toggle:** Uses existing `TabSwitcher` component with `role="tab"` and `aria-selected`.

#### Summary Stats Row

Above the pending list, show summary stats using `StatCard` atoms:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Rp 6,699,000    │ │ 1 overdue       │ │ 2 confirmed     │
│ pending          │ │                  │ │ this month      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

#### List View

```
┌──────────────────────────────────────────────────────┐
│  Recurring Transactions          [+ New Template]     │
│  ─────────────────────────────────────────────────── │
│  [List View] [Calendar View]   [< Feb 2026 >]       │
│                                                       │
│  ┌─ PENDING THIS MONTH (3) ────────────────────────┐ │
│  │                                                   │ │
│  │  <AlertCircle/> Rent     Rp 5,000,000  Due Feb 1 │ │
│  │     [Confirm]  [Skip]              OVERDUE badge  │ │
│  │                                                   │ │
│  │  <Clock/> Netflix         Rp 199,000  Due Feb 15  │ │
│  │     [Confirm]  [Skip]                             │ │
│  │                                                   │ │
│  │  <Clock/> iPhone 17 Pro  Rp 1,500,000  Due Feb 20│ │
│  │     Installment 05/12                             │ │
│  │     [Confirm]  [Skip]                             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ ALL TEMPLATES (7) ─────────────────────────────┐ │
│  │  Name       Amount     Day  Next Due   Status  ⋮ │ │
│  │  Rent       5,000,000  1st  Mar 1     ● Active ⋮ │ │
│  │  Netflix    199,000    15th Mar 15    ● Active ⋮ │ │
│  │  iPhone 17  1,500,000  20th Mar 20   ● Active  │ │
│  │    ░░░░░░░░░░░░ 5/12 progress bar         ⋮     │ │
│  │  Gym        500,000    5th  —        ⏸ Paused ⋮ │ │
│  │    (row at opacity-60)                           │ │
│  │  Old Loan   2,000,000  10th —        ○ Done   ⋮ │ │
│  └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Status indicators (Lucide icons, not emoji):**

- Overdue: `<AlertCircle size={16} class="text-error" />` + "Overdue" badge
- Pending: `<Clock size={16} class="text-warning" />` + due date text
- Confirmed: `<CheckCircle size={16} class="text-success" />`
- Skipped: `<MinusCircle size={16} class="text-base-content/40" />`

**Status badges:**

- Active: `badge-success`
- Paused: `badge-warning`
- Completed: `badge-ghost` (neutral, not `badge-info`)
- Cancelled: `badge-error`

**Paused templates:** Rows rendered at `opacity-60` for visual distinction.

**Template row actions:** Kebab dropdown (`EllipsisVertical` icon, `dropdown dropdown-end`) with Edit, Pause/Resume, Cancel. Follows `TransactionCard` action pattern.

**Installment progress:** `ProgressBar` atom (64px wide) + "5/12" text for installment templates.

**Next Due column:** Shows due_date of next pending occurrence, or "—" for completed/cancelled.

#### Calendar View (Desktop)

```
┌─ February 2026 ──────────────────────────────────────┐
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                   │
│                                  1    Rent            │
│                                  <AlertCircle/>       │
│   2    3    4   5    6    7    8                      │
│                    Gym                                │
│   9   10   11   12   13   14  15   Netflix            │
│                                    <Clock/>           │
│  16   17   18   19  20   21   22                     │
│                     iPhone <Clock/>                   │
│  23   24   25   26   27   28                         │
│                                                       │
│  Legend: <AlertCircle/> Overdue  <Clock/> Pending     │
│          <CheckCircle/> Confirmed                     │
└──────────────────────────────────────────────────────┘
```

**Desktop only** (`@container @3xl` / 768px+). Uses CSS grid (7 columns). Each cell shows day number + occurrence name + status icon. Clicking a pending occurrence opens the confirm modal.

#### Calendar View (Mobile < 768px)

On mobile, calendar falls back to a **date-grouped list**:

```
┌─ February 2026 ─────────────────────┐
│  [< Prev]    February 2026  [Next >] │
│                                      │
│  Feb 1                               │
│  <AlertCircle/> Rent  Rp 5,000,000  │
│    OVERDUE        [Confirm] [Skip]   │
│                                      │
│  Feb 15                              │
│  <Clock/> Netflix      Rp 199,000   │
│    Due in 3 days                     │
│                                      │
│  Feb 20                              │
│  <Clock/> iPhone 17   Rp 1,500,000  │
│    Installment 05/12                 │
└──────────────────────────────────────┘
```

#### Confirm Modal

```
┌─ Confirm: Netflix ──────────────────┐
│                                      │
│  Amount:    [Rp 199,000         ]   │
│  Date:      [2026-02-15         ]   │
│  Category:  [Entertainment ▼]       │  ← pre-filled, editable
│  Account:   [BCA Checking ▼]       │  ← pre-filled, editable
│                                      │
│  ┌─ alert-error (hidden by default) │
│  │  Error message here              │
│  └──────────────────────────────────│
│                                      │
│  [Cancel]              [Confirm]     │
└──────────────────────────────────────┘
```

**Focus management:** On open, focus moves to Amount input. On close, focus returns to the triggering [Confirm] button.

**Error handling:** On API error, modal stays open, inline `alert-error` shown above buttons, Confirm button re-enabled. Toast shown as secondary notification.

**Amount change indicator:** If user edits amount, show original template amount struck through above the input.

#### Skip Modal

```
┌─ Skip: Netflix ─────────────────────┐
│                                      │
│  Skip this month's payment?          │
│                                      │
│  Reason (optional):                  │
│  [                              ]    │
│  0 / 200 characters                  │
│                                      │
│  [Cancel]              [Skip]        │
└──────────────────────────────────────┘
```

Uses `ConfirmationModal` base with `details` slot for textarea. Skip button uses `btn-warning` (not destructive). Character counter with `aria-live="polite"`.

#### Create/Edit Template Form (Drawer)

Uses `Drawer` component (side panel, `w-full sm:max-w-md`) — not a centered modal. Too many fields for a modal.

```
┌─ New Recurring Transaction ─────────┐
│                                [X]   │
│                                      │
│  Name:        [                  ]   │
│  Type:        [Expense ▼]           │
│  Amount:      [                  ]   │
│  Category:    [Select... ▼]         │  ← filtered by type
│  Account:     [Select... ▼]         │
│  Day of Month:[15 ▼]               │
│  Start Month: [Feb 2026 ▼]         │
│                                      │
│  End Condition: *                    │
│  ☑ By count   [12] occurrences      │
│  ☑ By date    [Dec 2026]            │
│  (hint: "At least one is required") │
│  (both can be set — whichever first)│
│                                      │
│  □ This is an installment           │
│    (disabled until "By count" set)   │
│    Starting at: [5] of [12]  ← auto │
│    Label: [Installment]             │
│                                      │
│  Description: [                  ]   │
│                                      │
│  [Cancel]              [Save]        │
└──────────────────────────────────────┘
```

**End condition UX:** Both "By count" and "By date" can be set simultaneously — template ends when EITHER is reached (whichever first). Use checkboxes (not radio buttons). At least one must be selected. Validation hint: "At least one end condition is required" shown on submit if neither checked. Installment checkbox disabled until "By count" is checked and count > 0. The "of [Y]" field auto-populates from the count.

**`start_month` → `start_date` conversion:** The form uses a month picker (YYYY-MM). The API schema converts this to an ISO date by appending `-01` (first of month). Example: `2026-02` → `2026-02-01`. This conversion happens in the API layer (`createRecurringTemplateAPISchema`) before passing to the service.

**Submit loading:** Save button disabled + text changes to "Saving..." during POST.

#### Empty States

**First-time (no templates):** Full-page `EmptyState` with `RefreshCw` icon, "No recurring transactions yet", "Create a template to track bills, subscriptions, and regular income.", [+ New Template] CTA button.

**All caught up (pending empty):** `EmptyState` with `CheckCircle` icon (success), "All caught up!", "No pending bills for February 2026."

**Calendar empty month:** `EmptyState` centered in calendar area, "No recurring transactions scheduled for February 2026."

#### Cancel Template Confirmation

Uses `ConfirmationModal` with `confirmVariant="error"`:

- Title: "Cancel [template name]?"
- Description: "Future pending bills will be removed. Past confirmed transactions are preserved."
- Actions: [Keep Active] [Cancel Template]

## Integration Points (all v1)

### Dashboard Widget

Small card: "3 bills pending (Rp 6,699,000)" with CTA "Review pending bills →".
Overdue count shown as `badge badge-error` if > 0.
Uses `/api/recurring/stats` endpoint.

### Transaction Page Badge

Transactions created from recurring show a small recurring icon/badge.
Query: check if any occurrence has `transaction_id` matching the transaction.

### Reports: Recurring vs One-Time

New section in reports showing:

- Total recurring expenses vs one-time
- Recurring expense by category
- Uses occurrence data to calculate

### CashFlowWidget

Show upcoming bills due in next 7 days alongside existing cash flow entries.
Uses `/api/recurring/occurrences?due_within=7d` filter.
Maps occurrences to `CashFlowEntry[]` using `templateAmount` (not `confirmed_amount`).

### Budget Warning

On budget page, when category recurring total > budget amount:

- Show warning badge on category
- Non-blocking (informational only)

## Out of Scope (Follow-up)

- Other intervals (weekly, yearly, bi-weekly)
- Email/push notifications for due bills
- Pattern detection from transaction history
- Bill splitting between people
- Multiple currencies per template
- Automatic transaction creation
- Bulk confirm/skip multiple pending occurrences at once
