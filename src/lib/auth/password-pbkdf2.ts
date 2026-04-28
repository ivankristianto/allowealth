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
        return false;
      }

      const parts = hash.slice(PBKDF2_PREFIX.length).split('$');
      if (parts.length !== 3) {
        return false;
      }

      const [iterationsStr, saltBase64, storedHashBase64] = parts;
      const iterations = parseInt(iterationsStr, 10);

      if (Number.isNaN(iterations) || iterations <= 0) {
        return false;
      }

      const salt = base64ToBuffer(saltBase64);
      const storedHash = base64ToBuffer(storedHashBase64);

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
        return false;
      }

      let result = 0;
      for (let i = 0; i < derivedHash.length; i++) {
        result |= derivedHash[i] ^ storedHash[i];
      }

      return result === 0;
    } catch {
      return false;
    }
  }
}
