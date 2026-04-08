/**
 * Unit tests for PBKDF2-SHA256 password hasher
 */

import { describe, expect, it } from 'bun:test';
import { Pbkdf2Hasher } from './password-pbkdf2';

const hasher = new Pbkdf2Hasher();

describe('Pbkdf2Hasher', () => {
  describe('hash', () => {
    it('should produce a hash with the correct prefix', async () => {
      const hash = await hasher.hash('SecurePassword123!');
      expect(hash.startsWith('$pbkdf2-sha256$')).toBe(true);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await hasher.hash('SecurePassword123!');
      const hash2 = await hasher.hash('SecurePassword123!');

      expect(hash1).not.toEqual(hash2);
    });

    it('should produce a hash with correct format segments', async () => {
      const hash = await hasher.hash('SecurePassword123!');
      const parts = hash.slice('$pbkdf2-sha256$'.length).split('$');

      expect(parts.length).toBe(3);
      expect(parseInt(parts[0], 10)).toBe(100_000);
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const hash = await hasher.hash('CorrectPassword123!');

      expect(await hasher.verify('CorrectPassword123!', hash)).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await hasher.hash('CorrectPassword123!');

      expect(await hasher.verify('WrongPassword456!', hash)).toBe(false);
    });

    it('should verify a round-tripped hash', async () => {
      const password = 'KnownTestPassword1!';
      const hash = await hasher.hash(password);

      expect(await hasher.verify(password, hash)).toBe(true);
    });

    it('should return false for invalid hash format', async () => {
      expect(await hasher.verify('Password123!', 'not-a-hash')).toBe(false);
    });

    it('should return false for empty inputs', async () => {
      expect(await hasher.verify('', 'some-hash')).toBe(false);
      expect(await hasher.verify('Password123!', '')).toBe(false);
    });
  });
});
