import { Argon2idHasher } from './password-argon2id';
import { Pbkdf2Hasher } from './password-pbkdf2';

/**
 * Password hasher interface
 *
 * Implementations provide algorithm-specific hashing and verification.
 * The factory selects the strongest available hasher for the current runtime.
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

const isBunRuntime = typeof globalThis.Bun !== 'undefined';

function createPasswordHasher(runtimeIsBun = isBunRuntime): PasswordHasher {
  return runtimeIsBun ? new Argon2idHasher() : new Pbkdf2Hasher();
}

/** Runtime-appropriate hasher instance, created once at module load. */
export const passwordHasher = createPasswordHasher();

/** Whether the current runtime is Bun (exported for verify dispatch). */
export { createPasswordHasher, isBunRuntime };
