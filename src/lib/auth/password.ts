/**
 * Password hashing and verification utilities
 *
 * Uses Argon2id (via oslo library) for secure password hashing.
 * Argon2id is a memory-hard key derivation function that provides
 * protection against GPU/ASIC attacks.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9106.html
 */

import { Argon2id } from 'oslo/password';

/**
 * Argon2id configuration
 *
 * These parameters provide a good balance between security and performance.
 * - memoryCost: 19456 (19 MB) - memory hardness
 * - timeCost: 2 - number of iterations
 * - outputLen: 32 - 256-bit hash output
 * - parallelism: 1 - number of threads (kept at 1 for browser compatibility)
 */
const ARGON_CONFIG = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

/**
 * Hash a plain text password using Argon2id
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

  const argon2id = new Argon2id(ARGON_CONFIG);
  return await argon2id.hash(password);
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
    const argon2id = new Argon2id(ARGON_CONFIG);
    return await argon2id.verify(hash, password);
  } catch (error) {
    // If verification fails (e.g., invalid hash format), return false
    return false;
  }
}
