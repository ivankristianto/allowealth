/**
 * Runtime Environment Utility
 *
 * Provides unified access to environment variables across different runtimes.
 *
 * In Cloudflare Workers / workerd, env vars are accessed via
 * `import { env } from 'cloudflare:workers'` (available since adapter v13 / Astro 6).
 *
 * Fallback chain (first defined value wins):
 * 1. Test overrides (unit tests)
 * 2. cloudflare:workers env (Workers + workerd dev)
 * 3. process.env (Bun CLI, Node.js)
 * 4. import.meta.env (Vite build-time vars)
 */

/**
 * Cached reference to the cloudflare:workers env object.
 * `undefined` = not yet resolved, `null` = resolved but unavailable.
 */
let cfEnv: Record<string, unknown> | null | undefined = undefined;

/**
 * Resolve cloudflare:workers env lazily (no top-level await).
 *
 * Removing top-level await keeps this module synchronous so that Bun's
 * `require()` can load any file that imports it. The async probe fires
 * immediately but doesn't block module loading. In Workers the promise
 * settles before the first request; in Bun `cloudflare:workers` doesn't
 * exist so it resolves to null almost instantly.
 */
(async () => {
  try {
    const moduleName = 'cloudflare:workers';
    const mod = (await import(moduleName)) as { env?: Record<string, unknown> };
    cfEnv = mod.env ?? null;
  } catch {
    cfEnv = null;
  }
})();

/**
 * Return cached cloudflare:workers env.
 * Returns null if not yet resolved (falls through to process.env).
 */
function getCfEnv(): Record<string, unknown> | null {
  return cfEnv ?? null;
}

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
 * 2. cloudflare:workers env (Cloudflare Workers / workerd dev)
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

  // Check cloudflare:workers env (Workers + workerd dev)
  const cf = getCfEnv();
  if (cf) {
    const val = cf[key];
    if (val !== undefined && typeof val === 'string') {
      return val;
    }
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
 * Get a cloudflare:workers env binding by key (may be a non-string object like D1Database).
 * Returns undefined outside of workerd or if the binding is not set.
 */
export function getBinding<T = unknown>(key: string): T | undefined {
  const cf = getCfEnv();
  if (!cf) return undefined;
  return cf[key] as T | undefined;
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
