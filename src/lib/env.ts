/**
 * Runtime Environment Utility
 *
 * Provides unified access to environment variables across different runtimes.
 *
 * In Cloudflare Workers, secrets and vars are only accessible via request context
 * (Astro.locals.runtime.env), not via import.meta.env at module load time.
 *
 * This utility allows middleware to set the runtime env on first request,
 * and provides a unified getter that checks runtime env first, then falls back
 * to import.meta.env for local development.
 */

/**
 * Runtime environment holder for Cloudflare Workers
 */
let runtimeEnv: Record<string, string | undefined> | null = null;

/**
 * Test-only overrides for environment variables
 * @internal
 */
let testOverrides: Record<string, string | undefined> | null = null;

/**
 * Set the runtime environment (call from middleware on first request)
 *
 * This is needed for Cloudflare Workers where secrets and vars are passed via
 * the runtime context, not available at module initialization.
 */
export function setRuntimeEnv(env: Record<string, string | undefined>): void {
  if (!runtimeEnv) {
    runtimeEnv = env;
  }
}

/**
 * Get an environment variable from available sources
 *
 * Priority:
 * 1. Test overrides (for unit tests)
 * 2. Runtime env (Cloudflare Workers secrets/vars)
 * 3. process.env (Node.js/Bun runtime - loaded via --env-file)
 * 4. import.meta.env (build-time env vars from Vite)
 *
 * @param key - The environment variable name
 * @returns The value or undefined if not set
 */
export function getEnv(key: string): string | undefined {
  // Check test overrides first (for unit tests)
  if (testOverrides && key in testOverrides) {
    return testOverrides[key];
  }

  // Check runtime env (Cloudflare Workers)
  if (runtimeEnv?.[key] !== undefined) {
    return runtimeEnv[key];
  }

  // Check process.env (Node.js/Bun runtime)
  // This handles env vars loaded via `bun --env-file` or Node.js environment
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
