# Recurring Drawer UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the recurring template drawer to match transaction drawer UX patterns and improve form layout clarity without changing recurring business behavior.

**Architecture:** Keep the existing `RecurringTemplateForm` + `RecurringTemplateForm.client` contract and payload shape. Refactor only presentation structure/classes and minimal DOM hooks required for interaction wiring. Validate with a targeted regression test for drawer structure and existing recurring E2E flows.

**Tech Stack:** Astro 5, TypeScript, DaisyUI/Tailwind, Bun test, Playwright E2E

---

### Task 1: Add failing UI regression test (RED)

**Files:**

- Create: `src/components/organisms/RecurringTemplateForm.test.ts`
- Test: `src/components/organisms/RecurringTemplateForm.test.ts`

**Step 1: Write failing test for redesigned drawer markers**

- Assert `RecurringTemplateForm.astro` includes:
  - segmented type control marker (`data-recurring-type-segmented`)
  - emphasized amount wrapper (`data-recurring-amount-field`)
  - sticky action footer (`data-recurring-actions`)

**Step 2: Run test to verify RED**

Run: `bun test src/components/organisms/RecurringTemplateForm.test.ts`
Expected: FAIL because markers do not exist yet.

### Task 2: Refactor recurring form markup and styles (GREEN)

**Files:**

- Modify: `src/components/organisms/RecurringTemplateForm.astro`

**Step 1: Implement segmented type control UI**

- Replace the current bordered radio-card presentation with a transaction-like segmented container.
- Preserve radio names/values for client compatibility.

**Step 2: Rework core field hierarchy and spacing**

- Introduce a stronger amount field style.
- Normalize field spacing and section grouping for scanability.

**Step 3: Introduce sticky action container**

- Wrap cancel/save actions in a bottom sticky region (`data-recurring-actions`).

**Step 4: Keep behavior hooks stable**

- Preserve existing names and data attributes consumed by client script.

### Task 3: Update client script for new segmented state styling

**Files:**

- Modify: `src/components/organisms/RecurringTemplateForm.client.ts`

**Step 1: Add segmented UI sync helper**

- On type change/reset/edit, toggle active classes for expense/income segmented items.

**Step 2: Keep all existing business logic unchanged**

- End condition, installment enablement, payload builder, and submit flow remain behavior-equivalent.

### Task 4: Verify regression test turns GREEN

**Files:**

- Test: `src/components/organisms/RecurringTemplateForm.test.ts`

**Step 1: Run targeted test**

Run: `bun test src/components/organisms/RecurringTemplateForm.test.ts`
Expected: PASS.

### Task 5: Run project verification gates

**Files:**

- N/A (verification commands)

**Step 1: Run formatting/lint/type gates**

Run:

- `bun run lint:fix`
- `bun run stylelint:fix`
- `bun run format:fix`
- `bun run typecheck`

Expected: all pass.

**Step 2: Run recurring E2E spec**

Run: `bun run test:e2e -- e2e/tests/recurring.spec.ts`
Expected: recurring flow passes with redesigned drawer.
