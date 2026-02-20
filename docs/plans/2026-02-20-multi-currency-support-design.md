# Multi-Currency Support: Separate Currency Baskets

**Date:** 2026-02-20
**Issue:** [#174](https://github.com/ivankristianto/allowealth/issues/174)
**Status:** Approved

## Summary

Enable workspaces to manage finances in up to two independent currency baskets (Primary + optional Secondary) without conversion. Each currency maintains its own totals for assets, budgets, and transactions. Replaces the hardcoded IDR/USD enum with a configurable, extensible currency list.

## Goals

1. Replace hardcoded `['IDR', 'USD']` with 12 configurable currencies
2. Workspace-level Primary (required) + Secondary (optional) currency setting
3. Currency settings locked once accounts/budgets/transactions exist
4. Remove exchange rates, conversion utilities, and header currency selector
5. Dashboard shows both currency totals side-by-side; detail widgets use tab switching

## Non-Goals

- Currency conversion or exchange rate tracking
- More than 2 currencies per workspace
- Per-user currency preferences
- Header currency selector (removed)

## Supported Currencies

IDR, USD, SGD, PHP, EUR, GBP, MYR, THB, JPY, AUD, KRW, INR

Extensible — adding a currency means adding one entry to `CURRENCY_META`.

## Design

### 1. Data Model

#### Schema Changes

**Accounts, Transactions, Budgets tables (both SQLite + PostgreSQL):**

- Change `currency: text('currency', { enum: ['IDR', 'USD'] })` to `currency: text('currency').notNull()`
- App-level validation via `isValidCurrency()` against `AVAILABLE_CURRENCIES`
- Existing indexes on `currency` columns remain valid

**Exchange Rates table:**

- Drop entirely (both dialects)

**Workspace Meta:**

- Existing key `currency` = primary currency (unchanged)
- New key `secondary_currency` (nullable — absent or empty = single-currency mode)
- Validation: must be valid currency code, must differ from primary

#### Lock Mechanism

Before updating `currency` or `secondary_currency`:

1. Check if any accounts, budgets, or transactions exist in the workspace
2. If data exists → reject with 400 error
3. UI disables dropdowns and shows warning

### 2. UI Changes

#### Settings Page (`/settings`)

- **Primary Currency** dropdown — all 12 currencies, required
- **Secondary Currency** dropdown — all currencies minus selected primary, optional ("None" default)
- Options show: flag emoji + code + name (e.g., "🇮🇩 IDR — Indonesian Rupiah")
- Lock state: disabled dropdowns + info alert when data exists
- Warning during onboarding: "Choose carefully — cannot be changed after adding data"

#### Header

- Remove `CurrencySelector` component entirely
- Remove currency nano store (`currencyStore.ts`)

#### Dashboard

**Summary cards (top):**

- Side-by-side totals when secondary exists:
  - Total Assets: IDR Rp 10,000,000 / USD $5,000
  - Total Debt: IDR Rp 2,000,000 / USD $500
- Single line when no secondary (current behavior)
- No converted total

**Detail widgets (budgets, spending, top categories, budget health):**

- Tab bar: `[Primary] [Secondary]` (only shown when secondary exists)
- Shared tab state — switching updates all widgets
- Default: Primary currency

#### Transactions

- Tab bar for primary/secondary currency filtering
- Transaction form: currency auto-set from selected account (no manual override)
- Transfer modal: destination accounts filtered to same currency as source
- Cross-currency transfers blocked

#### Budgets

- Tab bar for primary/secondary filtering
- Create budget: currency from active tab

#### Reports

- Currency tab on all report pages
- One currency at a time, default Primary

#### Accounts

- Create account: currency dropdown shows only workspace's configured currencies

### 3. Services

**WorkspaceMetaService:**

- `getSecondaryCurrency(workspaceId)` — returns secondary or null
- `setSecondaryCurrency(workspaceId, currency)` — with lock check
- `getWorkspaceCurrencies(workspaceId)` — returns `{ primary, secondary }`
- `canChangeCurrencySettings(workspaceId)` — checks data existence

**DashboardService:**

- New `getDashboardSummary(workspaceId)` — multi-currency totals for summary cards
- Remove converted total calculation and exchange rate lookups

**AccountService:**

- Create validation: currency must be in workspace's configured currencies
- Transfer validation: block cross-currency transfers

**BudgetService:**

- Create validation: currency must be in workspace's configured currencies

### 4. API

**PUT /api/workspace/settings:**

- Expand currency validation from enum to `isValidCurrency()` check
- Add `secondary_currency` field (optional, nullable)
- Lock check: 400 if data exists and currencies changing

**GET /api/workspace/settings:**

- Add `secondary_currency` to response

**Transfers API:**

- Reject if source/destination account currencies differ

### 5. Removals

- `src/lib/currency/conversion.ts`
- `src/db/schema/sqlite/exchange-rates.ts` + PostgreSQL equivalent
- `src/lib/stores/currencyStore.ts`
- `src/components/molecules/CurrencySelector.astro` + stories
- Exchange rate seeder data
- Dashboard converted total display

### 6. Migration

**Schema:** Alter currency columns (remove enum), drop exchange_rates table.
**Data:** No transformation needed — existing IDR/USD values remain valid.
**Workspace defaults:** Existing workspaces keep primary='IDR', secondary=null.

### 7. Testing

**Unit:** Currency validation, lock mechanism, cross-currency transfer block, workspace currencies.
**Integration:** Dashboard multi-currency summary, budget/transaction filtering.
**E2E:** Onboarding flow, dashboard with two currencies, currency lock, transfer restrictions.
**Seeder:** Multi-currency workspace scenario, remove exchange rate seeds.
