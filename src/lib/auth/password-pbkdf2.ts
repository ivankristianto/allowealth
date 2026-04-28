/**
 * PBKDF2-SHA256 password hasher
 *
 * Uses Web Crypto API for cross-runtime compatibility (Bun, Node, Cloudflare Workers).
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */

import type { PasswordHasher } from './password-hasher';

const PBKDF2_CONFIG = {
  iterations: 600_000,
  saltLength: 16,
  hashLength: 32,
  algorithm: 'SHA-256',
} as const;

const MIN_ACCEPTED_ITERATIONS = 100_000;
const MAX_ACCEPTED_ITERATIONS = 2_000_000;
const ITERATIONS_PATTERN = /^[1-9][0-9]*$/;

export const PBKDF2_PREFIX = '$pbkdf2-sha256$';

function bufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PBKDF2_CONFIG.saltLength));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
  ]);

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_CONFIG.iterations,
      hash: PBKDF2_CONFIG.algorithm,
    },
    keyMaterial,
    PBKDF2_CONFIG.hashLength * 8
  );
}

export class Pbkdf2Hasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = generateSalt();
    const derivedKey = await deriveKey(password, salt);

    const saltBase64 = bufferToBase64(salt);
    const hashBase64 = bufferToBase64(derivedKey);

    return `${PBKDF2_PREFIX}${PBKDF2_CONFIG.iterations}$${saltBase64}$${hashBase64}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      if (!hash.startsWith(PBKDF2_PREFIX)) {
        console.error('[pbkdf2-debug] reject: missing prefix', {
          hashLen: hash.length,
          first16: hash.slice(0, 16),
        });
        return false;
      }

      const parts = hash.slice(PBKDF2_PREFIX.length).split('$');
      if (parts.length !== 3) {
        console.error('[pbkdf2-debug] reject: bad part count', { parts: parts.length });
        return false;
      }

      const [iterationsStr, saltBase64, storedHashBase64] = parts;

      if (!ITERATIONS_PATTERN.test(iterationsStr)) {
        console.error('[pbkdf2-debug] reject: iterations pattern', { iterationsStr });
        return false;
      }

      const iterations = parseInt(iterationsStr, 10);
      if (
        !Number.isFinite(iterations) ||
        iterations < MIN_ACCEPTED_ITERATIONS ||
        iterations > MAX_ACCEPTED_ITERATIONS
      ) {
        console.error('[pbkdf2-debug] reject: iterations bounds', { iterations });
        return false;
      }

      const salt = base64ToBuffer(saltBase64);
      const storedHash = base64ToBuffer(storedHashBase64);

      if (
        salt.length !== PBKDF2_CONFIG.saltLength ||
        storedHash.length !== PBKDF2_CONFIG.hashLength
      ) {
        console.error('[pbkdf2-debug] reject: salt/hash length', {
          saltLen: salt.length,
          hashLen: storedHash.length,
        });
        return false;
      }

      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);

      const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
        'deriveBits',
      ]);

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt as BufferSource,
          iterations,
          hash: PBKDF2_CONFIG.algorithm,
        },
        keyMaterial,
        storedHash.length * 8
      );

      const derivedHash = new Uint8Array(derivedBits);

      if (derivedHash.length !== storedHash.length) {
        console.error('[pbkdf2-debug] reject: derived length mismatch', {
          derived: derivedHash.length,
          stored: storedHash.length,
        });
        return false;
      }

      let result = 0;
      for (let i = 0; i < derivedHash.length; i++) {
        result |= derivedHash[i] ^ storedHash[i];
      }

      if (result !== 0) {
        console.error('[pbkdf2-debug] reject: bytes mismatch', {
          passwordLen: password.length,
          iterations,
        });
      } else {
        console.error('[pbkdf2-debug] match', { iterations });
      }

      return result === 0;
    } catch (error) {
      console.error('[pbkdf2-debug] threw', {
        name: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
