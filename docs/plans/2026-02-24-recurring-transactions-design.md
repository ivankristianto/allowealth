# Recurring Transactions Design

**Date:** 2026-02-24
**Issues:** #181, #159, #184
**Status:** Approved

## Summary

Recurring transactions system for tracking repeating bills and income. Users create templates that generate monthly occurrences requiring manual confirmation before becoming actual transactions. Supports installments with occurrence counters (e.g., "iPhone 17 Pro - Installment 05/12").

## Requirements

| Requirement       | Decision                                                   |
| ----------------- | ---------------------------------------------------------- |
| Transaction types | Both expense and income                                    |
| Interval          | Monthly only (extensible later)                            |
| End condition     | Both: occurrence count OR end date (at least one required) |
| Auto-creation     | No - user manually confirms each occurrence                |
| Confirm date      | Pre-filled with due date, user can change                  |
| Confirm amount    | Pre-filled from template, user can edit                    |
| Installments      | Counter only (05/12), custom starting number               |
| Skip handling     | Explicit skip button with optional reason                  |
| Cancellation      | User can cancel/stop any recurring anytime                 |
| Budget link       | Warning when recurring total exceeds category budget       |

## Architecture: Two Tables (Templates + Occurrences)

### `recurring_templates` table

| Column                       | Type      | Notes                                              |
| ---------------------------- | --------- | -------------------------------------------------- |
| `id`                         | text PK   | UUID                                               |
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

**Status transitions:**

```
active → paused (temporary, can resume)
active → cancelled (permanent, user stopped early; future pending removed)
active → completed (all occurrences done or end_date passed)
paused → active (resume)
```

**End condition:** Template ends when EITHER `total_occurrences` is reached OR `end_date` is passed, whichever first. At least one must be set.

### `recurring_occurrences` table

| Column              | Type       | Notes                                                    |
| ------------------- | ---------- | -------------------------------------------------------- |
| `id`                | text PK    | UUID                                                     |
| `template_id`       | text FK    | → recurring_templates (cascade delete)                   |
| `workspace_id`      | text FK    | → workspaces (efficient queries)                         |
| `due_date`          | text       | ISO date, the scheduled date                             |
| `occurrence_number` | integer    | 1-based counter (starts at `starting_occurrence_number`) |
| `status`            | enum       | `pending` \| `confirmed` \| `skipped`                    |
| `transaction_id`    | text? FK   | → transactions (set on confirm)                          |
| `confirmed_amount`  | text?      | Actual amount if different from template                 |
| `skip_reason`       | text?      | Optional reason when skipped                             |
| `confirmed_at`      | timestamp? | When user confirmed                                      |
| `created_at`        | timestamp  |                                                          |

**No changes to existing `transactions` table.** Link is occurrence → transaction.

### Day-of-month edge cases

- `day_of_month = 31` in a 30-day month → use last day of month
- `day_of_month = 29/30/31` in February → use Feb 28 (or 29 in leap year)

## Occurrence Generation Strategy

Occurrences are generated **on-demand**, not by a background scheduler.

### When generated:

1. **Page load** of `/recurring` - generate missing occurrences up to current month + 1 month lookahead
2. **Template creation** - generate first occurrence immediately
3. **CLI** `bun run aw recurring:generate` - manual/cron trigger

### Generation logic:

```
For each active template:
  1. Find last generated occurrence_number
  2. Calculate next due_date = start_date month + (occurrence_number - starting_occurrence_number) months
  3. Set day = min(day_of_month, last_day_of_target_month)
  4. If due_date <= end of next month AND occurrence_number <= total_occurrences:
     → Create occurrence with status=pending
  5. If total_occurrences reached OR end_date passed:
     → Mark template status=completed
```

### Installment description:

When `is_installment = true`, auto-generate:

```
{name} - {installment_label} {occurrence_number}/{total_occurrences}
```

Example: `iPhone 17 Pro - Installment 05/12`

## Service Layer

### RecurringTemplateService

| Method                             | Description                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `create(input)`                    | Create template + first occurrence(s)                 |
| `findAll(workspaceId)`             | List all templates with stats                         |
| `findById(id, workspaceId)`        | Template with occurrence history                      |
| `update(id, data)`                 | Update template (future occurrences only)             |
| `pause(id)`                        | Set status=paused                                     |
| `resume(id)`                       | Set status=active, regenerate occurrences             |
| `cancel(id)`                       | Set status=cancelled, remove future pending           |
| `delete(id)`                       | Soft delete template + occurrences                    |
| `generateOccurrences(workspaceId)` | Generate missing occurrences for all active templates |

### RecurringOccurrenceService

| Method                                | Description                               |
| ------------------------------------- | ----------------------------------------- |
| `findPending(workspaceId, month?)`    | Pending bills for confirmation            |
| `findByTemplate(templateId)`          | All occurrences for a template            |
| `confirm(id, {amount, date})`         | Create transaction + link + update status |
| `skip(id, reason?)`                   | Mark as skipped                           |
| `getCalendarData(workspaceId, month)` | Occurrences grouped by day                |
| `getStats(workspaceId)`               | Counts by status, total pending amount    |

### Confirm flow:

```
User clicks "Confirm" on pending bill
  → Opens mini-form pre-filled with: amount, date, category, account
  → User can edit amount and date
  → On submit:
    1. Create transaction via TransactionService.create()
    2. Update occurrence: status=confirmed, transaction_id, confirmed_amount, confirmed_at
    3. Invalidate cache
```

## API Endpoints

```
POST   /api/recurring                           → Create template
GET    /api/recurring                           → List templates (with stats)
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

All endpoints: auth, workspace scoping, validation, HTML rendering support (`?_render=html`).

## UI Design

### `/recurring` page

Two view modes: **List View** (default) and **Calendar View**.

#### List View

```
┌──────────────────────────────────────────────────────┐
│  Recurring Transactions          [+ New Template]     │
│  ─────────────────────────────────────────────────── │
│  [List View] [Calendar View]        February 2026    │
│                                                       │
│  ┌─ PENDING THIS MONTH (3) ────────────────────────┐ │
│  │                                                   │ │
│  │  🔴 Rent             Rp 5,000,000    Due Feb 1   │ │
│  │     [Confirm]  [Skip]                  OVERDUE   │ │
│  │                                                   │ │
│  │  🟡 Netflix           Rp 199,000    Due Feb 15   │ │
│  │     [Confirm]  [Skip]                            │ │
│  │                                                   │ │
│  │  🟡 iPhone 17 Pro     Rp 1,500,000  Due Feb 20  │ │
│  │     Installment 05/12                             │ │
│  │     [Confirm]  [Skip]                            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ ALL TEMPLATES (7) ─────────────────────────────┐ │
│  │  Name          Amount       Day   Status         │ │
│  │  Rent          5,000,000    1st   ● Active       │ │
│  │  Netflix       199,000      15th  ● Active       │ │
│  │  iPhone 17     1,500,000    20th  ● Active 5/12  │ │
│  │  Gym           500,000      5th   ⏸ Paused       │ │
│  │  Old Loan      2,000,000    10th  ✓ Completed    │ │
│  └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

#### Calendar View

```
┌─ February 2026 ──────────────────────────────────────┐
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                   │
│                                  1🔴  Rent           │
│   2    3    4   5    6    7    8                      │
│                    Gym                                │
│   9   10   11   12   13   14  15🟡  Netflix          │
│  16   17   18   19  20🟡  21   22                    │
│                     iPhone                            │
│  23   24   25   26   27   28                         │
│                                                       │
│  Legend: 🔴 Overdue  🟡 Pending  ✅ Confirmed        │
└──────────────────────────────────────────────────────┘
```

#### Confirm Modal

```
┌─ Confirm: Netflix ──────────────────┐
│                                      │
│  Amount:    [Rp 199,000         ]   │
│  Date:      [2026-02-15         ]   │
│  Category:  Entertainment (locked)   │
│  Account:   BCA (locked)            │
│                                      │
│  [Cancel]              [Confirm]     │
└──────────────────────────────────────┘
```

#### Create/Edit Template Form

```
┌─ New Recurring Transaction ─────────┐
│                                      │
│  Name:        [                  ]   │
│  Type:        [Expense ▼]           │
│  Amount:      [                  ]   │
│  Category:    [Select... ▼]         │
│  Account:     [Select... ▼]         │
│  Day of Month:[15 ▼]               │
│  Start Month: [Feb 2026 ▼]         │
│                                      │
│  End Condition:                      │
│  ○ By count   [12] occurrences      │
│  ○ By date    [Dec 2026]            │
│                                      │
│  □ This is an installment           │
│    Starting at: [5] of [12]         │
│    Label: [Installment]             │
│                                      │
│  Description: [                  ]   │
│                                      │
│  [Cancel]              [Save]        │
└──────────────────────────────────────┘
```

## Integration Points (all v1)

### Dashboard Widget

Small card: "3 bills pending (Rp 6,699,000)" with link to `/recurring`.
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
