# Design: Rename Assets to Accounts

**Date:** 2026-02-19
**Status:** Approved

## Context

The "assets" terminology is misleading — the feature manages all financial accounts including liabilities (credit cards, loans). "Accounts" is the correct domain term. The app hasn't launched, so no backward compatibility or migrations are needed.

## Decision

Pure terminology rename across the entire codebase. No business logic changes, no schema structure changes, no new features.

### What Changes

| Old                                   | New                                       |
| ------------------------------------- | ----------------------------------------- |
| `assets` (table)                      | `accounts`                                |
| `asset_categories` (table)            | `account_categories`                      |
| `asset_history` (table)               | `account_history`                         |
| `asset_snapshots` (table)             | `account_snapshots`                       |
| `asset_snapshot_items` (table)        | `account_snapshot_items`                  |
| `asset_update_reminders` (table)      | `account_update_reminders`                |
| `AssetType`                           | `AccountType`                             |
| `Asset` / `AssetOutput`               | `Account` / `AccountOutput`               |
| `AssetHistory` / `AssetHistoryOutput` | `AccountHistory` / `AccountHistoryOutput` |
| `AssetCategory`                       | `AccountCategory`                         |
| `assetService`                        | `accountService`                          |
| `assetCategoryService`                | `accountCategoryService`                  |
| `/assets/*` (pages)                   | `/accounts/*`                             |
| `/api/assets/*` (API)                 | `/api/accounts/*`                         |
| `/api/asset-categories/*`             | `/api/account-categories/*`               |
| `Asset*` (components)                 | `Account*`                                |
| `ASSET_*` (constants)                 | `ACCOUNT_*`                               |
| `CacheTags.ASSETS`                    | `CacheTags.ACCOUNTS`                      |
| UI label "Portfolio"                  | "Accounts"                                |

### What Does NOT Change

- `account_class` field name and values (`liquid`, `non_liquid`, `debt`) — already correctly named
- `AccountClass` type — already correct
- Business logic (balance tracking, transfers, close/reopen, snapshots, forecasting)
- Type enum values (`cash`, `bank_account`, `credit_card`, `loan`, etc.)
- Database structure (columns, relations, constraints)
- The asset/liability distinction derived from `account_class` (`liquid`/`non_liquid` = asset, `debt` = liability)

### URL Changes

- `/assets` → `/accounts`
- `/assets/[id]` → `/accounts/[id]`
- `/assets/history` → `/accounts/history`
- `/assets/history/[id]` → `/accounts/history/[id]`
- `/assets/closed` → `/accounts/closed`
- `/assets/categories` → `/accounts/categories`
- `/api/assets/*` → `/api/accounts/*`
- `/api/asset-categories/*` → `/api/account-categories/*`

### UI Label Changes

- Navigation: "Portfolio" → "Accounts"
- Page headers updated to use "Account(s)" terminology
- Form labels: "Asset Name" → "Account Name", "Asset Type" → "Account Type"
- All user-facing strings: "asset" → "account"

## Approach

Big Bang rename with structured commits per layer:

1. **DB Schema** — Rename tables in both `sqlite/` and `postgresql/` schema files
2. **Types** — Rename `asset.ts` → `account.ts`, update all type names and barrel exports
3. **Services** — Rename service files and all internal references
4. **Utilities & Constants** — Rename utils, constants, validation, API client files
5. **API Routes** — Move `api/assets/` → `api/accounts/`, `api/asset-categories/` → `api/account-categories/`
6. **Pages** — Move `pages/assets/` → `pages/accounts/`
7. **Components** — Rename all `Asset*` components to `Account*`
8. **Tests** — Rename test files, update imports and references
9. **OpenAPI** — Rename schema and path YAML files
10. **Config & Navigation** — Update nav links, route guards, cache tags, seeders, middleware, Storybook stories
