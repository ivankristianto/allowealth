/**
 * Argon2id password hasher (pure JavaScript)
 *
 * Uses @noble/hashes for runtimes without Bun.password (Cloudflare Workers,
 * Node). Cloudflare Workers blocks runtime WebAssembly compilation
 * ("Wasm code generation disallowed by embedder"), so a WASM-based Argon2
 * library cannot run there. Pure JS is slower than WASM but well within
 * the latency budget for a single per-login verify.
 *
 * Produces and verifies the same PHC-encoded `$argon2id$` format as the Bun
 * native hasher, so hashes generated on either runtime are cross-verifiable.
 *
 * Parameters mirror the Bun native config: m=65536 (64 MiB), t=2, p=1.
 *
 * @see https://github.com/paulmillr/noble-hashes
 */

import { argon2idAsync } from '@noble/hashes/argon2.js';
import { createLogger } from '@/lib/logger';
import { ARGON2ID_PREFIX } from './password-argon2id';
import type { PasswordHasher } from './password-hasher';

const logger = createLogger('password');

const ARGON2ID_VERSION = 0x13;
const ARGON2ID_PARAMS = {
  t: 2,
  m: 65_536,
  p: 1,
  version: ARGON2ID_VERSION,
  dkLen: 32,
} as const;

const SALT_LENGTH = 16;

const MAX_MEMORY_KIB = 262_144; // 256 MiB ceiling for verify-side params
const MAX_TIME_COST = 16;
const MAX_PARALLELISM = 4;

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

function bytesToBase64NoPadding(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/=+$/, '');
}

function base64NoPaddingToBytes(value: string): Uint8Array {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

type ParsedArgon2idHash = {
  version: number;
  m: number;
  t: number;
  p: number;
  salt: Uint8Array;
  hash: Uint8Array;
};

function parseArgon2idPhc(value: string): ParsedArgon2idHash | null {
  // Expected: $argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>
  const parts = value.split('$');
  if (parts.length !== 6 || parts[0] !== '' || parts[1] !== 'argon2id') {
    return null;
  }

  const versionMatch = parts[2].match(/^v=(\d+)$/);
  if (!versionMatch) {
    return null;
  }

  const version = Number.parseInt(versionMatch[1], 10);
  if (version !== ARGON2ID_VERSION) {
    return null;
  }

  const params: Record<string, number> = {};
  for (const segment of parts[3].split(',')) {
    const match = segment.match(/^([a-z]+)=(\d+)$/);
    if (!match) {
      return null;
    }

    params[match[1]] = Number.parseInt(match[2], 10);
  }

  const m = params.m;
  const t = params.t;
  const p = params.p;
  if (
    !Number.isFinite(m) ||
    !Number.isFinite(t) ||
    !Number.isFinite(p) ||
    m <= 0 ||
    t <= 0 ||
    p <= 0 ||
    m > MAX_MEMORY_KIB ||
    t > MAX_TIME_COST ||
    p > MAX_PARALLELISM
  ) {
    return null;
  }

  let salt: Uint8Array;
  let storedHash: Uint8Array;
  try {
    salt = base64NoPaddingToBytes(parts[4]);
    storedHash = base64NoPaddingToBytes(parts[5]);
  } catch {
    return null;
  }

  if (salt.length === 0 || storedHash.length === 0) {
    return null;
  }

  return { version, m, t, p, salt, hash: storedHash };
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { name: 'UnknownError', message: String(error) };
}

export class Argon2idJsHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = generateSalt();
    const derived = await argon2idAsync(password, salt, ARGON2ID_PARAMS);

    return [
      '',
      'argon2id',
      `v=${ARGON2ID_VERSION}`,
      `m=${ARGON2ID_PARAMS.m},t=${ARGON2ID_PARAMS.t},p=${ARGON2ID_PARAMS.p}`,
      bytesToBase64NoPadding(salt),
      bytesToBase64NoPadding(derived),
    ].join('$');
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash || !hash.startsWith(ARGON2ID_PREFIX)) {
      return false;
    }

    const parsed = parseArgon2idPhc(hash);
    if (!parsed) {
      return false;
    }

    let derived: Uint8Array;
    try {
      derived = await argon2idAsync(password, parsed.salt, {
        t: parsed.t,
        m: parsed.m,
        p: parsed.p,
        version: parsed.version,
        dkLen: parsed.hash.length,
      });
    } catch (error) {
      logger.error('Argon2id JS verify threw', describeError(error));
      return false;
    }

    return timingSafeEqual(derived, parsed.hash);
  }
}
