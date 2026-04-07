import { describe, expect, it } from 'bun:test';
import { ARGON2ID_PREFIX } from './password-argon2id';
import { createPasswordFacade } from './password';
import { createPasswordHasher } from './password-hasher';
import { PBKDF2_PREFIX, Pbkdf2Hasher } from './password-pbkdf2';

const KNOWN_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=2,p=1$KKa335shvrWayGnd1ZwIFoLuZwFVnVFx4UMio6TCIbo$vK8PnpIuF1zweSNXM4H5VfPQURPkSpiDVa1BhbS6GFE';

describe('password runtime selection', () => {
  it('selects PBKDF2 when Bun runtime is unavailable', () => {
    expect(createPasswordHasher(false)).toBeInstanceOf(Pbkdf2Hasher);
  });

  it('uses PBKDF2 hashing and rejects Argon2id verification outside Bun', async () => {
    const warnings: string[] = [];
    const facade = createPasswordFacade({
      passwordHasher: new Pbkdf2Hasher(),
      pbkdf2Verifier: new Pbkdf2Hasher(),
      argon2idVerifier: null,
      logger: {
        warn(message) {
          warnings.push(String(message));
        },
      },
    });
    const hash = await facade.hashPassword('SecurePassword123!');

    expect(hash.startsWith(PBKDF2_PREFIX)).toBe(true);
    expect(await facade.verifyPassword('TestPassword123!', KNOWN_ARGON2ID_HASH)).toBe(false);
    expect(
      warnings.some((message) =>
        message.includes('Argon2id hash encountered on non-Bun runtime; cannot verify')
      )
    ).toBe(true);
  });

  it('continues to recognize Argon2id hashes by prefix in runtime coverage tests', () => {
    expect(KNOWN_ARGON2ID_HASH.startsWith(ARGON2ID_PREFIX)).toBe(true);
  });
});
