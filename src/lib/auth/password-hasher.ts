import { Argon2idHasher } from './password-argon2id';
import { Pbkdf2Hasher } from './password-pbkdf2';

/**
 * Password hasher interface
 *
 * Implementations provide algorithm-specific hashing and verification.
 * The factory selects the runtime-appropriate hasher: Argon2id via
 * `Bun.password` on Bun (Docker, local dev), PBKDF2-SHA256 via Web Crypto
 * elsewhere (Cloudflare Workers, Node).
 *
 * Hashes do not migrate between deployment targets. Workers cannot run
 * Argon2id within its 10ms CPU/request budget (pure-JS Argon2id exceeds
 * it; runtime WASM compilation is blocked by the embedder), so each
 * deployment owns its own hash format.
 *
 * Set `PASSWORD_HASHER=pbkdf2` to force PBKDF2 even when running on Bun
 * (used by the seeder to produce hashes for a Workers-targeted DB).
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

const isBunRuntime = typeof globalThis.Bun !== 'undefined';

function readHasherOverride(): 'pbkdf2' | 'argon2id' | null {
  const value = typeof process !== 'undefined' ? process.env?.PASSWORD_HASHER : undefined;
  if (value === 'pbkdf2' || value === 'argon2id') {
    return value;
  }

  return null;
}

function createPasswordHasher(runtimeIsBun = isBunRuntime): PasswordHasher {
  const override = readHasherOverride();

  if (override === 'pbkdf2') {
    return new Pbkdf2Hasher();
  }

  if (override === 'argon2id') {
    if (!runtimeIsBun) {
      throw new Error('PASSWORD_HASHER=argon2id requires the Bun runtime');
    }
    return new Argon2idHasher();
  }

  return runtimeIsBun ? new Argon2idHasher() : new Pbkdf2Hasher();
}

/** Runtime-appropriate hasher instance, created once at module load. */
export const passwordHasher = createPasswordHasher();

export { createPasswordHasher, isBunRuntime };
