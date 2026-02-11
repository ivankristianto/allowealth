/**
 * HMAC-SHA256 Cookie Signing
 *
 * Signs and verifies cookie values using HMAC-SHA256 via Web Crypto API.
 * Cross-runtime compatible (Node.js, Bun, Cloudflare Workers).
 *
 * Format: base64(json).hmac_hex
 */

import { getEnv } from '@/lib/env';

/**
 * Encode a string to base64, handling Unicode characters safely.
 * btoa() only handles Latin-1; this converts UTF-8 bytes first.
 */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a base64 string back to a UTF-8 string.
 * Reverses toBase64() by decoding the bytes as UTF-8.
 */
function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hexParts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hexParts.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return hexParts.join('');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Get the HMAC signing key from GOOGLE_CLIENT_SECRET
 */
async function getSigningKey(): Promise<CryptoKey> {
  const secret = getEnv('GOOGLE_CLIENT_SECRET');
  if (!secret) {
    throw new Error('GOOGLE_CLIENT_SECRET not available for cookie signing');
  }

  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Compute HMAC-SHA256 of the given data
 */
async function computeHmac(data: string): Promise<string> {
  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bufferToHex(signature);
}

/**
 * Sign a cookie value: base64(json).hmac_hex
 *
 * @param value - JSON string to sign
 * @returns Signed cookie string in format base64.hmac_hex
 */
export async function signCookieValue(value: string): Promise<string> {
  const payload = toBase64(value);
  const hmac = await computeHmac(payload);
  return `${payload}.${hmac}`;
}

/**
 * Verify and extract a signed cookie value
 *
 * @param signedValue - Signed cookie in format base64.hmac_hex
 * @returns The original JSON string if valid, null if tampered
 */
export async function verifyCookieSignature(signedValue: string): Promise<string | null> {
  const dotIndex = signedValue.lastIndexOf('.');
  if (dotIndex === -1) {
    return null;
  }

  const payload = signedValue.substring(0, dotIndex);
  const providedHmac = signedValue.substring(dotIndex + 1);

  // Validate HMAC format (64 hex chars for SHA-256)
  if (providedHmac.length !== 64 || !/^[0-9a-f]+$/.test(providedHmac)) {
    return null;
  }

  // Verify using constant-time comparison via Web Crypto API
  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const expectedSig = hexToBuffer(providedHmac);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    expectedSig as BufferSource,
    encoder.encode(payload)
  );

  if (!isValid) {
    return null;
  }

  try {
    return fromBase64(payload);
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison using Web Crypto API HMAC verify
 *
 * Compares two strings in constant time to prevent timing attacks.
 * Uses HMAC verification internally which provides timing-safe comparison.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}
