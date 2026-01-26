/**
 * Unit tests for transaction utility functions
 * @fileoverview Tests for transaction transformation and amount parsing
 */

import { describe, test, expect } from 'bun:test';
import {
  transformTransaction,
  safeParseAmount,
  type DrizzleTransactionResult,
} from './transaction';

describe('transaction utilities', () => {
  describe('transformTransaction', () => {
    const mockDrizzleTransaction: DrizzleTransactionResult = {
      id: 'tx-123',
      type: 'expense',
      amount: '50000',
      currency: 'IDR',
      description: 'Grocery shopping',
      transaction_date: new Date('2026-01-15'),
      deleted_at: null,
      created_at: new Date('2026-01-15T10:00:00'),
      updated_at: new Date('2026-01-15T10:00:00'),
      category: {
        id: 'cat-1',
        name: 'Groceries',
        type: 'expense',
      },
      asset: {
        id: 'asset-1',
        name: 'Cash',
        type: 'cash',
      },
    };

    test('transforms Drizzle result to TransactionOutput format', () => {
      const result = transformTransaction(mockDrizzleTransaction);

      expect(result.id).toBe('tx-123');
      expect(result.type).toBe('expense');
      expect(result.amount).toBe('50000');
      expect(result.currency).toBe('IDR');
      expect(result.description).toBe('Grocery shopping');
    });

    test('transforms category correctly', () => {
      const result = transformTransaction(mockDrizzleTransaction);

      expect(result.category.id).toBe('cat-1');
      expect(result.category.name).toBe('Groceries');
      expect(result.category.type).toBe('expense');
    });

    test('transforms asset correctly', () => {
      const result = transformTransaction(mockDrizzleTransaction);

      expect(result.asset).toBeDefined();
      expect(result.asset.id).toBe('asset-1');
      expect(result.asset.name).toBe('Cash');
      expect(result.asset.type).toBe('cash');
    });

    test('handles null description', () => {
      const txWithNullDesc: DrizzleTransactionResult = {
        ...mockDrizzleTransaction,
        description: null,
      };

      const result = transformTransaction(txWithNullDesc);
      expect(result.description).toBeNull();
    });

    test('handles null deleted_at', () => {
      const result = transformTransaction(mockDrizzleTransaction);
      expect(result.deleted_at).toBeNull();
    });

    test('preserves date objects', () => {
      const result = transformTransaction(mockDrizzleTransaction);

      expect(result.transaction_date).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    test('handles income type', () => {
      const incomeTransaction: DrizzleTransactionResult = {
        ...mockDrizzleTransaction,
        type: 'income',
        category: {
          id: 'cat-2',
          name: 'Salary',
          type: 'income',
        },
      };

      const result = transformTransaction(incomeTransaction);
      expect(result.type).toBe('income');
      expect(result.category.type).toBe('income');
    });

    test('handles USD currency', () => {
      const usdTransaction: DrizzleTransactionResult = {
        ...mockDrizzleTransaction,
        currency: 'USD',
        amount: '100.50',
      };

      const result = transformTransaction(usdTransaction);
      expect(result.currency).toBe('USD');
      expect(result.amount).toBe('100.50');
    });
  });

  describe('safeParseAmount', () => {
    test('parses valid string amount', () => {
      expect(safeParseAmount('100.50')).toBe(100.5);
      expect(safeParseAmount('50000')).toBe(50000);
      expect(safeParseAmount('0')).toBe(0);
    });

    test('handles number input', () => {
      expect(safeParseAmount(100.5)).toBe(100.5);
      expect(safeParseAmount(0)).toBe(0);
      expect(safeParseAmount(-50)).toBe(-50);
    });

    test('returns 0 for invalid string', () => {
      expect(safeParseAmount('invalid')).toBe(0);
      expect(safeParseAmount('')).toBe(0);
      expect(safeParseAmount('abc123')).toBe(0);
    });

    test('returns 0 for NaN', () => {
      expect(safeParseAmount(NaN)).toBe(0);
    });

    test('handles negative amounts', () => {
      expect(safeParseAmount('-100.50')).toBe(-100.5);
      expect(safeParseAmount(-50)).toBe(-50);
    });

    test('handles decimal amounts', () => {
      expect(safeParseAmount('99.99')).toBe(99.99);
      expect(safeParseAmount('0.01')).toBe(0.01);
    });

    test('handles large numbers', () => {
      expect(safeParseAmount('1000000000')).toBe(1000000000);
      expect(safeParseAmount(1000000000)).toBe(1000000000);
    });

    test('handles scientific notation', () => {
      expect(safeParseAmount('1e6')).toBe(1000000);
    });
  });
});
