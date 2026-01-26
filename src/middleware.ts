/**
 * Astro Middleware
 *
 * Validates session cookies on every request and attaches user data to Astro.locals.
 * This middleware runs on every request to provide authentication context to pages.
 *
 * Route Protection:
 * - Routes under /dashboard, /transactions, /budget, /assets, /reports, /forecast, /calculators, /settings, /profile, /security
 *   require authentication and will redirect to /login if not authenticated.
 *
 * @see https://docs.astro.build/en/reference/middleware-reference/
 */

import type { MiddlewareHandler } from 'astro';
import { auth } from './lib/auth/lucia';
import { logError } from './lib/utils/error-logger';

/**
 * Session cookie name used by Lucia Auth
 * Note: Lucia uses 'sid' as the default session cookie name when using
 * sessionCookie configuration. This is set in the lucia.ts configuration.
 */
const SESSION_COOKIE_NAME = 'sid';

/**
 * Routes that require authentication
 * Any path starting with these prefixes will redirect to /login if not authenticated
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/transactions',
  '/budget',
  '/assets',
  '/reports',
  '/forecast',
  '/calculators',
  '/settings',
  '/profile',
  '/security',
] as const;

/**
 * Content Security Policy headers for XSS prevention
 *
 * CSP restricts the sources of various types of content, preventing XSS attacks.
 * Learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 *
 * Note: In development mode, we use a more lenient policy to support Astro dev toolbar.
 * In production, we use strict nonce-based CSP.
 */
const isDev = import.meta.env.DEV;

const CSP_HEADERS_PROD = {
  // Default policy for all content types
  'default-src': "'self'",

  // Script sources - use nonce for inline scripts (strict)
  'script-src': "'self'",

  // Style sources - allow same origin, inline styles (for Tailwind CSS), and Google Fonts
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",

  // Image sources - allow same origin, data URIs, and https images
  'img-src': "'self' data: https:",

  // Font sources - allow same origin, data URIs, and Google Fonts CDN
  'font-src': "'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",

  // Connect sources - allow same origin API calls
  'connect-src': "'self'",

  // Frame sources - deny all framing (clickjacking prevention)
  'frame-ancestors': "'none'",

  // Base URI - restrict base tag to same origin
  'base-uri': "'self'",

  // Form action - restrict form submissions to same origin
  'form-action': "'self'",

  // Object sources - block plugins (Flash, etc.)
  'object-src': "'none'",

  // Report violations to endpoint (optional, for monitoring)
  'report-to': "'csp-endpoint'",
} as const;

const CSP_HEADERS_DEV = {
  ...CSP_HEADERS_PROD,
  // In dev mode, allow unsafe-inline and unsafe-eval for Astro dev toolbar
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
} as const;

/**
 * Generate a cryptographically random nonce for CSP
 * A nonce is a random value used only once to allow inline scripts securely
 */
function generateNonce(): string {
  // Generate 16 random bytes and convert to base64
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Convert CSP headers object to CSP header string with nonce
 * @param nonce - The CSP nonce to allow for inline scripts (production only)
 */
function buildCSPHeader(nonce: string): string {
  const headers = isDev ? CSP_HEADERS_DEV : CSP_HEADERS_PROD;

  return Object.entries(headers)
    .map(([directive, source]) => {
      // Add nonce to script-src directive in production mode only
      if (!isDev && directive === 'script-src') {
        return `${directive} ${source} 'nonce-${nonce}'`;
      }
      return `${directive} ${source}`;
    })
    .join('; ');
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Generate a fresh CSP nonce for each request
  const nonce = generateNonce();
  (context.locals as any).cspNonce = nonce;

  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  const pathname = context.url.pathname;

  // Check if this is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  // No session cookie - user is not authenticated
  if (!sessionId) {
    (context.locals as any).user = null;
    (context.locals as any).session = null;

    // Redirect to login if accessing protected route
    if (isProtectedRoute) {
      const returnUrl = pathname + context.url.search;
      return context.redirect(`/login?redirect=${encodeURIComponent(returnUrl)}`, 302);
    }

    // Still apply CSP headers for unauthenticated requests
    const response = await next();
    response.headers.set('Content-Security-Policy', buildCSPHeader(nonce));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  }

  try {
    // Validate session using Lucia
    const { session, user } = await auth.validateSession(sessionId);

    // Session is valid - attach user and session to locals
    (context.locals as any).session = session;
    (context.locals as any).user = user;

    // If session is not fresh (close to expiry), consider refreshing it
    // This is optional and depends on your security requirements
    if (session && session.fresh) {
      // Session is fresh - could set a new cookie if needed
      // For now, we'll just continue
    }

    // Apply security headers to response
    const response = await next();

    // Add Content Security Policy headers for XSS prevention with nonce
    response.headers.set('Content-Security-Policy', buildCSPHeader(nonce));

    // Add additional security headers
    response.headers.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
    response.headers.set('X-Frame-Options', 'DENY'); // Prevent clickjacking
    response.headers.set('X-XSS-Protection', '1; mode=block'); // Legacy XSS protection
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // Control referrer information

    return response;
  } catch (error) {
    // Session validation failed - clear user data
    logError('Session validation error', error);
    (context.locals as any).user = null;
    (context.locals as any).session = null;

    // Redirect to login if accessing protected route
    if (isProtectedRoute) {
      const returnUrl = pathname + context.url.search;
      return context.redirect(`/login?redirect=${encodeURIComponent(returnUrl)}`, 302);
    }

    // Still apply CSP headers even when session validation fails
    const response = await next();
    response.headers.set('Content-Security-Policy', buildCSPHeader(nonce));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  }
};
