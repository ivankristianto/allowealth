# Recurring Forecast Follow-Ups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining forecast follow-up work: index tuning, filter UX alignment, and bounded maintainability refactors.

**Architecture:** Keep the current service/page split intact. Improve the forecast path by tightening DB access patterns, reusing the shared multi-select interaction model already present elsewhere in the app, and extracting only the duplicated recurring-specific helpers that are now causing drift.

**Tech Stack:** Astro 5, TypeScript, Drizzle ORM, DaisyUI/Tailwind, Bun test

---

### Task 1: Add forecast query indexes

**Files:**
- Modify: `src/db/schema/sqlite/recurring-templates.ts`
- Modify: `src/db/schema/postgresql/recurring-templates.ts`
- Create/Modify: `drizzle/sqlite/*`
- Create/Modify: `drizzle/postgresql/*`

**Steps:**
1. Add composite indexes for the forecast query shape on SQLite and PostgreSQL:
   - `(workspace_id, account_id)`
   - `(workspace_id, type)`
2. Generate migrations with `bun run db:generate`.
3. Inspect generated SQL and metadata for both dialects.
4. Run `bun run typecheck`.

### Task 2: Align forecast account filter with MultiSelectDropdown

**Files:**
- Modify: `src/pages/recurring/forecast/index.astro`
- Reference: `src/components/molecules/MultiSelectDropdown.astro`
- Reference: `src/components/organisms/TransactionFiltersBar.astro`
- Test: existing forecast filter parser tests in `src/lib/utils/recurring-forecast-filters.test.ts`

**Steps:**
1. Replace the native `select[multiple]` with `MultiSelectDropdown`.
2. Keep the submitted query parameter name as `accounts` so the current parser and URLs stay stable.
3. Group/sort forecast accounts using the same pattern already used in transaction filters where reasonable.
4. Verify selected state still round-trips from URL to UI.

### Task 3: Extract duplicated recurring helpers

**Files:**
- Create: `src/lib/utils/recurring-frequency.ts`
- Create: `src/services/recurring-template-output.ts`
- Modify: `src/services/recurring-forecast.service.ts`
- Modify: `src/components/molecules/RecurringTemplateRow.astro`
- Modify: `src/services/recurring-forecast.service.test.ts`

**Steps:**
1. Move frequency label formatting into a shared utility and update both forecast service and recurring row to use it.
2. Extract a typed recurring-template output mapper so forecast service no longer shapes the DTO inline with `any`.
3. Update forecast tests to import the shared frequency utility from its new home.

### Task 4: Bounded form maintainability cleanup

**Files:**
- Modify: `src/components/organisms/RecurringTemplateForm.client.ts`

**Steps:**
1. Extract the duplicated field setter helper.
2. Extract the duplicated amount/currency formatter setup helper.
3. Reuse those helpers in reset/edit/prefill paths only; do not rewrite the whole module.

### Task 5: Verification

**Files:**
- Test: `src/lib/utils/recurring-forecast-filters.test.ts`
- Test: `src/services/recurring-forecast.service.test.ts`

**Steps:**
1. Run focused tests for forecast/filter helpers.
2. Run `bun run typecheck`.
3. Run `bun run build`.

