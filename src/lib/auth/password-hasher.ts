/**
 * Password hasher interface
 *
 * Implementations provide algorithm-specific hashing and verification.
 * The factory selects the strongest available hasher for the current runtime.
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
