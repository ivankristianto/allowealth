/**
 * Password hashing and verification facade
 *
 * Selects the strongest available hasher per runtime:
 * - Bun: Argon2id via Bun.password (memory-hard, OWASP recommended)
 * - Workers: PBKDF2-SHA256 via Web Crypto API (cross-runtime fallback)
 *
 * Verification dispatches by hash prefix, so both formats are readable
 * on any runtime that supports the underlying algorithm.
 *
 * @see docs/superpowers/specs/2026-04-07-argon2id-password-hashing-design.md
 */

import { createLogger } from '@/lib/logger';
import { ARGON2ID_PREFIX, Argon2idHasher } from './password-argon2id';
import { isBunRuntime, passwordHasher } from './password-hasher';
import { PBKDF2_PREFIX, Pbkdf2Hasher } from './password-pbkdf2';

const logger = createLogger('password');

/** Fallback PBKDF2 verifier -- always available regardless of runtime. */
const pbkdf2Verifier = new Pbkdf2Hasher();

/** Argon2id verifier -- only usable on Bun runtime. */
const argon2idVerifier = isBunRuntime ? new Argon2idHasher() : null;

/**
 * Hash a plain text password using the runtime-appropriate algorithm.
 *
 * @param password - Plain text password (minimum 12 characters)
 * @returns Hashed password string in PHC or custom prefix format
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }

  return passwordHasher.hash(password);
}

/**
 * Verify a plain text password against a stored hash.
 *
 * Dispatches to the correct verifier based on the hash prefix.
 * Handles both Argon2id and PBKDF2 hash formats.
 *
 * @param password - Plain text password to verify
 * @param hash - Stored hash to verify against
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  if (hash.startsWith(ARGON2ID_PREFIX)) {
    if (!argon2idVerifier) {
      logger.warn('Argon2id hash encountered on non-Bun runtime; cannot verify');
      return false;
    }

    return argon2idVerifier.verify(password, hash);
  }

  if (hash.startsWith(PBKDF2_PREFIX)) {
    return pbkdf2Verifier.verify(password, hash);
  }

  return false;
}
