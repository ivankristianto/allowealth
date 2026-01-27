# Budget Migration Plan: Categories → Budgets Table

## Overview

Remove `percentage`, `budget_amount`, and `currency` from the Categories table. Use the Budgets table as the primary source for monthly budget data, enabling historical budget tracking.

## User Requirements

- **Empty month**: Show "No budgets set" message (already exists in UI)
- **Data migration**: None - users start fresh (no backward compatibility)
- **Category currency**: Remove entirely from categories
- **Percentage**: Calculate on-the-fly (not stored)
- **Schema changes**: Direct schema edits + seeder update (no migration files)

## Data Model Clarifications

**Transaction ↔ Budget Relationship:**

- **Indirect link** via `category_id` + transaction date (no FK to budgets table)
- Budget spent amount = SUM of expense transactions matching `category_id` within the budget's `month/year`
- No schema changes needed for transactions table

**Income Handling:**

- Income transactions are **ignored** for budget tracking
- Budgets are expense-only (categories with type="income" won't have budget records)
- Only expense categories appear in budget management UI

## Implementation Phases

### Phase 1: New Budget CRUD API & Service

**New files to create:**

1. `src/lib/validation/budgets.ts` - Validation schemas

```typescript
// createBudgetSchema: category_id, month, year, budget_amount, currency, notes?
// updateBudgetSchema: budget_amount, notes?
// copyBudgetsSchema: source_month, source_year, target_month, target_year
```

2. `src/lib/types/budget.ts` - Type definitions

```typescript
// Budget, BudgetWithCategory, CreateBudgetInput, UpdateBudgetInput
```

3. `src/pages/api/budgets/index.ts` - List & Create
   - `GET /api/budgets?month=1&year=2026&currency=IDR`
   - `POST /api/budgets` - Create budget record

4. `src/pages/api/budgets/[id].ts` - Single budget CRUD
   - `GET /api/budgets/:id`
   - `PUT /api/budgets/:id`
   - `DELETE /api/budgets/:id`

5. `src/pages/api/budgets/copy.ts` - Copy to next month
   - `POST /api/budgets/copy` - Copy all budgets from source to target month

**Modify BudgetService** (`src/services/budget.service.ts`):

- Add: `createBudget()`, `updateBudget()`, `deleteBudget()`, `getBudgetByCategory()`, `copyBudgetsToMonth()`

#### Progress Checklist

- [x] Create `src/lib/validation/budgets.ts`
- [x] Create `src/lib/types/budget.ts`
- [x] Create `src/pages/api/budgets/index.ts` (GET list, POST create)
- [x] Create `src/pages/api/budgets/[id].ts` (GET, PUT, DELETE)
- [x] Create `src/pages/api/budgets/copy.ts` (POST copy)
- [x] Add `createBudget()` to BudgetService
- [x] Add `updateBudget()` to BudgetService
- [x] Add `deleteBudget()` to BudgetService
- [x] Add `getBudgetById()` to BudgetService
- [x] Add `getBudgetByCategory()` to BudgetService
- [x] Add `findAllBudgets()` to BudgetService
- [x] Add `copyBudgetsToMonth()` to BudgetService

**Completed:** 2026-01-27 | **Commit:** `bc88c5a`

**Additional changes made:**

- Added currency validation (budget currency must match category currency)
- Added empty update payload validation
- Copy operation wrapped in transaction for atomicity
- Closed budgets cannot be modified (permanent lock by design)

---

### Phase 2: Refactor Budget Service to Use Budgets Table

**Critical change in** `src/services/budget.service.ts`:

Current (line 75-82, 117):

```typescript
// Queries categories.budget_amount
const userCategories = await this.db.query.categories.findMany({...});
const budgetAmount = category.budget_amount; // Line 117
```

New approach:

```typescript
// Query budgets table joined with categories
const monthBudgets = await this.db
  .select({
    budget_amount: budgets.budget_amount,
    category_id: budgets.category_id,
    category_name: categories.name,
    category_type: categories.type,
    // ... etc
  })
  .from(budgets)
  .innerJoin(categories, eq(budgets.category_id, categories.id))
  .where(
    and(
      eq(budgets.user_id, user_id),
      eq(budgets.month, month),
      eq(budgets.year, year),
      eq(budgets.currency, currency)
    )
  );
```

**Methods to update:**

- `getMonthlyOverview()` - Query budgets table instead of categories
- `getCategoryRemaining()` - Query budgets table for budget_amount
- `getBudgetHistory()` - Already calls getMonthlyOverview, should work

#### Progress Checklist

- [x] Refactor `getMonthlyOverview()` to query budgets table
- [x] Refactor `getCategoryRemaining()` to query budgets table
- [x] Verify `getBudgetHistory()` works with new queries
- [x] Update test mocks to use budgets table
- [x] Add tests for inactive/income category filtering

**Completed:** 2026-01-27

**Key changes:**

- `getMonthlyOverview()` now queries `budgets` table with category relation
- `getCategoryRemaining()` queries budgets table using category's currency
- Added `createMockBudget()` and `createMockBudgetWithCategory()` test helpers
- Added test cases for inactive category and income category exclusion

---

### Phase 3: Update UI Components

**Files to modify:**

1. `src/components/organisms/SetNewBudgetModal.astro`
   - Change API endpoint from `PUT /api/categories/:id` to `POST/PUT /api/budgets`
   - Add month/year context (use current month by default)
   - Include month/year display in modal

2. `src/pages/budget/index.astro`
   - Add "Copy to Next Month" button in header
   - Add confirmation modal for copy action
   - Update client-side event handlers

3. `src/components/organisms/BudgetPageHeader.astro`
   - Add "Copy to Next Month" button

**New component:**

- `src/components/organisms/CopyBudgetModal.astro` - Confirmation modal for copying budgets

#### Progress Checklist

- [x] Update `SetNewBudgetModal.astro` to use new API endpoints
- [x] Add month/year context to SetNewBudgetModal
- [x] Create `CopyBudgetModal.astro`
- [x] Add "Copy to Next Month" button to `BudgetPageHeader.astro`
- [x] Update `budget/index.astro` with copy functionality

**Completed:** 2026-01-27

**Key changes:**

- SetNewBudgetModal now calls POST /api/budgets (create) or PUT /api/budgets/:id (update)
- Added month/year props to track budget period context
- Created CopyBudgetModal with validation and screen reader accessibility
- BudgetPageHeader shows "Copy to Next Month" button when budgets exist
- Added ARIA live regions for loading state announcements (accessibility)
- Added client-side validation for budget amounts and month/year ranges

---

### Phase 4: Remove Budget Fields from Categories

**Schema change** (`src/db/schema/categories.ts`) - Direct edit, no migration needed:

```diff
- percentage: text('percentage').default('0').notNull(),
- budget_amount: text('budget_amount').default('0').notNull(),
- currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
```

Note: After schema changes, run `bun run db:push` to sync schema to database (dev only).

**Type updates** (`src/lib/types/category.ts`):

- Remove `percentage`, `budget_amount`, `currency` from Category interface

**Validation updates** (`src/lib/validation/categories.ts`):

- Remove `percentageValidation`, `budgetAmountValidation`, `currencyEnum`
- Remove from `createCategorySchema`, `updateCategorySchema`

**Service updates** (`src/services/category.service.ts`):

- Remove budget fields from `create()` (lines 40-41)
- Remove budget fields from `update()` (lines 100-101)

**API updates:**

- `src/pages/api/categories/index.ts` - Remove budget fields from POST
- `src/pages/api/categories/[id].ts` - Remove budget fields from PUT/response
- `src/pages/api/budget/category/[id].ts` - Deprecate/remove this endpoint

#### Progress Checklist

- [x] Remove columns from `src/db/schema/categories.ts`
- [x] Update `src/lib/types/category.ts`
- [x] Update `src/lib/validation/categories.ts`
- [x] Update `src/services/category.service.ts`
- [x] Update `src/pages/api/categories/index.ts`
- [x] Update `src/pages/api/categories/[id].ts`
- [x] Remove/deprecate `src/pages/api/budget/category/[id].ts`
- [x] Update `src/services/budget.service.ts` (getCategoryRemaining now takes currency param)
- [x] Update `src/services/dashboard.service.ts` (queries budgets table instead of categories)
- [x] Update UI components (CategoryModal, categories page, CategorySelect)
- [x] Update transaction pages to use transaction currency for budget lookup
- [x] Update integration tests to remove budget fields from categories
- [x] Update unit tests and mocks

**Status: COMPLETE**

---

### Phase 5: Update Dashboard & Related Services

**Files to update:**

- `src/services/dashboard.service.ts` - Update budget queries to use budgets table
- `src/lib/utils/budget.ts` - Update type definitions, remove category.percentage references
- `src/lib/budget/alerts.ts` - Should work (uses spent/budget pairs)

#### Progress Checklist

- [x] Update `src/services/dashboard.service.ts` (verified - already queries budgets table)
- [x] Update `src/lib/utils/budget.ts` (removed unused functions)
- [x] Verify `src/lib/budget/alerts.ts` works (confirmed - uses spent/budget pairs)

**Completed:** 2026-01-27

**Key changes:**

- Verified dashboard service already queries budgets table (getMonthlySpent, getBudgetHealth)
- Removed unused `calculateTotalBudget` and `shouldWarnBudgetAllocation` functions
- Removed unused `BudgetTotal` type
- Cleaned up unused `addCurrency` import

---

### Phase 6: OpenAPI Documentation

**Remove from Category schemas:**

- `openapi/schemas/Category.yml` - Remove percentage, budget_amount, currency
- `openapi/schemas/CreateCategoryRequest.yml` - Remove budget fields
- `openapi/schemas/UpdateCategoryRequest.yml` - Remove budget fields

**Create new schemas:**

- `openapi/schemas/Budget.yml`
- `openapi/schemas/CreateBudgetRequest.yml`
- `openapi/schemas/UpdateBudgetRequest.yml`
- `openapi/schemas/CopyBudgetsRequest.yml`

**Create new paths:**

- `openapi/paths/budgets.yml`

**Update main file:**

- `openapi.yml` - Add references to new schemas/paths

#### Progress Checklist

- [x] Update `openapi/schemas/Category.yml`
- [x] Update `openapi/schemas/CreateCategoryRequest.yml`
- [x] Update `openapi/schemas/UpdateCategoryRequest.yml`
- [x] Create `openapi/schemas/Budget.yml`
- [x] Create `openapi/schemas/CreateBudgetRequest.yml`
- [x] Create `openapi/schemas/UpdateBudgetRequest.yml`
- [x] Create `openapi/schemas/CopyBudgetsRequest.yml`
- [x] Create `openapi/paths/budgets.yml`
- [x] Update `openapi.yml` with new references

**Completed:** 2026-01-27

**Key changes:**

- Removed percentage, budget_amount, currency from Category schemas
- Created Budget, CreateBudgetRequest, UpdateBudgetRequest, CopyBudgetsRequest schemas
- Created CopyBudgetsResponse, BudgetResponse, BudgetsListResponse response schemas
- Created budgets.yml with full CRUD endpoints (/api/budgets)
- Removed deprecated /api/budget/category/{id} endpoint
- Deleted unused BudgetCategoryResponse and UpdateBudgetCategoryRequest schemas
- Added required field specifications to response schemas

---

### Phase 7: Update Tests & Mocks

**Test files to update:**

- `src/services/budget.service.test.ts` - Update to use budgets table mocks
- `src/services/category.service.test.ts` - Remove budget_amount tests
- `src/services/dashboard.service.test.ts` - Update budget queries
- `src/pages/api/budget/category/budget-category.api.integration.test.ts` - Update/remove
- `src/pages/api/categories/categories.api.integration.test.ts` - Remove budget assertions
- `src/components/organisms/SetNewBudgetModal.test.ts` - Update API calls
- `src/components/organisms/BudgetCard.test.ts` - Update mocks
- `src/components/organisms/BudgetCardGrid.test.ts` - Update mocks

**Mock files to update:**

- `src/services/test-helpers/mocks.ts` - Remove budget fields from createMockCategory, add createMockBudget

#### Progress Checklist

- [ ] Update `src/services/budget.service.test.ts`
- [ ] Update `src/services/category.service.test.ts`
- [ ] Update `src/services/dashboard.service.test.ts`
- [ ] Update/remove `budget-category.api.integration.test.ts`
- [ ] Update `categories.api.integration.test.ts`
- [ ] Update `SetNewBudgetModal.test.ts`
- [ ] Update `BudgetCard.test.ts`
- [ ] Update `BudgetCardGrid.test.ts`
- [ ] Update `src/services/test-helpers/mocks.ts`

---

### Phase 8: Update Seeder

**File:** `src/db/seed.ts`

- Remove `percentage`, `budget_amount`, `currency` from category seed data
- Add budget seed data for recent months (e.g., last 3 months)

#### Progress Checklist

- [ ] Update `src/db/seed.ts` - remove budget fields from categories
- [ ] Add budget seed data for recent months

---

## Critical Files Summary

| File                                               | Change Type                          |
| -------------------------------------------------- | ------------------------------------ |
| `src/db/schema/categories.ts`                      | Remove 3 columns                     |
| `src/db/schema/budgets.ts`                         | No change (already exists)           |
| `src/services/budget.service.ts`                   | Major refactor - query budgets table |
| `src/services/category.service.ts`                 | Remove budget field handling         |
| `src/lib/types/category.ts`                        | Remove budget fields                 |
| `src/lib/validation/categories.ts`                 | Remove budget validations            |
| `src/components/organisms/SetNewBudgetModal.astro` | Update API endpoint                  |
| `src/pages/budget/index.astro`                     | Add copy functionality               |
| `src/pages/api/budgets/*.ts`                       | NEW - Budget CRUD endpoints          |
| `src/pages/api/categories/*.ts`                    | Remove budget fields                 |

---

## Verification Checklist

1. **Empty state test:**
   - Navigate to a future month with no budgets
   - Should show "No budgets set" message
   - "Set Budget" button should work

2. **Budget CRUD:**
   - Create budget for category in January 2026
   - Edit budget amount
   - Delete budget
   - Verify persists across refresh

3. **Copy to next month:**
   - Set budgets for January 2026
   - Click "Copy to Next Month"
   - Navigate to February 2026
   - Verify budgets copied correctly

4. **Percentage calculation:**
   - Create 3 budgets: $100, $200, $300
   - Verify percentages: ~16.67%, ~33.33%, ~50%

5. **Quality gates:**

   ```bash
   bun run lint:fix
   bun run stylelint:fix
   bun run format:fix
   bun run typecheck
   bun run test
   bun run db:push  # Sync schema (dev only)
   ```

6. **Manual E2E:**
   - Login as test user
   - Go to Budget page
   - Set budgets for current month
   - Add transactions
   - Verify spent amounts update
   - Verify status (ok/warning/exceeded) works
