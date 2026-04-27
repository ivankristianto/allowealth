/**
 * Unit tests for the pure-JS Argon2id password hasher.
 *
 * The JS implementation is what runs on Cloudflare Workers (where runtime
 * WASM compilation is blocked) and any other non-Bun runtime. Hashes
 * produced here MUST verify against the Bun-native hasher and vice versa,
 * so the same `$argon2id$` PHC format is asserted on both sides.
 */

import { describe, expect, it } from 'bun:test';
import { Argon2idHasher } from './password-argon2id';
import { Argon2idJsHasher } from './password-argon2id-js';

const jsHasher = new Argon2idJsHasher();
const nativeHasher = new Argon2idHasher();

const KNOWN_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=2,p=1$9Rpb7Vy0/fQOsRiXXYpDm73xYTNAAU84oTHhVpIRgGg$gufu68Vx6EqJbpyflezrsARjjGsM4uoVzkaCCEvKpsw';

describe('Argon2idJsHasher', () => {
  describe('hash', () => {
    it('produces a hash with the argon2id prefix', async () => {
      const hash = await jsHasher.hash('SecurePassword123!');

      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('produces different hashes for the same password', async () => {
      const hash1 = await jsHasher.hash('SecurePassword123!');
      const hash2 = await jsHasher.hash('SecurePassword123!');

      expect(hash1).not.toEqual(hash2);
    });

    it('encodes the configured Argon2id parameters', async () => {
      const hash = await jsHasher.hash('SecurePassword123!');

      expect(hash).toContain('m=65536');
      expect(hash).toContain('t=2');
      expect(hash).toContain('p=1');
    });
  });

  describe('verify', () => {
    it('verifies a freshly hashed password', async () => {
      const hash = await jsHasher.hash('CorrectPassword123!');

      expect(await jsHasher.verify('CorrectPassword123!', hash)).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const hash = await jsHasher.hash('CorrectPassword123!');

      expect(await jsHasher.verify('WrongPassword456!', hash)).toBe(false);
    });

    it('verifies a hardcoded known Argon2id hash', async () => {
      expect(await jsHasher.verify('KnownTestPassword1!', KNOWN_ARGON2ID_HASH)).toBe(true);
    });

    it('returns false for empty inputs', async () => {
      expect(await jsHasher.verify('', 'some-hash')).toBe(false);
      expect(await jsHasher.verify('Password123!', '')).toBe(false);
    });

    it('returns false for non-argon2id hash format', async () => {
      expect(await jsHasher.verify('Password123!', '$pbkdf2-sha256$100000$abc$def')).toBe(false);
    });

    it('returns false for a truncated PHC string', async () => {
      const truncated = KNOWN_ARGON2ID_HASH.slice(0, 40);

      expect(await jsHasher.verify('KnownTestPassword1!', truncated)).toBe(false);
    });

    it('returns false when the salt segment is corrupted', async () => {
      const segments = KNOWN_ARGON2ID_HASH.split('$');
      segments[4] = 'not_valid_base64!!!';
      const corrupted = segments.join('$');

      expect(await jsHasher.verify('KnownTestPassword1!', corrupted)).toBe(false);
    });

    it('returns false when the hash segment is corrupted', async () => {
      const segments = KNOWN_ARGON2ID_HASH.split('$');
      segments[5] = 'not_valid_base64!!!';
      const corrupted = segments.join('$');

      expect(await jsHasher.verify('KnownTestPassword1!', corrupted)).toBe(false);
    });

    it('returns false when the parameter block is tampered with', async () => {
      const tampered = KNOWN_ARGON2ID_HASH.replace('m=65536,t=2,p=1', 'm=99999,t=9,p=9');

      expect(await jsHasher.verify('KnownTestPassword1!', tampered)).toBe(false);
    });

    it('returns false when memory cost exceeds the safety ceiling', async () => {
      const huge = KNOWN_ARGON2ID_HASH.replace('m=65536', 'm=999999999');

      expect(await jsHasher.verify('KnownTestPassword1!', huge)).toBe(false);
    });
  });

  describe('cross-runtime compatibility', () => {
    it('verifies a hash produced by the Bun-native hasher', async () => {
      const nativeHash = await nativeHasher.hash('CrossRuntimePassword1!');

      expect(await jsHasher.verify('CrossRuntimePassword1!', nativeHash)).toBe(true);
    });

    it('produces a hash the Bun-native hasher can verify', async () => {
      const jsHash = await jsHasher.hash('CrossRuntimePassword1!');

      expect(await nativeHasher.verify('CrossRuntimePassword1!', jsHash)).toBe(true);
    });
  });
});
