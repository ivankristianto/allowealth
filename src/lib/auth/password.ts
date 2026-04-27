/**
 * Password hashing and verification facade
 *
 * Hashes new passwords with Argon2id (native `Bun.password` on Bun, WASM
 * `hash-wasm` elsewhere). Verifies by hash prefix so legacy PBKDF2 records
 * still authenticate while new writes use Argon2id everywhere.
 */

import type { PasswordHasher } from './password-hasher';
import { ARGON2ID_PREFIX } from './password-argon2id';
import { passwordHasher } from './password-hasher';
import { PBKDF2_PREFIX, Pbkdf2Hasher } from './password-pbkdf2';

const pbkdf2Verifier = new Pbkdf2Hasher();

type PasswordFacadeOptions = {
  passwordHasher?: PasswordHasher;
  pbkdf2Verifier?: PasswordHasher;
  argon2idVerifier?: PasswordHasher;
};

function createPasswordFacade(options: PasswordFacadeOptions = {}) {
  const activePasswordHasher = options.passwordHasher ?? passwordHasher;
  const activePbkdf2Verifier = options.pbkdf2Verifier ?? pbkdf2Verifier;
  const activeArgon2idVerifier = options.argon2idVerifier ?? passwordHasher;

  return {
    async hashPassword(password: string): Promise<string> {
      if (!password || password.length < 12) {
        throw new Error('Password must be at least 12 characters long');
      }

      return activePasswordHasher.hash(password);
    },

    async verifyPassword(password: string, hash: string): Promise<boolean> {
      if (!password || !hash) {
        return false;
      }

      if (hash.startsWith(ARGON2ID_PREFIX)) {
        return activeArgon2idVerifier.verify(password, hash);
      }

      if (hash.startsWith(PBKDF2_PREFIX)) {
        return activePbkdf2Verifier.verify(password, hash);
      }

      return false;
    },
  };
}

const facade = createPasswordFacade();

/**
 * Hash a plain text password using the runtime-appropriate Argon2id implementation.
 *
 * @param password - Plain text password (minimum 12 characters)
 * @returns PHC-encoded `$argon2id$` hash string
 */
export async function hashPassword(password: string): Promise<string> {
  return facade.hashPassword(password);
}

/**
 * Verify a plain text password against a stored hash.
 *
 * Dispatches to the correct verifier based on the hash prefix.
 * Handles both Argon2id and legacy PBKDF2 hash formats.
 *
 * @param password - Plain text password to verify
 * @param hash - Stored hash to verify against
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return facade.verifyPassword(password, hash);
}
