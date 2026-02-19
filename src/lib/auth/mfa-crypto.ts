/**
 * MFA cryptographic utilities.
 *
 * Uses Web Crypto API only for cross-runtime compatibility.
 */

const AES_GCM_IV_LENGTH = 12;
const AES_256_KEY_LENGTH = 32;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_RAW_LENGTH = 8;
const BACKUP_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BACKUP_CODE_MAX_UNBIASED = 256 - (256 % BACKUP_CODE_CHARS.length);
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_SALT_LENGTH = 16;
const PBKDF2_HASH_BITS = 256;

/**
 * Encrypt a base32 TOTP secret using AES-256-GCM.
 * Returns a base64 payload containing IV + ciphertext.
 */
export async function encryptTotpSecret(secret: string, encryptionKey: string): Promise<string> {
  const keyBytes = base64ToBuffer(encryptionKey);
  if (keyBytes.length !== AES_256_KEY_LENGTH) {
    throw new Error('MFA encryption key must decode to 32 bytes');
  }

  const key = await crypto.subtle.importKey('raw', keyBytes as BufferSource, 'AES-GCM', false, [
    'encrypt',
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const plaintext = new TextEncoder().encode(secret);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plaintext
  );

  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);

  return bufferToBase64(payload);
}

/**
 * Decrypt an encrypted TOTP secret payload produced by encryptTotpSecret.
 */
export async function decryptTotpSecret(encrypted: string, encryptionKey: string): Promise<string> {
  const keyBytes = base64ToBuffer(encryptionKey);
  if (keyBytes.length !== AES_256_KEY_LENGTH) {
    throw new Error('MFA encryption key must decode to 32 bytes');
  }

  const payload = base64ToBuffer(encrypted);
  if (payload.length <= AES_GCM_IV_LENGTH) {
    throw new Error('Invalid encrypted TOTP secret payload');
  }

  const iv = payload.slice(0, AES_GCM_IV_LENGTH);
  const ciphertext = payload.slice(AES_GCM_IV_LENGTH);

  const key = await crypto.subtle.importKey('raw', keyBytes as BufferSource, 'AES-GCM', false, [
    'decrypt',
  ]);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    ciphertext as BufferSource
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Generate single-use backup codes in XXXX-XXXX format.
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  const uniqueCodes = new Set<string>();

  while (codes.length < BACKUP_CODE_COUNT) {
    const rawCode = generateRandomBackupCodeRaw();
    const formattedCode = `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;

    if (uniqueCodes.has(formattedCode)) {
      continue;
    }

    uniqueCodes.add(formattedCode);
    codes.push(formattedCode);
  }

  return codes;
}

/**
 * Hash a backup code using PBKDF2-SHA256.
 *
 * Format: base64(salt):base64(hash)
 */
export async function hashBackupCode(code: string): Promise<string> {
  const normalizedCode = normalizeBackupCode(code);
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
  const hash = await deriveBackupCodeHash(normalizedCode, salt);

  return `${bufferToBase64(salt)}:${bufferToBase64(hash)}`;
}

/**
 * Verify backup code against stored hash string.
 */
export async function verifyBackupCode(code: string, storedHash: string): Promise<boolean> {
  const [saltBase64, hashBase64] = storedHash.split(':');
  if (!saltBase64 || !hashBase64) {
    return false;
  }

  try {
    const normalizedCode = normalizeBackupCode(code);
    const salt = base64ToBuffer(saltBase64);
    const expectedHash = base64ToBuffer(hashBase64);
    const actualHash = await deriveBackupCodeHash(normalizedCode, salt);

    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}

function normalizeBackupCode(code: string): string {
  return code.trim().toUpperCase();
}

function generateRandomBackupCodeRaw(): string {
  let rawCode = '';

  while (rawCode.length < BACKUP_CODE_RAW_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(BACKUP_CODE_RAW_LENGTH));

    for (const byte of bytes) {
      if (byte < BACKUP_CODE_MAX_UNBIASED) {
        rawCode += BACKUP_CODE_CHARS[byte % BACKUP_CODE_CHARS.length];
      }

      if (rawCode.length === BACKUP_CODE_RAW_LENGTH) {
        break;
      }
    }
  }

  return rawCode;
}

async function deriveBackupCodeHash(code: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: PBKDF2_HASH,
      iterations: PBKDF2_ITERATIONS,
      salt: salt as BufferSource,
    },
    keyMaterial,
    PBKDF2_HASH_BITS
  );

  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

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
