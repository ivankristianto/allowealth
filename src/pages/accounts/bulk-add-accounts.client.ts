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

export type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

export interface ParsedAccount {
  name: string;
  type: AccountType;
  currency: string;
  balance: string;
}

export interface ParsedLine {
  account: ParsedAccount | null;
  error: string | null;
  lineNumber: number;
}

export function parseLine(line: string, lineNumber: number, validCurrencies: string[]): ParsedLine {
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

export function parseTextarea(text: string, validCurrencies: string[]): ParsedLine[] {
  return text
    .split('\n')
    .map((line, i) => ({ line: line.trim(), lineNumber: i + 1 }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => parseLine(line, lineNumber, validCurrencies));
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
      addToast(
        `${successCount} account${successCount !== 1 ? 's' : ''} created successfully!`,
        'success'
      );
      modal.close();
      textarea.value = '';
      if (previewContainer) previewContainer.classList.add('hidden');
      const urlParams = new URL(window.location.href);
      const { navigate } = await import('astro:transitions/client');
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
