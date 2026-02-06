# Multi-Page Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix bugs across Settings/Security pages, wire transaction import, remove cash default, add asset transfer + inline history, add budget export/import/table view, rename API Key to MCP Access Token with setup instructions.

**Architecture:** Server-rendered Astro components with client-side scripts for interactivity. All API calls use `csrfFetch` with CSRF headers. Dual SQLite/PostgreSQL via `getActiveSchema()`. Modals use `<dialog>` with Motion animations.

**Tech Stack:** Astro 5, DaisyUI v5, Tailwind CSS v4, Drizzle ORM, Zod, Nano Stores, Motion, Lucide icons, bun:test

---

## Task 1: Fix Profile Save Bug

The profile form at `/profile` never fires because the script checks for a `#currency` select element that doesn't exist in the form. The `instanceof HTMLSelectElement` guard at line 47 fails, so the entire submit handler is skipped.

**Files:**

- Modify: `src/pages/profile.astro:43-48` — remove currency check from guard condition
- Modify: `src/pages/profile.astro:62-65` — remove currency validation
- Modify: `src/pages/profile.astro:78-84` — remove currency from payload

**Step 1: Fix the guard condition**

In `src/pages/profile.astro`, replace lines 43-48:

```typescript
// BEFORE (broken):
if (
  profileForm instanceof HTMLFormElement &&
  profileNameInput instanceof HTMLInputElement &&
  profileEmailInput instanceof HTMLInputElement &&
  profileCurrencyInput instanceof HTMLSelectElement &&
  profileSubmitButton instanceof HTMLButtonElement
) {

// AFTER (fixed):
if (
  profileForm instanceof HTMLFormElement &&
  profileNameInput instanceof HTMLInputElement &&
  profileEmailInput instanceof HTMLInputElement &&
  profileSubmitButton instanceof HTMLButtonElement
) {
```

**Step 2: Remove currency validation and dead references**

Remove lines 40, 62-65, and the `currency` field from the payload (line 83):

```typescript
// Remove line 40:
// const profileCurrencyInput = document.getElementById('currency');

// Remove lines 62-65:
// if (!profileCurrencyInput.value) {
//   errors.push('Please select a currency');
// }

// Remove line 83 from profileData:
// currency: formData.get('primaryCurrency'),
```

**Step 3: Verify manually**

Navigate to `/profile`, fill in name/email, click "Save Profile Changes". Should see toast "Profile updated successfully!" and a PUT request to `/api/user/profile` in Network tab.

**Step 4: Commit**

```bash
git add src/pages/profile.astro
git commit -m "fix(profile): remove non-existent currency guard that prevented form submission"
```

---

## Task 2: Wire Transaction Import Button

The import button shows "coming soon!" toast instead of navigating to the existing import page.

**Files:**

- Modify: `src/components/molecules/TransactionActionsBar.astro:120-124`

**Step 1: Replace toast with navigation**

In `src/components/molecules/TransactionActionsBar.astro`, replace lines 120-124:

```typescript
// BEFORE:
const importBtn = actionsBar.querySelector('[data-import-csv-button]');
importBtn?.addEventListener('click', () => {
  addToast('CSV import coming soon!', 'info');
});

// AFTER:
const importBtn = actionsBar.querySelector('[data-import-csv-button]');
importBtn?.addEventListener('click', () => {
  window.location.href = '/transactions/import';
});
```

**Step 2: Verify**

Navigate to `/transactions`, click Import button. Should navigate to `/transactions/import` showing the 5-step CSV import form.

**Step 3: Commit**

```bash
git add src/components/molecules/TransactionActionsBar.astro
git commit -m "feat(transactions): wire import button to existing import page"
```

---

## Task 3: Fix Copy Button + Toast Z-Index on Security Page

Two bugs: (1) Copy button may fail in modal context, (2) Toast appears behind modal backdrop.

**Files:**

- Modify: `src/components/organisms/GenerateApiKeyModal.astro:275-297` — add clipboard fallback
- Modify: `src/components/molecules/ToastContainer.astro:23` — increase z-index

**Step 1: Fix toast z-index**

In `src/components/molecules/ToastContainer.astro`, line 23, change `z-50` to `z-[100]`:

```html
<!-- BEFORE: -->
<div id="toast-container" class="toast toast-top toast-end z-50" ...>
  <!-- AFTER: -->
  <div id="toast-container" class="toast toast-top toast-end z-[100]" ...></div>
</div>
```

**Step 2: Add clipboard fallback in GenerateApiKeyModal**

In `src/components/organisms/GenerateApiKeyModal.astro`, replace the copy handler (lines 275-297) with a version that has a textarea fallback:

```typescript
copyBtn.addEventListener('click', async () => {
  const key = (plainKeyEl.textContent || '').trim();
  let copied = false;

  // Try modern clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(key);
      copied = true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: hidden textarea + execCommand
  if (!copied) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = key;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      copied = true;
    } catch {
      // Both methods failed
    }
  }

  if (copied) {
    copyLabel.textContent = 'Copied!';
    copyIconDefault.classList.add('hidden');
    copyIconSuccess.classList.remove('hidden');
    setTimeout(() => {
      copyLabel.textContent = 'Copy Key';
      copyIconDefault.classList.remove('hidden');
      copyIconSuccess.classList.add('hidden');
    }, 2000);
  } else {
    addToast('Unable to copy. Please select and copy the key manually.', 'error');
  }
});
```

**Step 3: Verify**

Open Security page, generate a new API key, click Copy button. Should copy successfully. If it shows a toast error, the toast should appear ABOVE the modal backdrop.

**Step 4: Commit**

```bash
git add src/components/molecules/ToastContainer.astro src/components/organisms/GenerateApiKeyModal.astro
git commit -m "fix(security): add clipboard fallback and fix toast z-index behind modal"
```

---

## Task 4: Remove Cash from Default Asset Categories

**Files:**

- Modify: `src/lib/constants/asset-categories.ts:12-18` — remove Cash entry
- Modify: `src/lib/constants/asset-categories.ts` — re-number sortOrder

**Step 1: Remove Cash entry and renumber**

In `src/lib/constants/asset-categories.ts`, remove lines 12-18 (the Cash entry) and update `sortOrder` values so Bank Account starts at 1:

```typescript
export const DEFAULT_ASSET_CATEGORIES: DefaultAssetCategory[] = [
  {
    name: 'Bank Account',
    description: 'Checking and savings accounts',
    isLiability: false,
    sortOrder: 1,
    legacyType: 'bank_account',
  },
  {
    name: 'E-Wallet',
    description: 'Digital wallets (GoPay, OVO, etc.)',
    isLiability: false,
    sortOrder: 2,
    legacyType: 'e_wallet',
  },
  // ... rest with sortOrder decremented by 1
```

**Step 2: Verify**

Run `bun run typecheck` to ensure nothing broke. Navigate to `/assets/add` — Cash should not appear in the category dropdown.

**Step 3: Commit**

```bash
git add src/lib/constants/asset-categories.ts
git commit -m "feat(assets): remove Cash from default asset categories"
```

---

## Task 5: Rename "API Key" to "MCP Access Token"

**Files:**

- Modify: `src/components/molecules/SecurityApiKeysCard.astro:31,33` — rename labels
- Modify: `src/components/organisms/GenerateApiKeyModal.astro` — rename UI text
- Modify: `src/pages/security.astro` — update any references

**Step 1: Update SecurityApiKeysCard labels**

In `src/components/molecules/SecurityApiKeysCard.astro`:

- Line 31: Change `"API Keys"` to `"MCP Access Tokens"`
- Line 33: Change `"AI & Integration Access"` to `"Model Context Protocol (MCP)"`

**Step 2: Update GenerateApiKeyModal labels**

Search for all user-facing text containing "API Key" or "API key" and replace with "MCP Access Token":

- Modal title
- Form labels
- Success/error messages
- Copy button label: "Copy Key" → "Copy Token"
- Description text about what the key is for

**Step 3: Verify**

Navigate to Security page. All references should say "MCP Access Token" instead of "API Key".

**Step 4: Commit**

```bash
git add src/components/molecules/SecurityApiKeysCard.astro src/components/organisms/GenerateApiKeyModal.astro
git commit -m "feat(security): rename API Key to MCP Access Token"
```

---

## Task 6: Inline Modal Errors for All Modals

Establish pattern: modal form errors show inline, not as toasts.

**Files:**

- Modify: `src/components/organisms/GenerateApiKeyModal.astro` — errors already inline (has `data-form-error`), just remove `addToast` call on error
- Modify: `src/components/organisms/SetNewBudgetModal.astro` — add inline error div, replace toast errors
- Modify: `src/components/organisms/AssetFormModal.astro` — add inline error div if missing
- Modify: `src/components/organisms/AssetTransferModal.astro` (new file from Task 10) — build with inline errors from start

**Step 1: Audit GenerateApiKeyModal**

In `src/components/organisms/GenerateApiKeyModal.astro`, the `data-form-error` div already exists. Remove the `addToast(message, 'error')` call in the catch block (around line 267) and only use the inline error:

```typescript
// BEFORE:
if (errorEl) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}
addToast(message, 'error'); // REMOVE THIS LINE

// AFTER:
if (errorEl) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}
```

**Step 2: Add inline error to SetNewBudgetModal**

In `src/components/organisms/SetNewBudgetModal.astro`, add an error div inside the form (before the first FormField), and replace `addToast(..., 'error')` calls with showing this div:

```html
<!-- Add after <form> opening tag -->
<div
  data-form-error
  class="hidden alert alert-error text-sm rounded-xl"
  role="alert"
  aria-live="polite"
></div>
```

Then in the script section, replace error toasts:

```typescript
// BEFORE:
addToast('Failed to save budget', 'error');

// AFTER:
const errorEl = modal.querySelector('[data-form-error]') as HTMLElement;
if (errorEl) {
  errorEl.textContent = 'Failed to save budget';
  errorEl.classList.remove('hidden');
}
```

Keep success toasts (`addToast(..., 'success')`) — those are fine as toasts.

**Step 3: Verify**

Test each modal by triggering an error (e.g., submit empty form). Error should appear inside the modal, not as a floating toast.

**Step 4: Commit**

```bash
git add src/components/organisms/GenerateApiKeyModal.astro src/components/organisms/SetNewBudgetModal.astro
git commit -m "fix(modals): show errors inline in modal forms instead of toasts"
```

---

## Task 7: Asset History API Limit Param

Add `limit` query param to the existing asset history endpoint.

**Files:**

- Modify: `src/pages/api/assets/[id]/history.ts:14-20` — parse limit param
- Modify: `src/services/asset.service.ts` — add limit param to getHistory

**Step 1: Add limit param to API endpoint**

In `src/pages/api/assets/[id]/history.ts`, add limit parsing before the service call:

```typescript
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    // Parse optional limit param
    const limitParam = context.url.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : undefined;

    const history = await assetService.getHistory(id, auth.workspaceId, perf, limit);

    return successResponse(history);
  } catch (error) {
    // ... existing error handling
  }
};
```

**Step 2: Add limit param to service method**

In `src/services/asset.service.ts`, update the `getHistory` method signature and query:

```typescript
async getHistory(asset_id: string, workspaceId: string, perf?: PerfCollector, limit?: number) {
  const asset = await this.findById(asset_id, workspaceId);
  if (!asset) {
    throw new Error('Asset not found');
  }

  return trackQuery('AssetService.getHistory', perf, async () => {
    const query: any = {
      where: eq(this.schema.assetHistory.asset_id, asset_id),
      orderBy: (assetHistory: any, { desc }: any) => [desc(assetHistory.recorded_at)],
    };
    if (limit) {
      query.limit = limit;
    }
    return this.db.query.assetHistory.findMany(query);
  });
}
```

**Step 3: Test**

```bash
curl http://localhost:4321/api/assets/<asset-id>/history?limit=10
```

Should return max 10 entries.

**Step 4: Commit**

```bash
git add src/pages/api/assets/[id]/history.ts src/services/asset.service.ts
git commit -m "feat(assets): add limit query param to asset history API"
```

---

## Task 8: Inline Expandable Asset History

Add a clickable toggle on each asset row that expands to show last 10 balance changes.

**Files:**

- Modify: `src/components/molecules/AssetItemRow.astro` — add history toggle button + expandable container
- Create: `src/components/molecules/AssetInlineHistory.client.ts` — fetch + render logic

**Step 1: Add toggle button and container to AssetItemRow**

In `src/components/molecules/AssetItemRow.astro`, add after the asset row's action buttons area:

1. A "History" toggle button with `data-toggle-history` and `data-asset-id={asset.id}`
2. A hidden container div with `data-history-container` and `data-asset-id={asset.id}` placed after the row

The toggle button uses Lucide `History` icon with text "History".

The container div:

```html
<div
  data-history-container
  data-asset-id="{asset.id}"
  class="hidden bg-base-200/50 rounded-xl p-4 mt-2 mb-2"
>
  <!-- Populated by client script -->
</div>
```

**Step 2: Create client script**

Create `src/components/molecules/AssetInlineHistory.client.ts`:

```typescript
import { csrfFetch } from '@/lib/csrf-client';

interface HistoryEntry {
  id: string;
  balance: string;
  notes: string | null;
  recorded_at: string;
}

let activeAssetId: string | null = null;

export function initInlineHistory() {
  document.querySelectorAll<HTMLElement>('[data-toggle-history]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const assetId = btn.dataset.assetId;
      if (!assetId) return;

      const container = document.querySelector(
        `[data-history-container][data-asset-id="${assetId}"]`
      ) as HTMLElement;
      if (!container) return;

      // Toggle: collapse if same asset clicked again
      if (activeAssetId === assetId) {
        container.classList.add('hidden');
        activeAssetId = null;
        return;
      }

      // Collapse previous
      if (activeAssetId) {
        const prev = document.querySelector(
          `[data-history-container][data-asset-id="${activeAssetId}"]`
        ) as HTMLElement;
        if (prev) prev.classList.add('hidden');
      }

      // Show loading skeleton
      container.innerHTML =
        '<div class="flex justify-center py-4"><span class="loading loading-spinner loading-md"></span></div>';
      container.classList.remove('hidden');
      activeAssetId = assetId;

      try {
        const res = await csrfFetch(`/api/assets/${assetId}/history?limit=10`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message);

        const entries: HistoryEntry[] = json.data;
        if (entries.length === 0) {
          container.innerHTML =
            '<p class="text-sm text-base-content/60 text-center py-2">No history entries yet.</p>';
          return;
        }

        // Build table
        let html = `<table class="table table-sm w-full">
          <thead><tr>
            <th>Date</th><th class="text-right">Balance</th><th class="text-right">Change</th><th>Notes</th>
          </tr></thead><tbody>`;

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const balance = parseFloat(entry.balance);
          const prevBalance = i < entries.length - 1 ? parseFloat(entries[i + 1].balance) : balance;
          const change = balance - prevBalance;
          const changeClass =
            change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-base-content/50';
          const changePrefix = change > 0 ? '+' : '';
          const date = new Date(entry.recorded_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          html += `<tr>
            <td class="text-sm">${date}</td>
            <td class="text-sm text-right font-mono">${balance.toLocaleString()}</td>
            <td class="text-sm text-right font-mono ${changeClass}">${i < entries.length - 1 ? changePrefix + change.toLocaleString() : '—'}</td>
            <td class="text-sm text-base-content/60 truncate max-w-32">${entry.notes || '—'}</td>
          </tr>`;
        }

        html += '</tbody></table>';
        html += `<div class="text-center mt-2"><a href="/assets/history/${assetId}" class="link link-accent text-sm">View all history</a></div>`;
        container.innerHTML = html;
      } catch (err) {
        container.innerHTML = `<p class="text-sm text-error text-center py-2">Failed to load history.</p>`;
      }
    });
  });
}
```

**Step 3: Import and initialize in assets page**

In `src/pages/assets/index.astro`, add in the `<script>` section:

```typescript
import { initInlineHistory } from '@/components/molecules/AssetInlineHistory.client';
initInlineHistory();
```

**Step 4: Verify**

Navigate to `/assets`, click "History" on any asset row. Should expand showing last 10 entries with date, balance, change, notes. Click again to collapse.

**Step 5: Commit**

```bash
git add src/components/molecules/AssetItemRow.astro src/components/molecules/AssetInlineHistory.client.ts src/pages/assets/index.astro
git commit -m "feat(assets): add inline expandable history for each asset row"
```

---

## Task 9: Budget Category Dropdown Filter

Disable categories that already have a budget for the selected month in the "Add Budget" modal.

**Files:**

- Modify: `src/components/organisms/SetNewBudgetModal.astro` — disable used categories

**Step 1: Update the category dropdown rendering**

The modal already receives `budgets` prop (passed as `budgetsForModal` from budget/index.astro line 331). The template already builds a `budgetMap` from these. Currently it shows a warning when selecting an existing category.

Change the approach: instead of warning, disable the option:

```astro
{
  expenseCategories.map((category, index) => {
    const existingBudget = budgetMap.get(category.id);
    return (
      <option
        value={category.id}
        selected={!existingBudget && index === 0}
        disabled={!!existingBudget}
        data-budget-id={existingBudget?.id || ''}
        data-budget-amount={existingBudget?.budget_amount || '0'}
      >
        {category.name}
        {existingBudget ? ' (already set)' : ''}
      </option>
    );
  })
}
```

**Step 2: Auto-select first non-disabled option**

In the client script, after modal open, find and select the first non-disabled option:

```typescript
const firstAvailable = categorySelect.querySelector('option:not([disabled])') as HTMLOptionElement;
if (firstAvailable) firstAvailable.selected = true;
```

**Step 3: Verify**

Open budget page, create a budget for "Food". Open "Add Budget" modal again — "Food" should be greyed out with "(already set)".

**Step 4: Commit**

```bash
git add src/components/organisms/SetNewBudgetModal.astro
git commit -m "feat(budget): disable already-budgeted categories in add modal dropdown"
```

---

## Task 10: Asset Transfer Modal

New modal for transferring balance between assets.

**Files:**

- Create: `src/components/organisms/AssetTransferModal.astro`
- Create: `src/pages/api/assets/transfer.ts`
- Modify: `src/services/asset.service.ts` — add `transfer()` method
- Modify: `src/pages/assets/index.astro` — add Transfer button + include modal

**Step 1: Add transfer method to AssetService**

In `src/services/asset.service.ts`, add after `updateBalance`:

```typescript
async transfer(
  fromId: string,
  toId: string,
  amount: string,
  notes: string | undefined,
  workspaceId: string
): Promise<{ fromAsset: any; toAsset: any }> {
  const fromAsset = await this.findById(fromId, workspaceId);
  const toAsset = await this.findById(toId, workspaceId);

  if (!fromAsset || !toAsset) {
    throw new Error('Asset not found');
  }

  if (fromAsset.currency !== toAsset.currency) {
    throw new Error('Cannot transfer between different currencies');
  }

  const transferAmount = parseFloat(amount);
  const fromBalance = parseFloat(fromAsset.balance);

  if (transferAmount <= 0) {
    throw new Error('Transfer amount must be positive');
  }

  if (fromBalance < transferAmount) {
    throw new Error('Insufficient balance');
  }

  const newFromBalance = (fromBalance - transferAmount).toString();
  const newToBalance = (parseFloat(toAsset.balance) + transferAmount).toString();

  // Deduct from source
  const updatedFrom = await this.updateBalance(fromId, workspaceId, {
    balance: newFromBalance,
    notes: notes ? `Transfer out: ${notes}` : `Transfer to ${toAsset.name}`,
  });

  try {
    // Add to target
    const updatedTo = await this.updateBalance(toId, workspaceId, {
      balance: newToBalance,
      notes: notes ? `Transfer in: ${notes}` : `Transfer from ${fromAsset.name}`,
    });

    return { fromAsset: updatedFrom, toAsset: updatedTo };
  } catch (error) {
    // Compensating transaction: restore source balance
    await this.updateBalance(fromId, workspaceId, {
      balance: fromAsset.balance,
      notes: 'Rollback: transfer failed',
    });
    throw error;
  }
}
```

**Step 2: Create API endpoint**

Create `src/pages/api/assets/transfer.ts`:

```typescript
import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { z } from 'zod';

const transferSchema = z
  .object({
    fromAssetId: z.string().min(1),
    toAssetId: z.string().min(1),
    amount: z.string().refine((v) => parseFloat(v) > 0, 'Amount must be positive'),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.fromAssetId !== d.toAssetId, {
    message: 'Source and destination must be different',
    path: ['toAssetId'],
  });

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, transferSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { fromAssetId, toAssetId, amount, notes } = validation.data;
    const result = await assetService.transfer(
      fromAssetId,
      toAssetId,
      amount,
      notes,
      auth.workspaceId
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
      if (error.message === 'Asset not found') return errorResponse('Asset not found', 404);
      if (error.message === 'Insufficient balance')
        return errorResponse('Insufficient balance', 400);
      if (error.message.includes('currency')) return errorResponse(error.message, 400);
    }
    logError('Error transferring between assets', error);
    return errorResponse('Failed to transfer', 500);
  }
};
```

**Step 3: Create AssetTransferModal component**

Create `src/components/organisms/AssetTransferModal.astro` with:

- Modal using `<dialog>` element
- "From" asset dropdown
- "To" asset dropdown (filters to same currency, excludes "from" selection)
- Amount input
- Notes textarea
- Inline error div (no toasts for errors, per Task 6 pattern)
- Submit handler that POSTs to `/api/assets/transfer`

**Step 4: Add Transfer button to assets page**

In `src/pages/assets/index.astro`, add a "Transfer" button in the header area and include `<AssetTransferModal>` component.

**Step 5: Verify**

Navigate to `/assets`. Click "Transfer" button. Select from/to accounts, enter amount. Submit. Both balances should update.

**Step 6: Commit**

```bash
git add src/services/asset.service.ts src/pages/api/assets/transfer.ts src/components/organisms/AssetTransferModal.astro src/pages/assets/index.astro
git commit -m "feat(assets): add asset-to-asset balance transfer"
```

---

## Task 11: Budget Export Button

Add export button to budget page matching transaction styling.

**Files:**

- Modify: `src/pages/budget/index.astro` — add Export button with download logic

**Step 1: Add Export button**

In `src/pages/budget/index.astro`, add after the BudgetPageHeader (around line 264), inside the content area:

```html
<div class="flex items-center gap-3">
  <button
    type="button"
    class="btn btn-soft rounded-full px-5 h-12 text-sm font-bold transition-all active:scale-95"
    data-budget-export-btn
    aria-label="Export budgets to CSV"
  >
    <Download size="{16}" class="stroke-current" aria-hidden="true" />
    Export
  </button>
</div>
```

Add import for `Download` from `@lucide/astro` at the top.

**Step 2: Add client-side download logic**

In the `<script>` section of budget/index.astro:

```typescript
const exportBtn = document.querySelector('[data-budget-export-btn]');
exportBtn?.addEventListener('click', async () => {
  const container = document.querySelector('[data-budget-page]') as HTMLElement;
  const year = container?.dataset.year;
  const month = container?.dataset.month;
  const currency = container?.dataset.currency || 'IDR';

  try {
    const res = await fetch(`/api/budget/export?year=${year}&month=${month}&currency=${currency}`);
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Budget exported successfully!', 'success');
  } catch {
    addToast('Failed to export budget.', 'error');
  }
});
```

**Step 3: Verify**

Navigate to `/budget`, click Export. CSV file should download with budget data for the displayed month.

**Step 4: Commit**

```bash
git add src/pages/budget/index.astro
git commit -m "feat(budget): add CSV export button"
```

---

## Task 12: Budget Table View Mode

Add Card/Table toggle with a new table component.

**Files:**

- Create: `src/components/organisms/BudgetTable.astro`
- Create: `src/components/partials/BudgetTablePartial.astro`
- Modify: `src/pages/budget/index.astro` — add toggle, conditional render

**Step 1: Create BudgetTable component**

Create `src/components/organisms/BudgetTable.astro`:

```astro
---
import { getIconForCategory } from '@/lib/utils/categoryIcons';
import type { BudgetData } from './BudgetCardGrid.astro';

export interface Props {
  budgets: BudgetData[];
  currency?: 'IDR' | 'USD';
}

const { budgets = [], currency = 'IDR' } = Astro.props;

const sortedBudgets = [...budgets].sort((a, b) => {
  const amountA =
    typeof a.budget_amount === 'string' ? parseFloat(a.budget_amount) : a.budget_amount;
  const amountB =
    typeof b.budget_amount === 'string' ? parseFloat(b.budget_amount) : b.budget_amount;
  return amountB - amountA;
});

function formatAmount(val: string | number): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return num.toLocaleString('id-ID');
}

function getStatusBadge(status: string): string {
  if (status === 'exceeded') return 'badge-error';
  if (status === 'warning') return 'badge-warning';
  return 'badge-success';
}
---

<div class="overflow-x-auto" data-budget-table>
  <table class="table table-sm w-full">
    <thead>
      <tr>
        <th data-sort="category">Category</th>
        <th data-sort="budget" class="text-right">Budget</th>
        <th data-sort="spent" class="text-right">Spent</th>
        <th data-sort="remaining" class="text-right">Remaining</th>
        <th data-sort="percentage" class="text-right">% Used</th>
        <th data-sort="status">Status</th>
      </tr>
    </thead>
    <tbody>
      {
        sortedBudgets.map((budget) => {
          const budgetAmt =
            typeof budget.budget_amount === 'string'
              ? parseFloat(budget.budget_amount)
              : budget.budget_amount;
          const spentAmt =
            typeof budget.spent_amount === 'string'
              ? parseFloat(budget.spent_amount)
              : budget.spent_amount;
          const remaining = budgetAmt - spentAmt;
          return (
            <tr class="hover" data-budget-table-row data-category-name={budget.category_name}>
              <td class="font-medium">{budget.category_name}</td>
              <td class="text-right font-mono">{formatAmount(budgetAmt)}</td>
              <td class="text-right font-mono">{formatAmount(spentAmt)}</td>
              <td class={`text-right font-mono ${remaining < 0 ? 'text-error' : ''}`}>
                {formatAmount(remaining)}
              </td>
              <td class="text-right">{budget.percentage_used}%</td>
              <td>
                <span class={`badge badge-sm ${getStatusBadge(budget.status)}`}>
                  {budget.status}
                </span>
              </td>
            </tr>
          );
        })
      }
    </tbody>
  </table>
</div>
```

**Step 2: Add view toggle to budget page**

In `src/pages/budget/index.astro`, add a toggle next to the filter input (around line 288-305):

```html
<div class="flex items-center gap-2" data-view-toggle>
  <button
    type="button"
    class="btn btn-sm btn-ghost"
    data-view-mode="card"
    aria-label="Card view"
    aria-pressed="true"
  >
    <LayoutGrid size="{16}" class="stroke-current" aria-hidden="true" />
  </button>
  <button
    type="button"
    class="btn btn-sm btn-ghost"
    data-view-mode="table"
    aria-label="Table view"
    aria-pressed="false"
  >
    <TableIcon size="{16}" class="stroke-current" aria-hidden="true" />
  </button>
</div>
```

Import `LayoutGrid` and `Table as TableIcon` from `@lucide/astro`.

**Step 3: Add conditional rendering**

Render both `BudgetCardGridPartial` and `BudgetTable` in the budget-cards-container, with one hidden:

```html
<div id="budget-cards-container">
  <div data-view="card">
    <BudgetCardGridPartial budgets="{budgetData?.categories" || []} currency="{selectedCurrency}" />
  </div>
  <div data-view="table" class="hidden">
    <BudgetTable budgets="{budgetData?.categories" || []} currency="{selectedCurrency}" />
  </div>
</div>
```

**Step 4: Add client-side toggle logic**

```typescript
const viewToggle = document.querySelector('[data-view-toggle]');
viewToggle?.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.viewMode;
    const cardView = document.querySelector('[data-view="card"]') as HTMLElement;
    const tableView = document.querySelector('[data-view="table"]') as HTMLElement;

    if (mode === 'table') {
      cardView?.classList.add('hidden');
      tableView?.classList.remove('hidden');
    } else {
      cardView?.classList.remove('hidden');
      tableView?.classList.add('hidden');
    }

    // Update aria-pressed
    viewToggle.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.viewMode === mode ? 'true' : 'false');
      b.classList.toggle('btn-active', b.dataset.viewMode === mode);
    });

    // Persist preference
    localStorage.setItem('budget-view-mode', mode || 'card');
  });
});

// Restore preference
const savedMode = localStorage.getItem('budget-view-mode');
if (savedMode === 'table') {
  const tableBtn = viewToggle?.querySelector('[data-view-mode="table"]') as HTMLButtonElement;
  tableBtn?.click();
}
```

**Step 5: Verify**

Navigate to `/budget`. Toggle between Card and Table views. Table should show all columns. Preference persists on reload.

**Step 6: Commit**

```bash
git add src/components/organisms/BudgetTable.astro src/pages/budget/index.astro
git commit -m "feat(budget): add table view mode with card/table toggle"
```

---

## Task 13: Budget CSV Import

Add import modal with file upload, preview, overwrite option, and results.

**Files:**

- Create: `src/components/organisms/BudgetImportModal.astro`
- Create: `src/pages/api/budget/import.ts`
- Modify: `src/services/budget.service.ts` — add `importFromCSV()` method
- Modify: `src/pages/budget/index.astro` — add Import button + include modal

**Step 1: Add importFromCSV to BudgetService**

In `src/services/budget.service.ts`, add:

```typescript
async importFromCSV(
  workspaceId: string,
  createdByUserId: string,
  rows: Array<Record<string, string>>,
  overwrite: boolean,
  targetMonth: number,
  targetYear: number,
  currency: 'IDR' | 'USD'
): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  // 1. Get all categories for name → ID mapping
  // 2. If overwrite, delete existing budgets for month/year
  // 3. For each row: lookup category by name, skip if not found
  // 4. Create budget entry
  // 5. Return results
}
```

**Step 2: Create API endpoint**

Create `src/pages/api/budget/import.ts`:

- Accept POST with FormData: `csv_file`, `overwrite`, `month`, `year`, `currency`
- Parse CSV, validate columns
- Call `budgetService.importFromCSV()`
- Return `{ imported, skipped, errors }`

**Step 3: Create BudgetImportModal**

Create `src/components/organisms/BudgetImportModal.astro` with 3-step flow:

1. File upload zone (drag-and-drop + file input)
2. Preview table + "Overwrite existing?" checkbox
3. Results summary

**Step 4: Add Import button to budget page**

In `src/pages/budget/index.astro`, add Import button next to Export button:

```html
<button
  type="button"
  class="btn btn-soft rounded-full px-5 h-12 text-sm font-bold transition-all active:scale-95"
  data-budget-import-btn
  aria-label="Import budgets from CSV"
>
  <Upload size="{16}" class="stroke-current" aria-hidden="true" />
  Import
</button>
```

Include `<BudgetImportModal>` in the page.

**Step 5: Verify**

Export a budget CSV, modify amounts, import it back with "overwrite" checked. Budgets should update.

**Step 6: Commit**

```bash
git add src/services/budget.service.ts src/pages/api/budget/import.ts src/components/organisms/BudgetImportModal.astro src/pages/budget/index.astro
git commit -m "feat(budget): add CSV import with overwrite option"
```

---

## Task 14: MCP Setup Instructions Dialog

Add help dialog explaining how to configure MCP with the access token.

**Files:**

- Create: `src/components/organisms/MCPSetupInstructionsModal.astro`
- Modify: `src/components/molecules/SecurityApiKeysCard.astro` — add info button

**Step 1: Create MCPSetupInstructionsModal**

Create `src/components/organisms/MCPSetupInstructionsModal.astro`:

Reference `docs/architecture/2026-02-04-mcp-server-design.md` for accurate instructions. The modal should contain:

1. Brief MCP explanation
2. Configuration example for Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "allowealth": {
      "command": "npx",
      "args": ["allowealth-mcp"],
      "env": {
        "ALLOWEALTH_API_KEY": "<your-token-here>"
      }
    }
  }
}
```

3. A "Copy Config" button
4. Link to full documentation

Use the Modal component pattern with `<dialog>`.

**Step 2: Add info button to SecurityApiKeysCard**

In `src/components/molecules/SecurityApiKeysCard.astro`, add next to the section title:

```html
<div class="flex items-center gap-2">
  <h3 class="text-lg font-bold">MCP Access Tokens</h3>
  <button
    type="button"
    class="btn btn-ghost btn-xs btn-circle"
    aria-label="MCP setup instructions"
    data-open-mcp-instructions
  >
    <HelpCircle size="{16}" class="stroke-current" aria-hidden="true" />
  </button>
</div>
```

**Step 3: Wire button to modal**

Add click handler that opens the MCP instructions dialog.

**Step 4: Include modal in security page**

In `src/pages/security.astro`, import and include `<MCPSetupInstructionsModal>`.

**Step 5: Verify**

Open Security page, click the help icon next to "MCP Access Tokens". Dialog should open with setup instructions. "Copy Config" button should work.

**Step 6: Commit**

```bash
git add src/components/organisms/MCPSetupInstructionsModal.astro src/components/molecules/SecurityApiKeysCard.astro src/pages/security.astro
git commit -m "feat(security): add MCP setup instructions dialog"
```

---

## Quality Gates (Run Before Final Commit)

After all tasks are complete, run quality gates:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

All must pass before pushing.

---

## Task Summary

| #   | Task                              | Scope   | Complexity |
| --- | --------------------------------- | ------- | ---------- |
| 1   | Fix profile save bug              | Bug fix | Small      |
| 2   | Wire transaction import button    | Bug fix | Tiny       |
| 3   | Fix copy button + toast z-index   | Bug fix | Small      |
| 4   | Remove Cash from defaults         | Config  | Tiny       |
| 5   | Rename API Key → MCP Access Token | Rename  | Small      |
| 6   | Inline modal errors pattern       | UX      | Medium     |
| 7   | Asset history API limit param     | API     | Small      |
| 8   | Inline expandable asset history   | Feature | Medium     |
| 9   | Budget category dropdown filter   | Feature | Small      |
| 10  | Asset transfer modal              | Feature | Large      |
| 11  | Budget export button              | Feature | Small      |
| 12  | Budget table view mode            | Feature | Medium     |
| 13  | Budget CSV import                 | Feature | Large      |
| 14  | MCP setup instructions dialog     | Feature | Medium     |
