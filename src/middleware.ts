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
import { auth, type User, type Session } from './lib/auth/lucia';
import { logError } from './lib/utils/error-logger';
import {
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  validateCsrfToken,
  requiresCsrfProtection,
  isCsrfExempt,
} from './lib/csrf';
import { setRuntimeEnv } from './db/config';
import { getCachedSession, cacheSession } from './lib/auth/session-cache';
import { PerfCollector } from './lib/perf';

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
 * Build Server-Timing header from timings object
 * Server-Timing exposes server-side metrics to browser DevTools Network panel
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
 */
function buildServerTimingHeader(timings: Record<string, number>): string {
  return Object.entries(timings)
    .map(([name, value]) => {
      // Server-Timing format: metric;dur=value;desc="description"
      // auth.source is a flag (1=cache, 0=db), not a duration
      if (name === 'auth.source') {
        const desc = value === 1 ? 'cache' : 'db';
        return `${name.replace(/\./g, '-')};desc="${desc}"`;
      }
      return `${name.replace(/\./g, '-')};dur=${value.toFixed(2)}`;
    })
    .join(', ');
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

/**
 * Inject CSP nonce into all script tags in HTML response
 * This is necessary because Astro generates inline scripts for module bootstrapping
 * that don't automatically get nonces from Astro.locals.cspNonce
 *
 * @param html - The HTML string to process
 * @param nonce - The CSP nonce to inject
 * @returns HTML with nonce attributes added to all script tags
 */
function injectScriptNonces(html: string, nonce: string): string {
  // Match <script tags that don't already have a nonce attribute
  // Handles: <script>, <script type="module">, <script src="...">, etc.
  // Uses negative lookahead to skip scripts that already have nonce
  return html.replace(/<script(?![^>]*\bnonce\b)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
}

/**
 * Apply security headers and optionally inject nonces into HTML responses
 * @param response - The original response
 * @param nonce - The CSP nonce
 * @returns Modified response with security headers
 */
async function applySecurityHeaders(response: Response, nonce: string): Promise<Response> {
  const contentType = response.headers.get('Content-Type') || '';
  const mightBeHtml = contentType === '' || contentType.includes('text/html');

  // For potential HTML responses, read body and inject nonces if it's actually HTML
  // We check body content because Content-Type may not be set in some SSR environments
  if (mightBeHtml) {
    const body = await response.text();
    const trimmedBody = body.trimStart().toLowerCase();
    const isActuallyHtml = trimmedBody.startsWith('<!doctype') || trimmedBody.startsWith('<html');

    if (isActuallyHtml) {
      // Inject nonces into all script tags (both dev and production for consistency)
      const modifiedHtml = injectScriptNonces(body, nonce);

      // Create new response with modified HTML and copy headers
      const newHeaders = new Headers();
      response.headers.forEach((value, key) => {
        newHeaders.set(key, value);
      });

      // Set security headers
      newHeaders.set('Content-Security-Policy', buildCSPHeader(nonce));
      newHeaders.set('X-Content-Type-Options', 'nosniff');
      newHeaders.set('X-Frame-Options', 'DENY');
      newHeaders.set('X-XSS-Protection', '1; mode=block');
      newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

      return new Response(modifiedHtml, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // Body was read but not HTML - reconstruct response with original body
    const newHeaders = new Headers();
    response.headers.forEach((value, key) => {
      newHeaders.set(key, value);
    });
    newHeaders.set('Content-Security-Policy', buildCSPHeader(nonce));
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('X-XSS-Protection', '1; mode=block');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  // For non-HTML responses (e.g., JSON API), clone and add headers
  const newHeaders = new Headers();
  response.headers.forEach((value, key) => {
    newHeaders.set(key, value);
  });
  newHeaders.set('Content-Security-Policy', buildCSPHeader(nonce));
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-XSS-Protection', '1; mode=block');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Clone the response body for non-HTML content
  const bodyStream = response.body;
  return new Response(bodyStream, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const requestStart = performance.now();
  const pathname = context.url.pathname;
  const timings: Record<string, number> = {};

  // Create PerfCollector when PERF_DEBUG is enabled
  const perfDebugEnabled = import.meta.env.PERF_DEBUG === 'true';
  if (perfDebugEnabled) {
    const perf = new PerfCollector();
    perf.setRoute(pathname);
    (context.locals as any).perf = perf;
  }

  // Set runtime env for Cloudflare Workers (secrets are only available via request context)
  // This must happen before any database operations
  const runtime = (context.locals as any).runtime;

  if (runtime?.env) {
    setRuntimeEnv(runtime.env);
  }

  // Generate a fresh CSP nonce for each request
  const nonce = generateNonce();
  (context.locals as any).cspNonce = nonce;

  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  const method = context.request.method;

  // Check if this is an API request that requires CSRF protection
  const isApiRequest = pathname.startsWith('/api/');
  const needsCsrfValidation =
    isApiRequest && requiresCsrfProtection(method) && !isCsrfExempt(pathname);

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
    return applySecurityHeaders(response, nonce);
  }

  // Validate CSRF token for protected API requests
  // This must happen after we verify there's a session but before processing the request
  if (needsCsrfValidation) {
    const cookieToken = getCsrfTokenFromCookie(context.cookies);
    const headerToken = getCsrfTokenFromHeader(context.request);

    if (!validateCsrfToken(cookieToken, headerToken)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'CSRF token validation failed',
            code: 'CSRF_VALIDATION_FAILED',
          },
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  try {
    // Try to get session from cache first (saves ~400ms DB round trip)
    const authStart = performance.now();
    let session: Session | null = null;
    let user: User | null = null;
    let cacheHit = false;

    const cached = await getCachedSession(sessionId, context.locals.perf);
    if (cached) {
      session = cached.session;
      user = cached.user;
      cacheHit = true;
      timings['auth.cacheHit'] = performance.now() - authStart;
    } else {
      // Cache miss - validate session with database
      const dbStart = performance.now();
      const result = await auth.validateSession(sessionId);
      session = result.session;
      user = result.user as User | null;
      timings['auth.dbValidate'] = performance.now() - dbStart;

      // Cache the validated session for future requests
      if (session && user) {
        await cacheSession(sessionId, session, user);
      }
    }
    timings['auth.validateSession'] = performance.now() - authStart;
    timings['auth.source'] = cacheHit ? 1 : 0; // 1 = cache, 0 = db

    // Check if user has been soft-deleted
    if (user?.deletedAt !== null && user?.deletedAt !== undefined) {
      // User is soft-deleted - treat as unauthenticated
      (context.locals as any).user = null;
      (context.locals as any).session = null;

      // Redirect to login if accessing protected route
      if (isProtectedRoute) {
        const returnUrl = pathname + context.url.search;
        return context.redirect(`/login?redirect=${encodeURIComponent(returnUrl)}`, 302);
      }

      // Still apply CSP headers
      const response = await next();
      return applySecurityHeaders(response, nonce);
    }

    // Session is valid - attach user and session to locals
    (context.locals as any).session = session;
    (context.locals as any).user = user;

    // Set CSRF token for authenticated users on page loads
    // Only generate a new token if one doesn't exist (prevents multi-tab issues)
    if (!isApiRequest) {
      const existingToken = getCsrfTokenFromCookie(context.cookies);
      if (existingToken) {
        // Reuse existing token
        (context.locals as any).csrfToken = existingToken;
      } else {
        // Generate new token only when needed
        const csrfToken = generateCsrfToken();
        setCsrfCookie(context.cookies, csrfToken);
        (context.locals as any).csrfToken = csrfToken;
      }
    }

    // If session is not fresh (close to expiry), consider refreshing it
    // This is optional and depends on your security requirements
    if (session && session.fresh) {
      // Session is fresh - could set a new cookie if needed
      // For now, we'll just continue
    }

    // Apply security headers to response
    const nextStart = performance.now();
    const response = await next();
    timings['page.render'] = performance.now() - nextStart;
    timings['total'] = performance.now() - requestStart;

    // Apply security headers and inject nonces into HTML scripts
    const securedResponse = await applySecurityHeaders(response, nonce);

    // Expose server-side performance metrics via Server-Timing header
    // Viewable in browser DevTools Network panel under "Timing" tab
    // Enable with PERF_DEBUG=true environment variable
    if (import.meta.env.PERF_DEBUG === 'true' && Object.keys(timings).length > 0) {
      securedResponse.headers.set('Server-Timing', buildServerTimingHeader(timings));
    }

    return securedResponse;
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
    return applySecurityHeaders(response, nonce);
  }
};
