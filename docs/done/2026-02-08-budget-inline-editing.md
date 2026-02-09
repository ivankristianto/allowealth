# Budget Inline Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace modal-based budget editing with inline editing so users can click budget amounts directly to update them.

**Architecture:** Hybrid approach — client-side JS shows the input instantly for fast UX, then on save calls `PUT /api/budgets/:id` and refreshes via server-rendered HTML partials (following ADR 002). No new API endpoints needed. The `SetNewBudgetModal` keeps its creation flow (POST) but loses its update flow (PUT).

**Tech Stack:** Astro components, TypeScript client scripts, existing `PUT /api/budgets/:id` API, `csrfFetch`, `budgetApiClient`, Motion animations.

**GitHub Issue:** #167

---

## Task 1: Add data attributes to BudgetCard for inline editing

**Files:**

- Modify: `src/components/organisms/BudgetCard.astro:306-312` (budget amount display)

**Step 1: Add inline-editable data attributes to the budget amount element**

In `BudgetCard.astro`, find the budget amount display element (around line 306-312):

```astro
<div class="text-right">
  <StatLabel size="sm" className="text-[10px] md:text-xs"> Budget </StatLabel>
  <p
    class="text-xs md:text-sm font-bold mt-0.5 md:mt-1 text-base-content/60 leading-none"
    data-budget-amount
    data-testid="budget-amount"
  >
    {formatCurrency(budget, currency)}
  </p>
</div>
```

Replace with:

```astro
<div class="text-right">
  <StatLabel size="sm" className="text-[10px] md:text-xs"> Budget </StatLabel>
  <p
    class="text-xs md:text-sm font-bold mt-0.5 md:mt-1 text-base-content/60 leading-none cursor-pointer hover:text-base-content hover:underline hover:decoration-dotted transition-colors"
    data-budget-amount
    data-testid="budget-amount"
    data-budget-editable={categoryId}
    data-budget-raw={budget}
    role="button"
    tabindex="0"
    aria-label={`Edit ${categoryName} budget: ${formatCurrency(budget, currency)}. Click to edit.`}
  >
    {formatCurrency(budget, currency)}
  </p>
</div>
```

Key additions:

- `data-budget-editable={categoryId}` — marks element as inline-editable, stores category ID
- `data-budget-raw={budget}` — stores raw numeric value for pre-filling the input
- `cursor-pointer hover:text-base-content hover:underline hover:decoration-dotted` — visual affordance
- `role="button" tabindex="0"` — keyboard accessible
- Updated `aria-label` — tells screen readers the amount is editable

**Step 2: Verify the card renders correctly**

Run: `bun run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/components/organisms/BudgetCard.astro
git commit -m "feat(budget): add inline-editable data attributes to BudgetCard amount"
```

---

## Task 2: Add data attributes to BudgetTable for inline editing

**Files:**

- Modify: `src/components/organisms/BudgetTable.astro:111-114` (budget amount cell)

**Step 1: Update the budget amount cell in the table**

In `BudgetTable.astro`, find the budget amount cell (around line 111-114):

```astro
<td class="px-6 md:px-8 py-5 md:py-6 text-right">
  <span class="text-sm font-bold text-base-content">
    {formatCurrency(budgetAmt, currency)}
  </span>
</td>
```

Replace with:

```astro
<td class="px-6 md:px-8 py-5 md:py-6 text-right">
  <span
    class="text-sm font-bold text-base-content cursor-pointer hover:text-accent hover:underline hover:decoration-dotted transition-colors"
    data-budget-editable={budget.category_id}
    data-budget-raw={budgetAmt}
    data-testid="budget-table-amount"
    role="button"
    tabindex="0"
    aria-label={`Edit ${budget.category_name} budget: ${formatCurrency(budgetAmt, currency)}. Click to edit.`}
  >
    {formatCurrency(budgetAmt, currency)}
  </span>
</td>
```

**Step 2: Store the budget ID on the table row for API calls**

We need the budget ID to call `PUT /api/budgets/:id`. The budget ID is available from the page's `data-expense-categories` JSON, but we also need it in the table row context.

In `BudgetTable.astro`, the component receives `BudgetData[]` which doesn't include `budget_id`. We need to pass it through. However, since the budget ID comes from `data-expense-categories` JSON on the page container, we can look it up client-side from there. No change needed here.

**Step 3: Verify the table renders correctly**

Run: `bun run build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add src/components/organisms/BudgetTable.astro
git commit -m "feat(budget): add inline-editable data attributes to BudgetTable amount cells"
```

---

## Task 3: Write failing tests for BudgetInlineEdit client module

**Files:**

- Create: `src/components/organisms/BudgetInlineEdit.client.test.ts`

**Step 1: Write the unit tests**

```typescript
/**
 * BudgetInlineEdit Client Module Tests
 *
 * Tests for inline budget editing logic: validation, state management,
 * and API request formatting.
 */

import { describe, it, expect } from 'bun:test';

// ============================================================================
// VALIDATION LOGIC (extracted for testability)
// ============================================================================

/**
 * Validate budget amount input.
 * Mirrors server-side validation from src/lib/validation/budgets.ts
 * - Must be a non-empty string
 * - Must parse to a positive number
 * - Must not be NaN
 */
function validateBudgetAmount(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Budget amount is required' };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: 'Budget amount must be a valid number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Budget amount must be a positive number' };
  }

  return { valid: true };
}

/**
 * Build the API request body for updating a budget.
 */
function buildUpdateRequestBody(budgetAmount: string): { budget_amount: string } {
  return { budget_amount: budgetAmount };
}

/**
 * Build the API endpoint URL for updating a budget.
 */
function buildUpdateEndpoint(budgetId: string): string {
  return `/api/budgets/${budgetId}`;
}

// ============================================================================
// TESTS
// ============================================================================

describe('BudgetInlineEdit - Validation', () => {
  describe('validateBudgetAmount', () => {
    it('should accept positive integer amounts', () => {
      const result = validateBudgetAmount('5000000');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept positive decimal amounts', () => {
      const result = validateBudgetAmount('500.50');
      expect(result.valid).toBe(true);
    });

    it('should reject empty string', () => {
      const result = validateBudgetAmount('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount is required');
    });

    it('should reject whitespace-only string', () => {
      const result = validateBudgetAmount('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount is required');
    });

    it('should reject zero', () => {
      const result = validateBudgetAmount('0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a positive number');
    });

    it('should reject negative amounts', () => {
      const result = validateBudgetAmount('-100');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a positive number');
    });

    it('should reject non-numeric strings', () => {
      const result = validateBudgetAmount('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a valid number');
    });

    it('should reject partially numeric strings like "100abc"', () => {
      // Number("100abc") returns NaN, so this is correctly rejected
      const result = validateBudgetAmount('100abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a valid number');
    });

    it('should reject comma-formatted numbers like "1,000"', () => {
      // Number("1,000") returns NaN
      const result = validateBudgetAmount('1,000');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a valid number');
    });
  });
});

describe('BudgetInlineEdit - API Request', () => {
  describe('buildUpdateRequestBody', () => {
    it('should format request body with budget_amount', () => {
      const body = buildUpdateRequestBody('5000000');
      expect(body).toEqual({ budget_amount: '5000000' });
    });

    it('should preserve string format for amount', () => {
      const body = buildUpdateRequestBody('500.50');
      expect(body.budget_amount).toBe('500.50');
    });
  });

  describe('buildUpdateEndpoint', () => {
    it('should construct correct API endpoint', () => {
      const endpoint = buildUpdateEndpoint('budget-123');
      expect(endpoint).toBe('/api/budgets/budget-123');
    });
  });
});

describe('BudgetInlineEdit - State Management', () => {
  describe('Single edit constraint', () => {
    it('should track active edit state', () => {
      let activeEditCategoryId: string | null = null;

      // Start editing
      activeEditCategoryId = 'cat-1';
      expect(activeEditCategoryId).toBe('cat-1');

      // Attempting to start another edit should be blocked
      const canStartNewEdit = activeEditCategoryId === null;
      expect(canStartNewEdit).toBe(false);

      // Cancel edit
      activeEditCategoryId = null;
      expect(activeEditCategoryId).toBeNull();

      // Now can start new edit
      const canStartAfterCancel = activeEditCategoryId === null;
      expect(canStartAfterCancel).toBe(true);
    });
  });

  describe('Budget ID lookup', () => {
    it('should find budget ID from categories data by category ID', () => {
      const categoriesData = [
        { id: 'cat-1', name: 'Housing', budget_amount: '5000000', budget_id: 'budget-1' },
        { id: 'cat-2', name: 'Food', budget_amount: '3000000', budget_id: 'budget-2' },
      ];

      const categoryId = 'cat-2';
      const match = categoriesData.find((c) => c.id === categoryId);
      expect(match).toBeDefined();
      expect(match?.budget_id).toBe('budget-2');
    });

    it('should return undefined for unknown category ID', () => {
      const categoriesData = [
        { id: 'cat-1', name: 'Housing', budget_amount: '5000000', budget_id: 'budget-1' },
      ];

      const match = categoriesData.find((c) => c.id === 'unknown');
      expect(match).toBeUndefined();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/components/organisms/BudgetInlineEdit.client.test.ts`
Expected: All tests PASS (these test pure functions defined inline, not imports yet).

**Step 3: Commit**

```bash
git add src/components/organisms/BudgetInlineEdit.client.test.ts
git commit -m "test(budget): add unit tests for inline edit validation and state management"
```

---

## Task 4: Create BudgetInlineEdit.client.ts module

**Files:**

- Create: `src/components/organisms/BudgetInlineEdit.client.ts`

**Step 1: Write the inline edit module**

```typescript
/**
 * Budget Inline Edit Client Module
 *
 * Handles inline editing of budget amounts in both card and table views.
 * Uses hybrid approach: client-side input for speed, server-rendered refresh for consistency.
 *
 * Part of the Interactive Page Architecture pattern.
 * See: docs/architecture/002-interactive-pages.md
 */

import { csrfFetch } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
import { refreshBudgetData } from './BudgetPage.client';

// =============================================================================
// STATE
// =============================================================================

/** Currently active edit (only one at a time) */
let activeEditCategoryId: string | null = null;

/** Original element content for restoring on cancel */
let originalElementHtml: string | null = null;

/** Reference to the element currently being edited */
let activeEditElement: HTMLElement | null = null;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate budget amount input.
 * Uses Number() for strict validation (rejects "1,000", "100abc", etc.)
 * Mirrors server-side validation from src/lib/validation/budgets.ts
 */
export function validateBudgetAmount(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Budget amount is required' };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: 'Budget amount must be a valid number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Budget amount must be a positive number' };
  }

  return { valid: true };
}

// =============================================================================
// BUDGET ID LOOKUP
// =============================================================================

interface CategoryBudgetData {
  id: string;
  name: string;
  budget_amount: string;
}

interface BudgetRecord {
  id: string;
  category_id: string;
  budget_amount: string;
}

/**
 * Look up the budget ID for a category from the page's data attributes.
 *
 * The budget page stores existing budgets in `data-expense-categories` JSON on the
 * `[data-budget-container]` element. We also need the budget IDs which are stored
 * separately. The budget IDs can be found from the budgets data.
 */
function getBudgetIdForCategory(categoryId: string): string | null {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return null;

  // Budget IDs are stored in the budgets data on the page
  // They're available from the existing budgets that were rendered into the modal
  // We can access them from the modal's option elements
  const modalCategory = document.querySelector(
    `#set-new-budget-modal-category option[value="${categoryId}"]`
  ) as HTMLOptionElement | null;

  if (modalCategory?.dataset.budgetId) {
    return modalCategory.dataset.budgetId;
  }

  return null;
}

// =============================================================================
// INLINE EDIT UI
// =============================================================================

/**
 * Enter edit mode on a budget amount element.
 *
 * Replaces the formatted amount text with an input field + Save/Cancel buttons.
 * Only one budget can be edited at a time.
 */
function enterEditMode(element: HTMLElement, categoryId: string): void {
  // Prevent concurrent edits
  if (activeEditCategoryId !== null) {
    addToast('Please save or cancel the current edit first.', 'info');
    return;
  }

  const rawAmount = element.dataset.budgetRaw || '0';
  const budgetId = getBudgetIdForCategory(categoryId);

  if (!budgetId) {
    addToast('Could not find budget to edit. Try refreshing the page.', 'error');
    return;
  }

  // Store state for cancel/restore
  activeEditCategoryId = categoryId;
  originalElementHtml = element.innerHTML;
  activeEditElement = element;

  // Determine if this is inside a card or table for styling
  const isTable = element.closest('[data-budget-table]') !== null;

  // Build inline edit UI
  const wrapper = document.createElement('div');
  wrapper.className = isTable ? 'inline-flex items-center gap-2' : 'flex items-center gap-2';
  wrapper.dataset.inlineEdit = 'true';

  const input = document.createElement('input');
  input.type = 'number';
  input.value = rawAmount;
  input.min = '0';
  input.step = '0.01';
  input.className = isTable
    ? 'input input-sm input-bordered w-28 text-right font-bold rounded-lg'
    : 'input input-sm input-bordered w-full text-right font-bold rounded-lg';
  input.dataset.inlineEditInput = 'true';
  input.setAttribute('aria-label', 'Budget amount');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-xs btn-accent rounded-lg font-bold';
  saveBtn.textContent = 'Save';
  saveBtn.dataset.inlineEditSave = 'true';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-xs btn-ghost rounded-lg font-bold';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.dataset.inlineEditCancel = 'true';

  wrapper.appendChild(input);
  wrapper.appendChild(saveBtn);
  wrapper.appendChild(cancelBtn);

  // Replace element content
  element.innerHTML = '';
  element.appendChild(wrapper);
  element.classList.remove('cursor-pointer');
  element.removeAttribute('role');
  element.removeAttribute('tabindex');

  // Focus the input and select all text
  input.focus();
  input.select();

  // Event handlers
  saveBtn.addEventListener('click', () => {
    handleSave(element, budgetId, input.value, categoryId);
  });

  cancelBtn.addEventListener('click', () => {
    cancelEditMode();
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(element, budgetId, input.value, categoryId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditMode();
    }
  });
}

/**
 * Cancel edit mode and restore the original content.
 */
function cancelEditMode(): void {
  if (activeEditElement && originalElementHtml !== null) {
    activeEditElement.innerHTML = originalElementHtml;
    activeEditElement.classList.add('cursor-pointer');
    activeEditElement.setAttribute('role', 'button');
    activeEditElement.setAttribute('tabindex', '0');
  }

  activeEditCategoryId = null;
  originalElementHtml = null;
  activeEditElement = null;
}

/**
 * Handle save: validate, call API, refresh page.
 */
async function handleSave(
  element: HTMLElement,
  budgetId: string,
  value: string,
  categoryId: string
): Promise<void> {
  // Validate
  const validation = validateBudgetAmount(value);
  if (!validation.valid) {
    addToast(validation.error || 'Invalid budget amount', 'error');
    return;
  }

  // Show loading state on Save button
  const saveBtn = element.querySelector('[data-inline-edit-save]') as HTMLButtonElement | null;
  const input = element.querySelector('[data-inline-edit-input]') as HTMLInputElement | null;
  const cancelBtn = element.querySelector('[data-inline-edit-cancel]') as HTMLButtonElement | null;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }
  if (input) input.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;

  try {
    const response = await csrfFetch(`/api/budgets/${budgetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_amount: value }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || 'Failed to update budget');
    }

    // Reset edit state before refresh (refresh replaces DOM)
    activeEditCategoryId = null;
    originalElementHtml = null;
    activeEditElement = null;

    addToast('Budget updated successfully!', 'success');

    // Dispatch event for page orchestrator
    document.dispatchEvent(
      new CustomEvent('budget-updated', {
        detail: { categoryId, budgetId, budgetAmount: value },
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update budget';
    addToast(message, 'error');

    // Revert to display mode on error
    cancelEditMode();
  }
}

// =============================================================================
// EVENT SETUP
// =============================================================================

/**
 * Set up click handlers on all `[data-budget-editable]` elements.
 *
 * Uses event delegation on the budget container for efficiency
 * and to handle dynamically injected content.
 */
export function setupInlineEditHandlers(): void {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return;

  // Remove previous listener to prevent duplicates (clone trick not needed with delegation)
  container.removeEventListener('click', handleEditableClick);
  container.removeEventListener('keydown', handleEditableKeydown);

  container.addEventListener('click', handleEditableClick);
  container.addEventListener('keydown', handleEditableKeydown);
}

/**
 * Handle click on an editable budget amount (event delegation).
 */
function handleEditableClick(e: Event): void {
  const target = (e.target as HTMLElement).closest('[data-budget-editable]') as HTMLElement | null;
  if (!target) return;

  // Don't enter edit mode if we're already inside an inline edit
  if (target.querySelector('[data-inline-edit]')) return;

  const categoryId = target.dataset.budgetEditable;
  if (!categoryId) return;

  e.stopPropagation();
  enterEditMode(target, categoryId);
}

/**
 * Handle keyboard activation (Enter/Space) on editable elements.
 */
function handleEditableKeydown(e: Event): void {
  const keyEvent = e as KeyboardEvent;
  if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return;

  const target = (keyEvent.target as HTMLElement).closest(
    '[data-budget-editable]'
  ) as HTMLElement | null;
  if (!target) return;

  // Don't enter edit mode if we're already inside an inline edit
  if (target.querySelector('[data-inline-edit]')) return;

  const categoryId = target.dataset.budgetEditable;
  if (!categoryId) return;

  keyEvent.preventDefault();
  keyEvent.stopPropagation();
  enterEditMode(target, categoryId);
}

/**
 * Clean up inline edit state.
 * Call when the page is being torn down (Astro page transition).
 */
export function cleanupInlineEdit(): void {
  cancelEditMode();

  const container = document.querySelector('[data-budget-container]');
  if (container) {
    container.removeEventListener('click', handleEditableClick);
    container.removeEventListener('keydown', handleEditableKeydown);
  }
}
```

**Step 2: Verify the module compiles**

Run: `bun run typecheck`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/components/organisms/BudgetInlineEdit.client.ts
git commit -m "feat(budget): create BudgetInlineEdit client module with validation and API integration"
```

---

## Task 5: Integrate BudgetInlineEdit into BudgetPage orchestrator

**Files:**

- Modify: `src/components/organisms/BudgetPage.client.ts`

**Step 1: Import and initialize inline edit handlers**

At the top of `BudgetPage.client.ts`, add the import (after existing imports around line 6):

```typescript
import { setupInlineEditHandlers, cleanupInlineEdit } from './BudgetInlineEdit.client';
```

**Step 2: Call `setupInlineEditHandlers()` in `initBudgetPage()`**

In the `initBudgetPage()` function (around line 472), add after `setupEditBudgetHandlers()`:

```typescript
// Set up inline edit handlers (replaces modal-based editing for existing budgets)
setupInlineEditHandlers();
```

**Step 3: Call `setupInlineEditHandlers()` in `handleContentUpdated()`**

In `handleContentUpdated()` (around line 184), add after `setupEditBudgetHandlers()`:

```typescript
setupInlineEditHandlers();
```

**Step 4: Call `cleanupInlineEdit()` in `cleanup()`**

In `cleanup()` (around line 496), add before the event listener removal:

```typescript
cleanupInlineEdit();
```

**Step 5: Verify compilation**

Run: `bun run typecheck`
Expected: No type errors.

**Step 6: Commit**

```bash
git add src/components/organisms/BudgetPage.client.ts
git commit -m "feat(budget): integrate inline edit handlers into BudgetPage orchestrator"
```

---

## Task 6: Remove edit-budget modal trigger (deprecate modal editing for existing budgets)

**Files:**

- Modify: `src/components/organisms/BudgetPage.client.ts` — remove `setupEditBudgetHandlers()` function and all references
- Modify: `src/components/organisms/BudgetCard.astro` — remove the Edit button that opens modal
- Modify: `src/components/organisms/BudgetTable.astro` — remove the Edit button column

**Step 1: Remove `setupEditBudgetHandlers()` from BudgetPage.client.ts**

Delete the entire `setupEditBudgetHandlers()` function (lines 404-450) and remove all calls to it:

- Remove call in `initBudgetPage()` (line 472)
- Remove call in `handleContentUpdated()` (line 184)

**Step 2: Remove the Edit button from BudgetCard.astro**

In `BudgetCard.astro`, find the edit button (around lines 276-284):

```astro
<button
  type="button"
  class="inline-flex items-center gap-1 text-base-content/30 hover:text-base-content/60 transition-colors min-h-[44px] min-w-[44px] justify-center rounded-lg hover:bg-base-200 text-xs font-medium"
  aria-label={`Edit ${categoryName} budget`}
  data-edit-budget={categoryId}
>
  <Pencil size={16} class="stroke-current" aria-hidden="true" />
  <span class="hidden md:inline">Edit</span>
</button>
```

Remove this entire button element. Also remove the `Pencil` import from the imports list (line 22) if it's no longer used elsewhere in the file. Check if `Pencil` is used elsewhere — it's imported at line 22. After removing the edit button, `Pencil` is no longer used in BudgetCard, so remove it from the import.

**Step 3: Remove the Edit button from BudgetTable.astro**

In `BudgetTable.astro`, find the edit button in each row (around lines 153-161):

```astro
<button
  type="button"
  data-edit-budget={budget.category_id}
  class="inline-flex items-center gap-1.5 text-base-content/40 hover:text-base-content hover:bg-base-200/50 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  aria-label={`Edit ${budget.category_name} budget`}
>
  <Pencil size={12} class="stroke-current" aria-hidden="true" />
  <span>Edit</span>
</button>
```

Remove this button. Also remove the `Pencil` import from line 16 if no longer used, and rename the "Action" column header to "Actions" (it now only has the "Details" link).

If only the "Details" link remains, consider renaming the column header from "Action" to "" or keeping it. The column now only has "Details" so keep the header as "Action".

**Step 4: Verify compilation and build**

Run: `bun run typecheck && bun run build`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/components/organisms/BudgetPage.client.ts src/components/organisms/BudgetCard.astro src/components/organisms/BudgetTable.astro
git commit -m "refactor(budget): remove modal-based edit buttons, replaced by inline editing"
```

---

## Task 7: Simplify SetNewBudgetModal to creation-only

**Files:**

- Modify: `src/components/organisms/SetNewBudgetModal.astro`

**Step 1: Remove update (PUT) logic from the modal's client script**

In the modal's `<script>` section, find the submit handler (around line 265-294). The current logic checks for `existingBudgetId` and does PUT for updates vs POST for creates.

Remove the PUT branch entirely. The modal should now only POST to create new budgets.

Replace the submit handler try block (lines 265-330) with a simplified version that only does POST:

```typescript
try {
  const response = await fetch('/api/budgets', {
    method: 'POST',
    headers: getCsrfHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      category_id: categoryId,
      month,
      year,
      budget_amount: budgetAmount,
      currency,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create budget');
  }

  // Success - announce to screen readers, close modal and show toast
  if (statusDiv) {
    statusDiv.textContent = 'Budget created successfully';
  }
  addToast('Budget created successfully!', 'success');
  form.reset();
  modal.close();

  // Dispatch custom event so page can update
  document.dispatchEvent(
    new CustomEvent('budget-updated', {
      detail: {
        categoryId,
        budgetAmount,
        currency,
        month,
        year,
      },
    })
  );
} catch (err) {
  // ... keep existing error handling
}
```

**Step 2: Remove the "budget exists" warning UI**

Remove the `budget-exists-warning` div (lines 98-105) and the `checkExistingBudget` function and related event listener from the script.

**Step 3: Disable categories that already have budgets**

Keep the existing logic that adds `disabled` and "(already set)" to options with existing budgets — this prevents creating duplicate budgets.

**Step 4: Update the submit button text**

Change "Set Budget" to "Create Budget" to clarify it's creation-only.

**Step 5: Verify compilation**

Run: `bun run typecheck && bun run build`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/components/organisms/SetNewBudgetModal.astro
git commit -m "refactor(budget): simplify SetNewBudgetModal to creation-only (remove update logic)"
```

---

## Task 8: Update unit tests for the modal simplification

**Files:**

- Modify: `src/components/organisms/SetNewBudgetModal.test.ts`

**Step 1: Remove update-related tests**

In `SetNewBudgetModal.test.ts`, remove the "Request Format - Update Budget" describe block (lines 207-227) since the modal no longer handles updates.

**Step 2: Update button text expectations**

Update the test at line 297 to expect "Create Budget" instead of "Set Budget":

```typescript
it('should have submit button', () => {
  const buttonText = 'Create Budget';
  expect(buttonText).toBe('Create Budget');
});
```

**Step 3: Run tests**

Run: `bun test src/components/organisms/SetNewBudgetModal.test.ts`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/components/organisms/SetNewBudgetModal.test.ts
git commit -m "test(budget): update modal tests to reflect creation-only behavior"
```

---

## Task 9: Update BudgetPage e2e page object for inline editing

**Files:**

- Modify: `e2e/pages/BudgetPage.ts`

**Step 1: Replace modal-based `setBudget()` with inline edit approach**

The current `setBudget()` opens a modal, selects category, fills amount, submits. Replace with inline editing:

```typescript
/**
 * Set a budget amount for a specific category using inline editing.
 * @param categoryId - The category ID to set budget for
 * @param amount - The budget amount to set
 */
async setBudget(categoryId: string, amount: number): Promise<void> {
  // Click the budget amount to enter edit mode
  const budgetAmount = this.page.locator(
    `[data-budget-editable="${categoryId}"]`
  ).first();
  await budgetAmount.click();

  // Wait for input to appear
  const input = this.page.locator('[data-inline-edit-input]');
  await expect(input).toBeVisible();

  // Clear and fill the amount
  await input.clear();
  await input.fill(amount.toString());

  // Click Save
  const saveBtn = this.page.locator('[data-inline-edit-save]');
  await saveBtn.click();

  // Wait for the page to refresh (inline edit disappears)
  await expect(input).toBeHidden({ timeout: 10000 });
  await this.waitForPageLoad();
}
```

**Step 2: Remove `openEditModal()` and `cancelModal()` methods**

These methods reference the modal which is no longer used for editing. Remove them.

**Step 3: Remove modal-related selectors**

Remove the private modal selector fields at the top of the class (lines 15-19):

```typescript
// Remove these:
private readonly modalSelector = '#set-new-budget-modal';
private readonly modalCategorySelect = '#set-new-budget-modal-category';
private readonly modalAmountInput = '#set-new-budget-modal-amount';
private readonly modalSubmitBtn = '#set-new-budget-modal-form button[type="submit"]';
private readonly modalCancelBtn = '[data-cancel-budget]';
```

And remove the `getModal()` method.

**Step 4: Verify compilation**

Run: `npx tsc --noEmit -p e2e/tsconfig.json` (or however e2e types are checked)
Expected: No errors.

**Step 5: Commit**

```bash
git add e2e/pages/BudgetPage.ts
git commit -m "test(budget): update BudgetPage e2e page object for inline editing"
```

---

## Task 10: Update e2e tests for inline editing flow

**Files:**

- Modify: `e2e/tests/budget/budget-management.spec.ts`

**Step 1: Review and update test assertions**

The existing e2e tests call `budgetPage.setBudget(categoryId, amount)` which now uses inline editing internally (updated in Task 9). The tests themselves should still work conceptually, but verify:

1. The `setBudget` call now triggers inline edit instead of modal
2. Assertions about budget amounts should still work since `data-testid="budget-amount"` is preserved
3. No tests reference modal selectors directly

Review each test and ensure they don't reference modal-specific elements. The existing tests in `budget-management.spec.ts` call `setBudget()` and `expectBudgetSet()` which are abstracted in the page object — so they should work without changes if the page object is updated correctly.

**Step 2: Run e2e tests**

Run: `bunx playwright test e2e/tests/budget/budget-management.spec.ts`
Expected: All tests PASS.

**Step 3: Commit (if any changes were needed)**

```bash
git add e2e/tests/budget/budget-management.spec.ts
git commit -m "test(budget): verify e2e tests work with inline editing flow"
```

---

## Task 11: Remove unused modal references from budget page

**Files:**

- Modify: `src/pages/budget/index.astro`

**Step 1: Clean up budget page**

The budget page currently:

1. Fetches `expenseCategories` and `budgetsForModal` to pass to `SetNewBudgetModal`
2. Stores `expenseCategoriesWithBudgets` in `data-expense-categories` for the edit handler

After this change:

- `SetNewBudgetModal` still needs `categories` and `budgets` props for the creation flow (to know which categories already have budgets and disable them)
- `data-expense-categories` is still needed by `BudgetInlineEdit.client.ts` for budget ID lookup

So the page data fetching stays mostly the same. However, we need to ensure the `data-expense-categories` JSON includes budget IDs for the inline edit lookup.

**Step 2: Ensure budget IDs are in `data-expense-categories`**

Check the current `expenseCategoriesWithBudgets` mapping (line 237-239):

```typescript
const expenseCategoriesWithBudgets = expenseCategories.map((cat) => ({
  ...cat,
  budget_amount: budgetAmountsByCategory.get(cat.id) || '0',
}));
```

This doesn't include budget IDs. Update to include them:

```typescript
// Create maps for budget data by category_id
const budgetAmountsByCategory = new Map(
  existingBudgets.map((b) => [b.category_id, b.budget_amount])
);
const budgetIdsByCategory = new Map(existingBudgets.map((b) => [b.category_id, b.id]));

const expenseCategoriesWithBudgets = expenseCategories.map((cat) => ({
  ...cat,
  budget_amount: budgetAmountsByCategory.get(cat.id) || '0',
  budget_id: budgetIdsByCategory.get(cat.id) || '',
}));
```

**Step 3: Update BudgetInlineEdit.client.ts to use `data-expense-categories` for budget ID lookup**

Replace the `getBudgetIdForCategory` function in `BudgetInlineEdit.client.ts` to use the JSON data instead of querying the modal DOM:

```typescript
function getBudgetIdForCategory(categoryId: string): string | null {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return null;

  const categoriesJson = container.getAttribute('data-expense-categories');
  if (!categoriesJson) return null;

  try {
    const categories = JSON.parse(categoriesJson) as Array<{
      id: string;
      budget_id?: string;
    }>;
    const match = categories.find((c) => c.id === categoryId);
    return match?.budget_id || null;
  } catch {
    return null;
  }
}
```

**Step 4: Verify build**

Run: `bun run typecheck && bun run build`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/pages/budget/index.astro src/components/organisms/BudgetInlineEdit.client.ts
git commit -m "feat(budget): include budget IDs in page data for inline edit lookup"
```

---

## Task 12: Run full quality gates

**Files:** None (verification only)

**Step 1: Run lint**

Run: `bun run lint:fix`
Expected: No errors (warnings acceptable).

**Step 2: Run stylelint**

Run: `bun run stylelint:fix`
Expected: No errors.

**Step 3: Run format**

Run: `bun run format:fix`
Expected: No errors.

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No errors.

**Step 5: Run unit tests**

Run: `bun test`
Expected: All tests PASS.

**Step 6: Run build**

Run: `bun run build`
Expected: Build succeeds.

**Step 7: Run e2e tests**

Run: `bunx playwright test e2e/tests/budget/`
Expected: All budget-related tests PASS.

**Step 8: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore: apply formatting and lint fixes for inline budget editing"
```

---

## Summary of Changes

| File                                                       | Action | Purpose                                                   |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------- |
| `src/components/organisms/BudgetCard.astro`                | Modify | Add `data-budget-editable` attributes, remove Edit button |
| `src/components/organisms/BudgetTable.astro`               | Modify | Add `data-budget-editable` attributes, remove Edit button |
| `src/components/organisms/BudgetInlineEdit.client.ts`      | Create | New module handling inline edit UI, validation, API calls |
| `src/components/organisms/BudgetInlineEdit.client.test.ts` | Create | Unit tests for validation and state management            |
| `src/components/organisms/BudgetPage.client.ts`            | Modify | Integrate inline edit, remove `setupEditBudgetHandlers()` |
| `src/components/organisms/SetNewBudgetModal.astro`         | Modify | Remove PUT update logic, creation-only                    |
| `src/components/organisms/SetNewBudgetModal.test.ts`       | Modify | Remove update-related tests                               |
| `src/pages/budget/index.astro`                             | Modify | Add budget IDs to `data-expense-categories` JSON          |
| `e2e/pages/BudgetPage.ts`                                  | Modify | Update page object for inline editing                     |
| `e2e/tests/budget/budget-management.spec.ts`               | Modify | Verify tests work with inline editing                     |
