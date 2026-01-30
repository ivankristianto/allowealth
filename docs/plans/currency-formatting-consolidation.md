# Currency Formatting Consolidation Plan

## Objective

- Eliminate all duplicate currency/number formatting functions and inline formatters.
- Establish **one** canonical formatting module as the **only** source of truth.
- Remove unused or redundant formatter APIs (no backward compatibility, no re-exports).
- Preserve client/server constraints (no Decimal.js in browser bundles).
- Add tests to lock in behavior and prevent regressions.

## Current Duplication Inventory (by location)

### Core formatting functions

- `src/lib/tokens.ts`: `formatCurrency`, `formatPercentage`, `formatCompactNumber`.
- `src/lib/utils/currency.ts`: `formatCurrency`, `formatCurrencyFromNumber`, `formatCurrencyNumber`, `formatCurrencyCompact`, `parseCurrencyInput`, math helpers.
- `src/lib/utils/currency-client.ts`: `formatCurrencyFromNumber`, `formatCurrencyCompact` (client-safe).
- `src/lib/constants/currency.ts`: `formatCurrency` (manual formatting via `toLocaleString('en-US')`).
- `src/lib/currency/conversion.ts`: `formatCurrencyAmount` (manual formatting with comma thousands).

### Inline runtime formatters (production UI / client scripts)

- `src/components/organisms/TransactionList.client.ts`: `Intl.NumberFormat` with dynamic currency.
- `src/components/organisms/TransactionsPage.client.ts`: `parseFloat(...).toLocaleString()` plus currency string.
- `src/pages/assets/history.astro`: manual symbol + `toLocaleString()`.
- `src/components/organisms/FinancialVelocityChart.astro`: `Intl.NumberFormat` for tooltips.
- `src/components/organisms/AssetHistoryModal.astro`: client script imports `formatCurrency` from tokens.

### Storybook/tests with local formatters

- Storybook local `formatCurrency` helpers:
  - `src/components/atoms/Currency.stories.ts`
  - `src/components/atoms/Percentage.stories.ts`
  - `src/components/organisms/BudgetCard.stories.ts`
  - `src/components/organisms/SpendingCard.stories.ts`
  - `src/components/organisms/BudgetCardGrid.stories.ts`
  - `src/components/organisms/TransactionSummaryCards.stories.ts`
  - `src/components/organisms/AssetDeleteConfirmModal.stories.ts`
  - `src/components/organisms/AssetGroupCard.stories.ts`
  - `src/components/organisms/AssetHistoryModal.stories.ts`
  - `src/components/organisms/AssetItemRow.stories.ts`
  - `src/components/organisms/AssetPortfolioSummary.stories.ts`
  - `src/components/organisms/BudgetSummary.stories.ts`
  - `src/components/organisms/CategoryDrillDownModal.stories.ts`
  - `src/components/organisms/AssetUpdateTodoList.stories.ts`
  - `src/components/organisms/RecentTransactionsList.stories.ts`
  - `src/components/organisms/TransactionList.stories.ts`
- Test-local formatter:
  - `src/components/organisms/BudgetCard.test.ts`

## Behavior Differences to Reconcile

- **Separators/locale**: IDR should use `id-ID` (dot thousands); `formatCurrencyAmount` and `constants/formatCurrency` currently use comma thousands.
- **Symbol spacing**: Some outputs include a space (Intl for IDR often yields `Rp 1.000.000`), others output `Rp100` or `Rp 0`.
- **Compact notation**: `tokens.formatCurrency` only handles `>= 1,000,000` and only `M`; `utils/currency` handles `K/M/B`; sign placement differs (`Rp-1.5M`).
- **Input types**: string vs number; tokens uses `parseFloat` without guard; utils uses Decimal with validation.
- **Invalid currency codes**: Inline `Intl.NumberFormat` with user-supplied `currency` can throw and break UI.
- **Precision**: `parseFloat` and `toLocaleString` can lose precision vs Decimal.

## Dependencies

- Runtime formatting primitives: `Intl.NumberFormat`, `Number#toLocaleString` (built-in).
- Decimal precision: `decimal.js` in `src/lib/utils/currency.ts` (server-only).
- Currency metadata/types:
  - `src/lib/constants/currency.ts` (metadata + type).
  - `src/lib/enums.ts` (`Currency` Zod enum used widely).
- UI tokens and usage: `src/lib/tokens.ts` (design system), `Currency` atom.
- Tests: `bun:test`.

## Potential Security / Integrity Risks in Current Logic

- **Unhandled invalid currency codes** in client scripts (`Intl.NumberFormat` with user data) can throw and break UI rendering.
- **NaN / Infinity formatting** from `parseFloat` in tokens/inline formatters can surface as `NaN` strings or misleading values.
- **Precision loss** (string -> float) can misrepresent large values in UI; this is an integrity risk for finance data.
- **Inconsistent separators and rounding** can mislead users (e.g., IDR displayed with comma thousands).
- **Negative sign placement inconsistencies** (`Rp-100` vs `-Rp100`) can be misread.

## Consolidation Strategy (Architecture)

- **Single formatting spec** for IDR/USD covering:
  - full format, compact format (K/M/B), number-only, and percentage.
  - symbol placement, spacing, decimals, rounding rules, negative sign behavior.
- **Single source of currency metadata** (decimals, locale, symbol). Prefer `src/lib/constants/currency.ts` and delete `tokens.currencyFormats`.
- **Single formatting module** with two entrypoints:
  - client-safe number formatting (Intl-based, no Decimal).
  - server wrapper for string amounts (Decimal validation + conversion to number for display).
- **No compatibility adapters**: remove duplicate exports and update all imports to the canonical module.

## Minimal Viable File Structure

```
src/lib/formatting/
  currency-core.ts        # Intl-based, client-safe; accepts number
  currency.ts             # server wrapper (string -> Decimal -> number) + exports
  currency-client.ts      # client wrapper, re-export from currency-core
  percentage.ts           # (optional) formatPercentage
  index.ts                # public exports

src/lib/formatting/__tests__/
  currency.test.ts        # full/compact/negative/invalid cases

src/lib/tokens.ts         # remove formatter logic; if used, import from formatting
```

## Execution Plan (UI -> Service -> API -> CLI -> Seeder)

1. **Discovery & Spec Definition (no code changes)**

- Capture expected outputs for existing usages (UI, services, tests, stories).
- Decide canonical formatting rules (spacing, rounding, compact thresholds, negative sign).
- Document the spec in `design-system/06-data-visualization.md`.

2. **Tests First (TDD: red → green → refactor)**

- Add `src/lib/formatting/__tests__/currency.test.ts` for full/compact formatting matrix.
- Add tests for invalid input handling and for IDR/USD separators and decimals.
- Add tests for negative sign placement and compact formatting.
- Run `bun run test` to confirm failures, implement minimal code to pass, then refactor per checklist.

3. **UI Layer Updates (first per constitution)**

- Replace inline formatters in UI/client scripts with canonical formatting exports.
- Update Storybook stories to import canonical formatters (no local formatter functions).
- Prefer `Currency` atom when rendering currency values (where feasible).
- Remove any local formatter helpers in stories/tests.

4. **Service/Lib Updates**

- Replace all imports of `formatCurrency*` in lib/services with the canonical module.
- Delete duplicate formatter modules:
  - `src/lib/tokens.ts` formatter section
  - `src/lib/utils/currency-client.ts` formatting functions
  - `src/lib/utils/currency.ts` formatting functions (keep only parsing/math if needed)
  - `src/lib/currency/conversion.ts` `formatCurrencyAmount`
  - `src/lib/constants/currency.ts` `formatCurrency`
- Update tests to use canonical formatter (remove local formatters).

5. **API / CLI / Seeder**

- No direct changes expected. If any formatting helpers exist there, route them to the canonical module.

6. **Documentation & Quality Gates**

- Update `design-system/START.md` references if the primary import path changes.
- Run quality gates: `bun run lint:fix`, `bun run stylelint:fix`, `bun run format:fix`, `bun run typecheck`, `bun run test`.

## Notes / Constraints

- Keep client bundles free of `decimal.js` (use client-safe module for browser scripts).
- Remove redundant public APIs; do not preserve old paths.
- Align output with **new** canonical spec; update tests accordingly.
