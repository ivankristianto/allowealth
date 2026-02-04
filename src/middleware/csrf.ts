/**
 * CSRF Protection Middleware
 *
 * Two responsibilities:
 * 1. Validate the CSRF token on state-changing API requests (POST, PUT, DELETE, PATCH).
 * 2. Ensure an httpOnly=false CSRF cookie exists for authenticated page loads
 *    so client-side JavaScript can read and include it in request headers.
 */

import type { MiddlewareHandler } from 'astro';
import {
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  validateCsrfToken,
  requiresCsrfProtection,
  isCsrfExempt,
} from '@/lib/csrf';

export const csrf: MiddlewareHandler = async (context, next) => {
  const pathname = context.url.pathname;
  const method = context.request.method;
  const isApiRequest = pathname.startsWith('/api/');
  const isAuthenticated = !!context.locals.session;

  // Validate CSRF token on state-changing API requests for authenticated users
  if (
    isAuthenticated &&
    isApiRequest &&
    requiresCsrfProtection(method) &&
    !isCsrfExempt(pathname)
  ) {
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
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Ensure CSRF cookie exists for authenticated page loads
  if (isAuthenticated && !isApiRequest) {
    const existingToken = getCsrfTokenFromCookie(context.cookies);
    if (existingToken) {
      context.locals.csrfToken = existingToken;
    } else {
      const token = generateCsrfToken();
      setCsrfCookie(context.cookies, token);
      context.locals.csrfToken = token;
    }
  }

  return next();
};
