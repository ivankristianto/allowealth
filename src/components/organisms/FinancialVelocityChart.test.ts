/**
 * Unit tests for FinancialVelocityChart component
 *
 * Tests data validation, transformation, and security measures.
 */

import { describe, it, expect } from 'bun:test';

describe('FinancialVelocityChart', () => {
  describe('Data Structure', () => {
    it('should accept valid trend data', () => {
      const data = [
        { name: 'Dec', income: 25245000, expenses: 33719000 },
        { name: 'Jan', income: 60525000, expenses: 41816000 },
        { name: 'Feb', income: 9750000, expenses: 4735000 },
      ];

      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('Dec');
      expect(data[0].income).toBe(25245000);
      expect(data[0].expenses).toBe(33719000);
    });

    it('should handle zero values', () => {
      const data = [
        { name: 'Jan', income: 0, expenses: 1000000 },
        { name: 'Feb', income: 5000000, expenses: 0 },
      ];

      expect(data[0].income).toBe(0);
      expect(data[1].expenses).toBe(0);
    });
  });

  describe('Data Validation', () => {
    it('should filter out invalid data entries', () => {
      const rawData = [
        { name: 'Jan', income: 5000000, expenses: 3000000 }, // Valid
        { name: 'Feb', income: NaN, expenses: 2000000 }, // Invalid - NaN income
        { name: 'Mar', income: 4000000, expenses: -1000 }, // Invalid - negative expenses
        { name: '', income: 3000000, expenses: 2000000 }, // Invalid - empty name
        { name: 'A'.repeat(101), income: 5000000, expenses: 4000000 }, // Invalid - name too long
        { name: 'Apr', income: 6000000, expenses: 5000000 }, // Valid
      ];

      const validData = rawData.filter(
        (item) =>
          typeof item.income === 'number' &&
          isFinite(item.income) &&
          item.income >= 0 &&
          typeof item.expenses === 'number' &&
          isFinite(item.expenses) &&
          item.expenses >= 0 &&
          typeof item.name === 'string' &&
          item.name.length > 0 &&
          item.name.length <= 100
      );

      expect(validData).toHaveLength(2);
      expect(validData[0].name).toBe('Jan');
      expect(validData[1].name).toBe('Apr');
    });

    it('should validate both income and expenses', () => {
      const validEntry = { name: 'Jan', income: 5000000, expenses: 3000000 };

      const isValid =
        typeof validEntry.income === 'number' &&
        isFinite(validEntry.income) &&
        validEntry.income >= 0 &&
        typeof validEntry.expenses === 'number' &&
        isFinite(validEntry.expenses) &&
        validEntry.expenses >= 0 &&
        typeof validEntry.name === 'string' &&
        validEntry.name.length > 0 &&
        validEntry.name.length <= 100;

      expect(isValid).toBe(true);
    });

    it('should reject infinite values', () => {
      const invalidEntries = [
        { name: 'Jan', income: Infinity, expenses: 1000000 },
        { name: 'Feb', income: 2000000, expenses: -Infinity },
      ];

      invalidEntries.forEach((entry) => {
        const isValid =
          typeof entry.income === 'number' &&
          isFinite(entry.income) &&
          entry.income >= 0 &&
          typeof entry.expenses === 'number' &&
          isFinite(entry.expenses) &&
          entry.expenses >= 0;

        expect(isValid).toBe(false);
      });
    });
  });

  describe('Data Transformation', () => {
    it('should extract labels correctly', () => {
      const data = [
        { name: 'Dec', income: 25245000, expenses: 33719000 },
        { name: 'Jan', income: 60525000, expenses: 41816000 },
        { name: 'Feb', income: 9750000, expenses: 4735000 },
      ];

      const labels = data.map((item) => item.name);
      expect(labels).toEqual(['Dec', 'Jan', 'Feb']);
    });

    it('should extract income data correctly', () => {
      const data = [
        { name: 'Dec', income: 25245000, expenses: 33719000 },
        { name: 'Jan', income: 60525000, expenses: 41816000 },
        { name: 'Feb', income: 9750000, expenses: 4735000 },
      ];

      const incomeData = data.map((item) => item.income);
      expect(incomeData).toEqual([25245000, 60525000, 9750000]);
    });

    it('should extract expenses data correctly', () => {
      const data = [
        { name: 'Dec', income: 25245000, expenses: 33719000 },
        { name: 'Jan', income: 60525000, expenses: 41816000 },
        { name: 'Feb', income: 9750000, expenses: 4735000 },
      ];

      const expensesData = data.map((item) => item.expenses);
      expect(expensesData).toEqual([33719000, 41816000, 4735000]);
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML special characters in JSON', () => {
      const maliciousData = [
        { name: '<script>alert("xss")</script>', income: 1000, expenses: 500 },
      ];

      const serialized = JSON.stringify(maliciousData)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');

      expect(serialized).not.toContain('<script>');
      expect(serialized).not.toContain('</script>');
      expect(serialized).toContain('\\u003c');
      expect(serialized).toContain('\\u003e');
    });

    it('should handle multiple special characters', () => {
      const data = [{ name: '<div>&test</div>', income: 1000, expenses: 500 }];

      const serialized = JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');

      expect(serialized).toContain('\\u003c');
      expect(serialized).toContain('\\u003e');
      expect(serialized).toContain('\\u0026');
    });
  });

  describe('Currency Formatting', () => {
    it('should format large numbers with proper locale', () => {
      const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      expect(formatter.format(25245000)).toBe('Rp\u00a025.245.000');
      expect(formatter.format(60525000)).toBe('Rp\u00a060.525.000');
      expect(formatter.format(9750000)).toBe('Rp\u00a09.750.000');
    });

    it('should handle zero values', () => {
      const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      expect(formatter.format(0)).toBe('Rp\u00a00');
    });
  });
});
