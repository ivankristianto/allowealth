/**
 * CSRF Protection Module
 *
 * Implements the Double-Submit Cookie pattern for CSRF protection:
 * 1. Server sets a CSRF token in a cookie (readable by JavaScript)
 * 2. Client reads the cookie and includes it in request headers
 * 3. Server validates the header matches the cookie
 *
 * This pattern works because:
 * - Attackers cannot read cookies from another domain (same-origin policy)
 * - Attackers cannot set custom headers in cross-origin requests
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */

import type { AstroCookies } from 'astro';

/**
 * CSRF token cookie name
 * Note: This cookie is NOT HttpOnly so JavaScript can read it
 */
export const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * CSRF token header name
 * Client must include this header with state-changing requests
 */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * CSRF token length in bytes (32 bytes = 256 bits of entropy)
 */
const CSRF_TOKEN_LENGTH = 32;

/**
 * CSRF cookie max age in seconds (24 hours)
 * Token is rotated on each page load for authenticated users
 */
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * Generate a cryptographically secure random token
 * @returns Base64-encoded random token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Set CSRF token cookie
 * @param cookies - Astro cookies object
 * @param token - CSRF token to set
 */
export function setCsrfCookie(cookies: AstroCookies, token: string): void {
  cookies.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    httpOnly: false, // Must be readable by JavaScript
    secure: import.meta.env.PROD, // Only secure in production
    sameSite: 'strict', // Prevent CSRF via same-site policy
    maxAge: CSRF_COOKIE_MAX_AGE,
  });
}

/**
 * Get CSRF token from cookies
 * @param cookies - Astro cookies object
 * @returns CSRF token or null if not set
 */
export function getCsrfTokenFromCookie(cookies: AstroCookies): string | null {
  return cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Get CSRF token from request headers
 * @param request - HTTP request object
 * @returns CSRF token from header or null
 */
export function getCsrfTokenFromHeader(request: Request): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Validate CSRF token
 *
 * Compares the token from the cookie with the token from the header.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param cookieToken - Token from cookie
 * @param headerToken - Token from request header
 * @returns true if tokens match, false otherwise
 */
export function validateCsrfToken(cookieToken: string | null, headerToken: string | null): boolean {
  // Both tokens must be present
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Tokens must be same length
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * HTTP methods that require CSRF protection
 * GET and HEAD requests should be idempotent and don't need protection
 */
export const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'] as const;

/**
 * Check if a request method requires CSRF protection
 * @param method - HTTP method
 * @returns true if method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  return CSRF_PROTECTED_METHODS.includes(method.toUpperCase() as any);
}

/**
 * API endpoints that are exempt from CSRF protection.
 *
 * Better Auth owns the full `/api/auth/*` surface, including authenticated session,
 * recovery, linking, and two-factor endpoints. Those routes already validate session
 * cookies and provider state internally, so this middleware should not block them.
 */
export const CSRF_EXEMPT_ENDPOINTS = ['/api/auth'] as const;

/**
 * Check if an endpoint is exempt from CSRF protection
 * @param pathname - Request pathname
 * @returns true if endpoint is exempt
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_ENDPOINTS.some(
    (endpoint) => pathname === endpoint || pathname.startsWith(`${endpoint}/`)
  );
}
