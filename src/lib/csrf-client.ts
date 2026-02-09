/**
 * CSRF Client-side Utilities
 *
 * Provides functions to read the CSRF token from cookies and include it in
 * fetch requests. This is the client-side counterpart to the server-side
 * CSRF protection module.
 *
 * Usage:
 * ```typescript
 * import { csrfFetch, getCsrfToken } from '@/lib/csrf-client';
 *
 * // Option 1: Use csrfFetch wrapper (recommended)
 * const response = await csrfFetch('/api/endpoint', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 *
 * // Option 2: Manually add header
 * const response = await fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': getCsrfToken() || '',
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */

/**
 * CSRF token cookie name - must match server-side configuration
 */
const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * CSRF token header name - must match server-side configuration
 */
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * HTTP methods that require CSRF token
 */
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Get CSRF token from cookies
 *
 * Reads the csrf_token cookie value. Returns null if not found.
 *
 * @returns CSRF token string or null
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const name = trimmed.substring(0, eqIdx);
    const value = trimmed.substring(eqIdx + 1);
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Check if a request method requires CSRF token
 *
 * @param method - HTTP method
 * @returns true if CSRF token is required
 */
function requiresCsrfToken(method: string): boolean {
  return CSRF_PROTECTED_METHODS.includes(method.toUpperCase());
}

/**
 * Fetch wrapper that automatically includes CSRF token
 *
 * Automatically adds the X-CSRF-Token header for POST, PUT, DELETE, and PATCH
 * requests. For GET and HEAD requests, no token is added.
 *
 * @param input - URL or Request object
 * @param init - Fetch options
 * @returns Promise resolving to Response
 *
 * @example
 * ```typescript
 * // POST request - CSRF token added automatically
 * const response = await csrfFetch('/api/transactions', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ amount: 100 }),
 * });
 *
 * // GET request - no CSRF token needed
 * const response = await csrfFetch('/api/transactions');
 * ```
 */
export async function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = init?.method?.toUpperCase() || 'GET';

  // Only add CSRF token for state-changing methods
  if (!requiresCsrfToken(method)) {
    return fetch(input, init);
  }

  const csrfToken = getCsrfToken();

  // Merge CSRF header with existing headers
  const headers = new Headers(init?.headers);
  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Get headers object with CSRF token included
 *
 * Use this when you need to construct headers manually.
 *
 * @param additionalHeaders - Additional headers to include
 * @returns Headers object with CSRF token
 *
 * @example
 * ```typescript
 * const headers = getCsrfHeaders({ 'Content-Type': 'application/json' });
 * const response = await fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers,
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function getCsrfHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  const csrfToken = getCsrfToken();
  return {
    ...additionalHeaders,
    ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
  };
}
