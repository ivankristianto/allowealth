# Bulk Add Accounts — Tabular Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the textarea CSV bulk-add modal with an editable table where users add rows dynamically with dropdowns for type/currency.

**Architecture:** The modal HTML in `index.astro` replaces the textarea + preview with a `<table>` containing input rows. The client script (`bulk-add-accounts.client.ts`) is rewritten to manage dynamic rows (add/remove) and per-field validation on submit. The test file is rewritten to test the new `validateRow()` function.

**Tech Stack:** Astro SSR, DaisyUI 5, Tailwind CSS v4, TypeScript client scripts, `bun:test`

**Design doc:** `docs/plans/2026-02-25-bulk-add-accounts-tabular-redesign-design.md`

---

### Task 1: Rewrite client script — types and validation

**Files:**

- Rewrite: `src/pages/accounts/bulk-add-accounts.client.ts`

Remove all old code (`parseLine`, `parseTextarea`, `ParsedLine`, `ParsedAccount`, `escapeHtml`). Write new types and pure validation function.

**Step 1: Replace the entire file with new types and validateRow**

```typescript
/**
 * Bulk Add Accounts Client Script (Tabular)
 *
 * Manages the tabular bulk-add modal:
 * - Dynamic row add/remove
 * - Per-field validation on submit
 * - Sequential POST /api/accounts submission
 */

import { csrfFetch } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';

export const VALID_ACCOUNT_TYPES = [
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

export type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

export interface RowData {
  name: string;
  type: string;
  currency: string;
  balance: string;
}

export interface RowErrors {
  name?: string;
  type?: string;
  currency?: string;
  balance?: string;
}

export function validateRow(row: RowData, validCurrencies: string[]): RowErrors {
  const errors: RowErrors = {};

  // Name: required, min 2 chars
  const name = row.name.trim();
  if (!name || name.length < 2) {
    errors.name = 'Min 2 characters';
  }

  // Type: must be valid
  if (!VALID_ACCOUNT_TYPES.includes(row.type as AccountType)) {
    errors.type = 'Select a type';
  }

  // Currency: must be valid
  if (!row.currency || !validCurrencies.includes(row.currency)) {
    errors.currency = 'Select a currency';
  }

  // Balance: optional, non-negative number
  const balanceStr = row.balance.trim();
  if (balanceStr !== '' && balanceStr !== '0') {
    const num = Number(balanceStr);
    if (isNaN(num) || !isFinite(num) || num < 0) {
      errors.balance = 'Must be ≥ 0';
    }
  }

  return errors;
}

// initBulkAddAccounts will be added in Task 3
export function initBulkAddAccounts() {
  // stub — replaced in Task 3
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (0 errors)

**Step 3: Commit**

```bash
git add src/pages/accounts/bulk-add-accounts.client.ts
git commit -m "refactor(accounts): rewrite bulk-add client with row-based types and validation"
```

---

### Task 2: Rewrite tests for validateRow

**Files:**

- Rewrite: `src/pages/accounts/bulk-add-accounts.test.ts`

Replace all `parseLine`/`parseTextarea` tests with `validateRow` tests.

**Step 1: Replace the test file**

```typescript
/**
 * Bulk Add Accounts - Row Validation Tests
 *
 * Tests for validateRow() which validates a single table row
 * in the tabular bulk-add accounts modal.
 */

import { describe, it, expect } from 'bun:test';
import { validateRow, VALID_ACCOUNT_TYPES } from './bulk-add-accounts.client';

const VALID_CURRENCIES = ['IDR', 'USD'];

describe('validateRow', () => {
  const validRow = { name: 'My Savings', type: 'bank_account', currency: 'IDR', balance: '0' };

  it('returns no errors for a valid row', () => {
    const errors = validateRow(validRow, VALID_CURRENCIES);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns no errors when balance is empty (defaults to 0)', () => {
    const errors = validateRow({ ...validRow, balance: '' }, VALID_CURRENCIES);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns no errors for valid balance with decimals', () => {
    const errors = validateRow({ ...validRow, balance: '100.50' }, VALID_CURRENCIES);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  // Name validation
  it('returns error when name is empty', () => {
    const errors = validateRow({ ...validRow, name: '' }, VALID_CURRENCIES);
    expect(errors.name).toBeDefined();
  });

  it('returns error when name is 1 character', () => {
    const errors = validateRow({ ...validRow, name: 'A' }, VALID_CURRENCIES);
    expect(errors.name).toBeDefined();
  });

  it('accepts name with exactly 2 characters', () => {
    const errors = validateRow({ ...validRow, name: 'AB' }, VALID_CURRENCIES);
    expect(errors.name).toBeUndefined();
  });

  it('trims name before validation', () => {
    const errors = validateRow({ ...validRow, name: '  AB  ' }, VALID_CURRENCIES);
    expect(errors.name).toBeUndefined();
  });

  it('rejects name that is whitespace only', () => {
    const errors = validateRow({ ...validRow, name: '   ' }, VALID_CURRENCIES);
    expect(errors.name).toBeDefined();
  });

  // Type validation
  it('returns error when type is empty', () => {
    const errors = validateRow({ ...validRow, type: '' }, VALID_CURRENCIES);
    expect(errors.type).toBeDefined();
  });

  it('returns error for invalid type', () => {
    const errors = validateRow({ ...validRow, type: 'savings' }, VALID_CURRENCIES);
    expect(errors.type).toBeDefined();
  });

  for (const type of VALID_ACCOUNT_TYPES) {
    it(`accepts valid account type: ${type}`, () => {
      const errors = validateRow({ ...validRow, type }, VALID_CURRENCIES);
      expect(errors.type).toBeUndefined();
    });
  }

  // Currency validation
  it('returns error when currency is empty', () => {
    const errors = validateRow({ ...validRow, currency: '' }, VALID_CURRENCIES);
    expect(errors.currency).toBeDefined();
  });

  it('returns error for invalid currency', () => {
    const errors = validateRow({ ...validRow, currency: 'EUR' }, VALID_CURRENCIES);
    expect(errors.currency).toBeDefined();
  });

  it('accepts valid currency', () => {
    const errors = validateRow({ ...validRow, currency: 'USD' }, VALID_CURRENCIES);
    expect(errors.currency).toBeUndefined();
  });

  // Balance validation
  it('returns error for negative balance', () => {
    const errors = validateRow({ ...validRow, balance: '-100' }, VALID_CURRENCIES);
    expect(errors.balance).toBeDefined();
  });

  it('returns error for non-numeric balance', () => {
    const errors = validateRow({ ...validRow, balance: 'abc' }, VALID_CURRENCIES);
    expect(errors.balance).toBeDefined();
  });

  it('returns error for infinite balance', () => {
    const errors = validateRow({ ...validRow, balance: '1e309' }, VALID_CURRENCIES);
    expect(errors.balance).toBeDefined();
  });

  it('accepts zero balance', () => {
    const errors = validateRow({ ...validRow, balance: '0' }, VALID_CURRENCIES);
    expect(errors.balance).toBeUndefined();
  });

  // Multiple errors
  it('returns multiple errors for multiple invalid fields', () => {
    const errors = validateRow(
      { name: '', type: 'invalid', currency: 'EUR', balance: '-5' },
      VALID_CURRENCIES
    );
    expect(errors.name).toBeDefined();
    expect(errors.type).toBeDefined();
    expect(errors.currency).toBeDefined();
    expect(errors.balance).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/pages/accounts/bulk-add-accounts.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/pages/accounts/bulk-add-accounts.test.ts
git commit -m "test(accounts): rewrite bulk-add tests for row-based validation"
```

---

### Task 3: Rewrite client script — initBulkAddAccounts

**Files:**

- Modify: `src/pages/accounts/bulk-add-accounts.client.ts`

Replace the stub `initBulkAddAccounts()` with the full implementation. This function:

1. Queries the modal DOM elements (table body, add-row button, submit, cancel)
2. Reads `data-valid-currencies` and `data-account-types` from the table
3. Manages rows: add row, remove row, update submit button text
4. On submit: validates all rows, highlights errors, submits valid rows via `POST /api/accounts`

**Step 1: Replace the stub initBulkAddAccounts with full implementation**

```typescript
export function initBulkAddAccounts() {
  const modal = document.getElementById('bulk-add-accounts-modal') as HTMLDialogElement;
  const tbody = document.querySelector('[data-bulk-rows]') as HTMLTableSectionElement;
  const addRowBtn = document.querySelector('[data-bulk-add-row]') as HTMLButtonElement;
  const submitBtn = document.querySelector('[data-bulk-accounts-submit]') as HTMLButtonElement;
  const submitText = document.querySelector('[data-bulk-accounts-submit-text]');
  const cancelBtn = document.querySelector('[data-bulk-accounts-cancel]');
  const errorDiv = document.getElementById('bulk-accounts-error');

  if (!modal || !tbody) return;
  if (modal.dataset.initialized) return;
  modal.dataset.initialized = 'true';

  const validCurrencies = (tbody.dataset.validCurrencies || '').split(',').filter(Boolean);
  // Account types JSON is embedded as data attribute on the tbody
  const accountTypesJson = tbody.dataset.accountTypes || '[]';
  const accountTypes: { value: string; label: string }[] = JSON.parse(accountTypesJson);

  let isSubmitting = false;
  let rowCounter = 0;

  function createRow(): HTMLTableRowElement {
    const id = ++rowCounter;
    const tr = document.createElement('tr');
    tr.dataset.rowId = String(id);

    // Name cell
    const tdName = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Account name';
    nameInput.className = 'input input-sm input-bordered w-full min-w-[140px]';
    nameInput.dataset.field = 'name';
    tdName.appendChild(nameInput);
    tr.appendChild(tdName);

    // Type cell
    const tdType = document.createElement('td');
    const typeSelect = document.createElement('select');
    typeSelect.className = 'select select-sm select-bordered w-full min-w-[130px]';
    typeSelect.dataset.field = 'type';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Select type';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    typeSelect.appendChild(defaultOpt);
    for (const t of accountTypes) {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = t.label;
      typeSelect.appendChild(opt);
    }
    tdType.appendChild(typeSelect);
    tr.appendChild(tdType);

    // Currency cell
    const tdCurrency = document.createElement('td');
    const currencySelect = document.createElement('select');
    currencySelect.className = 'select select-sm select-bordered w-full min-w-[80px]';
    currencySelect.dataset.field = 'currency';
    const defaultCurrOpt = document.createElement('option');
    defaultCurrOpt.value = '';
    defaultCurrOpt.textContent = '—';
    defaultCurrOpt.disabled = true;
    // Pre-select first currency if only one
    if (validCurrencies.length === 1) {
      defaultCurrOpt.selected = false;
    } else {
      defaultCurrOpt.selected = true;
    }
    currencySelect.appendChild(defaultCurrOpt);
    for (const c of validCurrencies) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (validCurrencies.length === 1) opt.selected = true;
      currencySelect.appendChild(opt);
    }
    tdCurrency.appendChild(currencySelect);
    tr.appendChild(tdCurrency);

    // Balance cell
    const tdBalance = document.createElement('td');
    const balanceInput = document.createElement('input');
    balanceInput.type = 'number';
    balanceInput.step = '0.01';
    balanceInput.min = '0';
    balanceInput.placeholder = '0';
    balanceInput.className =
      'input input-sm input-bordered w-full min-w-[100px] text-right tabular-nums';
    balanceInput.dataset.field = 'balance';
    tdBalance.appendChild(balanceInput);
    tr.appendChild(tdBalance);

    // Remove button cell
    const tdRemove = document.createElement('td');
    tdRemove.className = 'text-center';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-ghost btn-xs btn-square text-error';
    removeBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
    removeBtn.title = 'Remove row';
    removeBtn.dataset.action = 'remove-row';
    removeBtn.addEventListener('click', () => {
      tr.remove();
      updateState();
    });
    tdRemove.appendChild(removeBtn);
    tr.appendChild(tdRemove);

    // Clear errors on input
    nameInput.addEventListener('input', () => clearFieldError(nameInput));
    typeSelect.addEventListener('change', () => clearFieldError(typeSelect));
    currencySelect.addEventListener('change', () => clearFieldError(currencySelect));
    balanceInput.addEventListener('input', () => clearFieldError(balanceInput));

    return tr;
  }

  function clearFieldError(el: HTMLElement) {
    el.classList.remove('input-error', 'select-error');
    // Remove tooltip if present
    const parent = el.parentElement;
    const tooltip = parent?.querySelector('.text-error');
    if (tooltip) tooltip.remove();
  }

  function getRows(): HTMLTableRowElement[] {
    return Array.from(tbody.querySelectorAll('tr[data-row-id]'));
  }

  function getRowData(tr: HTMLTableRowElement): RowData {
    const name = (tr.querySelector('[data-field="name"]') as HTMLInputElement).value;
    const type = (tr.querySelector('[data-field="type"]') as HTMLSelectElement).value;
    const currency = (tr.querySelector('[data-field="currency"]') as HTMLSelectElement).value;
    const balance = (tr.querySelector('[data-field="balance"]') as HTMLInputElement).value;
    return { name, type, currency, balance };
  }

  function showFieldError(tr: HTMLTableRowElement, field: string, message: string) {
    const el = tr.querySelector(`[data-field="${field}"]`) as HTMLElement;
    if (!el) return;
    const errorClass = el.tagName === 'SELECT' ? 'select-error' : 'input-error';
    el.classList.add(errorClass);
    // Add tooltip text below
    const span = document.createElement('span');
    span.className = 'text-error text-xs';
    span.textContent = message;
    el.parentElement?.appendChild(span);
  }

  function updateState() {
    const rows = getRows();
    // Disable remove if only 1 row
    const removeBtns = tbody.querySelectorAll(
      '[data-action="remove-row"]'
    ) as NodeListOf<HTMLButtonElement>;
    for (const btn of removeBtns) {
      btn.disabled = rows.length <= 1;
    }
    // Update submit text
    if (submitText) {
      submitText.textContent =
        rows.length > 0
          ? `Create ${rows.length} Account${rows.length !== 1 ? 's' : ''}`
          : 'Create Accounts';
    }
  }

  function resetModal() {
    tbody.innerHTML = '';
    rowCounter = 0;
    tbody.appendChild(createRow());
    updateState();
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
    }
  }

  // Add Row
  addRowBtn?.addEventListener('click', () => {
    tbody.appendChild(createRow());
    updateState();
    // Focus the name input of the new row
    const rows = getRows();
    const lastRow = rows[rows.length - 1];
    (lastRow?.querySelector('[data-field="name"]') as HTMLInputElement)?.focus();
  });

  // Cancel
  cancelBtn?.addEventListener('click', () => {
    modal.close();
  });

  // Submit
  submitBtn?.addEventListener('click', async () => {
    if (isSubmitting) return;

    const rows = getRows();
    if (rows.length === 0) return;

    // Clear previous errors
    for (const tr of rows) {
      for (const el of tr.querySelectorAll('.input-error, .select-error')) {
        el.classList.remove('input-error', 'select-error');
      }
      for (const el of tr.querySelectorAll('td > .text-error')) {
        el.remove();
      }
    }
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
    }

    // Validate all rows
    let hasErrors = false;
    const validatedRows: { tr: HTMLTableRowElement; data: RowData; errors: RowErrors }[] = [];

    for (const tr of rows) {
      const data = getRowData(tr);
      const errors = validateRow(data, validCurrencies);
      validatedRows.push({ tr, data, errors });
      if (Object.keys(errors).length > 0) {
        hasErrors = true;
        for (const [field, message] of Object.entries(errors)) {
          showFieldError(tr, field, message!);
        }
      }
    }

    if (hasErrors) return;

    // Submit
    isSubmitting = true;
    submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Creating...';

    let successCount = 0;
    const apiErrors: string[] = [];

    for (const { data } of validatedRows) {
      const name = data.name.trim();
      const balance = data.balance.trim() || '0';
      // Format balance to max 2 decimal places
      const num = Number(balance);
      const formattedBalance = num % 1 === 0 ? String(num) : num.toFixed(2);

      try {
        const response = await csrfFetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            type: data.type,
            currency: data.currency,
            balance: formattedBalance,
          }),
        });

        const result = await response.json();
        if (response.ok && (result.success || result.data)) {
          successCount++;
        } else {
          const msg = result.error?.message || result.error || `Failed to create "${name}"`;
          apiErrors.push(`"${name}": ${msg}`);
        }
      } catch {
        apiErrors.push(`"${name}": Network error`);
      }
    }

    isSubmitting = false;
    submitBtn.disabled = false;
    updateState();

    if (apiErrors.length === 0 && successCount > 0) {
      addToast(
        `${successCount} account${successCount !== 1 ? 's' : ''} created successfully!`,
        'success'
      );
      modal.close();
      resetModal();
      const currentUrl = new URL(window.location.href);
      const { navigate } = await import('astro:transitions/client');
      navigate(currentUrl.pathname + currentUrl.search);
    } else if (apiErrors.length > 0) {
      if (successCount > 0) {
        addToast(`${successCount} created, ${apiErrors.length} failed`, 'warning');
      }
      if (errorDiv) {
        errorDiv.textContent = apiErrors.join('\n');
        errorDiv.style.whiteSpace = 'pre-line';
        errorDiv.classList.remove('hidden');
      }
    }
  });

  // Initialize with one empty row
  resetModal();

  // Reset when modal opens (in case it was previously used)
  modal.addEventListener('close', () => {
    if (!isSubmitting) resetModal();
  });
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (0 errors)

**Step 3: Run tests**

Run: `bun test src/pages/accounts/bulk-add-accounts.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/pages/accounts/bulk-add-accounts.client.ts
git commit -m "feat(accounts): implement tabular row management for bulk-add modal"
```

---

### Task 4: Replace modal HTML in index.astro

**Files:**

- Modify: `src/pages/accounts/index.astro` (lines 462–551)

Replace the textarea-based modal with the tabular version. Key changes:

- Remove `ListPlus` icon import (only if not used elsewhere — check first, it's used in AccountActions so the import stays)
- Widen modal to `max-w-2xl`
- Replace textarea + preview with a `<table>` with headers and an empty `<tbody data-bulk-rows>`
- Pass `data-valid-currencies` and `data-account-types` as JSON on the tbody
- Add "+ Add Row" button
- Keep error div and action buttons

**Step 1: Replace the modal HTML block (lines 462–551)**

Replace from `{/* Bulk Add Accounts Modal */}` through the closing `</dialog>` with:

```astro
{/* Bulk Add Accounts Modal */}
<dialog id="bulk-add-accounts-modal" class="modal" data-testid="bulk-add-accounts-modal">
  <div class="modal-box max-w-2xl rounded-card border border-base-300 shadow-xl p-0">
    <div class="p-6 flex flex-col gap-4">
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
            Add accounts row by row. Balance defaults to 0.
          </p>
        </div>
      </div>

      {/* Table */}
      <div class="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table class="table table-sm w-full">
          <thead>
            <tr class="text-base-content/50 text-xs">
              <th>Name</th>
              <th>Type</th>
              <th>Currency</th>
              <th class="text-right">Balance</th>
              <th class="w-10"></th>
            </tr>
          </thead>
          <tbody
            data-bulk-rows
            data-valid-currencies={orderedWorkspaceCurrencies.join(',')}
            data-account-types={JSON.stringify(
              VALID_ACCOUNT_TYPES.map((t) => ({
                value: t,
                label: formatAccountType(t),
              }))
            )}
          >
            {/* Rows added dynamically by client script */}
          </tbody>
        </table>
      </div>

      {/* Add Row button */}
      <button type="button" class="btn btn-ghost btn-sm gap-2 self-start" data-bulk-add-row>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg
        >
        Add Row
      </button>

      {/* Error */}
      <div
        id="bulk-accounts-error"
        class="hidden alert alert-error text-sm rounded-xl"
        role="alert"
      >
      </div>

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
          <span data-bulk-accounts-submit-text>Create 1 Account</span>
        </button>
      </div>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
```

**Also:** Remove the help text line referencing `VALID_ACCOUNT_TYPES.join(', ')` — that hint is no longer needed since types are now dropdowns.

**Step 2: Verify the `formatAccountType` import is present**

Check that `index.astro` already imports `formatAccountType` from `@/lib/types/account`. It does (line 31).

**Step 3: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: PASS (0 errors)

**Step 4: Commit**

```bash
git add src/pages/accounts/index.astro
git commit -m "feat(accounts): replace textarea modal with tabular bulk-add UI"
```

---

### Task 5: Manual browser test

**No files changed — verification only.**

**Step 1: Start dev server if not running**

Run: `lsof -i -P | grep LISTEN | grep 432` to find the port, or `bun run dev`

**Step 2: Open accounts page in Chrome**

Navigate to the accounts page, click "Bulk" button.

**Step 3: Verify these behaviors:**

1. Modal opens with 1 empty row (name input, type dropdown, currency dropdown, balance input, trash icon)
2. Trash icon is disabled (only 1 row)
3. Click "Add Row" — new row appears, name input focused
4. Trash icons become enabled (2+ rows)
5. Remove a row — trash disables again if back to 1
6. Submit with empty name — red border on name field, "Min 2 characters" shown
7. Submit with no type selected — red border on type dropdown
8. Fill valid data, submit — toast success, modal closes, page refreshes
9. Fill 3 rows, 1 with invalid data — only validation errors shown, no API calls
10. Submit button text updates: "Create 1 Account", "Create 2 Accounts", etc.

**Step 4: Verify partial failure**

Create a row with a duplicate account name (if API rejects duplicates) — verify error shows in error div while success count toasts.

---

### Task 6: Run quality gates and final commit

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun test src/pages/accounts/bulk-add-accounts.test.ts
```

All must pass.

**Step 2: Verify no regressions**

```bash
bun run build
```

**Step 3: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore(accounts): quality gates pass for tabular bulk-add"
```
