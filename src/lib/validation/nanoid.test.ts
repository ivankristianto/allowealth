/**
 * Nanoid Validation Utility Tests
 */

import { describe, test, expect } from 'bun:test';
import { isValidNanoid, validateNanoid } from './nanoid';

describe('isValidNanoid', () => {
  test('should accept valid 21-character nanoid', () => {
    const validId = 'V1StGXR8_Z5jdHi6B-myT';
    expect(isValidNanoid(validId)).toBe(true);
  });

  test('should accept nanoid with all allowed characters', () => {
    const validId = 'ABC123xyz_-ABC123xyz_'; // 21 chars with all allowed chars
    expect(isValidNanoid(validId)).toBe(true);
  });

  test('should reject nanoid with invalid length (too short)', () => {
    const shortId = 'shortID';
    expect(isValidNanoid(shortId)).toBe(false);
  });

  test('should reject nanoid with invalid length (too long)', () => {
    const longId = 'V1StGXR8_Z5jdHi6B-myTXXXXX';
    expect(isValidNanoid(longId)).toBe(false);
  });

  test('should reject nanoid with invalid characters (special chars)', () => {
    const invalidId = 'V1StGXR8@Z5jdHi6B-myT';
    expect(isValidNanoid(invalidId)).toBe(false);
  });

  test('should reject nanoid with invalid characters (spaces)', () => {
    const invalidId = 'V1StGXR8 Z5jdHi6B-myT';
    expect(isValidNanoid(invalidId)).toBe(false);
  });

  test('should reject nanoid with invalid characters (dots)', () => {
    const invalidId = 'V1StGXR8.Z5jdHi6B-myT';
    expect(isValidNanoid(invalidId)).toBe(false);
  });

  test('should reject empty string', () => {
    expect(isValidNanoid('')).toBe(false);
  });

  test('should reject null/undefined (type safety)', () => {
    expect(isValidNanoid(null as any)).toBe(false);
    expect(isValidNanoid(undefined as any)).toBe(false);
  });

  test('should accept custom length nanoid', () => {
    const customId = 'ABC123';
    expect(isValidNanoid(customId, 6)).toBe(true);
  });

  test('should reject custom length nanoid with wrong length', () => {
    const customId = 'ABC123';
    expect(isValidNanoid(customId, 10)).toBe(false);
  });
});

describe('validateNanoid', () => {
  test('should not throw for valid nanoid', () => {
    const validId = 'V1StGXR8_Z5jdHi6B-myT';
    expect(() => validateNanoid(validId)).not.toThrow();
  });

  test('should throw error for invalid nanoid', () => {
    const invalidId = 'invalid@id';
    expect(() => validateNanoid(invalidId)).toThrow(
      'Invalid ID format. Expected 21-character nanoid.'
    );
  });

  test('should throw error with custom field name', () => {
    const invalidId = 'invalid';
    expect(() => validateNanoid(invalidId, 'Category ID')).toThrow(
      'Invalid Category ID format. Expected 21-character nanoid.'
    );
  });

  test('should throw error for empty string', () => {
    expect(() => validateNanoid('')).toThrow('Invalid ID format. Expected 21-character nanoid.');
  });

  test('should throw error for null/undefined', () => {
    expect(() => validateNanoid(null as any)).toThrow();
    expect(() => validateNanoid(undefined as any)).toThrow();
  });
});
