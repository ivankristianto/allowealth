/**
 * Runtime Environment Utility
 *
 * Provides unified access to environment variables.
 *
 * Fallback chain (first defined value wins):
 * 1. Test overrides (unit tests)
 * 2. process.env (Bun CLI, Node.js)
 * 3. import.meta.env (Vite build-time vars)
 */

/**
 * Test-only overrides for environment variables
 * @internal
 */
let testOverrides: Record<string, string | undefined> | null = null;

/**
 * Get an environment variable from available sources
 *
 * Priority:
 * 1. Test overrides (for unit tests)
 * 2. process.env (Node.js/Bun runtime - loaded via --env-file)
 * 3. import.meta.env (build-time env vars from Vite)
 *
 * @param key - The environment variable name
 * @returns The value or undefined if not set
 */
export function getEnv(key: string): string | undefined {
  // Check test overrides first (for unit tests)
  if (testOverrides && key in testOverrides) {
    return testOverrides[key];
  }

  // Check process.env (Node.js/Bun runtime)
  if (typeof process !== 'undefined' && process.env?.[key] !== undefined) {
    return process.env[key];
  }

  // Fall back to import.meta.env (build-time vars from Vite)
  // Guard: import.meta.env is undefined in CJS contexts (e.g., drizzle-kit)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as Record<string, string | undefined>)[key];
  }

  return undefined;
}

/**
 * Get a required environment variable
 *
 * @param key - The environment variable name
 * @throws Error if the variable is not set
 * @returns The value
 */
export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Set environment variable overrides for testing
 *
 * @param overrides - Key-value pairs to override, or null to clear
 * @internal
 */
export function setTestEnv(overrides: Record<string, string | undefined> | null): void {
  testOverrides = overrides;
}
