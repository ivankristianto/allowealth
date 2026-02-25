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
    } else if (!/^\d+(\.\d{1,2})?$/.test(balanceStr)) {
      errors.balance = 'Max 2 decimals';
    }
  }

  return errors;
}

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
    removeBtns.forEach((btn) => {
      btn.disabled = rows.length <= 1;
    });
    // Update submit text
    if (submitText) {
      submitText.textContent =
        rows.length > 0
          ? `Create ${rows.length} Account${rows.length !== 1 ? 's' : ''}`
          : 'Create Accounts';
    }
    if (submitBtn && !isSubmitting) {
      submitBtn.disabled = rows.length === 0;
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
    if (rows.length === 0) {
      if (errorDiv) {
        errorDiv.textContent = 'Please add at least one account row.';
        errorDiv.classList.remove('hidden');
      }
      return;
    }

    // Clear previous errors
    for (const tr of rows) {
      tr.querySelectorAll('.input-error, .select-error').forEach((el) => {
        el.classList.remove('input-error', 'select-error');
      });
      tr.querySelectorAll('td > .text-error').forEach((el) => {
        el.remove();
      });
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
