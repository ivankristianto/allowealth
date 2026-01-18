# TypeScript Error Fix Implementation Plan

## Summary

This plan addresses **77 TypeScript errors** and **123 hints** found in the codebase. The issues fall into several categories:

1. **TypeScript syntax in Astro inline scripts** (45+ errors) - Astro inline scripts with attributes run in browser, not TypeScript
2. **Missing component props** (8 errors) - Card and Input components missing ARIA/pattern props
3. **Type mismatches** (2 errors) - String vs number comparisons, wrong element types
4. **Implicit any types** (20+ warnings) - Service functions need proper typing
5. **Unused imports/variables** (50+ warnings) - Code cleanup needed

**Note:** 123 hints are non-blocking but should be addressed incrementally.

---

## Proposed Changes

### New Files

None - all changes are modifications to existing files.

### Modified Files

#### High Priority (Blocking Errors)

1. **src/components/atoms/Card.astro** - Add ARIA props support
2. **src/components/atoms/Input.astro** - Add HTML5 validation props (`pattern`, `title`)
3. **src/pages/budget/index.astro** - Extract inline script to separate `.ts` file
4. **src/pages/settings/categories.astro** - Extract inline script to separate `.ts` file
5. **src/pages/settings/payment-methods.astro** - Extract inline script to separate `.ts` file
6. **src/pages/signup.astro** - Remove invalid `pattern` prop from Input
7. **src/components/molecules/RegistrationForm.astro** - Remove invalid `pattern` prop
8. **src/components/organisms/DashboardError.astro** - Remove invalid `role` prop
9. **src/components/organisms/SummaryCards.astro** - Remove invalid `role` props
10. **src/components/organisms/TransactionModal.astro** - Fix dialog element type
11. **src/components/organisms/TransactionList.astro** - Fix undefined variable

#### Medium Priority (Type Safety)

12. **src/services/category.service.ts** - Add explicit types for Drizzle orderBy
13. **src/services/payment-method.service.ts** - Add explicit types for Drizzle orderBy
14. **src/services/asset.service.ts** - Add explicit types for Drizzle orderBy
15. **src/services/transaction.service.ts** - Add types for map callbacks
16. **src/pages/dashboard.astro** - Add type annotations
17. **src/components/organisms/AssetUpdateTodoList.astro** - Add event handler types

#### Low Priority (Code Cleanup)

18-30. **Multiple component files** - Remove unused imports
31-40. **Multiple test files** - Remove unused variables

---

## Tasks Checklist

### Category 1: Easiest - Remove Invalid Props (2-5 min each)

- [x] **[EASIEST]** Remove `pattern` prop from `src/pages/signup.astro:78` (Input doesn't support `pattern`)
- [x] **[EASIEST]** Remove `pattern` prop from `src/components/molecules/RegistrationForm.astro:100`
- [x] **[EASY]** Add `role?: string` and `aria-labelledby?: string` to `src/components/atoms/Card.astro` Props interface
- [x] **[EASY]** Remove `role` props from 3 Card usages in `src/components/organisms/SummaryCards.astro`
- [x] **[EASY]** Remove `role` prop from `src/components/organisms/DashboardError.astro`
- [x] **[EASY]** Add `pattern?: string` and `title?: string` to `src/components/atoms/Input.astro` Props interface and pass through to input element

### Category 2: Easy - Fix Type Errors (5-10 min each)

- [x] **[EASY]** Fix `transactions` undefined variable in `src/components/organisms/TransactionList.astro:269` (should be `transaction`)
- [x] **[EASY]** Fix `alert.overage > 0` type error in `src/pages/budget/index.astro:309` (cast to number)
- [x] **[EASY]** Fix `modal?.close()` error in `src/components/organisms/TransactionModal.astro:76` (cast to HTMLDialogElement)

### Category 3: Medium - Extract Inline Scripts (15-30 min each)

These require moving TypeScript code out of Astro inline scripts into separate `.ts` files, then importing them.

- [x] **[MEDIUM]** Extract inline script from `src/pages/budget/index.astro` to `src/pages/budget/budget-client.ts`
  - Create `src/pages/budget/budget-client.ts`
  - Move all script logic to new file
  - Import in Astro: `<script src="./budget-client.ts">`

- [x] **[MEDIUM]** Extract inline script from `src/pages/settings/categories.astro` to `src/pages/settings/categories-client.ts`
  - Create `src/pages/settings/categories-client.ts`
  - Move all script logic to new file
  - Import in Astro: `<script src="./categories-client.ts">`

- [x] **[MEDIUM]** Extract inline script from `src/pages/settings/payment-methods.astro` to `src/pages/settings/payment-methods-client.ts`
  - Create `src/pages/settings/payment-methods-client.ts`
  - Move all script logic to new file
  - Import in Astro: `<script src="./payment-methods-client.ts">`

### Category 4: Medium - Add Type Annotations to Services (10-15 min each)

- [x] **[MEDIUM]** Add types to `src/services/category.service.ts:76` - `orderBy: (categories: Category, { asc }) => ...`
- [x] **[MEDIUM]** Add types to `src/services/payment-method.service.ts:69` - `orderBy: (paymentMethods: PaymentMethod, { asc }) => ...`
- [x] **[MEDIUM]** Add types to `src/services/asset.service.ts:101` - `orderBy: (assets: Asset, { asc }) => ...`
- [x] **[MEDIUM]** Add types to `src/services/asset.service.ts:196` - `orderBy: (assetHistory: AssetHistory, { desc }) => ...`
- [x] **[MEDIUM]** Add types to `src/services/transaction.service.ts:367,493,510` - map callback parameters

### Category 5: Low - Remove Unused Imports (5 min each)

- [x] **[LOW]** Remove unused import from `src/middleware.ts:12`
- [x] **[LOW]** Remove unused imports from `src/components/atoms/Percentage.astro`
- [x] **[LOW]** Remove unused imports from `src/components/molecules/QuickActions.astro`
- [x] **[LOW]** Remove unused imports from `src/components/molecules/TransactionRow.astro`
- [x] **[LOW]** Remove unused imports from `src/components/organisms/AssetUpdateTodoList.astro`
- [x] **[LOW]** Remove unused imports from `src/components/organisms/BudgetHistoryComparison.astro`
- [x] **[LOW]** Remove unused imports from `src/components/organisms/SummaryCards.astro`
- [x] **[LOW]** Remove unused imports from `src/components/organisms/TransactionList.astro`
- [x] **[LOW]** Remove unused imports from `src/pages/settings/categories.astro`
- [x] **[LOW]** Remove unused imports from `src/pages/settings/payment-methods.astro`

### Category 6: Low - Clean Up Test Files (5 min each)

- [x] **[LOW]** Remove unused variables from `src/services/auth.service.test.ts`
- [x] **[LOW]** Remove unused variables from `src/lib/currency/conversion.test.ts`
- [x] **[LOW]** Remove unused variables from `src/lib/auth/lucia.test.ts`
- [x] **[LOW]** Remove unused variables from `src/services/dashboard.service.test.ts`
- [x] **[LOW]** Remove unused variables from `src/services/dashboard.service.integration.test.ts`

### Category 7: Low - Remove Dead Code (5-15 min each)

- [x] **[LOW]** Remove unused `variantClasses` from `src/components/atoms/EmptyState.astro:38`
- [x] **[LOW]** Remove unused `typeLabels` from `src/components/atoms/PaymentMethodSelect.astro:46`
- [x] **[LOW]** Remove unused `getPriorityBadge` from `src/components/organisms/AssetUpdateTodoList.astro:58`
- [x] **[LOW]** Remove unused `getStatusColor` from `src/components/organisms/BudgetHistoryComparison.astro:46`
- [x] **[LOW]** Remove unused `getProgressColor` from `src/components/organisms/SummaryCards.astro:86`
- [x] **[LOW]** Remove unused `paymentIcons` from `src/components/molecules/TransactionRow.astro:40`
- [x] **[LOW]** Remove unused variables from `src/components/molecules/CSVImportForm.astro`
- [x] **[LOW]** Remove unused variables from `src/components/molecules/TransactionForm.astro`

### Category 8: Very Low - Address Hints (Optional, Non-Blocking)

- [x] **[VERY LOW]** Add `is:inline` directive to suppress Astro warnings in 6 files (or ignore)
- [ ] **[VERY LOW]** Fix Drizzle ORM deprecation warnings in schema files (upgrade when available)
- [x] **[VERY LOW]** Remove unused `await` keywords in test files (getDb is synchronous)
- [ ] **[VERY LOW]** Fix JSDoc type hint in `src/components/molecules/ToastContainer.astro`

---

## Implementation Order

**Recommended sequence to unblock development:**

1. **Phase 1 (Blocking Errors, ~30 min):** Complete Category 1 & 2 - Fix immediate type errors
2. **Phase 2 (Major Refactoring, ~60 min):** Complete Category 3 - Extract inline scripts
3. **Phase 3 (Type Safety, ~45 min):** Complete Category 4 - Add service type annotations
4. **Phase 4 (Cleanup, ~60 min):** Complete Category 5, 6, 7 - Remove unused code
5. **Phase 5 (Optional):** Category 8 - Address non-blocking hints

**Total estimated time:** ~3.5 hours for all blocking issues

---

## Key Technical Notes

### Why Inline Scripts Can't Use TypeScript

Astro's `<script>` tags with attributes like `define:vars` or `nonce` are treated as inline scripts and run directly in the browser. Browser JavaScript doesn't understand TypeScript syntax like:

- Type annotations: `function foo(x: string)`
- Type assertions: `x as HTMLInputElement`
- Type imports: `import type { ... }`

**Solution:** Extract TypeScript code to separate `.ts` files and import them.

### Component Props Pattern

When adding ARIA or HTML5 attributes to component props:

```typescript
// Card.astro
export interface Props {
  // ... existing props
  role?: string;
  aria-labelledby?: string;
  // Allow any other ARIA attributes
  [key: `aria-${string}`]: string | undefined;
}
```

### Drizzle ORM Type Inference

For `orderBy` callbacks, TypeScript needs explicit types:

```typescript
orderBy: (categories: Category, { asc }) => [asc(categories.name)];
```

---

## Validation

After completing each category, run:

```bash
bun run typecheck
```

Expected results:

- Phase 1 complete: ~70 errors remaining
- Phase 2 complete: ~0 errors remaining
- Phase 3 complete: 0 errors, ~80 warnings remaining
- Phase 4 complete: 0 errors, ~30 warnings remaining

---

## Constitution Alignment

This plan follows constitution principles:

- **Code Quality**: Addresses type safety and removes dead code
- **Fences**: Unblocks the `typecheck` gate (blocking)
- **Clarity**: Proper types improve code documentation
