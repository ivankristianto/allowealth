import { describe, test, expect } from 'bun:test';
import { validatePasswordClient, isPasswordValid } from './client-password';

describe('validatePasswordClient', () => {
  test('accepts password with 12+ chars, letter, and number', () => {
    expect(isPasswordValid('mypassword123')).toBe(true);
    expect(validatePasswordClient('mypassword123')).toEqual([]);
  });

  test('accepts password with 12+ chars, letter, and special char', () => {
    expect(isPasswordValid('mypassword!@#')).toBe(true);
    expect(validatePasswordClient('mypassword!@#')).toEqual([]);
  });

  test('accepts mixed case letters (no requirement for both cases)', () => {
    expect(isPasswordValid('MyPassword123')).toBe(true);
    expect(isPasswordValid('mypassword123')).toBe(true);
    expect(isPasswordValid('MYPASSWORD123')).toBe(true);
  });

  test('accepts password with letter and number but no special char', () => {
    expect(isPasswordValid('mypassword123')).toBe(true);
    expect(validatePasswordClient('mypassword123')).toEqual([]);
  });

  test('accepts password with letter and special char but no number', () => {
    expect(isPasswordValid('mypassword!@#')).toBe(true);
    expect(validatePasswordClient('mypassword!@#')).toEqual([]);
  });

  test('rejects password with < 12 characters', () => {
    const errors = validatePasswordClient('short123');
    expect(errors).toContain('Password must be at least 12 characters');
  });

  test('rejects password without any letters', () => {
    const errors = validatePasswordClient('123456789012');
    expect(errors).toContain('Password must contain at least one letter');
  });

  test('rejects password without number or special char', () => {
    const errors = validatePasswordClient('onlylettershere');
    expect(errors).toContain('Password must contain at least one number or special character');
  });

  test('returns multiple errors for multiple violations', () => {
    const errors = validatePasswordClient('short');
    expect(errors.length).toBeGreaterThan(1);
  });

  test('rejects empty password', () => {
    const errors = validatePasswordClient('');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('Password must be at least 12 characters');
  });

  test('handles edge case of exactly 12 characters with all requirements', () => {
    const password = 'abcdefgh1234'; // exactly 12 chars, has letters and numbers
    expect(isPasswordValid(password)).toBe(true);
  });

  test('rejects password with 11 characters even if it has letter and number', () => {
    const password = 'abcdefgh123'; // 11 chars
    expect(isPasswordValid(password)).toBe(false);
    expect(validatePasswordClient(password)).toContain('Password must be at least 12 characters');
  });
});

describe('isPasswordValid', () => {
  test('returns true for valid passwords', () => {
    expect(isPasswordValid('mypassword123')).toBe(true);
    expect(isPasswordValid('MyPassword!@#')).toBe(true);
    expect(isPasswordValid('SecurePass456')).toBe(true);
  });

  test('returns false for invalid passwords', () => {
    expect(isPasswordValid('short')).toBe(false);
    expect(isPasswordValid('onlyletters')).toBe(false);
    expect(isPasswordValid('123456789012')).toBe(false);
  });

  test('returns false for empty password', () => {
    expect(isPasswordValid('')).toBe(false);
  });
});
