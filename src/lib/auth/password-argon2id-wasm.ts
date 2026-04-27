/**
 * Argon2id password hasher (WASM)
 *
 * Uses hash-wasm for runtimes without Bun.password (Cloudflare Workers, Node).
 * Produces and verifies the same PHC-encoded `$argon2id$` format as the Bun
 * native hasher, so hashes generated on either runtime are cross-verifiable.
 *
 * Parameters mirror the Bun native config: m=65536 (64 MiB), t=2, p=1.
 *
 * The hash-wasm module is dynamically imported so Worker isolates that never
 * touch auth do not pay its init cost.
 *
 * @see https://github.com/Daninet/hash-wasm
 */

import { createLogger } from '@/lib/logger';
import { ARGON2ID_PREFIX } from './password-argon2id';
import type { PasswordHasher } from './password-hasher';

const logger = createLogger('password');

const ARGON2ID_PARAMS = {
  iterations: 2,
  parallelism: 1,
  memorySize: 65_536,
  hashLength: 32,
} as const;

const SALT_LENGTH = 16;

type HashWasmModule = typeof import('hash-wasm');
let hashWasmPromise: Promise<HashWasmModule> | null = null;

function loadHashWasm(): Promise<HashWasmModule> {
  if (!hashWasmPromise) {
    hashWasmPromise = import('hash-wasm');
  }

  return hashWasmPromise;
}

function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { name: 'UnknownError', message: String(error) };
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export class Argon2idWasmHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const { argon2id } = await loadHashWasm();

    return argon2id({
      password,
      salt: generateSalt(),
      ...ARGON2ID_PARAMS,
      outputType: 'encoded',
    });
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash || !hash.startsWith(ARGON2ID_PREFIX)) {
      return false;
    }

    let mod: HashWasmModule;
    try {
      mod = await loadHashWasm();
    } catch (error) {
      logger.error('Failed to load hash-wasm', describeError(error));
      return false;
    }

    try {
      return await mod.argon2Verify({ password, hash });
    } catch (error) {
      logger.error('Argon2id WASM verify threw', describeError(error));
      return false;
    }
  }
}
