/**
 * Unit tests for password hashing utilities
 */

import { describe, it, expect } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toEqual(password);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Each hash should be unique due to salt
      expect(hash1).not.toEqual(hash2);
    });

    it('should throw error for password less than 12 characters', async () => {
      const shortPassword = 'Short1!';

      expect(hashPassword(shortPassword)).rejects.toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should accept 12 character password', async () => {
      const password = 'TwelveChars1';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should accept long passwords', async () => {
      const password = 'VeryLongPasswordWithSpecialChars123!@#%$^&*()';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject password with different case', async () => {
      const password = 'Password123!';
      const differentCase = 'password123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(differentCase, hash);

      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('ValidPassword123!');
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verifyPassword('Password123!', '');

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await verifyPassword('Password123!', 'invalid-hash-format');

      expect(isValid).toBe(false);
    });

    it('should return false for both empty', async () => {
      const isValid = await verifyPassword('', '');

      expect(isValid).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should hash and verify multiple different passwords', async () => {
      const passwords = ['PasswordOne123!', 'PasswordTwo456@', 'PasswordThree789#'];

      for (const password of passwords) {
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    it('should not verify password against different hash', async () => {
      const password1 = 'FirstPassword123!';
      const password2 = 'SecondPassword456!';
      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);

      expect(await verifyPassword(password1, hash1)).toBe(true);
      expect(await verifyPassword(password2, hash2)).toBe(true);
      expect(await verifyPassword(password1, hash2)).toBe(false);
      expect(await verifyPassword(password2, hash1)).toBe(false);
    });
  });
});
