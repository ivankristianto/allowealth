# Container Query Migration Checklist

## Phase 1: High-Impact Pages and Shared Components

- [ ] `src/pages/transactions/index.astro` and `src/components/organisms/TransactionList.astro`
- [ ] `src/pages/budget/index.astro` and `src/components/organisms/BudgetTable.astro`
- [ ] `src/pages/reports/index.astro` and `src/components/organisms/CategoryIntelligenceTable.astro`
- [ ] `src/pages/settings/index.astro` and `src/components/organisms/ManageAccountForms.astro`
- [ ] `src/pages/assets/index.astro`, `src/pages/assets/closed.astro`, and `src/components/organisms/AssetActions.astro`
- [ ] `src/components/organisms/BudgetSummary.astro`, `src/components/organisms/BudgetCard.astro`, and `src/components/molecules/BudgetActions.astro`

## Phase 2: Tables, Cards, and Form-Heavy Components

- [ ] Convert remaining table breakpoint columns to container breakpoints:
  - `src/components/organisms/BudgetHistoryComparison.astro`
  - `src/components/partials/AssetHistoryPartial.astro`
  - `src/components/partials/TransactionHistoryPartial.astro`
- [ ] Convert responsive form row/grid patterns:
  - `src/components/organisms/CategoryModal.astro`
  - `src/components/organisms/AssetFormModal.astro`
  - `src/components/organisms/AssetHistoryModal.astro`
- [ ] Normalize card spacing/typography scales still using viewport tokens:
  - `src/components/organisms/FinancialVelocityChart.astro`
  - `src/components/organisms/SpendingCard.astro`
  - `src/components/atoms/StatCard.astro`

## Phase 3: Low-Risk Cleanup and Decision Bucket

- [ ] Resolve `NEEDS_DECISION` hits in token maps/frontmatter objects (`sm:`, `md:`, `lg:` keys) and confirm intentional usage vs responsive class leakage.
- [ ] Resolve marketing/landing breakpoints (`src/components/organisms/landing/*`, `src/pages/contact.astro`, `src/pages/privacy.astro`, `src/pages/terms.astro`) with explicit decision: keep viewport or convert selected blocks.
- [ ] Standardize page container wrappers to `@container` + mapped `@` breakpoints where still using `sm:px-*` / `lg:px-*` in app pages.

## Explicit Keep List (Viewport Chrome)

- [ ] Keep viewport breakpoints for app shell/navigation behavior:
  - `src/layouts/MainLayout.astro`
  - `src/components/layouts/Header.astro`
  - `src/components/layouts/MobileNavigation.astro`
  - `src/components/layouts/PublicNavbar.astro`

## Verification Gate For Each Migrated File

- [ ] 375px mobile check: no overflow; touch targets >= 44x44
- [ ] 1024px check with sidebar visible: component adapts by container width
- [ ] 1100px and 1440px checks: spacing and table/card transitions remain stable
- [ ] Confirm no `sm:/md:/lg:/xl:` viewport classes remain in migrated component blocks unless explicitly documented as chrome/exception
