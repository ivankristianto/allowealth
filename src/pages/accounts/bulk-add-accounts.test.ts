/**
 * Bulk Add Accounts - Tabular Modal Tests
 *
 * Covers row-level validation and DOM behavior for initBulkAddAccounts().
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Window } from 'happy-dom';
import { initBulkAddAccounts, validateRow, VALID_ACCOUNT_TYPES } from './bulk-add-accounts.client';

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

  it('returns error when balance has more than 2 decimals', () => {
    const errors = validateRow({ ...validRow, balance: '100.123' }, VALID_CURRENCIES);
    expect(errors.balance).toBeDefined();
  });

  it('returns error for scientific notation', () => {
    const errors = validateRow({ ...validRow, balance: '1e2' }, VALID_CURRENCIES);
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

describe('initBulkAddAccounts', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;

    const window = new Window();
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;

    document.body.innerHTML = `
      <dialog id="bulk-add-accounts-modal" class="modal">
        <table>
          <tbody data-bulk-rows></tbody>
        </table>
        <button type="button" data-bulk-add-row>Add</button>
        <button type="button" data-bulk-accounts-cancel>Cancel</button>
        <button type="button" data-bulk-accounts-submit>
          <span data-bulk-accounts-submit-text>Create Accounts</span>
        </button>
        <div id="bulk-accounts-error" class="hidden"></div>
      </dialog>
    `;

    const tbody = document.querySelector(
      '[data-bulk-rows]'
    ) as unknown as HTMLTableSectionElement | null;
    if (!tbody) throw new Error('Missing bulk rows tbody in test setup');
    tbody.dataset.validCurrencies = 'IDR,USD';
    tbody.dataset.accountTypes = JSON.stringify([
      { value: 'cash', label: 'Cash' },
      { value: 'bank_account', label: 'Bank Account' },
    ]);
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
  });

  it('initializes with one row and disables remove button', () => {
    initBulkAddAccounts();

    const tbody = document.querySelector('[data-bulk-rows]') as HTMLTableSectionElement;
    const rows = tbody.querySelectorAll('tr[data-row-id]');
    expect(rows).toHaveLength(1);

    const removeBtn = tbody.querySelector('[data-action="remove-row"]') as HTMLButtonElement;
    expect(removeBtn.disabled).toBe(true);

    const submitText = document.querySelector('[data-bulk-accounts-submit-text]');
    expect(submitText?.textContent).toBe('Create 1 Account');
  });

  it('adds and removes rows while keeping remove-button state in sync', () => {
    initBulkAddAccounts();

    const tbody = document.querySelector('[data-bulk-rows]') as HTMLTableSectionElement;
    const addRowBtn = document.querySelector('[data-bulk-add-row]') as HTMLButtonElement;

    addRowBtn.click();
    expect(tbody.querySelectorAll('tr[data-row-id]')).toHaveLength(2);

    const removeBtns = Array.from(
      tbody.querySelectorAll('[data-action="remove-row"]')
    ) as HTMLButtonElement[];
    expect(removeBtns[0]?.disabled).toBe(false);
    expect(removeBtns[1]?.disabled).toBe(false);

    removeBtns[0]?.click();

    const remainingRows = tbody.querySelectorAll('tr[data-row-id]');
    expect(remainingRows).toHaveLength(1);
    const remainingRemoveBtn = tbody.querySelector(
      '[data-action="remove-row"]'
    ) as HTMLButtonElement;
    expect(remainingRemoveBtn.disabled).toBe(true);
  });

  it('shows field-level validation errors on submit', () => {
    initBulkAddAccounts();

    const row = document.querySelector('tr[data-row-id]') as HTMLTableRowElement;
    const typeSelect = row.querySelector('[data-field="type"]') as HTMLSelectElement;
    const currencySelect = row.querySelector('[data-field="currency"]') as HTMLSelectElement;
    const submitBtn = document.querySelector('[data-bulk-accounts-submit]') as HTMLButtonElement;

    typeSelect.value = 'bank_account';
    currencySelect.value = 'IDR';

    submitBtn.click();

    const nameInput = row.querySelector('[data-field="name"]') as HTMLInputElement;
    expect(nameInput.classList.contains('input-error')).toBe(true);
    expect(nameInput.parentElement?.querySelector('.text-error')?.textContent).toBe(
      'Min 2 characters'
    );
  });

  it('shows a clear error when submit is clicked with zero rows', () => {
    initBulkAddAccounts();

    const tbody = document.querySelector('[data-bulk-rows]') as HTMLTableSectionElement;
    const submitBtn = document.querySelector('[data-bulk-accounts-submit]') as HTMLButtonElement;
    const errorDiv = document.getElementById('bulk-accounts-error') as HTMLDivElement;

    tbody.innerHTML = '';
    submitBtn.click();

    expect(errorDiv.classList.contains('hidden')).toBe(false);
    expect(errorDiv.textContent).toBe('Please add at least one account row.');
  });
});
