/**
 * Argon2id password hasher
 *
 * Uses Bun.password API for hardware-accelerated Argon2id hashing.
 * Only available in Bun runtime (Docker, local dev).
 *
 * Parameters: m=65536 (64 MiB), t=2, p=1 -- exceeds OWASP minimum.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 * @see https://bun.sh/docs/api/hashing#bun-password
 */

import type { PasswordHasher } from './password-hasher';

export const ARGON2ID_PREFIX = '$argon2id$';

const ARGON2ID_CONFIG = {
  algorithm: 'argon2id' as const,
  memoryCost: 65_536,
  timeCost: 2,
};

export class Argon2idHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, ARGON2ID_CONFIG);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash || !hash.startsWith(ARGON2ID_PREFIX)) {
      return false;
    }

    try {
      return Bun.password.verify(password, hash);
    } catch {
      return false;
    }
  }
}
