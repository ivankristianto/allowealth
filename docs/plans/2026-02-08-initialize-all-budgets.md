# Initialize All Budgets — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to create budget entries (amount=0) for all uninitialized expense categories in one click, eliminating manual per-category setup.

**Architecture:** Server-rendered modal with client-side orchestration following the Interactive Pages pattern. The service method handles bulk insertion in a single query. The API endpoint follows the existing POST `/api/budgets/copy` pattern. The UI adds a button to `BudgetActions.astro` and a new confirmation modal.

**Tech Stack:** Astro 5.x, Drizzle ORM, Zod validation, DaisyUI v5, Lucide icons, bun:test

**Design Document:** `docs/plans/2026-02-08-initialize-all-budgets-design.md`

---

## Task 1: Add Validation Schema

**Files:**

- Modify: `src/lib/validation/budgets.ts`
- Modify: `src/lib/validation/index.ts`

**Step 1: Add `initializeBudgetsSchema` to validation file**

Add after `copyBudgetsAPISchema` (around line 131):

```typescript
// Schema for initializing all budgets (for service layer)
export const initializeBudgetsSchema = z.object({
  workspace_id: z.string().min(1, 'Workspace ID is required'),
  created_by_user_id: z.string().min(1, 'Created by user ID is required'),
  month: monthValidation,
  year: yearValidation,
  currency: currencyEnum,
});

export type InitializeBudgetsInput = z.infer<typeof initializeBudgetsSchema>;

// API-specific schema (workspace_id and user_id come from auth context)
export const initializeBudgetsAPISchema = z.object({
  month: monthValidation,
  year: yearValidation,
  currency: currencyEnum,
});

export type InitializeBudgetsAPIInput = z.infer<typeof initializeBudgetsAPISchema>;
```

**Step 2: Export from validation index**

Add to `src/lib/validation/index.ts` in the `// Budgets` section:

```typescript
  initializeBudgetsSchema,
  initializeBudgetsAPISchema,
  type InitializeBudgetsInput,
  type InitializeBudgetsAPIInput,
```

**Step 3: Run typecheck to verify**

Run: `bun run typecheck`
Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add src/lib/validation/budgets.ts src/lib/validation/index.ts
git commit -m "feat(budget): add validation schemas for initialize all budgets"
```

---

## Task 2: Add `InitializeBudgetsResult` Type

**Files:**

- Modify: `src/lib/types/budget.ts`

**Step 1: Add result type**

Add after `CopyBudgetsResult` interface (around line 78):

```typescript
// Result of initialize all budgets operation
export interface InitializeBudgetsResult {
  initialized_count: number;
  categories: Array<{ id: string; name: string }>;
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/types/budget.ts
git commit -m "feat(budget): add InitializeBudgetsResult type"
```

---

## Task 3: Add Service Method — Write Failing Test

**Files:**

- Modify: `src/services/budget.service.test.ts`

**Step 1: Write the failing test**

Add a new `describe('initializeAllBudgets', ...)` block at the end of the file, inside the top-level `describe('BudgetService', ...)`:

```typescript
describe('initializeAllBudgets', () => {
  const workspaceId = 'workspace-1';
  const userId = 'user-1';
  const month = 2;
  const year = 2026;
  const currency = 'IDR' as const;

  it('creates budgets for categories without existing budgets', async () => {
    // Mock: 3 active expense categories
    const allCategories = [
      createMockCategory({ id: 'cat-1', name: 'Food', type: 'expense', is_active: true }),
      createMockCategory({ id: 'cat-2', name: 'Transport', type: 'expense', is_active: true }),
      createMockCategory({ id: 'cat-3', name: 'Entertainment', type: 'expense', is_active: true }),
    ];

    // Mock: 1 existing budget (cat-1 already has budget)
    const existingBudgets = [
      createMockBudget({ id: 'budget-1', category_id: 'cat-1', month, year, currency }),
    ];

    // Setup mocks - findMany is called twice: first for categories, then for budgets
    let findManyCallCount = 0;
    (mockDb.query.categories.findMany as any).mockResolvedValue(allCategories);

    (mockDb.query.budgets.findMany as any).mockResolvedValue(existingBudgets);

    // Mock insert to capture values
    const insertValues: any[] = [];
    (mockDb.insert as any).mockReturnValue({
      values: mock((vals: any) => {
        insertValues.push(...(Array.isArray(vals) ? vals : [vals]));
        return Promise.resolve();
      }),
    });

    const result = await budgetService.initializeAllBudgets({
      workspace_id: workspaceId,
      created_by_user_id: userId,
      month,
      year,
      currency,
    });

    // Should initialize 2 categories (cat-2 and cat-3, since cat-1 already has budget)
    expect(result.initialized_count).toBe(2);
    expect(result.categories).toHaveLength(2);
    expect(result.categories.map((c) => c.name)).toContain('Transport');
    expect(result.categories.map((c) => c.name)).toContain('Entertainment');

    // Verify insert was called with correct values
    expect(insertValues).toHaveLength(2);
    for (const val of insertValues) {
      expect(val.budget_amount).toBe('0');
      expect(val.workspace_id).toBe(workspaceId);
      expect(val.created_by_user_id).toBe(userId);
      expect(val.month).toBe(month);
      expect(val.year).toBe(year);
      expect(val.currency).toBe(currency);
      expect(val.is_closed).toBe(false);
    }
  });

  it('skips categories that already have budgets', async () => {
    const allCategories = [
      createMockCategory({ id: 'cat-1', name: 'Food', type: 'expense', is_active: true }),
    ];

    // cat-1 already has a budget
    const existingBudgets = [
      createMockBudget({ id: 'budget-1', category_id: 'cat-1', month, year, currency }),
    ];

    (mockDb.query.categories.findMany as any).mockResolvedValue(allCategories);
    (mockDb.query.budgets.findMany as any).mockResolvedValue(existingBudgets);

    const result = await budgetService.initializeAllBudgets({
      workspace_id: workspaceId,
      created_by_user_id: userId,
      month,
      year,
      currency,
    });

    expect(result.initialized_count).toBe(0);
    expect(result.categories).toHaveLength(0);
    // insert should NOT be called when there's nothing to initialize
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('handles empty category list gracefully', async () => {
    (mockDb.query.categories.findMany as any).mockResolvedValue([]);
    (mockDb.query.budgets.findMany as any).mockResolvedValue([]);

    const result = await budgetService.initializeAllBudgets({
      workspace_id: workspaceId,
      created_by_user_id: userId,
      month,
      year,
      currency,
    });

    expect(result.initialized_count).toBe(0);
    expect(result.categories).toHaveLength(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('filters out income categories and inactive categories', async () => {
    const allCategories = [
      createMockCategory({ id: 'cat-1', name: 'Food', type: 'expense', is_active: true }),
      createMockCategory({ id: 'cat-2', name: 'Salary', type: 'income', is_active: true }),
      createMockCategory({ id: 'cat-3', name: 'Old Expense', type: 'expense', is_active: false }),
    ];

    (mockDb.query.categories.findMany as any).mockResolvedValue(allCategories);
    (mockDb.query.budgets.findMany as any).mockResolvedValue([]);

    const insertValues: any[] = [];
    (mockDb.insert as any).mockReturnValue({
      values: mock((vals: any) => {
        insertValues.push(...(Array.isArray(vals) ? vals : [vals]));
        return Promise.resolve();
      }),
    });

    const result = await budgetService.initializeAllBudgets({
      workspace_id: workspaceId,
      created_by_user_id: userId,
      month,
      year,
      currency,
    });

    // Only cat-1 should be initialized (cat-2 is income, cat-3 is inactive)
    expect(result.initialized_count).toBe(1);
    expect(result.categories[0].name).toBe('Food');
  });

  it('validates month parameter', async () => {
    await expect(
      budgetService.initializeAllBudgets({
        workspace_id: workspaceId,
        created_by_user_id: userId,
        month: 13,
        year,
        currency,
      })
    ).rejects.toThrow();
  });

  it('validates year parameter', async () => {
    await expect(
      budgetService.initializeAllBudgets({
        workspace_id: workspaceId,
        created_by_user_id: userId,
        month,
        year: 1999,
        currency,
      })
    ).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/budget.service.test.ts`
Expected: FAIL with "budgetService.initializeAllBudgets is not a function" (method doesn't exist yet)

**Step 3: Commit failing test**

```bash
git add src/services/budget.service.test.ts
git commit -m "test(budget): add failing tests for initializeAllBudgets"
```

---

## Task 4: Implement Service Method

**Files:**

- Modify: `src/services/budget.service.ts`

**Step 1: Add import for the new validation schema and type**

At the top of `budget.service.ts`, update the imports:

Add `initializeBudgetsSchema` and `type InitializeBudgetsInput` to the validation import.

Add `type InitializeBudgetsResult` to the types import from `@/lib/types/budget`.

**Step 2: Add `initializeAllBudgets` method**

Add before `copyBudgetsToMonth` method (before line 853). Follow the pattern from `copyBudgetsToMonth`:

```typescript
  /**
   * Initialize budgets for all uninitialized expense categories
   * Creates budget entries with amount='0' for categories without budgets in the target month
   */
  async initializeAllBudgets(input: InitializeBudgetsInput): Promise<InitializeBudgetsResult> {
    const validated = initializeBudgetsSchema.parse(input);

    // Get all active expense categories for the workspace
    const allCategories = await this.db.query.categories.findMany({
      where: and(
        eq(this.schema.categories.workspace_id, validated.workspace_id),
        eq(this.schema.categories.is_active, true),
        eq(this.schema.categories.type, 'expense')
      ),
    });

    if (allCategories.length === 0) {
      return { initialized_count: 0, categories: [] };
    }

    // Get existing budgets for this month/year/currency
    const existingBudgets = await this.db.query.budgets.findMany({
      where: and(
        eq(this.schema.budgets.workspace_id, validated.workspace_id),
        eq(this.schema.budgets.month, validated.month),
        eq(this.schema.budgets.year, validated.year),
        eq(this.schema.budgets.currency, validated.currency)
      ),
    });

    // Filter to categories without budgets (Set for O(1) lookup)
    const existingCategoryIds = new Set(existingBudgets.map((b: { category_id: string }) => b.category_id));
    const uninitializedCategories = allCategories.filter(
      (cat: { id: string }) => !existingCategoryIds.has(cat.id)
    );

    if (uninitializedCategories.length === 0) {
      return { initialized_count: 0, categories: [] };
    }

    // Bulk insert budget records with amount='0'
    const newBudgets = uninitializedCategories.map((cat: { id: string }) => ({
      id: nanoid(),
      workspace_id: validated.workspace_id,
      created_by_user_id: validated.created_by_user_id,
      category_id: cat.id,
      month: validated.month,
      year: validated.year,
      budget_amount: '0',
      currency: validated.currency,
      is_closed: false,
    }));

    await Promise.resolve(this.db.insert(this.schema.budgets).values(newBudgets));

    // Invalidate budget cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(validated.workspace_id), CacheTags.BUDGET]);

    return {
      initialized_count: uninitializedCategories.length,
      categories: uninitializedCategories.map((cat: { id: string; name: string }) => ({
        id: cat.id,
        name: cat.name,
      })),
    };
  }
```

**Step 3: Run tests to verify they pass**

Run: `bun test src/services/budget.service.test.ts`
Expected: All `initializeAllBudgets` tests PASS

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/budget.service.ts
git commit -m "feat(budget): implement initializeAllBudgets service method"
```

---

## Task 5: Create API Endpoint

**Files:**

- Create: `src/pages/api/budgets/initialize.ts`

**Step 1: Create the API endpoint**

Follow the pattern from `src/pages/api/budgets/copy.ts`:

```typescript
import type { APIRoute } from 'astro';
import { budgetService, BudgetServiceError } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { initializeBudgetsAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * POST /api/budgets/initialize
 * Initialize budgets for all uninitialized expense categories with amount=0
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, initializeBudgetsAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const result = await budgetService.initializeAllBudgets({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      ...validation.data,
    });

    return successResponse(result, 200);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error initializing budgets', error);
    return errorResponse('Failed to initialize budgets', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/budgets/initialize.ts
git commit -m "feat(budget): add POST /api/budgets/initialize endpoint"
```

---

## Task 6: Create InitializeBudgetsModal Component

**Files:**

- Create: `src/components/organisms/InitializeBudgetsModal.astro`

**Step 1: Create the modal component**

Follow the pattern from `CopyBudgetModal.astro`. The modal shows a list of categories that will be initialized and requires confirmation:

```astro
---
/**
 * InitializeBudgetsModal Component
 *
 * Confirmation modal for initializing budgets for all uninitialized expense categories.
 * Shows category list, count, and helper text. Uses POST /api/budgets/initialize endpoint.
 *
 * @param {string} id - Modal ID
 * @param {Array} categories - Uninitialized categories with id, name, icon, color
 * @param {number} month - Target month (1-12)
 * @param {number} year - Target year
 * @param {string} currency - Target currency (IDR or USD)
 */

import Modal from '../molecules/Modal.astro';
import { Zap } from '@lucide/astro';
import { getMonthName } from '@/lib/utils/date';
import DynamicIcon from '@components/atoms/DynamicIcon.astro';

export interface Props {
  id: string;
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  month: number;
  year: number;
  currency: 'IDR' | 'USD';
}

const { id, categories, month, year, currency } = Astro.props;

const monthName = getMonthName(month);
const categoryCount = categories.length;
---

<div
  data-initialize-budgets-modal-container
  data-id={id}
  data-month={month}
  data-year={year}
  data-currency={currency}
>
  <Modal id={id} title="" size="md" closable={false} className="[&_.modal-box]:rounded-card">
    <div class="space-y-6">
      {/* Header with icon */}
      <div class="flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center bg-accent/10 text-accent"
        >
          <Zap size={24} class="stroke-current" aria-hidden="true" />
        </div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-base-content leading-none">
            Initialize Budgets?
          </h2>
          <p class="text-base-content/60 text-sm mt-2 font-medium">
            Create budget entries for {monthName}
            {year}.
          </p>
        </div>
      </div>

      {/* Category list */}
      <div class="bg-base-200/50 rounded-2xl border border-base-300 p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-base-content/50">
            Categories to initialize
          </span>
          <span class="badge badge-sm badge-ghost font-bold">
            {categoryCount}
            {categoryCount === 1 ? 'category' : 'categories'}
          </span>
        </div>
        <ul class="space-y-2 max-h-48 overflow-y-auto" role="list">
          {
            categories.map((cat) => (
              <li class="flex items-center gap-3 py-1.5 px-2 rounded-lg">
                <span
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={`background-color: ${cat.color}`}
                  aria-hidden="true"
                >
                  <DynamicIcon name={cat.icon} size={16} />
                </span>
                <span class="text-sm font-medium text-base-content">{cat.name}</span>
              </li>
            ))
          }
        </ul>
      </div>

      {/* Helper text */}
      <div class="text-sm text-base-content/70 bg-info/5 border border-info/10 rounded-xl p-4">
        <p>
          All budgets will be set to <span class="font-bold text-base-content">0</span> ({
            currency
          }). You can edit amounts afterwards using inline editing.
        </p>
      </div>

      {/* Error message container */}
      <div id={`${id}-error`} class="hidden alert alert-error text-sm rounded-xl" role="alert">
      </div>

      {/* ARIA live region for screen reader announcements */}
      <div id={`${id}-status`} class="sr-only" role="status" aria-live="polite"></div>

      {/* Actions */}
      <div class="flex items-center gap-4 pt-4">
        <button
          type="button"
          class="flex-1 py-4 text-base-content/60 font-bold hover:bg-base-200 rounded-2xl transition-colors"
          data-cancel-initialize
        >
          Cancel
        </button>
        <button
          type="button"
          class="flex-[2] btn btn-accent py-4 rounded-2xl font-bold text-base shadow-lg shadow-accent/20 hover:shadow-xl transition-all"
          data-confirm-initialize
          disabled={categoryCount === 0}
        >
          Initialize
        </button>
      </div>
    </div>
  </Modal>
</div>

<script>
  import { addToast } from '@lib/stores/toastStore';
  import { getCsrfHeaders } from '@/lib/csrf-client';

  const initializedModals = new WeakSet<Element>();

  function initInitializeBudgetsModal() {
    document.querySelectorAll('[data-initialize-budgets-modal-container]').forEach((container) => {
      if (initializedModals.has(container)) return;
      initializedModals.add(container);

      const id = container.getAttribute('data-id');
      if (!id) return;

      const modal = document.getElementById(id) as HTMLDialogElement | null;
      const cancelBtn = container.querySelector('[data-cancel-initialize]');
      const confirmBtn = container.querySelector(
        '[data-confirm-initialize]'
      ) as HTMLButtonElement | null;
      const errorDiv = document.getElementById(`${id}-error`);
      const statusDiv = document.getElementById(`${id}-status`);

      const month = parseInt(container.getAttribute('data-month') || '0', 10);
      const year = parseInt(container.getAttribute('data-year') || '0', 10);
      const currency = container.getAttribute('data-currency') || 'IDR';

      if (!modal || !confirmBtn) return;

      // Cancel handler
      cancelBtn?.addEventListener('click', () => {
        if (errorDiv) {
          errorDiv.textContent = '';
          errorDiv.classList.add('hidden');
        }
        modal.close();
      });

      // Confirm handler
      confirmBtn.addEventListener('click', async () => {
        const originalText = confirmBtn.textContent || 'Initialize';

        if (errorDiv) {
          errorDiv.textContent = '';
          errorDiv.classList.add('hidden');
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Initializing...';
        if (statusDiv) {
          statusDiv.textContent = 'Initializing budgets...';
        }

        try {
          const response = await fetch('/api/budgets/initialize', {
            method: 'POST',
            headers: getCsrfHeaders({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ month, year, currency }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to initialize budgets');
          }

          const data = await response.json();
          const result = data.data;

          const count = result.initialized_count || 0;
          const successMessage =
            count > 0
              ? `Initialized ${count} ${count === 1 ? 'budget' : 'budgets'} successfully`
              : 'All categories already have budgets';

          if (statusDiv) {
            statusDiv.textContent = successMessage;
          }
          addToast(successMessage, 'success');
          modal.close();

          // Dispatch event so page can refresh
          document.dispatchEvent(
            new CustomEvent('budgets-initialized', {
              detail: { initializedCount: count },
            })
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to initialize budgets';
          if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
          }
          addToast(message, 'error');
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInitializeBudgetsModal);
  } else {
    initInitializeBudgetsModal();
  }

  document.addEventListener('astro:page-load', initInitializeBudgetsModal);
</script>
```

**Step 2: Check if `DynamicIcon` component exists**

Check: `src/components/atoms/DynamicIcon.astro`
If it doesn't exist, replace `<DynamicIcon name={cat.icon} size={16} />` with a simpler approach — use a colored circle or a generic icon like `<Zap size={16} />`. Alternatively, use a `<span>` with the icon name as text. Verify the pattern used in `BudgetCardGridPartial.astro` for rendering category icons and replicate it.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/organisms/InitializeBudgetsModal.astro
git commit -m "feat(budget): create InitializeBudgetsModal component"
```

---

## Task 7: Add Initialize Button to BudgetActions

**Files:**

- Modify: `src/components/molecules/BudgetActions.astro`

**Step 1: Add props for uninitialized categories count**

Update the Props interface:

```typescript
export interface Props {
  showAiRebalancer?: boolean;
  uninitializedCount?: number;
  className?: string;
}
```

Destructure the new prop:

```typescript
const { showAiRebalancer = true, uninitializedCount = 0, className = '' } = Astro.props;
```

**Step 2: Add the Initialize All Budgets button**

Add the button before the AI Rebalancer button. Import `Zap` from `@lucide/astro`.

```astro
{/* Initialize All Budgets */}
{
  uninitializedCount > 0 ? (
    <div class="tooltip tooltip-bottom" data-tip="Initialize all budgets">
      <button
        type="button"
        class={ghostBtn}
        id="initialize-budgets-btn"
        data-testid="initialize-budgets-btn"
        data-target-modal="initialize-budgets-modal"
        aria-label="Initialize all budgets"
      >
        <Zap size={16} class="stroke-current md:hidden" aria-hidden="true" />
        <Zap size={18} class="stroke-current hidden md:block" aria-hidden="true" />
        <span class="hidden md:inline">Initialize All</span>
      </button>
    </div>
  ) : (
    <div class="tooltip tooltip-bottom" data-tip="All categories already have budgets">
      <button
        type="button"
        class={ghostBtn}
        disabled
        aria-disabled="true"
        aria-label="Initialize all budgets (all categories already have budgets)"
      >
        <Zap size={16} class="stroke-current md:hidden" aria-hidden="true" />
        <Zap size={18} class="stroke-current hidden md:block" aria-hidden="true" />
        <span class="hidden md:inline">Initialize All</span>
      </button>
    </div>
  )
}
```

**Step 3: Register the button in the script section**

In the `initBudgetActionButtons` function, add:

```typescript
initModalTriggerButton('initialize-budgets-btn');
```

In the `cleanupBudgetActionButtons` function, add `'initialize-budgets-btn'` to the array:

```typescript
['set-new-budget-btn', 'ai-rebalancer-btn', 'initialize-budgets-btn'].forEach(...)
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/molecules/BudgetActions.astro
git commit -m "feat(budget): add Initialize All Budgets button to BudgetActions"
```

---

## Task 8: Wire Up Budget Page

**Files:**

- Modify: `src/pages/budget/index.astro`
- Modify: `src/components/organisms/BudgetPageHeader.astro`

**Step 1: Calculate uninitialized categories in budget page**

In `src/pages/budget/index.astro`, after the `expenseCategoriesWithBudgets` calculation (around line 242), add:

```typescript
// Determine which expense categories don't have budgets for this month
const uninitializedCategories = expenseCategories.filter((cat) => !budgetIdsByCategory.has(cat.id));
```

**Step 2: Import and render the InitializeBudgetsModal**

Add the import at the top of the frontmatter:

```typescript
import InitializeBudgetsModal from '@components/organisms/InitializeBudgetsModal.astro';
```

Add the modal after `BudgetImportModal` in the template (around line 410):

```astro
{/* Initialize All Budgets Modal */}
{
  uninitializedCategories.length > 0 && (
    <InitializeBudgetsModal
      id="initialize-budgets-modal"
      categories={uninitializedCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      }))}
      month={selectedMonth}
      year={selectedYear}
      currency={selectedCurrency}
    />
  )
}
```

**Step 3: Pass uninitializedCount to BudgetPageHeader**

Update the `BudgetPageHeader` usage to pass the count:

```astro
<BudgetPageHeader ...existing props... uninitializedCount={uninitializedCategories.length} />
```

**Step 4: Update BudgetPageHeader to accept and pass uninitializedCount**

In `src/components/organisms/BudgetPageHeader.astro`:

1. Add `uninitializedCount?: number;` to Props interface
2. Destructure it: `uninitializedCount = 0,`
3. Pass to BudgetActions: `<BudgetActions showAiRebalancer={showAiRebalancer} uninitializedCount={uninitializedCount} />`

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 6: Run build**

Run: `bun run build`
Expected: PASS (verifies SSR rendering works)

**Step 7: Commit**

```bash
git add src/pages/budget/index.astro src/components/organisms/BudgetPageHeader.astro
git commit -m "feat(budget): wire initialize budgets modal to budget page"
```

---

## Task 9: Add Client-Side Event Handling

**Files:**

- Modify: `src/components/organisms/BudgetPage.client.ts`

**Step 1: Add `budgets-initialized` event handler**

In the `initBudgetPage()` function, find where `budget-updated` and `budgets-copied` events are handled and add:

```typescript
// Handle budgets initialized — refresh page to show new budget cards
document.addEventListener('budgets-initialized', ((e: CustomEvent) => {
  const { initializedCount } = e.detail;
  if (initializedCount > 0) {
    // Full page reload to get updated UI including button state
    window.location.reload();
  }
}) as EventListener);
```

Note: A full-page reload is the simplest approach here because:

1. The Initialize button state needs to change (enabled → disabled)
2. The modal component's category list needs to update
3. The page's `data-expense-categories` attribute needs to update
4. All budget cards need to appear

An alternative is `refreshBudgetData()`, but it wouldn't update the action bar or modal. Check what `budgets-copied` event does — if it navigates/reloads, follow the same pattern.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/organisms/BudgetPage.client.ts
git commit -m "feat(budget): handle budgets-initialized event with page refresh"
```

---

## Task 10: Run Quality Gates

**Files:** None (validation only)

**Step 1: Run lint**

Run: `bun run lint:fix`
Expected: PASS or auto-fixed

**Step 2: Run stylelint**

Run: `bun run stylelint:fix`
Expected: PASS or auto-fixed

**Step 3: Run format**

Run: `bun run format:fix`
Expected: PASS or auto-fixed

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Run tests**

Run: `bun test`
Expected: All tests PASS including the new initializeAllBudgets tests

**Step 6: Run build**

Run: `bun run build`
Expected: PASS

**Step 7: Commit any formatting/lint fixes**

```bash
git add -A
git commit -m "chore: fix lint/format issues from initialize budgets feature"
```

---

## Task 11: Update OpenAPI Documentation

**Files:**

- Modify: `openapi/paths/budget.yml`
- Modify: `openapi.yml` (if needed for new schema refs)

**Step 1: Add POST /api/budgets/initialize endpoint to OpenAPI**

Add to `openapi/paths/budget.yml`:

```yaml
/api/budgets/initialize:
  post:
    summary: Initialize all budgets
    description: Create budget entries with amount=0 for all active expense categories that don't have budgets in the specified month
    tags:
      - Budgets
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - month
              - year
              - currency
            properties:
              month:
                type: integer
                minimum: 1
                maximum: 12
                description: Target month
              year:
                type: integer
                minimum: 2000
                maximum: 2100
                description: Target year
              currency:
                type: string
                enum: [IDR, USD]
                description: Budget currency
    responses:
      '200':
        description: Budgets initialized successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: object
                  properties:
                    initialized_count:
                      type: integer
                    categories:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: string
                          name:
                            type: string
      '400':
        $ref: '../responses/common.yml#/responses/BadRequest'
      '401':
        $ref: '../responses/common.yml#/responses/Unauthorized'
      '500':
        $ref: '../responses/common.yml#/responses/InternalError'
```

**Step 2: Commit**

```bash
git add openapi/
git commit -m "docs(api): add POST /api/budgets/initialize to OpenAPI spec"
```

---

## Task 12: Manual Testing

**Files:** None (testing only)

**Step 1: Start dev server**

Run: `bun run dev`

**Step 2: Test happy path**

1. Navigate to `/budget` page
2. Verify "Initialize All" button is visible (if uninitialized categories exist)
3. Click "Initialize All" button
4. Verify modal opens with correct category list
5. Click "Initialize"
6. Verify success toast appears
7. Verify page refreshes with new budget cards (all showing 0)
8. Verify "Initialize All" button is now disabled

**Step 3: Test edge cases**

1. If all categories already have budgets, verify button is disabled with tooltip
2. Navigate to a different month and verify button state updates
3. Test inline editing of a newly initialized budget (change from 0 to a real amount)
4. Test canceling the modal (no changes should be made)

**Step 4: Test accessibility**

1. Tab to the Initialize All button
2. Press Enter to open modal
3. Tab through modal elements (category list → Cancel → Initialize)
4. Press Escape to close modal
5. Verify screen reader announcements during initialization

---

## Summary

| Task | Description                 | Files Changed                                  |
| ---- | --------------------------- | ---------------------------------------------- |
| 1    | Add validation schemas      | `validation/budgets.ts`, `validation/index.ts` |
| 2    | Add result type             | `types/budget.ts`                              |
| 3    | Write failing service tests | `budget.service.test.ts`                       |
| 4    | Implement service method    | `budget.service.ts`                            |
| 5    | Create API endpoint         | `api/budgets/initialize.ts`                    |
| 6    | Create modal component      | `InitializeBudgetsModal.astro`                 |
| 7    | Add button to action bar    | `BudgetActions.astro`                          |
| 8    | Wire up budget page         | `budget/index.astro`, `BudgetPageHeader.astro` |
| 9    | Client-side event handling  | `BudgetPage.client.ts`                         |
| 10   | Quality gates               | All files                                      |
| 11   | OpenAPI docs                | `openapi/paths/budget.yml`                     |
| 12   | Manual testing              | None                                           |

**Total commits:** ~10 (one per task, plus formatting)
