/**
 * Integration tests for the password hashing facade
 *
 * Tests the public hashPassword/verifyPassword API including
 * prefix-based verification dispatch across both hash formats.
 */

import { describe, expect, it } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

/** Hardcoded PBKDF2 hash of "TestPassword123!" for cross-format regression testing. */
const KNOWN_PBKDF2_HASH =
  '$pbkdf2-sha256$100000$xRDzRIW4WcZ8U135JQtdzQ==$sqJYw5hNy/d2l9dcWsUWBzPuWgEF82iwG5oqELlZjyc=';

/** Hardcoded Argon2id hash of "TestPassword123!" for cross-format regression testing. */
const KNOWN_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=2,p=1$KKa335shvrWayGnd1ZwIFoLuZwFVnVFx4UMio6TCIbo$vK8PnpIuF1zweSNXM4H5VfPQURPkSpiDVa1BhbS6GFE';

describe('Password Hashing Facade', () => {
  describe('hashPassword', () => {
    it('should produce an Argon2id hash on Bun runtime', async () => {
      const hash = await hashPassword('SecurePassword123!');

      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword('SecurePassword123!');
      const hash2 = await hashPassword('SecurePassword123!');

      expect(hash1).not.toEqual(hash2);
    });

    it('should throw for password shorter than 12 characters', async () => {
      await expect(hashPassword('Short1!')).rejects.toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should accept exactly 12 character password', async () => {
      const hash = await hashPassword('TwelveChars1');

      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify a freshly hashed password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('CorrectPassword123!');

      expect(await verifyPassword('WrongPassword456!', hash)).toBe(false);
    });

    it('should verify a known PBKDF2 hash', async () => {
      expect(await verifyPassword('TestPassword123!', KNOWN_PBKDF2_HASH)).toBe(true);
    });

    it('should verify a known Argon2id hash', async () => {
      expect(await verifyPassword('TestPassword123!', KNOWN_ARGON2ID_HASH)).toBe(true);
    });

    it('should reject wrong password against PBKDF2 hash', async () => {
      expect(await verifyPassword('WrongPassword456!', KNOWN_PBKDF2_HASH)).toBe(false);
    });

    it('should reject wrong password against Argon2id hash', async () => {
      expect(await verifyPassword('WrongPassword456!', KNOWN_ARGON2ID_HASH)).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('ValidPassword123!');

      expect(await verifyPassword('', hash)).toBe(false);
    });

    it('should return false for empty hash', async () => {
      expect(await verifyPassword('Password123!', '')).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      expect(await verifyPassword('Password123!', 'invalid-hash-format')).toBe(false);
    });

    it('should return false for unknown hash prefix', async () => {
      expect(await verifyPassword('Password123!', '$bcrypt$something')).toBe(false);
    });

    it('should return false for both empty', async () => {
      expect(await verifyPassword('', '')).toBe(false);
    });
  });

  describe('Cross-password isolation', () => {
    it('should not verify password against a different hash', async () => {
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
