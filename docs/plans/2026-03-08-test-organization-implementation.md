# Test Organization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish a documented test organization standard, move a first wave of representative tests into scope-based folders, remove a duplicate API test, and replace several low-value tests with coverage that exercises real source.

**Architecture:** Keep single-module Bun tests colocated under `src/`, move cross-cutting Bun tests into top-level `tests/` scope folders, and leave Playwright under `e2e/tests`. Use alias imports in moved top-level tests where possible so future moves do not force more relative import churn.

**Tech Stack:** Astro 5, TypeScript, Bun test, Playwright, file-based source guards

---

### Task 1: Document the test organization standard

**Files:**
- Modify: `.claude/rules/testing.md`
- Create: `docs/plans/2026-03-08-test-organization-design.md`
- Create: `docs/plans/2026-03-08-test-organization-implementation.md`

**Step 1: Write the failing test**

No new runtime test for this task. The failure is the current undocumented structure drift in the repo rules.

**Step 2: Update the test rules**

Add a new section that defines:

- colocated unit tests as the default
- top-level `tests/` scope folders for cross-cutting Bun tests
- `.test.ts` for Bun and `.spec.ts` for Playwright
- a ban on new `src/**/__tests__` directories
- a ban on non-test files inside test directories unless they live in `helpers`

**Step 3: Save the design and plan docs**

Write the approved design and this implementation plan into `docs/plans/`.

**Step 4: Verify the docs render cleanly**

Run: `bunx prettier --check .claude/rules/testing.md docs/plans/2026-03-08-test-organization-design.md docs/plans/2026-03-08-test-organization-implementation.md`

Expected: PASS

### Task 2: Move representative cross-cutting tests into top-level scope folders

**Files:**
- Move: `src/__tests__/api/budgets/initialize.test.ts` -> `tests/integration/api/budgets/initialize.test.ts`
- Delete: `src/__tests__/api/budgets-initialize.test.ts`
- Move: `src/services/__tests__/transaction-summary-aggregation.test.ts` -> `tests/integration/api/transactions/summary-aggregation.test.ts`
- Move: `src/__tests__/review-feedback-regressions.test.ts` -> `tests/regression/review-feedback-regressions.test.ts`
- Move: `src/__tests__/ui-style-consistency.test.ts` -> `tests/architecture/ui-style-consistency.test.ts`
- Move: `src/services/__tests__/performance-benchmark.test.ts` -> `tests/perf/services/performance-benchmark.test.ts`

**Step 1: Confirm the duplicate fails the consistency goal**

Run: `rg -n "POST /api/budgets/initialize" src/__tests__ tests`

Expected: two matching test files before cleanup

**Step 2: Move the files into their scope folders**

Keep file contents intact unless imports or comments need path updates.

**Step 3: Update imports and inline run instructions**

Use alias imports in top-level tests where practical. Fix any `Run:` comments that still point at `src/**/__tests__`.

**Step 4: Run the moved tests**

Run:

- `bun test tests/integration/api/budgets/initialize.test.ts`
- `bun test tests/integration/api/transactions/summary-aggregation.test.ts`
- `bun test tests/regression/review-feedback-regressions.test.ts`
- `bun test tests/architecture/ui-style-consistency.test.ts`
- `bun test tests/perf/services/performance-benchmark.test.ts`

Expected: PASS

### Task 3: Clean up colocated formatting tests and helper placement

**Files:**
- Move: `src/lib/formatting/__tests__/amount-input.test.ts` -> `src/lib/formatting/amount-input.test.ts`
- Move: `src/lib/formatting/__tests__/currency.test.ts` -> `src/lib/formatting/currency.test.ts`
- Move: `src/components/molecules/__tests__/budget-health-test-utils.ts` -> `src/components/molecules/test-helpers/budget-health.ts`

**Step 1: Move the colocated tests beside their real modules**

Update relative imports from `../foo` to `./foo` where needed.

**Step 2: Move the helper out of the test folder**

Keep it under the component tree, but place it in an explicit helper directory.

**Step 3: Run the moved formatting tests**

Run:

- `bun test src/lib/formatting/amount-input.test.ts`
- `bun test src/lib/formatting/currency.test.ts`

Expected: PASS

### Task 4: Replace low-value component tests with tests that touch real source

**Files:**
- Modify: `src/components/atoms/ThemeToggle.test.ts`
- Delete: `src/components/atoms/CategoryIcon.test.ts`
- Create: `src/lib/utils/categoryIconRegistry.test.ts`
- Modify: `src/components/organisms/BudgetInlineEdit.client.test.ts`
- Modify: `src/components/organisms/TransactionFiltersBar.test.ts`

**Step 1: Write the failing tests against the real source**

- `ThemeToggle.test.ts` should inspect `ThemeToggle.astro` and `ThemeToggle.client.ts`
- `categoryIconRegistry.test.ts` should assert alias normalization and fallback behavior
- `BudgetInlineEdit.client.test.ts` should import `validateBudgetAmount` from the real client module
- `TransactionFiltersBar.test.ts` should inspect the real Astro component instead of local constants

**Step 2: Run the targeted tests to verify they fail for the right reason**

Run:

- `bun test src/components/atoms/ThemeToggle.test.ts`
- `bun test src/lib/utils/categoryIconRegistry.test.ts`
- `bun test src/components/organisms/BudgetInlineEdit.client.test.ts`
- `bun test src/components/organisms/TransactionFiltersBar.test.ts`

Expected: FAIL until the test code is updated to point at the real implementation.

**Step 3: Replace the fake tests**

Remove hand-written HTML strings, copied validation functions, and locally reimplemented filter logic. Assert actual source contracts and exported functions instead.

**Step 4: Run the targeted tests again**

Run the same commands from Step 2.

Expected: PASS

### Task 5: Verify the first migration wave and capture the remaining work

**Files:**
- Modify: `.claude/rules/testing.md`
- Modify: `docs/plans/2026-03-08-test-organization-design.md`
- Modify: `docs/plans/2026-03-08-test-organization-implementation.md`

**Step 1: Run the changed test set together**

Run:

- `bun test tests/integration/api/budgets/initialize.test.ts tests/integration/api/transactions/summary-aggregation.test.ts tests/regression/review-feedback-regressions.test.ts tests/architecture/ui-style-consistency.test.ts src/lib/formatting/amount-input.test.ts src/lib/formatting/currency.test.ts src/components/atoms/ThemeToggle.test.ts src/lib/utils/categoryIconRegistry.test.ts src/components/organisms/BudgetInlineEdit.client.test.ts src/components/organisms/TransactionFiltersBar.test.ts`

Expected: PASS

**Step 2: Run the required quality gates for touched files**

Run:

- `bun run format:fix`
- `bun run lint`
- `bun run typecheck`

Expected: PASS

**Step 3: Summarize the remaining legacy migration queue**

Note the remaining `src/**/__tests__` directories and leave the next wave for a follow-up instead of forcing a full-repo rename in one patch.
