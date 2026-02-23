# ADR 012: Multi-Currency Support — Separate Currency Baskets

## Status

Accepted

## Context

The application hardcodes `['IDR', 'USD']` as the only supported currencies via database enum constraints. Exchange rate tables and a header currency selector exist but add complexity without real conversion value — the app tracks spending, not forex. Users in different regions need currencies beyond IDR/USD, and the dual-total dashboard UX should work with any currency pair.

## Decision

Replace the hardcoded currency enum with a configurable, extensible currency list. Each workspace selects a Primary (required) and optional Secondary currency. No conversion between currencies — each basket maintains independent totals.

### 1. Supported Currencies

IDR, USD, SGD, PHP, EUR, GBP, MYR, THB, JPY, AUD, KRW, INR (12 currencies). Extensible — adding a currency means adding one entry to `CURRENCY_META`.

### 2. Data Model

**Schema changes (both SQLite + PostgreSQL):**

- Change `currency: text('currency', { enum: ['IDR', 'USD'] })` to `currency: text('currency').notNull()` on accounts, transactions, budgets
- App-level validation via `isValidCurrency()` against `AVAILABLE_CURRENCIES`
- Drop exchange rates table entirely (both dialects)

**Workspace meta:**

- Existing key `currency` = primary currency (unchanged)
- New key `secondary_currency` (empty string = single-currency mode)
- Validation: must pass `isValidCurrency()`, must differ from primary

### 3. Currency Lock Mechanism

Before updating `currency` or `secondary_currency`:

1. Check if any accounts, budgets, or transactions have ever existed (including soft-deleted records)
2. If data exists, reject with 400 error
3. UI disables dropdowns and shows warning
4. Both currency fields update atomically in a single transaction

### 4. UI Pattern

**Dashboard summary cards:** Side-by-side totals when secondary exists (e.g., `IDR Rp 10,000,000 / USD $5,000`). Single line when no secondary.

**Detail widgets:** Shared tab bar `[Primary] [Secondary]` — switching updates all widgets simultaneously. Default: Primary currency.

**Transactions/Budgets/Reports:** Tab bar for currency filtering. Transaction currency auto-set from selected account. Cross-currency transfers blocked.

**Settings:** Primary and Secondary dropdowns with flag emoji + code + name. Lock state with info alert when data exists.

### 5. Service Changes

- `WorkspaceMetaService`: `getWorkspaceCurrencies()`, `canChangeCurrencySettings()`, lock checks
- `DashboardService`: Dynamic currency grouping via `CurrencyAmount[]` instead of hardcoded `idr`/`usd` fields
- `AccountService` / `BudgetService`: Validate currency against workspace configuration
- Remove exchange rate lookups and converted total calculations

### 6. Removals

- `src/lib/currency/conversion.ts`
- Exchange rates schema (both dialects)
- `src/lib/stores/currencyStore.ts`
- `CurrencySelector` component + stories
- Exchange rate seeder data

### 7. Migration

Schema: Alter currency columns (remove enum), drop exchange_rates table. Data: No transformation — existing IDR/USD values remain valid. Existing workspaces keep current `currency` meta as primary, secondary defaults to null.

## Consequences

### Positive

- Supports 12 currencies without conversion complexity
- Workspace-level configuration keeps multi-tenant clean
- Lock mechanism prevents data integrity issues from currency changes
- Removes dead code (exchange rates, conversion utilities, currency selector)

### Negative

- No cross-currency totals or conversion — users see separate baskets only
- Currency settings are immutable once data exists — requires careful onboarding UX
- Limited to 2 currencies per workspace

### Non-Goals

- Currency conversion or exchange rate tracking
- More than 2 currencies per workspace
- Per-user currency preferences
