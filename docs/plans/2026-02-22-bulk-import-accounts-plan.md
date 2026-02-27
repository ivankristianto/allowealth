# Bulk Account Import & Account Ownership Transfer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Bulk Add" modal to the accounts page for creating multiple accounts via plain text input, and add a "Transfer Ownership" section to the account detail page for admin users.

**Architecture:** Both features are UI-only — no new API endpoints or services. Bulk import reuses `POST /api/accounts` per account (same pattern as budget category bulk-add). Transfer ownership reuses `PATCH /api/accounts/:id/transfer-owner`. All server-side data is already available.

**Tech Stack:** Astro components (server-rendered), DaisyUI v5 modals, client-side TypeScript, CSRF fetch, Nano Stores toasts.

**Design doc:** `docs/plans/2026-02-22-bulk-import-accounts-design.md`

---

### Task 1: Add "Bulk Add" button to AccountActions component

**Files:**
- Modify: `src/components/organisms/AccountActions.astro`

**Context:**
- The `AccountActions` component renders the action bar on the accounts page.
- It already has buttons for All/Mine/Categories/Transfer/Closed/New Account.
- The "Bulk Add" button should appear before the "New Account" primary action button.
- It should be hidden in historical views (same as Transfer button).
- Pattern: follows the existing ghost button style used by Transfer button.

**Step 1: Add the ListPlus import and Bulk Add button**

In `src/components/organisms/AccountActions.astro`, add the `ListPlus` icon import:

```astro
import { Plus, Settings, ArrowRightLeft, Archive, Users, User, ListPlus } from '@lucide/astro';
```

Add the Bulk Add button in the template, right before the `{/* View Closed Accounts */}` comment block (after the Transfer block, around line 109):

```astro
  {/* Bulk Add */}
  {
    !isHistoricalView && (
      <div class="tooltip tooltip-bottom" data-tip="Bulk add accounts">
        <button
          type="button"
          class={ghostBtn}
          aria-label="Bulk add accounts"
          data-bulk-add-accounts-btn
          data-testid="bulk-add-accounts-btn"
        >
          <ListPlus size={16} class="stroke-current md:hidden" aria-hidden="true" />
          <ListPlus size={18} class="stroke-current hidden md:block" aria-hidden="true" />
          <span class="text-xs md:text-sm">Bulk</span>
        </button>
      </div>
    )
  }
```

**Step 2: Add client-side handler to open modal**

In the `<script>` section of `AccountActions.astro`, add a handler for the bulk add button. Add this function after the existing `initAddAccountButton()`:

```typescript
function initBulkAddButton() {
  document.querySelectorAll<HTMLElement>('[data-bulk-add-accounts-btn]').forEach((button) => {
    if (handlerMap.has(button)) return;

    const handler = () => {
      const modal = document.getElementById('bulk-add-accounts-modal') as HTMLDialogElement;
      if (modal) modal.showModal();
    };

    handlerMap.set(button, handler);
    button.addEventListener('click', handler);
  });
}
```

Call `initBulkAddButton()` alongside the existing init calls at the bottom of the script:
- Add it after `initTransferButton();` (line 224)
- Also add it inside the `astro:page-load` handler (line 228)

**Step 3: Run quality gates**

Run: `bun run typecheck`
Expected: PASS (no new types, just HTML + icon import)

**Step 4: Commit**

```bash
git add src/components/organisms/AccountActions.astro
git commit -m "feat(accounts): add bulk add button to account actions bar"
```

---

### Task 2: Add Bulk Add Accounts modal HTML to accounts index page

**Files:**
- Modify: `src/pages/accounts/index.astro`

**Context:**
- Pattern: Matches `src/pages/budget/categories/index.astro` lines 291-361 (bulk-add-modal).
- Modal is a DaisyUI `<dialog>` with textarea, preview area, error display, and action buttons.
- The `workspaceCurrencies` array is already available in the frontmatter (line 153-159).
- The `VALID_ACCOUNT_TYPES` array is already defined (line 47-58).
- Place the modal after the existing modals section (after `AccountUpdateValueModal` at line 460).

**Step 1: Add ListPlus icon import**

In the frontmatter imports of `src/pages/accounts/index.astro`, add `ListPlus` to the lucide import:

```typescript
import { CalendarDays, Info, Search, ListPlus } from '@lucide/astro';
```

**Step 2: Add data attributes for workspace currencies**

We need to pass workspace currencies to client-side code. Add a hidden element after the `data-testid="accounts-page"` div opening (right after line 294), inside the div:

No — better approach: embed the valid currencies and types as data attributes on the modal itself so the client script can read them.

**Step 3: Add bulk add modal HTML**

Add this after the `AccountUpdateValueModal` (after line 460, before `</ProtectedLayout>`):

```astro
  {/* Bulk Add Accounts Modal */}
  <dialog id="bulk-add-accounts-modal" class="modal" data-testid="bulk-add-accounts-modal">
    <div class="modal-box max-w-lg rounded-card border border-base-300 shadow-xl p-0">
      <div class="p-6 flex flex-col gap-6">
        {/* Header */}
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-accent/10">
            <ListPlus size={24} class="stroke-current text-accent" aria-hidden="true" />
          </div>
          <div class="flex-1">
            <h2 class="text-2xl font-bold tracking-tight text-primary leading-none">
              Bulk Add Accounts
            </h2>
            <p class="text-neutral text-sm mt-2 font-medium">
              One account per line: <code class="text-xs">Name, Type, Currency, Balance</code>
            </p>
          </div>
        </div>

        {/* Textarea */}
        <div class="form-control">
          <label class="label py-1" for="bulk-accounts-input">
            <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">
              Account Lines
            </span>
          </label>
          <textarea
            id="bulk-accounts-input"
            class="textarea textarea-bordered w-full h-40 text-sm bg-base-200 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2 rounded-xl font-mono"
            placeholder={'My Savings, bank_account, IDR, 5000000\nBCA Checking, bank_account, IDR\nGoPay, e_wallet, IDR, 250000\nCash USD, cash, USD, 100'}
            data-testid="bulk-accounts-textarea"
            data-valid-types={VALID_ACCOUNT_TYPES.join(',')}
            data-valid-currencies={orderedWorkspaceCurrencies.join(',')}
          ></textarea>
          <span class="text-base-content/40 text-xs mt-1">
            Type must be one of: {VALID_ACCOUNT_TYPES.join(', ')}. Balance is optional (defaults to 0).
          </span>
        </div>

        {/* Preview area */}
        <div id="bulk-accounts-preview" class="hidden">
          <p class="text-xs uppercase tracking-widest text-base-content/50 font-medium mb-2">
            Preview (<span data-bulk-accounts-count>0</span> accounts)
          </p>
          <div class="overflow-x-auto">
            <table class="table table-xs w-full">
              <thead>
                <tr class="text-base-content/50">
                  <th>Name</th>
                  <th>Type</th>
                  <th>Currency</th>
                  <th class="text-right">Balance</th>
                </tr>
              </thead>
              <tbody data-bulk-accounts-preview-body></tbody>
            </table>
          </div>
        </div>

        {/* Error */}
        <div id="bulk-accounts-error" class="hidden alert alert-error text-sm rounded-xl" role="alert"></div>

        {/* Actions */}
        <div class="flex gap-4 pt-2">
          <button
            type="button"
            class="flex-1 btn btn-ghost h-14 rounded-2xl font-bold"
            data-bulk-accounts-cancel
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-[2] btn btn-accent h-14 rounded-2xl font-bold"
            data-bulk-accounts-submit
            data-testid="bulk-accounts-submit-btn"
          >
            <span data-bulk-accounts-submit-text>Create Accounts</span>
          </button>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
```

**Step 4: Run quality gates**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/accounts/index.astro
git commit -m "feat(accounts): add bulk add accounts modal HTML"
```

---

### Task 3: Add bulk add accounts client logic

**Files:**
- Create: `src/pages/accounts/bulk-add-accounts.client.ts`
- Modify: `src/pages/accounts/index.astro` (add script import)

**Context:**
- Pattern: Follows `src/pages/budget/categories/categories-client.ts` lines 176-309.
- Parses textarea input, validates per line, shows preview, submits to `POST /api/accounts`.
- Uses `csrfFetch` for CSRF protection (cleaner than `getCsrfHeaders`).
- Uses `addToast` for notifications.
- Uses `navigate` from `astro:transitions/client` for page refresh.

**Step 1: Create the client script file**

Create `src/pages/accounts/bulk-add-accounts.client.ts`:

```typescript
/**
 * Bulk Add Accounts Client Script
 *
 * Handles the bulk add accounts modal:
 * - Parses textarea input (Name, Type, Currency[, Balance] per line)
 * - Validates each line and shows preview table
 * - Submits to POST /api/accounts sequentially
 * - Shows success/error feedback
 *
 * Pattern: matches budget/categories/categories-client.ts bulk add logic
 */

import { csrfFetch } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
import { navigate } from 'astro:transitions/client';

const VALID_ACCOUNT_TYPES = [
  'cash',
  'bank_account',
  'e_wallet',
  'mutual_fund',
  'bond',
  'crypto',
  'stock',
  'other',
  'credit_card',
  'loan',
] as const;

type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

interface ParsedAccount {
  name: string;
  type: AccountType;
  currency: string;
  balance: string;
}

interface ParsedLine {
  account: ParsedAccount | null;
  error: string | null;
  lineNumber: number;
}

function parseLine(line: string, lineNumber: number, validCurrencies: string[]): ParsedLine {
  const parts = line.split(',').map((p) => p.trim());

  if (parts.length < 3) {
    return {
      account: null,
      error: `Line ${lineNumber}: Expected at least 3 fields (Name, Type, Currency)`,
      lineNumber,
    };
  }

  const [name, rawType, rawCurrency, rawBalance] = parts;

  // Validate name
  if (!name || name.length < 2) {
    return {
      account: null,
      error: `Line ${lineNumber}: Name must be at least 2 characters`,
      lineNumber,
    };
  }

  // Validate type
  const type = rawType?.toLowerCase() as AccountType;
  if (!VALID_ACCOUNT_TYPES.includes(type)) {
    return {
      account: null,
      error: `Line ${lineNumber}: Invalid type "${rawType}". Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`,
      lineNumber,
    };
  }

  // Validate currency
  const currency = rawCurrency?.toUpperCase();
  if (!currency || !validCurrencies.includes(currency)) {
    return {
      account: null,
      error: `Line ${lineNumber}: Invalid currency "${rawCurrency}". Must be one of: ${validCurrencies.join(', ')}`,
      lineNumber,
    };
  }

  // Validate balance (optional)
  let balance = '0';
  if (rawBalance !== undefined && rawBalance !== '') {
    const num = Number(rawBalance);
    if (isNaN(num) || num < 0) {
      return {
        account: null,
        error: `Line ${lineNumber}: Invalid balance "${rawBalance}". Must be a non-negative number`,
        lineNumber,
      };
    }
    // Format to max 2 decimal places, matching API regex: ^\d+(\.\d{1,2})?$
    balance = num % 1 === 0 ? String(num) : num.toFixed(2);
  }

  return {
    account: { name, type, currency, balance },
    error: null,
    lineNumber,
  };
}

function parseTextarea(text: string, validCurrencies: string[]): ParsedLine[] {
  return text
    .split('\n')
    .map((line, i) => ({ line: line.trim(), lineNumber: i + 1 }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => parseLine(line, lineNumber, validCurrencies));
}

let initialized = false;

export function initBulkAddAccounts() {
  const modal = document.getElementById('bulk-add-accounts-modal') as HTMLDialogElement;
  const textarea = document.getElementById('bulk-accounts-input') as HTMLTextAreaElement;
  const previewContainer = document.getElementById('bulk-accounts-preview');
  const previewBody = document.querySelector('[data-bulk-accounts-preview-body]');
  const countEl = document.querySelector('[data-bulk-accounts-count]');
  const errorDiv = document.getElementById('bulk-accounts-error');
  const submitBtn = document.querySelector('[data-bulk-accounts-submit]') as HTMLButtonElement;
  const submitText = document.querySelector('[data-bulk-accounts-submit-text]');
  const cancelBtn = document.querySelector('[data-bulk-accounts-cancel]');

  if (!modal || !textarea || initialized) return;
  initialized = true;

  // Read valid currencies from data attribute
  const validCurrencies = (textarea.dataset.validCurrencies || '').split(',').filter(Boolean);

  // Update preview on input
  textarea.addEventListener('input', () => {
    const parsed = parseTextarea(textarea.value, validCurrencies);
    const validAccounts = parsed.filter((p) => p.account !== null);
    const errors = parsed.filter((p) => p.error !== null);

    if (parsed.length > 0 && previewContainer && previewBody && countEl) {
      previewContainer.classList.remove('hidden');
      countEl.textContent = String(validAccounts.length);

      // Build preview rows
      previewBody.innerHTML = '';
      for (const p of parsed) {
        const tr = document.createElement('tr');
        if (p.account) {
          tr.innerHTML = `
            <td class="font-medium">${escapeHtml(p.account.name)}</td>
            <td><span class="badge badge-xs badge-ghost">${escapeHtml(p.account.type)}</span></td>
            <td><span class="badge badge-xs badge-outline">${escapeHtml(p.account.currency)}</span></td>
            <td class="text-right tabular-nums">${escapeHtml(p.account.balance)}</td>
          `;
        } else {
          tr.innerHTML = `<td colspan="4" class="text-error text-xs">${escapeHtml(p.error || '')}</td>`;
        }
        previewBody.appendChild(tr);
      }

      // Update submit button text
      if (submitText) {
        submitText.textContent =
          validAccounts.length > 0
            ? `Create ${validAccounts.length} Account${validAccounts.length !== 1 ? 's' : ''}`
            : 'Create Accounts';
      }

      // Disable submit if there are errors and no valid accounts
      if (submitBtn) {
        submitBtn.disabled = validAccounts.length === 0;
      }
    } else if (previewContainer) {
      previewContainer.classList.add('hidden');
      if (submitText) submitText.textContent = 'Create Accounts';
      if (submitBtn) submitBtn.disabled = false;
    }

    // Clear error display
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
    }
  });

  // Cancel
  cancelBtn?.addEventListener('click', () => {
    modal.close();
  });

  // Submit
  submitBtn?.addEventListener('click', async () => {
    const parsed = parseTextarea(textarea.value, validCurrencies);
    const validAccounts = parsed.filter((p) => p.account !== null).map((p) => p.account!);
    const parseErrors = parsed.filter((p) => p.error !== null);

    if (validAccounts.length === 0) {
      if (errorDiv) {
        errorDiv.textContent =
          parseErrors.length > 0
            ? parseErrors.map((e) => e.error).join('\n')
            : 'Please enter at least one valid account line.';
        errorDiv.classList.remove('hidden');
      }
      return;
    }

    // Clear errors
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
    }

    submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Creating...';

    let successCount = 0;
    const errors: string[] = [];

    for (const account of validAccounts) {
      try {
        const response = await csrfFetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: account.name,
            type: account.type,
            currency: account.currency,
            balance: account.balance,
          }),
        });

        const result = await response.json();
        if (response.ok && (result.success || result.data)) {
          successCount++;
        } else {
          const msg = result.error?.message || result.error || `Failed to create "${account.name}"`;
          errors.push(`"${account.name}": ${msg}`);
        }
      } catch {
        errors.push(`"${account.name}": Network error`);
      }
    }

    submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Create Accounts';

    if (errors.length === 0 && successCount > 0) {
      addToast(`${successCount} account${successCount !== 1 ? 's' : ''} created successfully!`, 'success');
      modal.close();
      textarea.value = '';
      if (previewContainer) previewContainer.classList.add('hidden');
      const urlParams = new URL(window.location.href);
      navigate(urlParams.pathname + urlParams.search);
    } else if (errors.length > 0) {
      if (successCount > 0) {
        addToast(`${successCount} created, ${errors.length} failed`, 'warning');
      }
      if (errorDiv) {
        errorDiv.textContent = errors.join('\n');
        errorDiv.style.whiteSpace = 'pre-line';
        errorDiv.classList.remove('hidden');
      }
    }
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Step 2: Import and call from the accounts page**

In `src/pages/accounts/index.astro`, add the import inside the existing `<script>` tag (after the existing imports at line 464-466):

```typescript
import { initBulkAddAccounts } from './bulk-add-accounts.client';
```

Then add `initBulkAddAccounts();` inside the `init()` function (around line 569, after `initAccountPeriodSelector()`):

```typescript
function init() {
  initInlineHistory();
  initAccountSearch();
  initFirstAccountButton();
  openOnboardingAccountModal();
  initAccountPeriodSelector();
  initBulkAddAccounts();
}
```

**Step 3: Run quality gates**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/accounts/bulk-add-accounts.client.ts src/pages/accounts/index.astro
git commit -m "feat(accounts): add bulk add accounts client logic with parse, validate, preview"
```

---

### Task 4: Manual browser test — Bulk Add Accounts

**Context:**
- Start the dev server if not running: `bun run dev`
- Check which port is in use: `lsof -i -P | grep LISTEN | grep 432`
- Navigate to the accounts page in Chrome

**Step 1: Verify button appears**

- Navigate to `/accounts`
- Confirm "Bulk" button appears in the action bar (between Transfer and Closed/New Account)
- Confirm it's hidden when viewing historical months

**Step 2: Test the modal**

- Click "Bulk" button
- Confirm modal opens with textarea and placeholder text
- Type valid input:
  ```
  Test Savings, bank_account, IDR, 1000000
  Test Wallet, e_wallet, IDR
  ```
- Confirm preview table shows 2 accounts with correct values
- Confirm submit button says "Create 2 Accounts"

**Step 3: Test validation**

- Type invalid input:
  ```
  Short, bank_account, IDR
  Good Name, invalid_type, IDR
  Good Name, bank_account, FAKE
  ```
- Confirm error messages appear in preview for invalid lines

**Step 4: Test submission**

- Enter 2-3 valid accounts and click submit
- Confirm accounts appear in the list after page refresh
- Confirm toast shows success message

**Step 5: Clean up test data**

- Delete the test accounts created during testing

---

### Task 5: Add Transfer Ownership section to account detail page

**Files:**
- Modify: `src/pages/accounts/[id].astro`

**Context:**
- Add a "Transfer Ownership" section at the bottom of the account detail page.
- Only visible when `user.role === 'admin'`.
- The account detail page already has the `user` object (line 32).
- Needs to fetch workspace members via `workspaceService.getMembers()`.
- The existing `PATCH /api/accounts/:id/transfer-owner` API expects `{ owner_user_id: string }`.

**Step 1: Add imports and data fetching in frontmatter**

In `src/pages/accounts/[id].astro`, add the workspace service import. Modify the existing import line (line 11):

```typescript
import { accountService, transactionService, workspaceService } from '@/services';
```

Add the `UserRoundCog` icon import to the lucide import line:

```typescript
import {
  ArrowLeft,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Info,
  CalendarClock,
  UserRoundCog,
} from '@lucide/astro';
```

After the existing `const user = Astro.locals.user!;` (line 32), add:

```typescript
const isAdmin = user.role === 'admin';
```

After the account fetch (after line 43), add workspace members fetch:

```typescript
// Fetch workspace members for ownership transfer (admin only)
const workspaceMembers = isAdmin ? await workspaceService.getMembers(user.workspaceId) : [];
```

**Step 2: Add Transfer Ownership HTML section**

Add this after the tabbed history section closing `</div>` (after line 452), before the closing `</div>` of the `max-w-4xl` container:

```astro
    {/* Transfer Ownership - Admin only */}
    {
      isAdmin && workspaceMembers.length > 1 && (
        <div
          class="rounded-card border border-base-300 bg-base-100 p-6 shadow-sm"
          data-transfer-ownership-section
        >
          <div class="flex items-center gap-3 mb-4">
            <UserRoundCog size={20} class="stroke-current text-base-content/60" aria-hidden="true" />
            <h3 class="text-sm font-bold uppercase tracking-wider text-base-content/60">
              Transfer Ownership
            </h3>
          </div>

          <div class="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div class="form-control w-full sm:flex-1">
              <label class="label py-1" for="transfer-owner-select">
                <span class="text-xs text-base-content/50">
                  Current owner: <strong>{workspaceMembers.find((m) => m.id === account.created_by_user_id)?.name || 'Unknown'}</strong>
                </span>
              </label>
              <select
                id="transfer-owner-select"
                class="select select-bordered w-full rounded-xl text-sm"
                data-transfer-owner-select
                data-account-id={account.id}
                data-current-owner={account.created_by_user_id}
              >
                {workspaceMembers.map((member) => (
                  <option
                    value={member.id}
                    selected={member.id === account.created_by_user_id}
                  >
                    {member.name}{member.id === account.created_by_user_id ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              class="btn btn-outline btn-sm h-12 rounded-xl px-6 font-bold"
              data-transfer-owner-btn
              disabled
            >
              Transfer
            </button>
          </div>

          {/* Confirmation area (hidden by default) */}
          <div data-transfer-confirm class="hidden mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <p class="text-sm text-warning font-medium mb-3">
              Are you sure you want to transfer ownership of this account?
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="btn btn-warning btn-sm rounded-xl font-bold"
                data-transfer-confirm-btn
              >
                Yes, Transfer
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm rounded-xl"
                data-transfer-cancel-btn
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )
    }
```

**Step 3: Add client-side handler**

In the `<script>` section of `[id].astro`, add this function before the `initDetail()` function:

```typescript
function initTransferOwnership() {
  const select = document.querySelector<HTMLSelectElement>('[data-transfer-owner-select]');
  const transferBtn = document.querySelector<HTMLButtonElement>('[data-transfer-owner-btn]');
  const confirmArea = document.querySelector<HTMLElement>('[data-transfer-confirm]');
  const confirmBtn = document.querySelector<HTMLButtonElement>('[data-transfer-confirm-btn]');
  const cancelBtn = document.querySelector<HTMLButtonElement>('[data-transfer-cancel-btn]');

  if (!select || !transferBtn) return;

  const currentOwner = select.dataset.currentOwner || '';
  const accountId = select.dataset.accountId || '';

  // Enable/disable transfer button based on selection
  select.addEventListener('change', () => {
    transferBtn.disabled = select.value === currentOwner;
    if (confirmArea) confirmArea.classList.add('hidden');
  });

  // Show confirmation
  transferBtn.addEventListener('click', () => {
    if (confirmArea) confirmArea.classList.remove('hidden');
  });

  // Cancel confirmation
  cancelBtn?.addEventListener('click', () => {
    if (confirmArea) confirmArea.classList.add('hidden');
  });

  // Confirm transfer
  confirmBtn?.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Transferring...';

    try {
      const { csrfFetch } = await import('@/lib/csrf-client');
      const response = await csrfFetch(`/api/accounts/${accountId}/transfer-owner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_user_id: select.value }),
      });

      const result = await response.json();

      if (response.ok) {
        const { addToast } = await import('@/lib/stores/toastStore');
        addToast('Ownership transferred successfully!', 'success');
        window.location.reload();
      } else {
        const { addToast } = await import('@/lib/stores/toastStore');
        addToast(result.error?.message || result.error || 'Failed to transfer ownership', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Yes, Transfer';
      }
    } catch {
      const { addToast } = await import('@/lib/stores/toastStore');
      addToast('Network error. Please try again.', 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Yes, Transfer';
    }
  });
}
```

Add `initTransferOwnership();` to the `initDetail()` function:

```typescript
function initDetail() {
  initDetailPeriodSelector();
  initDetailUpdateValueButtons();
  initAccountTabs();
  initTransferOwnership();
}
```

**Step 4: Run quality gates**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/accounts/\[id\].astro
git commit -m "feat(accounts): add transfer ownership UI to account detail page (admin-only)"
```

---

### Task 6: Manual browser test — Transfer Ownership

**Step 1: Test visibility**

- Navigate to `/accounts/[id]` as an admin user
- Confirm "Transfer Ownership" section appears at the bottom
- Navigate as a non-admin member
- Confirm section does NOT appear

**Step 2: Test the dropdown**

- As admin, open an account detail page
- Confirm dropdown shows all workspace members
- Confirm current owner is pre-selected with "(current)" label
- Confirm "Transfer" button is disabled when current owner is selected
- Select a different member — confirm button enables

**Step 3: Test the transfer flow**

- Select a different member
- Click "Transfer"
- Confirm warning confirmation appears
- Click "Cancel" — confirm warning hides
- Click "Transfer" again, then "Yes, Transfer"
- Confirm success toast appears
- Confirm page reloads with updated owner

---

### Task 7: Run full quality gates and final commit

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Fix any issues found**

Address any lint, style, or type errors.

**Step 3: Verify build**

```bash
bun run build
```

Expected: Build succeeds with no errors.

**Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore: fix lint/format issues from bulk import and transfer features"
```
