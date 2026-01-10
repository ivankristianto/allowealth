/**
 * Astro Middleware
 *
 * Validates session cookies on every request and attaches user data to Astro.locals.
 * This middleware runs on every request to provide authentication context to pages.
 *
 * @see https://docs.astro.build/en/reference/middleware-reference/
 */

import type { MiddlewareHandler } from 'astro';
import { auth } from './lib/auth/lucia';
import type { User, Session } from 'lucia';

/**
 * Extend Astro.locals to include user and session
 */
declare module 'astro' {
  interface Locals {
    user?: User | null;
    session?: Session | null;
  }
}

/**
 * Session cookie name used by Lucia Auth
 * Note: Lucia uses 'sid' as the default session cookie name when using
 * sessionCookie configuration. This is set in the lucia.ts configuration.
 */
const SESSION_COOKIE_NAME = 'sid';

/**
 * Content Security Policy headers for XSS prevention
 *
 * CSP restricts the sources of various types of content, preventing XSS attacks.
 * Learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
const CSP_HEADERS = {
  // Default policy for all content types
  'default-src': "'self'",

  // Script sources - only allow scripts from same origin
  'script-src': "'self'",

  // Style sources - allow same origin and inline styles (for Tailwind CSS)
  'style-src': "'self' 'unsafe-inline'",

  // Image sources - allow same origin, data URIs, and https images
  'img-src': "'self' data: https:",

  // Font sources - allow same origin and data URIs
  'font-src': "'self' data:",

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

/**
 * Convert CSP headers object to CSP header string
 */
function buildCSPHeader(): string {
  return Object.entries(CSP_HEADERS)
    .map(([directive, source]) => `${directive} ${source}`)
    .join('; ');
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;

  // No session cookie - user is not authenticated
  if (!sessionId) {
    (context.locals as any).user = null;
    (context.locals as any).session = null;
    return next();
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

    // Add Content Security Policy headers for XSS prevention
    response.headers.set('Content-Security-Policy', buildCSPHeader());

    // Add additional security headers
    response.headers.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
    response.headers.set('X-Frame-Options', 'DENY'); // Prevent clickjacking
    response.headers.set('X-XSS-Protection', '1; mode=block'); // Legacy XSS protection
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // Control referrer information

    return response;
  } catch (error) {
    // Session validation failed - clear user data
    console.error('Session validation error:', error);
    (context.locals as any).user = null;
    (context.locals as any).session = null;
    return next();
  }
};
