# Transaction Bulk Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-select checkboxes to the transaction list with a sticky bottom action bar for bulk change category, change account, and delete operations.

**Architecture:** Client-side selection state managed via Nano Store (`selectedTransactionIds`). Checkboxes rendered server-side in TransactionCard, toggled client-side. Single `POST /api/transactions/bulk` endpoint delegates to service methods that loop through IDs calling existing `update()`/`delete()` to preserve audit logging. After bulk action, re-fetch the current page via existing HTML fragment pattern.

**Tech Stack:** Astro components (SSR), Nano Stores (client state), DaisyUI (styling), existing TransactionService methods

---

### Task 1: Add bulk service methods with tests

**Files:**

- Modify: `src/services/transaction.service.ts`
- Modify: `src/services/transaction.service.test.ts`
- Modify: `src/services/service-errors.ts` (add `BULK_LIMIT_EXCEEDED` error code)

**Step 1: Add `BULK_LIMIT_EXCEEDED` error code**

In `src/services/service-errors.ts`, add to `ServiceErrorCode` enum after `DUPLICATE_TRANSACTION`:

```typescript
BULK_LIMIT_EXCEEDED = 'BULK_LIMIT_EXCEEDED',
```

**Step 2: Write failing tests for bulk operations**

In `src/services/transaction.service.test.ts`, add a new `describe('bulk operations', ...)` block at the end of the main describe. Tests:

```typescript
describe('bulk operations', () => {
  describe('bulkUpdateCategory', () => {
    it('should update category for multiple transactions', async () => {
      const ids = ['txn-1', 'txn-2', 'txn-3'];
      const newCategoryId = 'cat-new';

      // Mock category lookup (exists, active)
      (mockDb.query.categories.findFirst as any).mockResolvedValue(
        createMockCategory({ id: newCategoryId, is_active: true })
      );

      // Mock findById for each transaction (exists, not deleted)
      const mockTxn = createMockTransactionWithRelations({}, mockCategory, mockAccount);
      (mockDb.query.transactions.findFirst as any).mockResolvedValue(mockTxn);

      // Mock update
      (mockDb.update as any).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      });

      const result = await transactionService.bulkUpdateCategory(
        ids,
        newCategoryId,
        'workspace-1',
        'user-1'
      );

      expect(result.updated).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error if category not found', async () => {
      (mockDb.query.categories.findFirst as any).mockResolvedValue(null);

      await expect(
        transactionService.bulkUpdateCategory(['txn-1'], 'bad-cat', 'workspace-1', 'user-1')
      ).rejects.toThrow('Category not found');
    });

    it('should handle partial failures', async () => {
      const newCategoryId = 'cat-new';
      (mockDb.query.categories.findFirst as any).mockResolvedValue(
        createMockCategory({ id: newCategoryId, is_active: true })
      );

      // First transaction found, second not found
      (mockDb.query.transactions.findFirst as any)
        .mockResolvedValueOnce(createMockTransactionWithRelations({}, mockCategory, mockAccount))
        .mockResolvedValueOnce(null);

      (mockDb.update as any).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      });

      const result = await transactionService.bulkUpdateCategory(
        ['txn-1', 'txn-missing'],
        newCategoryId,
        'workspace-1',
        'user-1'
      );

      expect(result.updated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('txn-missing');
    });

    it('should reject if IDs exceed limit', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `txn-${i}`);

      await expect(
        transactionService.bulkUpdateCategory(ids, 'cat-1', 'workspace-1', 'user-1')
      ).rejects.toThrow('Bulk operations limited to 100');
    });
  });

  describe('bulkUpdateAccount', () => {
    it('should update account for multiple transactions', async () => {
      const ids = ['txn-1', 'txn-2'];
      const newAccountId = 'acc-new';

      // Mock account lookup
      (mockDb.query.accounts.findFirst as any).mockResolvedValue(
        createMockAccount({ id: newAccountId, status: 'active' })
      );

      const mockTxn = createMockTransactionWithRelations({}, mockCategory, mockAccount);
      (mockDb.query.transactions.findFirst as any).mockResolvedValue(mockTxn);

      (mockDb.update as any).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      });

      const result = await transactionService.bulkUpdateAccount(
        ids,
        newAccountId,
        'workspace-1',
        'user-1'
      );

      expect(result.updated).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('bulkDelete', () => {
    it('should soft delete multiple transactions', async () => {
      const ids = ['txn-1', 'txn-2'];

      const mockTxn = createMockTransactionWithRelations({}, mockCategory, mockAccount);
      (mockDb.query.transactions.findFirst as any).mockResolvedValue(mockTxn);

      (mockDb.update as any).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      });

      const result = await transactionService.bulkDelete(ids, 'workspace-1', 'user-1');

      expect(result.updated).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures on delete', async () => {
      (mockDb.query.transactions.findFirst as any)
        .mockResolvedValueOnce(createMockTransactionWithRelations({}, mockCategory, mockAccount))
        .mockResolvedValueOnce(null);

      (mockDb.update as any).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      });

      const result = await transactionService.bulkDelete(
        ['txn-1', 'txn-missing'],
        'workspace-1',
        'user-1'
      );

      expect(result.updated).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `bun test src/services/transaction.service.test.ts`
Expected: FAIL — `bulkUpdateCategory`, `bulkUpdateAccount`, `bulkDelete` not defined

**Step 4: Implement bulk methods in TransactionService**

Add to `src/services/transaction.service.ts` after the `delete()` method and before `count()`:

```typescript
/** Maximum IDs per bulk operation */
private static readonly BULK_OPERATION_LIMIT = 100;

/** Result type for bulk operations */
interface BulkOperationResult {
  updated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Bulk update category for multiple transactions.
 * Validates category once, then loops through IDs calling update() for audit trail.
 */
async bulkUpdateCategory(
  ids: string[],
  categoryId: string,
  workspaceId: string,
  userId: string
): Promise<BulkOperationResult> {
  if (ids.length > TransactionService.BULK_OPERATION_LIMIT) {
    throw new TransactionServiceError(
      ServiceErrorCode.BULK_LIMIT_EXCEEDED,
      `Bulk operations limited to ${TransactionService.BULK_OPERATION_LIMIT} items`,
      400
    );
  }

  // Validate category exists and is active (once, upfront)
  const category = await this.categoryService.findById(categoryId, workspaceId);
  if (!category) {
    throw new TransactionServiceError(
      ServiceErrorCode.CATEGORY_NOT_FOUND,
      'Category not found',
      404
    );
  }
  if (!category.is_active) {
    throw new TransactionServiceError(
      ServiceErrorCode.CATEGORY_INACTIVE,
      'Category is inactive',
      400
    );
  }

  const result: BulkOperationResult = { updated: 0, failed: 0, errors: [] };

  for (const id of ids) {
    try {
      await this.update(id, workspaceId, { category_id: categoryId }, userId);
      result.updated++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Bulk update account for multiple transactions.
 * Validates account once, then loops through IDs calling update() for audit trail.
 */
async bulkUpdateAccount(
  ids: string[],
  accountId: string,
  workspaceId: string,
  userId: string
): Promise<BulkOperationResult> {
  if (ids.length > TransactionService.BULK_OPERATION_LIMIT) {
    throw new TransactionServiceError(
      ServiceErrorCode.BULK_LIMIT_EXCEEDED,
      `Bulk operations limited to ${TransactionService.BULK_OPERATION_LIMIT} items`,
      400
    );
  }

  // Validate account exists and is active (once, upfront)
  const account = await this.accountService.findByIdIncludingClosed(accountId, workspaceId);
  if (!account) {
    throw new TransactionServiceError(
      ServiceErrorCode.ACCOUNT_NOT_FOUND,
      'Account not found',
      404
    );
  }
  if (account.status === 'closed') {
    throw new TransactionServiceError(
      ServiceErrorCode.ACCOUNT_CLOSED,
      'Cannot update transaction — account is deactivated',
      400
    );
  }

  const result: BulkOperationResult = { updated: 0, failed: 0, errors: [] };

  for (const id of ids) {
    try {
      await this.update(id, workspaceId, { account_id: accountId }, userId);
      result.updated++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Bulk soft-delete multiple transactions.
 * Loops through IDs calling delete() for per-transaction audit trail.
 */
async bulkDelete(
  ids: string[],
  workspaceId: string,
  userId: string
): Promise<BulkOperationResult> {
  if (ids.length > TransactionService.BULK_OPERATION_LIMIT) {
    throw new TransactionServiceError(
      ServiceErrorCode.BULK_LIMIT_EXCEEDED,
      `Bulk operations limited to ${TransactionService.BULK_OPERATION_LIMIT} items`,
      400
    );
  }

  const result: BulkOperationResult = { updated: 0, failed: 0, errors: [] };

  for (const id of ids) {
    try {
      await this.delete(id, workspaceId, userId);
      result.updated++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}
```

Also export the `BulkOperationResult` interface:

```typescript
export interface BulkOperationResult {
  updated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/services/transaction.service.test.ts`
Expected: All tests PASS

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/services/transaction.service.ts src/services/transaction.service.test.ts src/services/service-errors.ts
git commit -m "feat(transactions): add bulk update/delete service methods (#272)"
```

---

### Task 2: Create the bulk API endpoint

**Files:**

- Create: `src/pages/api/transactions/bulk.ts`

**Step 1: Write the API endpoint**

Create `src/pages/api/transactions/bulk.ts`:

```typescript
import type { APIRoute } from 'astro';
import { transactionService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['update_category', 'update_account', 'delete']),
  ids: z.array(z.string().min(1)).min(1).max(100),
  payload: z
    .object({
      category_id: z.string().min(1).optional(),
      account_id: z.string().min(1).optional(),
    })
    .optional(),
});

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    if (!auth.workspaceId) {
      return errorResponse('Unauthorized', 401);
    }

    const contentType = context.request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const parsed = bulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', parsed.error.issues);
    }

    const { action, ids, payload } = parsed.data;

    switch (action) {
      case 'update_category': {
        if (!payload?.category_id) {
          return errorResponse('category_id is required for update_category action', 400);
        }
        const result = await transactionService.bulkUpdateCategory(
          ids,
          payload.category_id,
          auth.workspaceId,
          auth.userId
        );
        return successResponse(result);
      }

      case 'update_account': {
        if (!payload?.account_id) {
          return errorResponse('account_id is required for update_account action', 400);
        }
        const result = await transactionService.bulkUpdateAccount(
          ids,
          payload.account_id,
          auth.workspaceId,
          auth.userId
        );
        return successResponse(result);
      }

      case 'delete': {
        const result = await transactionService.bulkDelete(ids, auth.workspaceId, auth.userId);
        return successResponse(result);
      }

      default:
        return errorResponse('Unknown action', 400);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error in bulk transaction operation', error);

    // Forward service error status codes
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const serviceError = error as { message: string; statusCode: number; code: string };
      return errorResponse(serviceError.message, serviceError.statusCode, serviceError.code);
    }

    return errorResponse('Failed to process bulk operation', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/pages/api/transactions/bulk.ts
git commit -m "feat(transactions): add POST /api/transactions/bulk endpoint (#272)"
```

---

### Task 3: Add client-side bulk API function

**Files:**

- Modify: `src/lib/api/transactionsApiClient.ts`

**Step 1: Add bulkAction function**

Add to `src/lib/api/transactionsApiClient.ts` after the `deleteTransaction` function:

```typescript
export interface BulkActionPayload {
  action: 'update_category' | 'update_account' | 'delete';
  ids: string[];
  payload?: {
    category_id?: string;
    account_id?: string;
  };
}

export interface BulkActionResult {
  updated: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

/**
 * Execute a bulk action on multiple transactions
 */
export async function bulkTransactionAction(payload: BulkActionPayload): Promise<BulkActionResult> {
  const response = await fetch('/api/transactions/bulk', {
    method: 'POST',
    headers: getCsrfHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.message || 'Bulk operation failed');
  }

  const json = await response.json();
  return json.data || json;
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/api/transactionsApiClient.ts
git commit -m "feat(transactions): add bulkTransactionAction client API (#272)"
```

---

### Task 4: Add selection Nano Store

**Files:**

- Create: `src/lib/stores/transactionSelectionStore.ts`

**Step 1: Create the selection store**

```typescript
/**
 * Transaction Selection Store
 *
 * Manages the set of selected transaction IDs for bulk operations.
 * Selection is page-scoped — cleared on filter change, pagination, or navigation.
 */

import { atom, computed } from 'nanostores';

/** Set of currently selected transaction IDs */
export const selectedTransactionIds = atom<Set<string>>(new Set());

/** Number of selected transactions (derived) */
export const selectedCount = computed(selectedTransactionIds, (ids) => ids.size);

/** Whether any transactions are selected (derived) */
export const hasSelection = computed(selectedTransactionIds, (ids) => ids.size > 0);

/** Toggle selection for a single transaction ID */
export function toggleSelection(id: string): void {
  const current = new Set(selectedTransactionIds.get());
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  selectedTransactionIds.set(current);
}

/** Select all given IDs (additive) */
export function selectAll(ids: string[]): void {
  selectedTransactionIds.set(new Set(ids));
}

/** Deselect all */
export function clearSelection(): void {
  selectedTransactionIds.set(new Set());
}

/** Check if a specific ID is selected */
export function isSelected(id: string): boolean {
  return selectedTransactionIds.get().has(id);
}

/** Get selected IDs as array */
export function getSelectedIds(): string[] {
  return Array.from(selectedTransactionIds.get());
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/stores/transactionSelectionStore.ts
git commit -m "feat(transactions): add selection nano store for bulk ops (#272)"
```

---

### Task 5: Add checkbox to TransactionCard

**Files:**

- Modify: `src/components/molecules/TransactionCard.astro`

**Step 1: Add checkbox to mobile layout**

In `TransactionCard.astro`, add a checkbox as the first element inside the mobile layout div (`<div class="@lg:hidden">`). The checkbox goes before Row 1:

```html
<!-- Checkbox for bulk selection -->
<!-- Wrap existing mobile rows in flex with checkbox: -->
<div class="flex items-start gap-2.5">
  <label class="flex items-center cursor-pointer shrink-0 pt-0.5">
    <input type="checkbox" class="checkbox checkbox-sm checkbox-primary"
      data-bulk-select={transaction.id}
      aria-label={`Select transaction: ${primaryText}`} />
  </label>
  <div class="flex-1 min-w-0">
    <!-- ...existing mobile Row 1 and Row 2 content... -->
  </div>
</div>
```

This wraps both mobile rows in a flex container with the checkbox on the left. Close the wrapper divs appropriately after Row 2.

**Step 2: Add checkbox to desktop layout**

In the desktop layout (`<div class="hidden @lg:flex items-center gap-3 @2xl:gap-4">`), add the checkbox as the first child (before the date column):

```html
<!-- Checkbox as first child in desktop flex row: -->
<label class="flex items-center cursor-pointer shrink-0">
  <input type="checkbox" class="checkbox checkbox-sm checkbox-primary"
    data-bulk-select={transaction.id}
    aria-label={`Select transaction: ${primaryText}`} />
</label>
```

**Important:** Both mobile and desktop checkboxes use `data-bulk-select={transaction.id}` for client-side binding. The same `data-bulk-select` attribute is used — the client script queries all `[data-bulk-select]` elements.

**Step 3: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/molecules/TransactionCard.astro
git commit -m "feat(transactions): add bulk selection checkbox to TransactionCard (#272)"
```

---

### Task 6: Add select-all checkbox to TransactionDateGroups

**Files:**

- Modify: `src/components/molecules/TransactionDateGroups.astro`

**Step 1: Add select-all header above date groups**

Before the `groups.map(...)` block, add a select-all row:

```html
<!-- Select All header — add before the groups.map() block -->
<div
  class="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-base-300/50 bg-base-100"
  id="bulk-select-all-bar"
>
  <label class="flex items-center cursor-pointer shrink-0">
    <input
      type="checkbox"
      class="checkbox checkbox-sm checkbox-primary"
      data-bulk-select-all
      aria-label="Select all transactions on this page"
    />
  </label>
  <span class="text-xs font-medium text-base-content/60" data-bulk-select-count> Select all </span>
</div>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/molecules/TransactionDateGroups.astro
git commit -m "feat(transactions): add select-all checkbox to date groups header (#272)"
```

---

### Task 7: Create BulkActionBar component

**Files:**

- Create: `src/components/organisms/BulkActionBar.astro`

**Step 1: Create the sticky bottom action bar**

```html
---
/**
 * Bulk Action Bar
 *
 * Sticky bottom bar that appears when transactions are selected.
 * Shows selected count and action buttons: Change Category, Change Account, Delete.
 * Hidden by default — shown/hidden by client script based on selection state.
 */

import { X, FolderPen, CreditCard, Trash2 } from '@lucide/astro';
import type { Category } from '@/lib/stores/transactionsDataStore';

export interface Props {
  categories: Array<{ id: string; name: string; type: string }>;
  accounts: Array<{ id: string; name: string }>;
}

const { categories, accounts } = Astro.props;

// Split categories by type for the dropdown
const expenseCategories = categories.filter((c) => c.type === 'expense');
const incomeCategories = categories.filter((c) => c.type === 'income');
---

<div
  id="bulk-action-bar"
  class="fixed bottom-0 inset-x-0 z-40 hidden"
  role="toolbar"
  aria-label="Bulk transaction actions"
>
  <div class="bg-base-100 border-t border-base-300 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
      {/* Close / clear selection */}
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        data-bulk-clear
        aria-label="Clear selection"
      >
        <X size="{18}" class="stroke-current" aria-hidden="true" />
      </button>

      {/* Selected count */}
      <span class="text-sm font-bold text-base-content" data-bulk-selected-count> 0 selected </span>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Change Category dropdown */}
      <div class="dropdown dropdown-top dropdown-end">
        <button
          type="button"
          tabindex="{0}"
          class="btn btn-sm btn-outline gap-2"
          aria-haspopup="listbox"
          aria-label="Change category for selected transactions"
        >
          <FolderPen size="{16}" class="stroke-current" aria-hidden="true" />
          <span class="hidden sm:inline">Category</span>
        </button>
        <ul
          tabindex="{0}"
          class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-56 max-h-64 overflow-y-auto border border-base-300 mb-2"
          role="listbox"
          data-bulk-category-list
        >
          {expenseCategories.length > 0 && (
          <li class="menu-title text-xs">Expense</li>
          )} {expenseCategories.map((cat) => (
          <li role="none">
            <button
              type="button"
              role="option"
              class="text-sm"
              data-bulk-action="update_category"
              data-bulk-value="{cat.id}"
            >
              {cat.name}
            </button>
          </li>
          ))} {incomeCategories.length > 0 && (
          <li class="menu-title text-xs">Income</li>
          )} {incomeCategories.map((cat) => (
          <li role="none">
            <button
              type="button"
              role="option"
              class="text-sm"
              data-bulk-action="update_category"
              data-bulk-value="{cat.id}"
            >
              {cat.name}
            </button>
          </li>
          ))}
        </ul>
      </div>

      {/* Change Account dropdown */}
      <div class="dropdown dropdown-top dropdown-end">
        <button
          type="button"
          tabindex="{0}"
          class="btn btn-sm btn-outline gap-2"
          aria-haspopup="listbox"
          aria-label="Change account for selected transactions"
        >
          <CreditCard size="{16}" class="stroke-current" aria-hidden="true" />
          <span class="hidden sm:inline">Account</span>
        </button>
        <ul
          tabindex="{0}"
          class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-56 max-h-64 overflow-y-auto border border-base-300 mb-2"
          role="listbox"
          data-bulk-account-list
        >
          {accounts.map((acc) => (
          <li role="none">
            <button
              type="button"
              role="option"
              class="text-sm"
              data-bulk-action="update_account"
              data-bulk-value="{acc.id}"
            >
              {acc.name}
            </button>
          </li>
          ))}
        </ul>
      </div>

      {/* Delete button */}
      <button
        type="button"
        class="btn btn-sm btn-error btn-outline gap-2"
        data-bulk-action="delete"
        aria-label="Delete selected transactions"
      >
        <Trash2 size="{16}" class="stroke-current" aria-hidden="true" />
        <span class="hidden sm:inline">Delete</span>
      </button>
    </div>
  </div>
</div>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/organisms/BulkActionBar.astro
git commit -m "feat(transactions): create BulkActionBar sticky bottom component (#272)"
```

---

### Task 8: Add BulkActionBar and bulk delete confirmation modal to transactions page

**Files:**

- Modify: `src/pages/transactions/index.astro`

**Step 1: Import and add BulkActionBar**

At the top of the frontmatter, add the import:

```typescript
import BulkActionBar from '@/components/organisms/BulkActionBar.astro';
```

Before the closing `</ProtectedLayout>` tag (after the existing delete-dialog ConfirmationModal), add:

```html
{/* Bulk Action Bar (shown when transactions selected) */}
<BulkActionBar categories="{categories.map((c)" ="">
  ({ id: c.id, name: c.name, type: c.type }))} accounts={accountOptions.map((a) => ({ id: a.id,
  name: a.name }))} /> {/* Bulk Delete Confirmation Modal */}
  <ConfirmationModal
    id="bulk-delete-dialog"
    title="Delete Transactions"
    description=""
    confirmLabel="Delete All"
    confirmVariant="error"
    confirmLoadingLabel="Deleting..."
    cancelLabel="Cancel"
    iconVariant="error"
  >
    <p
      slot="details"
      id="bulk-delete-dialog-details"
      class="text-sm text-base-content/70 font-medium"
      data-confirm-details
    ></p> </ConfirmationModal
></BulkActionBar>
```

**Step 2: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/pages/transactions/index.astro
git commit -m "feat(transactions): add BulkActionBar and bulk delete modal to page (#272)"
```

---

### Task 9: Implement client-side bulk operations orchestrator

**Files:**

- Create: `src/components/organisms/BulkActions.client.ts`
- Modify: `src/components/organisms/TransactionsPage.client.ts`

**Step 1: Create BulkActions.client.ts**

This file handles all bulk action UI logic: checkbox toggling, select-all, action bar visibility, and dispatching bulk API calls.

```typescript
/**
 * Bulk Actions Client-Side Controller
 *
 * Manages checkbox selection, select-all, action bar visibility,
 * and dispatches bulk API calls for transaction operations.
 */

import {
  selectedTransactionIds,
  selectedCount,
  hasSelection,
  toggleSelection,
  selectAll,
  clearSelection,
  getSelectedIds,
} from '@/lib/stores/transactionSelectionStore';
import { bulkTransactionAction } from '@/lib/api/transactionsApiClient';
import { addToast } from '@/lib/stores/toastStore';
import {
  clearConfirmError,
  closeConfirmationModal,
  setConfirmLoading,
  showConfirmError,
} from '@/components/molecules/ConfirmationModal.client';
import { invalidateAllCache } from '@/lib/stores/transactionsDataStore';

let controller: AbortController | null = null;

/** Callback to re-fetch and render after a bulk action completes */
let onBulkActionComplete: (() => Promise<void>) | null = null;

/**
 * Register callback for after bulk action completes
 */
export function setOnBulkActionComplete(callback: () => Promise<void>): void {
  onBulkActionComplete = callback;
}

/**
 * Initialize bulk action event listeners
 */
export function initBulkActions(signal: AbortSignal): void {
  // --- Checkbox toggling (event delegation) ---
  document.addEventListener(
    'change',
    (e) => {
      const target = e.target as HTMLInputElement;

      // Individual checkbox
      if (target.matches('[data-bulk-select]')) {
        const id = target.getAttribute('data-bulk-select');
        if (id) toggleSelection(id);
        syncCheckboxUI();
        return;
      }

      // Select-all checkbox
      if (target.matches('[data-bulk-select-all]')) {
        if (target.checked) {
          const allIds = Array.from(
            document.querySelectorAll<HTMLInputElement>('[data-bulk-select]')
          )
            .map((el) => el.getAttribute('data-bulk-select')!)
            .filter(Boolean);
          selectAll(allIds);
        } else {
          clearSelection();
        }
        syncCheckboxUI();
        return;
      }
    },
    { signal }
  );

  // --- Clear selection button ---
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement;

      if (target.closest('[data-bulk-clear]')) {
        clearSelection();
        syncCheckboxUI();
        return;
      }

      // Bulk action buttons (category/account selection from dropdown)
      const actionBtn = target.closest('[data-bulk-action]') as HTMLElement | null;
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-bulk-action');
        const value = actionBtn.getAttribute('data-bulk-value');
        if (action) {
          handleBulkAction(action, value);
        }
        return;
      }
    },
    { signal }
  );

  // --- Subscribe to selection changes to update UI ---
  const unsubscribe = hasSelection.subscribe((selected) => {
    const bar = document.getElementById('bulk-action-bar');
    if (bar) {
      bar.classList.toggle('hidden', !selected);
    }
  });

  const unsubCount = selectedCount.subscribe((count) => {
    const countEl = document.querySelector('[data-bulk-selected-count]');
    if (countEl) {
      countEl.textContent = `${count} selected`;
    }

    const selectCountEl = document.querySelector('[data-bulk-select-count]');
    if (selectCountEl) {
      selectCountEl.textContent = count > 0 ? `${count} selected` : 'Select all';
    }
  });

  // Cleanup subscriptions on abort
  signal.addEventListener('abort', () => {
    unsubscribe();
    unsubCount();
    clearSelection();
  });
}

/**
 * Sync checkbox checked state with store
 */
export function syncCheckboxUI(): void {
  const selected = selectedTransactionIds.get();

  // Sync individual checkboxes
  document.querySelectorAll<HTMLInputElement>('[data-bulk-select]').forEach((cb) => {
    const id = cb.getAttribute('data-bulk-select');
    cb.checked = id ? selected.has(id) : false;
  });

  // Sync select-all checkbox
  const allCheckboxes = document.querySelectorAll<HTMLInputElement>('[data-bulk-select]');
  const selectAllCb = document.querySelector<HTMLInputElement>('[data-bulk-select-all]');
  if (selectAllCb && allCheckboxes.length > 0) {
    const allChecked = Array.from(allCheckboxes).every((cb) => cb.checked);
    const someChecked = Array.from(allCheckboxes).some((cb) => cb.checked);
    selectAllCb.checked = allChecked;
    selectAllCb.indeterminate = someChecked && !allChecked;
  }
}

/**
 * Handle a bulk action dispatch
 */
async function handleBulkAction(action: string, value: string | null): Promise<void> {
  const ids = getSelectedIds();
  if (ids.length === 0) return;

  // For delete, show confirmation modal
  if (action === 'delete') {
    showBulkDeleteConfirmation(ids.length);
    return;
  }

  // For update actions, execute immediately
  if (action === 'update_category' && value) {
    await executeBulkAction({
      action: 'update_category',
      ids,
      payload: { category_id: value },
    });
  } else if (action === 'update_account' && value) {
    await executeBulkAction({
      action: 'update_account',
      ids,
      payload: { account_id: value },
    });
  }
}

/**
 * Show bulk delete confirmation modal
 */
function showBulkDeleteConfirmation(count: number): void {
  const dialog = document.getElementById('bulk-delete-dialog') as HTMLDialogElement | null;
  if (!dialog) return;

  const details = document.getElementById('bulk-delete-dialog-details');
  if (details) {
    details.textContent = `Are you sure you want to delete ${count} transaction${count !== 1 ? 's' : ''}? This action cannot be undone.`;
  }

  clearConfirmError(dialog.querySelector('[data-confirm-error]') as HTMLElement | null);
  dialog.showModal();
}

/**
 * Execute bulk action via API
 */
async function executeBulkAction(payload: {
  action: 'update_category' | 'update_account' | 'delete';
  ids: string[];
  payload?: { category_id?: string; account_id?: string };
}): Promise<void> {
  try {
    const result = await bulkTransactionAction(payload);

    // Show result toast
    const actionLabel =
      payload.action === 'delete'
        ? 'deleted'
        : payload.action === 'update_category'
          ? 'recategorized'
          : 'updated';

    if (result.failed === 0) {
      addToast(
        `${result.updated} transaction${result.updated !== 1 ? 's' : ''} ${actionLabel}`,
        'success'
      );
    } else {
      addToast(
        `${result.updated} ${actionLabel}, ${result.failed} failed`,
        result.updated > 0 ? 'warning' : 'error'
      );
    }

    // Clear selection and refresh
    clearSelection();
    syncCheckboxUI();
    invalidateAllCache();

    if (onBulkActionComplete) {
      await onBulkActionComplete();
    }
  } catch (error) {
    addToast(error instanceof Error ? error.message : 'Bulk operation failed', 'error');
  }
}

/**
 * Initialize bulk delete confirmation dialog handler.
 * Call this from the page orchestrator after DOM is ready.
 */
export function initBulkDeleteConfirmation(signal: AbortSignal): void {
  const dialog = document.getElementById('bulk-delete-dialog') as HTMLDialogElement | null;
  if (!dialog) return;

  const confirmBtn = dialog.querySelector('[data-confirm-action]') as HTMLButtonElement | null;
  const cancelBtn = dialog.querySelector('[data-confirm-cancel]') as HTMLButtonElement | null;
  const errorDiv = dialog.querySelector('[data-confirm-error]') as HTMLElement | null;

  confirmBtn?.addEventListener(
    'click',
    async () => {
      const ids = getSelectedIds();
      if (ids.length === 0) return;

      setConfirmLoading(confirmBtn!, true);
      clearConfirmError(errorDiv);

      try {
        await executeBulkAction({ action: 'delete', ids });
        closeConfirmationModal(dialog);
      } catch (error) {
        showConfirmError(
          errorDiv,
          error instanceof Error ? error.message : 'Failed to delete transactions'
        );
      } finally {
        setConfirmLoading(confirmBtn!, false);
      }
    },
    { signal }
  );

  cancelBtn?.addEventListener(
    'click',
    () => {
      clearConfirmError(errorDiv);
      closeConfirmationModal(dialog);
    },
    { signal }
  );
}
```

**Step 2: Wire into TransactionsPage.client.ts**

In `src/components/organisms/TransactionsPage.client.ts`:

Add imports at the top:

```typescript
import {
  initBulkActions,
  initBulkDeleteConfirmation,
  setOnBulkActionComplete,
  syncCheckboxUI,
} from './BulkActions.client';
import { clearSelection } from '@/lib/stores/transactionSelectionStore';
```

In the `setupEventListeners()` function, after all existing event listener setup, add:

```typescript
// Bulk actions
initBulkActions(signal);
initBulkDeleteConfirmation(signal);
setOnBulkActionComplete(() => fetchAndRender());
```

In the existing `fetchAndRender()` function, after the line `reattachPaginationListeners()`, add:

```typescript
// Re-sync bulk selection checkboxes after HTML replacement
syncCheckboxUI();
```

In the filter change handlers (`handleCategoryFilterChange`, `handleCategoryIdsFilterChange`, `handleAccountIdsFilterChange`, `handleMonthFilterChange`, `handleSearchInput` debounced callback, `handlePageChange`, and the `transactions-changed` event handler), add `clearSelection()` call before `fetchAndRender()`:

```typescript
clearSelection();
```

Also add `clearSelection()` in the reset-filters handler (inside the `[data-reset-filters]` click handler).

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 4: Run build**

Run: `bun run build`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/components/organisms/BulkActions.client.ts src/components/organisms/TransactionsPage.client.ts
git commit -m "feat(transactions): implement bulk actions client-side orchestrator (#272)"
```

---

### Task 10: Run quality gates and final verification

**Files:** None (verification only)

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass with 0 errors

**Step 2: Run unit tests**

```bash
bun test src/services/transaction.service.test.ts
```

Expected: All tests pass

**Step 3: Run build**

```bash
bun run build
```

Expected: Build succeeds

**Step 4: Commit any formatting fixes**

If quality gates made changes:

```bash
git add -A
git commit -m "chore: apply quality gate fixes"
```

---

### Task 11: Manual smoke test in browser

**Files:** None (verification only)

**Step 1: Start dev server**

```bash
bun run dev
```

**Step 2: Verify in browser**

Navigate to `/transactions` and verify:

1. Each transaction card has a checkbox on the left
2. Checking a checkbox shows the sticky bottom action bar
3. "Select all" checkbox works
4. Clicking "Category" in action bar shows dropdown with categories
5. Selecting a category triggers the bulk update and shows success toast
6. Clicking "Delete" shows confirmation modal
7. Confirming delete shows success toast and removes transactions
8. Changing any filter clears the selection
9. Pagination clears the selection
10. Action bar hides when selection is cleared

**Step 3: Test on mobile viewport**

Resize to 375px width and verify:

- Checkboxes render correctly in mobile layout
- Action bar buttons show icons only (labels hidden on mobile via `hidden sm:inline`)
- Dropdown menus open upward (`dropdown-top`) without clipping
