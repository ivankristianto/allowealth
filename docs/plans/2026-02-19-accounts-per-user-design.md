# Accounts Per User — Design

## User Stories

1. As a user, I want to have my own accounts (assets & liabilities).
2. Accounts by default are owned by the admin of the workspace.
3. As a user, I can switch between global view (all accounts) and my accounts only.
4. When viewing my accounts only, all values recalculate for my accounts. An info banner tells me it's not the global view and links back to it.

## Decisions

| Decision           | Choice                                   | Rationale                                                                   |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------- |
| Ownership field    | Reuse `created_by_user_id`               | Already exists with index. No migration needed.                             |
| Ownership transfer | Admin-only, updates `created_by_user_id` | Simple, avoids new columns. Admin controls ownership.                       |
| View state storage | URL query param `?view=mine`             | Shareable, bookmarkable, works with back/forward. Default = all (no param). |
| Scope              | Accounts page only                       | Dashboard stays workspace-wide. Future scope for dashboard.                 |
| Banner style       | DaisyUI `alert-info`                     | Visible but non-intrusive. Contains link to switch back.                    |

## Data Model

No schema changes. Reuse existing `created_by_user_id` on the accounts table as the ownership field.

- Default owner = whoever creates the account (current behavior)
- Ownership transfer = admin updates `created_by_user_id` to target user ID
- Existing index on `created_by_user_id` supports efficient filtering

## Service Layer

### `findAll()` — add `owner_user_id` filter

```typescript
findAll(workspaceId, {
  type?, category_id?, currency?, includeInactive?,
  owner_user_id?: string  // NEW — filters by created_by_user_id
})
```

When `owner_user_id` is set, adds `WHERE created_by_user_id = owner_user_id` to conditions.

### `getSnapshotForMonth()` — propagate owner filter

Pass `owner_user_id` through to the underlying `findAll()` call used for historical views.

### `countClosed()` — add optional owner filter

```typescript
countClosed(workspaceId, ownerUserId?: string)
```

When set, counts only closed accounts owned by that user.

### New: `transferOwnership()`

```typescript
transferOwnership(accountId: string, newOwnerId: string, workspaceId: string): Promise<void>
```

Admin-only. Updates `created_by_user_id` on the account. Invalidates cache.

## API Changes

### `GET /api/accounts` — accept `owner` query param

```
GET /api/accounts?owner=<userId>
```

Passes `owner_user_id` to `findAll()`. No param = all accounts (current behavior).

### `PATCH /api/accounts/[id]/transfer-owner` — new endpoint

```
PATCH /api/accounts/:id/transfer-owner
Body: { owner_user_id: string }
```

Admin-only. Calls `transferOwnership()`. Returns updated account.

## UI Changes

### View Toggle — in AccountActions bar

Two-segment toggle added to the AccountActions component:

- **All Accounts** (default, no `?view` param)
- **My Accounts** (`?view=mine`)

Toggle uses `<a>` tags for server-side rendering — no client JS needed for the switch itself.

### Info Alert Banner — shown when `view=mine`

```
[info icon] Showing your accounts only. Values reflect your portfolio.  [View all accounts →]
```

- DaisyUI `alert alert-info` component
- Positioned below historical view indicator, above action buttons
- "View all accounts" link removes the `?view=mine` param

### Portfolio Recalculation

When `view=mine`, the filtered accounts array is passed to existing calculation utils:

- `calculatePortfolioTotals(accounts)` — already takes accounts as input
- `calculateDebtTotals(accounts)` — same
- `calculateAccountAllocation(accounts)` — same

No changes to calculation utils needed. Filtering happens upstream in the page.

### Ownership Transfer — admin only

In the account edit form (AccountFormModal), add an owner dropdown:

- Only visible when user role is `admin`
- Lists workspace members
- Changing owner calls `PATCH /api/accounts/:id/transfer-owner`

## Out of Scope

- Dashboard widgets (stays workspace-wide)
- Transaction filtering by account owner
- Per-user budget scoping
- Account sharing (one owner per account)
- Closed accounts page filtering by owner (future enhancement)
