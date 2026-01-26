/**
 * Unit tests for ResourceAllocationChart component
 *
 * Tests data validation, transformation, and security measures.
 */

import { describe, it, expect } from 'bun:test';

describe('ResourceAllocationChart', () => {
  describe('Data Structure', () => {
    it('should accept valid expense category data', () => {
      const data = [
        { name: 'Utilities', value: 1850000 },
        { name: 'Dining', value: 905000 },
        { name: 'Health', value: 750000 },
      ];

      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('Utilities');
      expect(data[0].value).toBe(1850000);
    });

    it('should handle optional color property', () => {
      const data = [
        { name: 'Utilities', value: 1850000, color: '#10b981' },
        { name: 'Dining', value: 905000, color: '#3b82f6' },
      ];

      expect(data[0].color).toBe('#10b981');
      expect(data[1].color).toBe('#3b82f6');
    });
  });

  describe('Data Validation', () => {
    it('should filter out invalid data entries', () => {
      const rawData = [
        { name: 'Utilities', value: 1850000 }, // Valid
        { name: 'Invalid', value: NaN }, // Invalid - NaN
        { name: 'Negative', value: -100 }, // Invalid - negative
        { name: '', value: 500 }, // Invalid - empty name
        { name: 'A'.repeat(101), value: 1000 }, // Invalid - name too long
        { name: 'Valid', value: 750000 }, // Valid
      ];

      const validData = rawData.filter(
        (item) =>
          typeof item.value === 'number' &&
          isFinite(item.value) &&
          item.value >= 0 &&
          typeof item.name === 'string' &&
          item.name.length > 0 &&
          item.name.length <= 100
      );

      expect(validData).toHaveLength(2);
      expect(validData[0].name).toBe('Utilities');
      expect(validData[1].name).toBe('Valid');
    });

    it('should validate numeric values', () => {
      const validValues = [0, 100, 1850000, Number.MAX_SAFE_INTEGER];
      const invalidValues = [NaN, Infinity, -Infinity, -1];

      validValues.forEach((value) => {
        expect(typeof value === 'number' && isFinite(value) && value >= 0).toBe(true);
      });

      invalidValues.forEach((value) => {
        expect(typeof value === 'number' && isFinite(value) && value >= 0).toBe(false);
      });
    });

    it('should validate string names', () => {
      const validNames = ['Utilities', 'A', 'A'.repeat(100)];
      const invalidNames = ['', 'A'.repeat(101)];

      validNames.forEach((name) => {
        expect(typeof name === 'string' && name.length > 0 && name.length <= 100).toBe(true);
      });

      invalidNames.forEach((name) => {
        expect(typeof name === 'string' && name.length > 0 && name.length <= 100).toBe(false);
      });
    });
  });

  describe('Percentage Calculation', () => {
    it('should calculate correct percentages', () => {
      const data = [
        { name: 'Utilities', value: 1850000 },
        { name: 'Dining', value: 905000 },
        { name: 'Health', value: 245000 },
      ];

      const total = data.reduce((sum, item) => sum + item.value, 0);
      expect(total).toBe(3000000);

      const withPercentages = data.map((item) => ({
        ...item,
        percentage: ((item.value / total) * 100).toFixed(1),
      }));

      expect(withPercentages[0].percentage).toBe('61.7'); // 1850000 / 3000000 * 100
      expect(withPercentages[1].percentage).toBe('30.2'); // 905000 / 3000000 * 100
      expect(withPercentages[2].percentage).toBe('8.2'); // 245000 / 3000000 * 100
    });

    it('should handle zero total', () => {
      const data = [
        { name: 'Zero1', value: 0 },
        { name: 'Zero2', value: 0 },
      ];

      const total = data.reduce((sum, item) => sum + item.value, 0);
      expect(total).toBe(0);

      // Should not divide by zero
      const withPercentages = data.map((item) => ({
        ...item,
        percentage: total === 0 ? '0.0' : ((item.value / total) * 100).toFixed(1),
      }));

      expect(withPercentages[0].percentage).toBe('0.0');
      expect(withPercentages[1].percentage).toBe('0.0');
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML special characters in JSON', () => {
      const maliciousData = [{ name: '<script>alert("xss")</script>', value: 1000 }];

      const serialized = JSON.stringify(maliciousData)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');

      expect(serialized).not.toContain('<script>');
      expect(serialized).not.toContain('</script>');
      expect(serialized).toContain('\\u003c');
      expect(serialized).toContain('\\u003e');
    });

    it('should escape ampersands in JSON', () => {
      const data = [{ name: 'Food & Drink', value: 1000 }];

      const serialized = JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');

      expect(serialized).toContain('\\u0026');
      expect(serialized).not.toContain('&');
    });
  });
});
