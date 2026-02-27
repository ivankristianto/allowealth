# Bulk Account Import & Account Ownership Transfer

## Overview

Two features:

1. **Bulk Account Import** — Add multiple accounts at once via plain text input (comma-separated fields)
2. **Account Ownership Transfer UI** — Admin-only UI to reassign an account to another workspace member

## Feature 1: Bulk Account Import

### Input Format

```
Name, Type, Currency[, Balance]
```

One account per line. Fields separated by commas.

| Field    | Required | Validation                                                                                                           | Default |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| Name     | Yes      | Min 2 chars, trimmed                                                                                                 | —       |
| Type     | Yes      | One of: `cash`, `bank_account`, `e_wallet`, `mutual_fund`, `bond`, `crypto`, `stock`, `other`, `credit_card`, `loan` | —       |
| Currency | Yes      | Valid currency enabled in workspace                                                                                  | —       |
| Balance  | No       | Valid number string                                                                                                  | `"0"`   |

**Example input:**

```
My Savings, bank_account, IDR, 5000000
BCA Checking, bank_account, IDR
GoPay, e_wallet, IDR, 250000
Cash USD, cash, USD, 100
```

### UI Design

**Location:** Accounts index page (`/accounts/index.astro`), "Bulk Add" button next to existing "Add Account" button.

**Modal pattern:** Matches budget category bulk-add modal (`/pages/budget/categories/index.astro`).

```
┌─────────────────────────────────────────┐
│  [icon] Bulk Add Accounts               │
│  Enter one account per line:            │
│  Name, Type, Currency, Balance          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ My Savings, bank_account, IDR,  │    │
│  │ 5000000                         │    │
│  │ BCA Checking, bank_account, IDR │    │
│  │ GoPay, e_wallet, IDR, 250000   │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  Default icon and balance (0) assigned. │
│                                         │
│  Preview (3 accounts)                   │
│  ┌────────────────────────────────┐     │
│  │ My Savings  bank_account  IDR  │     │
│  │ BCA Checking bank_account IDR  │     │
│  │ GoPay       e_wallet     IDR   │     │
│  └────────────────────────────────┘     │
│                                         │
│  [Cancel]        [Create 3 Accounts]    │
└─────────────────────────────────────────┘
```

**Interaction flow:**

1. User clicks "Bulk Add" button
2. Modal opens with textarea (placeholder shows format example)
3. Live preview updates on input — shows parsed accounts with type badges
4. Per-line validation errors displayed inline (e.g., "Line 3: Invalid type 'savings'")
5. User clicks "Create Accounts"
6. Sequential creation via existing `POST /api/accounts` (one per account)
7. Success: toast + modal close + page refresh
8. Partial failure: toast summary + errors in modal (user can fix and retry)

### API

No new endpoints. Reuses existing `POST /api/accounts` per account (same pattern as budget category bulk-add).

### Preview Component

Live preview renders a compact table/list showing:

- Account name
- Type badge (styled chip)
- Currency code
- Balance (if provided)
- Validation error per line (red text)

## Feature 2: Account Ownership Transfer UI

### Location

Account detail page (`/accounts/[id].astro`), visible only when `user.role === 'admin'`.

### UI Design

```
┌─────────────────────────────────────────┐
│  Transfer Ownership                      │
│                                         │
│  Current owner: Ivan (you)              │
│                                         │
│  New owner: [Dropdown: Select member ▼] │
│                                         │
│  [Transfer Ownership]                   │
└─────────────────────────────────────────┘
```

- Section at the bottom of account detail page
- Dropdown populated via `workspaceService.getMembers(workspaceId)` (SSR)
- Current owner pre-selected and shown
- "Transfer" button with inline confirmation ("Are you sure?")
- After transfer: toast notification + page refresh

### API

Already exists:

- `PATCH /api/accounts/:id/transfer-owner` with body `{ owner_user_id: string }`
- Admin-only (403 for non-admins)
- Validates target user exists in workspace
- Invalidates cache

### Service

Already exists:

- `accountService.transferOwnership(accountId, newOwnerId, workspaceId)` at `src/services/account.service.ts:949`

## Implementation Notes

### Files to modify

- `src/pages/accounts/index.astro` — Add "Bulk Add" button + modal HTML
- `src/pages/accounts/index.astro` or new client file — Bulk add client logic (parse, validate, preview, submit)
- `src/pages/accounts/[id].astro` — Add transfer ownership section (admin-only)
- `src/pages/accounts/[id].astro` or its client file — Transfer ownership client logic

### Files to reference (patterns)

- `src/pages/budget/categories/index.astro` — Bulk add modal HTML pattern
- `src/pages/budget/categories/categories-client.ts` — Bulk add client logic pattern
- `src/pages/api/accounts/[id]/transfer-owner.ts` — Existing transfer API

### No new service/API code needed

- Bulk import: reuses `POST /api/accounts`
- Transfer: reuses `PATCH /api/accounts/:id/transfer-owner`
- Member list: reuses `workspaceService.getMembers()`
