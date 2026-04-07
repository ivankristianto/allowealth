/**
 * Unit tests for Argon2id password hasher
 *
 * These tests require the Bun runtime (Bun.password API).
 */

import { describe, expect, it } from 'bun:test';
import { Argon2idHasher } from './password-argon2id';

const hasher = new Argon2idHasher();
const KNOWN_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=2,p=1$9Rpb7Vy0/fQOsRiXXYpDm73xYTNAAU84oTHhVpIRgGg$gufu68Vx6EqJbpyflezrsARjjGsM4uoVzkaCCEvKpsw';

describe('Argon2idHasher', () => {
  describe('hash', () => {
    it('should produce a hash with the argon2id prefix', async () => {
      const hash = await hasher.hash('SecurePassword123!');

      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await hasher.hash('SecurePassword123!');
      const hash2 = await hasher.hash('SecurePassword123!');

      expect(hash1).not.toEqual(hash2);
    });

    it('should include expected parameters in the hash', async () => {
      const hash = await hasher.hash('SecurePassword123!');

      expect(hash).toContain('m=65536');
      expect(hash).toContain('t=2');
      expect(hash).toContain('p=1');
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

    it('should verify a hardcoded known Argon2id hash', async () => {
      expect(await hasher.verify('KnownTestPassword1!', KNOWN_ARGON2ID_HASH)).toBe(true);
    });

    it('should return false for empty inputs', async () => {
      expect(await hasher.verify('', 'some-hash')).toBe(false);
      expect(await hasher.verify('Password123!', '')).toBe(false);
    });

    it('should return false for non-argon2id hash format', async () => {
      expect(await hasher.verify('Password123!', '$pbkdf2-sha256$100000$abc$def')).toBe(false);
    });
  });
});
