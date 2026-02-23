/**
 * Bulk Add Accounts - Parsing Unit Tests
 *
 * Tests for parseLine() and parseTextarea() functions that handle
 * CSV-like input parsing for the bulk account creation modal.
 */

import { describe, it, expect } from 'bun:test';
import { parseLine, parseTextarea } from './bulk-add-accounts.client';

const VALID_CURRENCIES = ['IDR', 'USD'];

describe('parseLine', () => {
  it('parses a valid line with all fields', () => {
    const result = parseLine('My Savings, bank_account, IDR, 5000000', 1, VALID_CURRENCIES);
    expect(result.error).toBeNull();
    expect(result.account).toEqual({
      name: 'My Savings',
      type: 'bank_account',
      currency: 'IDR',
      balance: '5000000',
    });
    expect(result.lineNumber).toBe(1);
  });

  it('parses a valid line without balance (defaults to 0)', () => {
    const result = parseLine('BCA Checking, bank_account, IDR', 1, VALID_CURRENCIES);
    expect(result.error).toBeNull();
    expect(result.account).toEqual({
      name: 'BCA Checking',
      type: 'bank_account',
      currency: 'IDR',
      balance: '0',
    });
  });

  it('parses a valid line with decimal balance', () => {
    const result = parseLine('Cash USD, cash, USD, 100.50', 1, VALID_CURRENCIES);
    expect(result.error).toBeNull();
    expect(result.account!.balance).toBe('100.50');
  });

  it('formats balance to 2 decimal places', () => {
    const result = parseLine('Test, cash, IDR, 100.123', 1, VALID_CURRENCIES);
    expect(result.error).toBeNull();
    expect(result.account!.balance).toBe('100.12');
  });

  it('handles zero balance explicitly', () => {
    const result = parseLine('Test, cash, IDR, 0', 1, VALID_CURRENCIES);
    expect(result.error).toBeNull();
    expect(result.account!.balance).toBe('0');
  });

  it('normalizes currency to uppercase', () => {
    const result = parseLine('Test, cash, idr, 100', 1, VALID_CURRENCIES);
    expect(result.error).toBeNull();
    expect(result.account!.currency).toBe('IDR');
  });

  it('normalizes type to lowercase', () => {
    const result = parseLine('Test, Bank_Account, IDR, 100', 1, VALID_CURRENCIES);
    expect(result.error).toBeNull();
    expect(result.account!.type).toBe('bank_account');
  });

  it('trims whitespace from all fields', () => {
    const result = parseLine(
      '  My Savings  ,  bank_account  ,  IDR  ,  5000  ',
      1,
      VALID_CURRENCIES
    );
    expect(result.error).toBeNull();
    expect(result.account).toEqual({
      name: 'My Savings',
      type: 'bank_account',
      currency: 'IDR',
      balance: '5000',
    });
  });

  // Validation errors

  it('returns error for fewer than 3 fields', () => {
    const result = parseLine('Only Name', 3, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toBe('Line 3: Expected at least 3 fields (Name, Type, Currency)');
    expect(result.lineNumber).toBe(3);
  });

  it('returns error for two fields', () => {
    const result = parseLine('Name, bank_account', 1, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toContain('Expected at least 3 fields');
  });

  it('returns error for name shorter than 2 characters', () => {
    const result = parseLine('A, cash, IDR', 2, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toBe('Line 2: Name must be at least 2 characters');
  });

  it('returns error for empty name', () => {
    const result = parseLine(', cash, IDR', 1, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toContain('Name must be at least 2 characters');
  });

  it('returns error for invalid account type', () => {
    const result = parseLine('Test, savings, IDR', 4, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toBe(
      'Line 4: Invalid type "savings". Must be one of: cash, bank_account, e_wallet, mutual_fund, bond, crypto, stock, other, credit_card, loan'
    );
  });

  it('returns error for invalid currency', () => {
    const result = parseLine('Test, cash, EUR', 5, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toBe('Line 5: Invalid currency "EUR". Must be one of: IDR, USD');
  });

  it('returns error for negative balance', () => {
    const result = parseLine('Test, cash, IDR, -100', 6, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toBe('Line 6: Invalid balance "-100". Must be a non-negative number');
  });

  it('returns error for non-numeric balance', () => {
    const result = parseLine('Test, cash, IDR, abc', 1, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toContain('Invalid balance "abc"');
  });

  it('returns error for infinite/scientific-overflow balance', () => {
    const result = parseLine('Test, cash, IDR, 1e309', 1, VALID_CURRENCIES);
    expect(result.account).toBeNull();
    expect(result.error).toContain('Invalid balance "1e309"');
  });

  // All valid account types
  const allTypes = [
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

  for (const type of allTypes) {
    it(`accepts valid account type: ${type}`, () => {
      const result = parseLine(`Test Account, ${type}, IDR`, 1, VALID_CURRENCIES);
      expect(result.error).toBeNull();
      expect(result.account!.type).toBe(type);
    });
  }
});

describe('parseTextarea', () => {
  it('parses multiple valid lines', () => {
    const text = 'Savings, bank_account, IDR, 1000000\nWallet, e_wallet, IDR, 250000';
    const results = parseTextarea(text, VALID_CURRENCIES);
    expect(results).toHaveLength(2);
    expect(results[0].account!.name).toBe('Savings');
    expect(results[1].account!.name).toBe('Wallet');
  });

  it('skips empty lines', () => {
    const text = 'Savings, bank_account, IDR\n\n\nWallet, e_wallet, IDR';
    const results = parseTextarea(text, VALID_CURRENCIES);
    expect(results).toHaveLength(2);
  });

  it('skips whitespace-only lines', () => {
    const text = 'Savings, bank_account, IDR\n   \n  \nWallet, e_wallet, IDR';
    const results = parseTextarea(text, VALID_CURRENCIES);
    expect(results).toHaveLength(2);
  });

  it('returns empty array for empty text', () => {
    const results = parseTextarea('', VALID_CURRENCIES);
    expect(results).toHaveLength(0);
  });

  it('returns empty array for whitespace-only text', () => {
    const results = parseTextarea('   \n  \n   ', VALID_CURRENCIES);
    expect(results).toHaveLength(0);
  });

  it('preserves original line numbers after skipping blanks', () => {
    const text = '\nSavings, bank_account, IDR\n\nWallet, e_wallet, IDR';
    const results = parseTextarea(text, VALID_CURRENCIES);
    expect(results[0].lineNumber).toBe(2);
    expect(results[1].lineNumber).toBe(4);
  });

  it('handles mix of valid and invalid lines', () => {
    const text =
      'Good Account, bank_account, IDR, 1000\nBad, invalid_type, IDR\nAnother Good, cash, USD';
    const results = parseTextarea(text, VALID_CURRENCIES);
    expect(results).toHaveLength(3);
    expect(results[0].account).not.toBeNull();
    expect(results[0].error).toBeNull();
    expect(results[1].account).toBeNull();
    expect(results[1].error).toContain('Invalid type');
    expect(results[2].account).not.toBeNull();
    expect(results[2].error).toBeNull();
  });

  it('handles single line without newline', () => {
    const results = parseTextarea('Savings, bank_account, IDR, 5000', VALID_CURRENCIES);
    expect(results).toHaveLength(1);
    expect(results[0].account!.name).toBe('Savings');
    expect(results[0].lineNumber).toBe(1);
  });
});
