/**
 * AES-256-GCM Encryption Utility
 *
 * Uses Web Crypto API for encryption/decryption of sensitive data.
 * Encrypted format: aes256gcm:<base64-iv>:<base64-ciphertext>:<base64-tag>
 */

import nodeCrypto from 'crypto';

const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Get the encryption key from environment variable
 *
 * Note: Uses import.meta.env instead of process.env because Astro/Vite
 * only populates import.meta.env from .env files, not process.env.
 */
function getEncryptionKey(): Uint8Array {
  const keyBase64 = import.meta.env.EMAIL_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error('EMAIL_ENCRYPTION_KEY environment variable is not set');
  }

  const key = Buffer.from(keyBase64, 'base64');

  if (key.length !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be 32 bytes (256 bits) base64 encoded');
  }

  return new Uint8Array(key);
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: aes256gcm:<iv>:<ciphertext>:<tag>
 */
export function encrypt(plaintext: string): string {
  const keyBytes = getEncryptionKey();
  const iv = nodeCrypto.randomBytes(IV_LENGTH);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const cipher = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(keyBytes), iv, {
    authTagLength: TAG_LENGTH / 8,
  });

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ivBase64 = iv.toString('base64');
  const ciphertextBase64 = encrypted.toString('base64');
  const tagBase64 = authTag.toString('base64');

  return `aes256gcm:${ivBase64}:${ciphertextBase64}:${tagBase64}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 *
 * @param encrypted - Encrypted string in format: aes256gcm:<iv>:<ciphertext>:<tag>
 * @returns Decrypted plaintext string
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');

  if (parts.length !== 4 || parts[0] !== 'aes256gcm') {
    throw new Error('Invalid encrypted format. Expected: aes256gcm:<iv>:<ciphertext>:<tag>');
  }

  const [, ivBase64, ciphertextBase64, tagBase64] = parts;
  const keyBytes = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');
  const authTag = Buffer.from(tagBase64, 'base64');

  const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', Buffer.from(keyBytes), iv, {
    authTagLength: TAG_LENGTH / 8,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Generate a new 32-byte encryption key (base64 encoded)
 *
 * @returns Base64 encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  const key = nodeCrypto.randomBytes(32);
  return key.toString('base64');
}
