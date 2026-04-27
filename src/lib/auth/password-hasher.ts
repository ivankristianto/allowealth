import { Argon2idHasher } from './password-argon2id';
import { Argon2idJsHasher } from './password-argon2id-js';

/**
 * Password hasher interface
 *
 * Implementations provide algorithm-specific hashing and verification.
 * The factory selects the runtime-appropriate Argon2id hasher: native
 * `Bun.password` on Bun, pure JavaScript (`@noble/hashes`) elsewhere.
 * Both produce and accept the same PHC-encoded `$argon2id$` format, so a
 * hash created on one runtime verifies on the other.
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

const isBunRuntime = typeof globalThis.Bun !== 'undefined';

function createPasswordHasher(runtimeIsBun = isBunRuntime): PasswordHasher {
  return runtimeIsBun ? new Argon2idHasher() : new Argon2idJsHasher();
}

/** Runtime-appropriate hasher instance, created once at module load. */
export const passwordHasher = createPasswordHasher();

export { createPasswordHasher, isBunRuntime };
