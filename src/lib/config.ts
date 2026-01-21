/**
 * Application Configuration
 *
 * Centralized configuration for environment-specific settings.
 * Uses Astro's `import.meta.env` for runtime environment variables.
 *
 * Environment Variables:
 * - PUBLIC_API_URL: Base URL for API endpoints (default: /api)
 *   - Development: /api (relative to dev server)
 *   - Production: https://api.example.com (absolute URL)
 *
 * @module config
 */

/**
 * Get the base API URL from environment variable.
 *
 * In Astro, environment variables prefixed with `PUBLIC_` are
 * exposed to the client-side code. This allows the same
 * configuration to work in both server and browser contexts.
 *
 * @returns The base API URL (default: '/api')
 *
 * @example
 * ```ts
 * import { getApiUrl } from '@/lib/config';
 *
 * const apiUrl = getApiUrl(); // '/api' or configured value
 * fetch(`${apiUrl}/auth/login`, { ... });
 * ```
 */
export function getApiUrl(): string {
  // Default to '/api' if not configured
  // Using relative URL for same-origin requests (same domain, port)
  return import.meta.env.PUBLIC_API_URL || '/api';
}

/**
 * Build a full API endpoint URL from a path.
 *
 * @param path - The API endpoint path (e.g., '/auth/login')
 * @returns The full API URL
 *
 * @example
 * ```ts
 * import { buildApiUrl } from '@/lib/config';
 *
 * const loginUrl = buildApiUrl('/auth/login');
 * // Returns: '/api/auth/login' (or configured base URL)
 * ```
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiUrl();
  // Remove trailing slash from base URL
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  // Remove leading slash from path if present, then join
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBaseUrl}/${cleanPath}`;
}

/**
 * Get the signup API endpoint URL.
 *
 * @returns The full signup endpoint URL
 *
 * @example
 * ```ts
 * import { getSignupUrl } from '@/lib/config';
 *
 * fetch(getSignupUrl(), { method: 'POST', ... });
 * ```
 */
export function getSignupUrl(): string {
  return buildApiUrl('/auth/signup');
}

/**
 * Get the login API endpoint URL.
 *
 * @returns The full login endpoint URL
 *
 * @example
 * ```ts
 * import { getLoginUrl } from '@/lib/config';
 *
 * fetch(getLoginUrl(), { method: 'POST', ... });
 * ```
 */
export function getLoginUrl(): string {
  return buildApiUrl('/auth/login');
}

/**
 * Get the logout API endpoint URL.
 *
 * @returns The full logout endpoint URL
 *
 * @example
 * ```ts
 * import { getLogoutUrl } from '@/lib/config';
 *
 * fetch(getLogoutUrl(), { method: 'POST', ... });
 * ```
 */
export function getLogoutUrl(): string {
  return buildApiUrl('/auth/logout');
}

/**
 * Configuration object export for convenience.
 *
 * @example
 * ```ts
 * import { config } from '@/lib/config';
 *
 * console.log(config.apiUrl); // '/api'
 * ```
 */
export const config = {
  /** Base API URL */
  apiUrl: getApiUrl(),

  /** Auth endpoint URLs */
  auth: {
    signup: getSignupUrl(),
    login: getLoginUrl(),
    logout: getLogoutUrl(),
  },
} as const;
