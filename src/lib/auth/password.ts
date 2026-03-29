/**
 * Password hashing and verification utilities
 *
 * Uses PBKDF2 with SHA-256 via Web Crypto API for secure password hashing.
 * This implementation works across all JavaScript runtimes including:
 * - Node.js
 * - Bun
 * - Cloudflare Workers
 * - Deno
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */

/**
 * PBKDF2 configuration
 *
 * - iterations: 100,000 (Cloudflare Workers limit - max supported is 100,000)
 * - saltLength: 16 bytes (128 bits)
 * - hashLength: 32 bytes (256 bits)
 * - algorithm: SHA-256
 *
 * Note: OWASP recommends 600,000 iterations for SHA-256, but Cloudflare Workers
 * has a hard limit of 100,000 iterations. For edge deployment compatibility,
 * we use the maximum allowed value.
 * @see https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
 */
const PBKDF2_CONFIG = {
  iterations: 100_000,
  saltLength: 16,
  hashLength: 32,
  algorithm: 'SHA-256',
} as const;

/**
 * Hash format: $pbkdf2-sha256$iterations$base64salt$base64hash
 */
const HASH_PREFIX = '$pbkdf2-sha256$';

/**
 * Convert Uint8Array or ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PBKDF2_CONFIG.saltLength));
}

/**
 * Derive key using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
  ]);

  // Derive the hash (cast salt to BufferSource for TypeScript compatibility)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_CONFIG.iterations,
      hash: PBKDF2_CONFIG.algorithm,
    },
    keyMaterial,
    PBKDF2_CONFIG.hashLength * 8 // bits
  );

  return derivedBits;
}

/**
 * Hash a plain text password using PBKDF2-SHA256
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password string
 *
 * @example
 * ```ts
 * const hash = await hashPassword('user-password123');
 * // Store hash in database
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }

  const salt = generateSalt();
  const derivedKey = await deriveKey(password, salt);

  // Format: $pbkdf2-sha256$iterations$base64salt$base64hash
  const saltBase64 = bufferToBase64(salt);
  const hashBase64 = bufferToBase64(derivedKey);

  return `${HASH_PREFIX}${PBKDF2_CONFIG.iterations}$${saltBase64}$${hashBase64}`;
}

/**
 * Verify a plain text password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 *
 * @example
 * ```ts
 * const isValid = await verifyPassword('user-password123', storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    // Parse the hash format: $pbkdf2-sha256$iterations$base64salt$base64hash
    if (!hash.startsWith(HASH_PREFIX)) {
      return false;
    }

    const parts = hash.slice(HASH_PREFIX.length).split('$');
    if (parts.length !== 3) {
      return false;
    }

    const [iterationsStr, saltBase64, storedHashBase64] = parts;
    const iterations = parseInt(iterationsStr, 10);

    if (isNaN(iterations) || iterations <= 0) {
      return false;
    }

    const salt = base64ToBuffer(saltBase64);
    const storedHash = base64ToBuffer(storedHashBase64);

    // Derive key with same parameters
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
      'deriveBits',
    ]);

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: iterations,
        hash: PBKDF2_CONFIG.algorithm,
      },
      keyMaterial,
      storedHash.length * 8
    );

    const derivedHash = new Uint8Array(derivedBits);

    // Constant-time comparison to prevent timing attacks
    if (derivedHash.length !== storedHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < derivedHash.length; i++) {
      result |= derivedHash[i] ^ storedHash[i];
    }

    return result === 0;
  } catch {
    // If verification fails (e.g., invalid hash format), return false
    return false;
  }
}
