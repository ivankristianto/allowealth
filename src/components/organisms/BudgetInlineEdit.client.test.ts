import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

let validateBudgetAmount: typeof import('./BudgetInlineEdit.client').validateBudgetAmount;
const originalDocument = globalThis.document;

beforeAll(async () => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener() {},
      querySelector() {
        return null;
      },
    },
  });

  ({ validateBudgetAmount } = await import('./BudgetInlineEdit.client'));
});

afterAll(() => {
  if (typeof originalDocument === 'undefined') {
    // Remove the test-only stub when the runtime did not provide a DOM.
    delete (globalThis as { document?: Document }).document;
    return;
  }

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

describe('validateBudgetAmount', () => {
  it('accepts positive integer and decimal amounts', () => {
    expect(validateBudgetAmount('5000000')).toEqual({ valid: true });
    expect(validateBudgetAmount('500.50')).toEqual({ valid: true });
  });

  it('rejects empty and whitespace-only input', () => {
    expect(validateBudgetAmount('')).toEqual({
      valid: false,
      error: 'Budget amount is required',
    });
    expect(validateBudgetAmount('   ')).toEqual({
      valid: false,
      error: 'Budget amount is required',
    });
  });

  it('rejects zero and negative values', () => {
    expect(validateBudgetAmount('0')).toEqual({
      valid: false,
      error: 'Budget amount must be a positive number',
    });
    expect(validateBudgetAmount('-100')).toEqual({
      valid: false,
      error: 'Budget amount must be a positive number',
    });
  });

  it('rejects values that Number() does not parse cleanly', () => {
    expect(validateBudgetAmount('abc')).toEqual({
      valid: false,
      error: 'Budget amount must be a valid number',
    });
    expect(validateBudgetAmount('100abc')).toEqual({
      valid: false,
      error: 'Budget amount must be a valid number',
    });
    expect(validateBudgetAmount('1,000')).toEqual({
      valid: false,
      error: 'Budget amount must be a valid number',
    });
  });
});
