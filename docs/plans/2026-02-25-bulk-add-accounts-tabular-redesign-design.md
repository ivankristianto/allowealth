# Bulk Add Accounts — Tabular Redesign

## Overview

Replace the textarea-based bulk add accounts modal with an editable table. Each row has proper inputs and dropdowns instead of requiring users to type comma-separated values.

## Motivation

The textarea CSV format is not UX-friendly:

- Users must remember field order and valid type names
- No discoverability of valid account types or currencies
- Typo-prone (e.g., `savings` instead of `bank_account`)

## UI Design

```
┌──────────────────────────────────────────────────────┐
│  [icon] Bulk Add Accounts                            │
│  Add accounts row by row.                            │
│                                                      │
│  ┌──────────────┬────────────┬──────┬──────────┬──┐  │
│  │ Name         │ Type    ▼  │ Cur ▼│ Balance  │  │  │
│  ├──────────────┼────────────┼──────┼──────────┼──┤  │
│  │ [My Savings ]│[bank_acc▼] │[IDR▼]│[5000000 ]│🗑│  │
│  │ [GoPay      ]│[e_wallet▼] │[IDR▼]│[0       ]│🗑│  │
│  └──────────────┴────────────┴──────┴──────────┴──┘  │
│                                                      │
│  [+ Add Row]                                         │
│                                                      │
│  [Cancel]                [Create 2 Accounts]         │
└──────────────────────────────────────────────────────┘
```

## Design Decisions

| Decision       | Choice                                             |
| -------------- | -------------------------------------------------- |
| Container      | Same modal, widened to `max-w-2xl`                 |
| Initial state  | 1 empty row                                        |
| Add row        | "+ Add Row" button below the table                 |
| Remove row     | Trash icon per row, disabled when only 1 row       |
| Type input     | `<select>` with 10 account types                   |
| Currency input | `<select>` with workspace currencies               |
| Balance input  | `<input type="number" step="0.01">`, defaults to 0 |
| Name input     | `<input type="text">`, min 2 chars                 |
| Validation     | Per-field on submit (red border via `input-error`) |
| Max rows       | No hard limit, modal body scrolls                  |
| Submit         | Sequential POST /api/accounts per row (unchanged)  |

## Validation

- On submit: validate all rows, highlight invalid fields with `input-error` class
- Invalid fields show inline error text
- Partial API failure: toast summary + mark failed rows in table
- Submit button text: "Create N Account(s)" updates with row count

## Files Changed

| File                                             | Action                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `src/pages/accounts/index.astro`                 | Replace modal HTML (textarea → table with inputs)                  |
| `src/pages/accounts/bulk-add-accounts.client.ts` | Rewrite — row management, per-field validation, dynamic add/remove |
| `src/pages/accounts/bulk-add-accounts.test.ts`   | Rewrite — test new row validation logic                            |

## Removed

- `parseLine()`, `parseTextarea()` functions
- `ParsedLine`, `ParsedAccount` interfaces
- `escapeHtml()` helper
- Textarea HTML, preview table, format hints
- All 44+ tests for CSV parsing

## Unchanged

- Modal trigger button in AccountActions
- `initBulkAddAccounts()` export name and init pattern
- Sequential `POST /api/accounts` with `csrfFetch`
- Toast notifications, partial failure handling
- Double-submit prevention (`isSubmitting` flag)
