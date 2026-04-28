/**
 * Password hashing and verification facade
 *
 * Hashes new passwords with the runtime-appropriate algorithm:
 * Argon2id via `Bun.password` on Bun (Docker, local dev), PBKDF2-SHA256
 * via Web Crypto on Cloudflare Workers and any other non-Bun runtime.
 *
 * Hashes do not migrate between deployment targets. An Argon2id hash
 * landing on a Workers deployment indicates a misconfigured seed and
 * surfaces a warning so it does not fail silently.
 */

import { createLogger } from '@/lib/logger';
import type { PasswordHasher } from './password-hasher';
import { ARGON2ID_PREFIX, Argon2idHasher } from './password-argon2id';
import { isBunRuntime, passwordHasher } from './password-hasher';
import { PBKDF2_PREFIX, Pbkdf2Hasher } from './password-pbkdf2';

const logger = createLogger('password');

const pbkdf2Verifier = new Pbkdf2Hasher();
const argon2idVerifier = isBunRuntime ? new Argon2idHasher() : null;

type PasswordFacadeOptions = {
  passwordHasher?: PasswordHasher;
  pbkdf2Verifier?: PasswordHasher;
  argon2idVerifier?: PasswordHasher | null;
  logger?: { warn(message: string): void };
};

function createPasswordFacade(options: PasswordFacadeOptions = {}) {
  const activePasswordHasher = options.passwordHasher ?? passwordHasher;
  const activePbkdf2Verifier = options.pbkdf2Verifier ?? pbkdf2Verifier;
  const activeArgon2idVerifier =
    options.argon2idVerifier === undefined ? argon2idVerifier : options.argon2idVerifier;
  const activeLogger = options.logger ?? logger;

  return {
    async hashPassword(password: string): Promise<string> {
      if (!password || password.length < 12) {
        throw new Error('Password must be at least 12 characters long');
      }

      return activePasswordHasher.hash(password);
    },

    async verifyPassword(password: string, hash: string): Promise<boolean> {
      console.error('[verify-debug] enter', {
        passwordLen: password?.length ?? 0,
        hashLen: hash?.length ?? 0,
        hashPrefix: hash ? hash.slice(0, 16) : null,
      });

      if (!password || !hash) {
        console.error('[verify-debug] empty input');
        return false;
      }

      if (hash.startsWith(ARGON2ID_PREFIX)) {
        if (!activeArgon2idVerifier) {
          activeLogger.warn(
            'Argon2id hash encountered on non-Bun runtime; this deployment uses PBKDF2 and cannot verify it'
          );
          return false;
        }

        console.error('[verify-debug] dispatching to argon2id verifier');
        return activeArgon2idVerifier.verify(password, hash);
      }

      if (hash.startsWith(PBKDF2_PREFIX)) {
        console.error('[verify-debug] dispatching to pbkdf2 verifier');
        return activePbkdf2Verifier.verify(password, hash);
      }

      console.error('[verify-debug] no prefix matched, falling through');
      return false;
    },
  };
}

const facade = createPasswordFacade();

/**
 * Hash a plain text password using the runtime-appropriate algorithm.
 *
 * @param password - Plain text password (minimum 12 characters)
 * @returns Hash string in `$argon2id$` (Bun) or `$pbkdf2-sha256$` (Workers) format
 */
export async function hashPassword(password: string): Promise<string> {
  return facade.hashPassword(password);
}

/**
 * Verify a plain text password against a stored hash.
 *
 * Dispatches to the correct verifier based on the hash prefix.
 * Argon2id verification only succeeds on Bun. On non-Bun runtimes an
 * Argon2id hash logs a warning and returns false so misconfigured seeds
 * surface immediately.
 *
 * @param password - Plain text password to verify
 * @param hash - Stored hash to verify against
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return facade.verifyPassword(password, hash);
}
