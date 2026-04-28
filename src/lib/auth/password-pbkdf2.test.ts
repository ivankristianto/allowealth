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
      expect(parseInt(parts[0], 10)).toBe(600_000);
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

    it('should reject iterations below the minimum', async () => {
      const tooLow =
        '$pbkdf2-sha256$50000$xRDzRIW4WcZ8U135JQtdzQ==$sqJYw5hNy/d2l9dcWsUWBzPuWgEF82iwG5oqELlZjyc=';

      expect(await hasher.verify('Password123!', tooLow)).toBe(false);
    });

    it('should reject iterations above the safety ceiling', async () => {
      const tooHigh =
        '$pbkdf2-sha256$5000000$xRDzRIW4WcZ8U135JQtdzQ==$sqJYw5hNy/d2l9dcWsUWBzPuWgEF82iwG5oqELlZjyc=';

      expect(await hasher.verify('Password123!', tooHigh)).toBe(false);
    });

    it('should reject non-decimal iteration counts', async () => {
      const malformed =
        '$pbkdf2-sha256$0x1e8480$xRDzRIW4WcZ8U135JQtdzQ==$sqJYw5hNy/d2l9dcWsUWBzPuWgEF82iwG5oqELlZjyc=';

      expect(await hasher.verify('Password123!', malformed)).toBe(false);
    });

    it('should reject mismatched salt size', async () => {
      const shortSalt =
        '$pbkdf2-sha256$600000$c2hvcnQ=$sqJYw5hNy/d2l9dcWsUWBzPuWgEF82iwG5oqELlZjyc=';

      expect(await hasher.verify('Password123!', shortSalt)).toBe(false);
    });

    it('should reject mismatched hash size', async () => {
      const shortHash = '$pbkdf2-sha256$600000$xRDzRIW4WcZ8U135JQtdzQ==$c2hvcnQ=';

      expect(await hasher.verify('Password123!', shortHash)).toBe(false);
    });
  });
});
